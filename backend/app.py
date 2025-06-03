#!/usr/bin/env python3
"""
HomeWatch Backend API
Sentiment Analysis and Data Processing Server

Features:
- Real-time sentiment analysis
- Social media data collection
- News article processing
- Analytics data aggregation
- RESTful API endpoints
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import logging
from datetime import datetime, timedelta, timezone
import json
import sqlite3

# Import custom modules
from sentiment.analyzer import SentimentAnalyzer
from data.processors import DataProcessor
from data.dataset_analyzer import DatasetAnalyzer
from analytics.generator import AnalyticsGenerator
from database.manager import DatabaseManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/homewatch.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'homewatch-dev-key-2024')

# Configure CORS - Allow all origins for development
CORS(app, 
     origins="*",
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Accept"],
     supports_credentials=True)

# Configure rate limiting (increased for development)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["2000 per day", "500 per hour"]  # Increased limits for development
)
limiter.init_app(app)

# Initialize services
sentiment_analyzer = SentimentAnalyzer()
data_processor = DataProcessor()
dataset_analyzer = DatasetAnalyzer()
analytics_generator = AnalyticsGenerator()
db_manager = DatabaseManager()

@app.route('/')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'HomeWatch API',
        'version': '1.0.0',
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

@app.route('/api/health')
def api_health_check():
    """API Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'HomeWatch API',
        'version': '1.0.0',
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

@app.route('/api/status')
def api_status():
    """API Status endpoint with more detailed information"""
    try:
        # Get some basic stats from the dataset
        stats = dataset_analyzer.get_overview_stats()
        return jsonify({
            'status': 'healthy',
            'service': 'HomeWatch API',
            'version': '1.0.0',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'data_stats': {
                'survey_responses': stats.get('total_responses', 0),
                'news_articles': stats.get('total_articles', 0)
            }
        })
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return jsonify({
            'status': 'degraded',
            'service': 'HomeWatch API',
            'version': '1.0.0',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'error': 'Data access issues'
        })

@app.route('/api/sentiment/analyze', methods=['POST'])
@limiter.limit("30 per minute")
def analyze_sentiment():
    """
    Analyze sentiment of text content
    
    Expected payload:
    {
        "text": "string",
        "source": "user_post|news|social_media",
        "metadata": {"optional": "data"}
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Text field is required'}), 400
        
        text = data['text']
        source = data.get('source', 'user_post')
        metadata = data.get('metadata', {})
        
        # Perform sentiment analysis
        result = sentiment_analyzer.analyze(text, source, metadata)
        
        # Store result in database
        db_manager.store_sentiment_result(result)
        
        logger.info(f"Sentiment analysis completed for source: {source}")
        
        return jsonify({
            'success': True,
            'result': result,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/sentiment/batch', methods=['POST'])
@limiter.limit("10 per minute")
def analyze_sentiment_batch():
    """
    Batch sentiment analysis for multiple texts
    
    Expected payload:
    {
        "texts": [
            {"text": "string", "id": "unique_id", "metadata": {}},
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'texts' not in data:
            return jsonify({'error': 'Texts array is required'}), 400
        
        texts = data['texts']
        
        if len(texts) > 100:
            return jsonify({'error': 'Maximum 100 texts per batch'}), 400
        
        results = sentiment_analyzer.analyze_batch(texts)
        
        # Store results in database
        for result in results:
            db_manager.store_sentiment_result(result)
        
        logger.info(f"Batch sentiment analysis completed for {len(texts)} texts")
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results),
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Batch sentiment analysis error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/data/news', methods=['GET'])
@limiter.limit("20 per minute")
def get_news_data():
    """
    Get and analyze news articles from existing dataset
    
    Query parameters:
    - limit: number of articles (default: 20, max: 100)
    - keywords: comma-separated keywords for filtering
    """
    try:
        limit = min(int(request.args.get('limit', 20)), 100)
        keywords = request.args.get('keywords', '')
        
        # Load news articles from existing dataset
        news_data = dataset_analyzer.get_news_data()
        
        # Filter by keywords if provided
        if keywords:
            keyword_list = [k.strip().lower() for k in keywords.split(',')]
            filtered_articles = []
            for article in news_data:
                article_text = f"{article.get('title', '')} {article.get('content', '')}".lower()
                if any(keyword in article_text for keyword in keyword_list):
                    filtered_articles.append(article)
            news_data = filtered_articles
        
        # Limit results
        limited_articles = news_data[:limit]
        
        # Analyze sentiment for each article
        processed_articles = []
        for article in limited_articles:
            sentiment_result = sentiment_analyzer.analyze(
                article.get('content', ''),
                source='news',
                metadata={
                    'title': article.get('title', ''),
                    'url': article.get('url', ''),
                    'published': article.get('published_date', '')
                }
            )
            
            processed_articles.append({
                **article,
                'sentiment': sentiment_result
            })
        
        logger.info(f"Retrieved and analyzed {len(processed_articles)} news articles from dataset")
        
        return jsonify({
            'success': True,
            'articles': processed_articles,
            'count': len(processed_articles),
            'total_available': len(news_data),
            'parameters': {
                'limit': limit,
                'keywords': keywords
            },
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"News data retrieval error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/data/social', methods=['GET'])
@limiter.limit("15 per minute")
def get_social_media_data():
    """
    Get survey data as social media-like posts for analysis
    
    Query parameters:
    - limit: number of responses (default: 50, max: 200)
    - location: filter by location
    """
    try:
        limit = min(int(request.args.get('limit', 50)), 200)
        location = request.args.get('location', '')
        
        # Get survey responses formatted as social media posts
        survey_data = dataset_analyzer.get_survey_responses_as_posts(limit=limit, location=location)
        
        # Analyze sentiment for each response
        processed_posts = []
        for post in survey_data:
            sentiment_result = sentiment_analyzer.analyze(
                post.get('content', ''),
                source='survey',
                metadata={
                    'location': post.get('location', ''),
                    'age': post.get('age', ''),
                    'employment': post.get('employment', ''),
                    'response_id': post.get('id', '')
                }
            )
            
            processed_posts.append({
                **post,
                'sentiment': sentiment_result
            })
        
        logger.info(f"Retrieved and analyzed {len(processed_posts)} survey responses as social posts")
        
        return jsonify({
            'success': True,
            'posts': processed_posts,
            'count': len(processed_posts),
            'parameters': {
                'limit': limit,
                'location': location
            },
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Survey data retrieval error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/analytics/dashboard', methods=['GET'])
@limiter.limit("30 per minute")
def get_dashboard_analytics():
    """
    Get comprehensive analytics data for dashboard
    
    Query parameters:
    - period: 7d,30d,90d,1y (default: 30d)
    - region: all,kl,selangor,penang,etc (default: all)
    - program: all,pr1ma,rumah-selangorku,etc (default: all)
    """
    try:
        period = request.args.get('period', '30d')
        region = request.args.get('region', 'all')
        program = request.args.get('program', 'all')
        
        # Generate analytics
        analytics_data = analytics_generator.generate_dashboard_data(
            period=period,
            region=region,
            program=program
        )
        
        logger.info(f"Generated dashboard analytics for period: {period}, region: {region}")
        
        return jsonify({
            'success': True,
            'data': analytics_data,
            'parameters': {
                'period': period,
                'region': region,
                'program': program
            },
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Dashboard analytics error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/analytics/trends', methods=['GET'])
@limiter.limit("20 per minute")
def get_sentiment_trends():
    """
    Get sentiment trends over time
    
    Query parameters:
    - period: 7d,30d,90d,1y (default: 30d)
    - granularity: hour,day,week,month (default: day)
    - source: all,news,social_media,user_posts (default: all)
    """
    try:
        period = request.args.get('period', '30d')
        granularity = request.args.get('granularity', 'day')
        source = request.args.get('source', 'all')
        
        # Generate trend data
        trends = analytics_generator.generate_sentiment_trends(
            period=period,
            granularity=granularity,
            source=source
        )
        
        logger.info(f"Generated sentiment trends for period: {period}")
        
        return jsonify({
            'success': True,
            'trends': trends,
            'parameters': {
                'period': period,
                'granularity': granularity,
                'source': source
            },
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Sentiment trends error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/analytics/export', methods=['POST'])
@limiter.limit("5 per minute")
def export_analytics_data():
    """
    Export analytics data in various formats
    
    Expected payload:
    {
        "format": "csv|json|xlsx",
        "data_type": "sentiment|posts|analytics",
        "filters": {...},
        "email": "optional@email.com"
    }
    """
    try:
        data = request.get_json()
        
        format_type = data.get('format', 'json')
        data_type = data.get('data_type', 'sentiment')
        filters = data.get('filters', {})
        email = data.get('email')
        
        # Generate export
        export_result = analytics_generator.export_data(
            format_type=format_type,
            data_type=data_type,
            filters=filters,
            email=email
        )
        
        logger.info(f"Data export generated: {format_type} format for {data_type}")
        
        return jsonify({
            'success': True,
            'export': export_result,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Data export error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# =============================================================================
# DASHBOARD ANALYTICS ENDPOINTS - Survey Data Integration
# =============================================================================

@app.route('/api/dashboard/overview', methods=['GET'])
@limiter.limit("10 per minute")
def get_dashboard_overview():
    """
    Get comprehensive dashboard overview with all analytics
    
    Returns complete survey data analysis including:
    - Sentiment overview
    - Location analysis  
    - Age group analysis
    - Employment vs application analysis
    - Income vs barriers analysis
    - Time trends
    - Program-specific sentiment
    - Text analysis and word clouds
    """
    try:
        # Generate comprehensive dashboard data
        dashboard_data = dataset_analyzer.generate_comprehensive_dashboard_data()
        
        logger.info("Generated comprehensive dashboard overview")
        
        return jsonify({
            'success': True,
            'data': dashboard_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Dashboard overview error: {str(e)}")
        return jsonify({'error': f'Failed to generate dashboard overview: {str(e)}'}), 500

@app.route('/api/dashboard/sentiment-overview', methods=['GET'])
@limiter.limit("15 per minute")
def get_sentiment_overview():
    """Get sentiment distribution overview from survey data"""
    try:
        overview = dataset_analyzer.generate_sentiment_overview()
        
        return jsonify({
            'success': True,
            'data': overview,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Sentiment overview error: {str(e)}")
        return jsonify({'error': f'Failed to generate sentiment overview: {str(e)}'}), 500

@app.route('/api/dashboard/location-sentiment', methods=['GET'])
@limiter.limit("15 per minute")
def get_location_sentiment():
    """Get sentiment analysis by location/state"""
    try:
        location_data = dataset_analyzer.generate_location_sentiment_analysis()
        
        return jsonify({
            'success': True,
            'data': location_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Location sentiment error: {str(e)}")
        return jsonify({'error': f'Failed to generate location sentiment analysis: {str(e)}'}), 500

@app.route('/api/dashboard/age-sentiment', methods=['GET'])
@limiter.limit("15 per minute")
def get_age_sentiment():
    """Get sentiment analysis by age group"""
    try:
        age_data = dataset_analyzer.generate_age_sentiment_analysis()
        
        return jsonify({
            'success': True,
            'data': age_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Age sentiment error: {str(e)}")
        return jsonify({'error': f'Failed to generate age sentiment analysis: {str(e)}'}), 500

@app.route('/api/dashboard/employment-application', methods=['GET'])
@limiter.limit("15 per minute")
def get_employment_application():
    """Get analysis of employment status vs application behavior"""
    try:
        employment_data = dataset_analyzer.generate_employment_application_analysis()
        
        return jsonify({
            'success': True,
            'data': employment_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Employment application error: {str(e)}")
        return jsonify({'error': f'Failed to generate employment application analysis: {str(e)}'}), 500

@app.route('/api/dashboard/income-barriers', methods=['GET'])
@limiter.limit("15 per minute")
def get_income_barriers():
    """Get analysis of income vs perceived barriers"""
    try:
        barriers_data = dataset_analyzer.generate_income_barriers_analysis()
        
        return jsonify({
            'success': True,
            'data': barriers_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Income barriers error: {str(e)}")
        return jsonify({'error': f'Failed to generate income barriers analysis: {str(e)}'}), 500

@app.route('/api/dashboard/awareness-sentiment', methods=['GET'])
@limiter.limit("15 per minute")
def get_awareness_sentiment():
    """Get analysis of policy awareness vs sentiment"""
    try:
        awareness_data = dataset_analyzer.generate_awareness_sentiment_analysis()
        
        return jsonify({
            'success': True,
            'data': awareness_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Awareness sentiment error: {str(e)}")
        return jsonify({'error': f'Failed to generate awareness sentiment analysis: {str(e)}'}), 500

@app.route('/api/dashboard/information-sources', methods=['GET'])
@limiter.limit("15 per minute")
def get_information_sources():
    """Get analysis of information sources preferences"""
    try:
        sources_data = dataset_analyzer.generate_information_sources_analysis()
        
        return jsonify({
            'success': True,
            'data': sources_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Information sources error: {str(e)}")
        return jsonify({'error': f'Failed to generate information sources analysis: {str(e)}'}), 500

@app.route('/api/dashboard/time-trends', methods=['GET'])
@limiter.limit("15 per minute")
def get_time_trends():
    """Get sentiment trends over survey time period"""
    try:
        trends_data = dataset_analyzer.generate_time_trend_analysis()
        
        return jsonify({
            'success': True,
            'data': trends_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Time trends error: {str(e)}")
        return jsonify({'error': f'Failed to generate time trends analysis: {str(e)}'}), 500

@app.route('/api/dashboard/program-sentiment', methods=['GET'])
@limiter.limit("15 per minute")
def get_program_sentiment():
    """Get sentiment analysis for specific housing programs"""
    try:
        program_data = dataset_analyzer.generate_program_specific_sentiment()
        
        return jsonify({
            'success': True,
            'data': program_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Program sentiment error: {str(e)}")
        return jsonify({'error': f'Failed to generate program sentiment analysis: {str(e)}'}), 500

@app.route('/api/dashboard/text-analysis', methods=['GET'])
@limiter.limit("15 per minute")
def get_text_analysis():
    """Get text analysis including word frequency, complaints, and improvements"""
    try:
        text_data = dataset_analyzer.generate_text_analysis()
        
        return jsonify({
            'success': True,
            'data': text_data,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Text analysis error: {str(e)}")
        return jsonify({'error': f'Failed to generate text analysis: {str(e)}'}), 500

@app.route('/api/dashboard/cross-tabulation', methods=['GET'])
@limiter.limit("15 per minute")
def get_cross_tabulation():
    """
    Get cross-tabulation analysis
    
    Query parameters:
    - type: location_sentiment, age_sentiment, employment_application (default: all)
    """
    try:
        analysis_type = request.args.get('type', 'all')
        
        if analysis_type == 'location_sentiment':
            data = dataset_analyzer.generate_location_sentiment_analysis()
        elif analysis_type == 'age_sentiment':
            data = dataset_analyzer.generate_age_sentiment_analysis()
        elif analysis_type == 'employment_application':
            data = dataset_analyzer.generate_employment_application_analysis()
        else:
            # Return all cross-tabulations
            data = {
                'location_sentiment': dataset_analyzer.generate_location_sentiment_analysis(),
                'age_sentiment': dataset_analyzer.generate_age_sentiment_analysis(),
                'employment_application': dataset_analyzer.generate_employment_application_analysis()
            }
        
        return jsonify({
            'success': True,
            'data': data,
            'type': analysis_type,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Cross-tabulation error: {str(e)}")
        return jsonify({'error': f'Failed to generate cross-tabulation analysis: {str(e)}'}), 500

@app.route('/api/dashboard/dataset-info', methods=['GET'])
@limiter.limit("20 per minute")
def get_dataset_info():
    """Get information about the survey dataset"""
    try:
        info = {
            'total_responses': len(dataset_analyzer.df),
            'survey_period': {
                'start': dataset_analyzer.df['Timestamp'].min().isoformat(),
                'end': dataset_analyzer.df['Timestamp'].max().isoformat()
            },
            'columns': list(dataset_analyzer.df.columns),
            'unique_locations': dataset_analyzer.df['location'].nunique() if 'location' in dataset_analyzer.df.columns else 0,
            'unique_age_groups': dataset_analyzer.df['age_group'].nunique() if 'age_group' in dataset_analyzer.df.columns else 0,
            'response_distribution': {
                'by_location': dataset_analyzer.df['location'].value_counts().to_dict() if 'location' in dataset_analyzer.df.columns else {},
                'by_age_group': dataset_analyzer.df['age_group'].value_counts().to_dict() if 'age_group' in dataset_analyzer.df.columns else {},
                'by_employment': dataset_analyzer.df['employment'].value_counts().to_dict() if 'employment' in dataset_analyzer.df.columns else {}
            }
        }
        
        return jsonify({
            'success': True,
            'data': info,
            'generated_at': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Dataset info error: {str(e)}")
        return jsonify({'error': f'Failed to get dataset information: {str(e)}'}), 500

# =============================================================================
# END DASHBOARD ANALYTICS ENDPOINTS
# =============================================================================

@app.route('/api/analytics/wordcloud', methods=['GET'])
@limiter.limit("30 per minute")
def get_wordcloud_data():
    """
    Generate word cloud data from sentiment analysis text
    Returns word frequency data for frontend word cloud generation
    """
    try:
        # Get parameters
        data_type = request.args.get('type', 'all')  # 'all', 'positive', 'negative', 'news', 'social'
        limit = int(request.args.get('limit', 100))
        sentiment_filter = request.args.get('sentiment')
        
        # Get text data based on type
        texts = []
        
        if data_type in ['all', 'news']:
            # Get news data from JSON file
            try:
                import json
                import os
                news_file_path = os.path.join(os.path.dirname(__file__), 'dataset', 'news.json')
                if os.path.exists(news_file_path):
                    with open(news_file_path, 'r', encoding='utf-8') as f:
                        news_articles = json.load(f)
                    
                    # Limit the number of articles processed
                    news_articles = news_articles[:limit] if limit < len(news_articles) else news_articles
                    
                    for article in news_articles:
                        # Combine title and content for text analysis
                        article_text = (article.get('title', '') + ' ' + article.get('content', '')).strip()
                        if article_text:
                            # For news data, we don't have pre-computed sentiment, so add all texts
                            # The sentiment filtering will be handled by the word cloud generation
                            texts.append(article_text)
            except Exception as e:
                logger.warning(f"Could not load news data: {e}")
        
        if data_type in ['all', 'social']:
            # Get social data (from survey responses or community posts)
            try:
                # Try to get CSV data
                df = dataset_analyzer.df
                if df is not None:
                    # Filter by sentiment if specified
                    if sentiment_filter:
                        # Map sentiment filter to the column values
                        if sentiment_filter == 'positive':
                            df_filtered = df[df['sentiment_score'] > 0.1]
                        elif sentiment_filter == 'negative':
                            df_filtered = df[df['sentiment_score'] < -0.1]
                        else:
                            df_filtered = df[(df['sentiment_score'] >= -0.1) & (df['sentiment_score'] <= 0.1)]
                    else:
                        df_filtered = df
                    
                    # Get text from relevant columns that contain responses
                    text_columns = [
                        'What challenges have you faced (or expect to face) when trying to access affordable housing? (Select all that apply)',
                        'In your opinion, what is the biggest weakness in Malaysia\'s current affordable housing policies?',
                        'What improvements would you like to see in future housing policies?'
                    ]
                    for col in text_columns:
                        if col in df_filtered.columns:
                            # Get non-null, non-empty responses
                            responses = df_filtered[col].dropna()
                            responses = responses[responses != '']  # Remove empty strings
                            texts.extend(responses.tolist())
            except Exception as e:
                logger.warning(f"Could not load dataset for wordcloud: {e}")
        
        # Process texts for word cloud
        word_freq = sentiment_analyzer.generate_wordcloud_data(texts, max_words=limit)
        
        return jsonify({
            'success': True,
            'data': {
                'words': word_freq,
                'total_texts': len(texts),
                'type': data_type,
                'sentiment_filter': sentiment_filter
            }
        })
        
    except Exception as e:
        logger.error(f"Word cloud generation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate word cloud data'
        }), 500

# =============================================================================
# STATIC FILE SERVING
# =============================================================================

@app.route('/')
def serve_index():
    """Serve the main index.html file"""
    return send_from_directory('..', 'index.html')

@app.route('/<path:filename>')
def serve_static_files(filename):
    """Serve static files from the parent directory"""
    # Security check - prevent directory traversal
    if '..' in filename or filename.startswith('/'):
        return jsonify({'error': 'Invalid file path'}), 400
    
    try:
        return send_from_directory('..', filename)
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404

# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Rate limit exceeded', 'retry_after': str(e.retry_after)}), 429

if __name__ == '__main__':
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Initialize database
    db_manager.initialize()
    
    # Start the application
    # port = int(os.getenv('PORT', 5001))  # Changed from 5000 to 5001 to avoid macOS AirPlay conflict
    port = 5001
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting HomeWatch API server on port {port}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )

