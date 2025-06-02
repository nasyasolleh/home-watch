"""
Analytics Generator for HomeWatch

Generates comprehensive analytics and insights from sentiment data:
- Dashboard analytics
- Trend analysis
- Regional comparisons
- Program effectiveness
- Predictive insights
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from collections import defaultdict, Counter
import json
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class AnalyticsConfig:
    """Configuration for analytics generation"""
    sentiment_threshold_positive: float = 0.1
    sentiment_threshold_negative: float = -0.1
    trend_window_days: int = 7
    min_data_points: int = 10

class AnalyticsGenerator:
    """
    Generates analytics and insights from sentiment and engagement data
    """
    
    def __init__(self):
        self.config = AnalyticsConfig()
        
        # Malaysian housing programs
        self.housing_programs = {
            'pr1ma': 'PR1MA',
            'rumah-selangorku': 'Rumah Selangorku',
            'my-first-home': 'My First Home',
            'pprt': 'PPRT',
            'ppr': 'PPR',
            'rumawip': 'RUMAWIP',
            'rent-to-own': 'Rent-to-Own',
            'social-housing': 'Social Housing'
        }
        
        # Malaysian regions
        self.regions = {
            'kuala_lumpur': 'Kuala Lumpur',
            'selangor': 'Selangor',
            'penang': 'Penang',
            'johor': 'Johor',
            'perak': 'Perak',
            'sabah': 'Sabah',
            'sarawak': 'Sarawak',
            'kedah': 'Kedah',
            'kelantan': 'Kelantan',
            'terengganu': 'Terengganu',
            'pahang': 'Pahang',
            'negeri_sembilan': 'Negeri Sembilan',
            'melaka': 'Melaka',
            'perlis': 'Perlis'
        }
        
        logger.info("AnalyticsGenerator initialized")
    
    def generate_dashboard_data(self, period: str = '30d', region: str = 'all', program: str = 'all') -> Dict:
        """
        Generate comprehensive dashboard analytics
        
        Args:
            period: Time period (7d, 30d, 90d, 1y)
            region: Geographic region filter
            program: Housing program filter
            
        Returns:
            Dictionary containing dashboard analytics
        """
        try:
            # Convert period to days
            days = self._parse_period(period)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get sample data for demo (replace with actual database queries)
            data = self._get_sample_sentiment_data(start_date, end_date, region, program)
            
            # Generate analytics
            analytics = {
                'overview': self._generate_overview_metrics(data),
                'sentiment_distribution': self._generate_sentiment_distribution(data),
                'trend_analysis': self._generate_trend_analysis(data, days),
                'program_comparison': self._generate_program_comparison(data),
                'regional_analysis': self._generate_regional_analysis(data),
                'engagement_metrics': self._generate_engagement_metrics(data),
                'keyword_analysis': self._generate_keyword_analysis(data),
                'alerts': self._generate_alerts(data),
                'metadata': {
                    'period': period,
                    'region': region,
                    'program': program,
                    'data_points': len(data),
                    'generated_at': datetime.now().isoformat(),
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                }
            }
            
            logger.info(f"Dashboard analytics generated for period: {period}")
            return analytics
            
        except Exception as e:
            logger.error(f"Error generating dashboard analytics: {str(e)}")
            raise
    
    def generate_sentiment_trends(self, period: str = '30d', granularity: str = 'day', source: str = 'all') -> Dict:
        """
        Generate sentiment trend analysis
        
        Args:
            period: Time period to analyze
            granularity: Data granularity (hour, day, week, month)
            source: Data source filter
            
        Returns:
            Dictionary containing trend data
        """
        try:
            days = self._parse_period(period)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get sample data
            data = self._get_sample_sentiment_data(start_date, end_date, source=source)
            
            # Generate trend data based on granularity
            trends = self._calculate_trends(data, granularity, start_date, end_date)
            
            result = {
                'trends': trends,
                'statistics': self._calculate_trend_statistics(trends),
                'insights': self._generate_trend_insights(trends),
                'metadata': {
                    'period': period,
                    'granularity': granularity,
                    'source': source,
                    'data_points': len(data),
                    'generated_at': datetime.now().isoformat()
                }
            }
            
            logger.info(f"Sentiment trends generated for {period} with {granularity} granularity")
            return result
            
        except Exception as e:
            logger.error(f"Error generating sentiment trends: {str(e)}")
            raise
    
    def export_data(self, format_type: str = 'json', data_type: str = 'sentiment', 
                   filters: Dict = None, email: Optional[str] = None) -> Dict:
        """
        Export analytics data in various formats
        
        Args:
            format_type: Export format (json, csv, xlsx)
            data_type: Type of data to export
            filters: Data filters to apply
            email: Optional email for delivery
            
        Returns:
            Dictionary containing export information
        """
        try:
            if filters is None:
                filters = {}
            
            # Get data based on type and filters
            data = self._get_export_data(data_type, filters)
            
            # Generate export file
            export_info = self._create_export_file(data, format_type, data_type)
            
            # Send email if requested
            if email:
                self._send_export_email(email, export_info)
            
            logger.info(f"Data export created: {format_type} format for {data_type}")
            return export_info
            
        except Exception as e:
            logger.error(f"Error exporting data: {str(e)}")
            raise
    
    def _parse_period(self, period: str) -> int:
        """Convert period string to days"""
        period_map = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        }
        return period_map.get(period, 30)
    
    def _get_sample_sentiment_data(self, start_date: datetime, end_date: datetime, 
                                 region: str = 'all', program: str = 'all', source: str = 'all') -> List[Dict]:
        """
        Get sample sentiment data for demo purposes
        In production, this would query the actual database
        """
        sample_data = []
        
        # Generate sample data points
        current_date = start_date
        while current_date <= end_date:
            # Generate random sentiment data for demo
            for i in range(np.random.randint(5, 20)):
                sentiment_score = np.random.normal(0, 0.3)  # Normal distribution around 0
                
                # Bias certain programs/regions for more realistic data
                if program == 'pr1ma' or 'pr1ma' in str(program):
                    sentiment_score += 0.1  # Slightly more positive
                
                data_point = {
                    'id': f"sample_{current_date.strftime('%Y%m%d')}_{i}",
                    'text': self._generate_sample_text(sentiment_score),
                    'sentiment_label': 'positive' if sentiment_score > 0.05 else 'negative' if sentiment_score < -0.05 else 'neutral',
                    'confidence': min(abs(sentiment_score) + 0.5, 1.0),
                    'scores': {
                        'compound': sentiment_score,
                        'positive': max(0, sentiment_score),
                        'negative': max(0, -sentiment_score),
                        'neutral': 1 - abs(sentiment_score)
                    },
                    'source': np.random.choice(['user_post', 'news', 'social_media']),
                    'region_mentioned': np.random.choice(list(self.regions.keys()) + [None, None, None]),
                    'program_mentioned': np.random.choice(list(self.housing_programs.keys()) + [None, None]),
                    'keywords': self._generate_sample_keywords(),
                    'housing_relevance': np.random.uniform(0.3, 1.0),
                    'analyzed_at': current_date.isoformat(),
                    'engagement': {
                        'likes': np.random.randint(0, 100),
                        'shares': np.random.randint(0, 50),
                        'comments': np.random.randint(0, 30)
                    }
                }
                
                sample_data.append(data_point)
            
            current_date += timedelta(hours=6)  # Add data every 6 hours
        
        return sample_data
    
    def _generate_sample_text(self, sentiment_score: float) -> str:
        """Generate sample text based on sentiment score"""
        if sentiment_score > 0.1:
            texts = [
                "PR1MA application approved! Very happy with the process.",
                "Great service from the housing department, highly recommended.",
                "Finally got my affordable home, thanks to the government scheme.",
                "Smooth application process and helpful staff.",
                "Excellent housing program, hope it continues."
            ]
        elif sentiment_score < -0.1:
            texts = [
                "Application rejected again, very frustrated with the system.",
                "Housing prices are still too high even with subsidies.",
                "Slow approval process, been waiting for months.",
                "Disappointed with the lack of transparency in selection.",
                "Need more affordable housing options in urban areas."
            ]
        else:
            texts = [
                "Applied for housing scheme, waiting for response.",
                "Attending briefing session about affordable housing.",
                "Checking eligibility requirements for PR1MA.",
                "Housing development announced in our area.",
                "Government reviewing housing policies."
            ]
        
        return np.random.choice(texts)
    
    def _generate_sample_keywords(self) -> List[str]:
        """Generate sample keywords"""
        keyword_pool = [
            'housing', 'affordable', 'pr1ma', 'application', 'approved', 'rejected',
            'expensive', 'cheap', 'loan', 'mortgage', 'subsidy', 'government',
            'development', 'project', 'selangor', 'kuala lumpur', 'penang'
        ]
        return list(np.random.choice(keyword_pool, size=np.random.randint(2, 6), replace=False))
    
    def _generate_overview_metrics(self, data: List[Dict]) -> Dict:
        """Generate overview metrics"""
        if not data:
            return {'total_posts': 0, 'avg_sentiment': 0, 'positive_ratio': 0, 'negative_ratio': 0}
        
        sentiments = [item['scores']['compound'] for item in data]
        positive_count = sum(1 for s in sentiments if s > self.config.sentiment_threshold_positive)
        negative_count = sum(1 for s in sentiments if s < self.config.sentiment_threshold_negative)
        
        return {
            'total_posts': len(data),
            'avg_sentiment': np.mean(sentiments),
            'positive_ratio': positive_count / len(data),
            'negative_ratio': negative_count / len(data),
            'neutral_ratio': (len(data) - positive_count - negative_count) / len(data),
            'engagement_rate': np.mean([
                item['engagement']['likes'] + item['engagement']['shares'] + item['engagement']['comments']
                for item in data if 'engagement' in item
            ]) if data else 0
        }
    
    def _generate_sentiment_distribution(self, data: List[Dict]) -> Dict:
        """Generate sentiment distribution analysis"""
        distribution = Counter([item['sentiment_label'] for item in data])
        
        return {
            'by_label': dict(distribution),
            'by_score_range': self._calculate_score_ranges(data),
            'confidence_distribution': self._calculate_confidence_distribution(data)
        }
    
    def _calculate_score_ranges(self, data: List[Dict]) -> Dict:
        """Calculate sentiment score ranges"""
        ranges = {
            'very_positive': 0,    # > 0.5
            'positive': 0,         # 0.1 to 0.5
            'neutral': 0,          # -0.1 to 0.1
            'negative': 0,         # -0.5 to -0.1
            'very_negative': 0     # < -0.5
        }
        
        for item in data:
            score = item['scores']['compound']
            if score > 0.5:
                ranges['very_positive'] += 1
            elif score > 0.1:
                ranges['positive'] += 1
            elif score > -0.1:
                ranges['neutral'] += 1
            elif score > -0.5:
                ranges['negative'] += 1
            else:
                ranges['very_negative'] += 1
        
        return ranges
    
    def _calculate_confidence_distribution(self, data: List[Dict]) -> Dict:
        """Calculate confidence score distribution"""
        confidences = [item['confidence'] for item in data]
        
        return {
            'avg_confidence': np.mean(confidences) if confidences else 0,
            'high_confidence': sum(1 for c in confidences if c > 0.8),
            'medium_confidence': sum(1 for c in confidences if 0.5 <= c <= 0.8),
            'low_confidence': sum(1 for c in confidences if c < 0.5)
        }
    
    def _generate_trend_analysis(self, data: List[Dict], days: int) -> Dict:
        """Generate trend analysis"""
        # Group data by day
        daily_sentiment = defaultdict(list)
        
        for item in data:
            date = datetime.fromisoformat(item['analyzed_at']).date()
            daily_sentiment[date].append(item['scores']['compound'])
        
        # Calculate daily averages
        daily_averages = []
        for date in sorted(daily_sentiment.keys()):
            avg_sentiment = np.mean(daily_sentiment[date])
            daily_averages.append({
                'date': date.isoformat(),
                'sentiment': avg_sentiment,
                'count': len(daily_sentiment[date])
            })
        
        # Calculate trend direction
        if len(daily_averages) >= 2:
            recent_avg = np.mean([day['sentiment'] for day in daily_averages[-3:]])
            earlier_avg = np.mean([day['sentiment'] for day in daily_averages[:3]])
            trend_direction = 'improving' if recent_avg > earlier_avg else 'declining' if recent_avg < earlier_avg else 'stable'
        else:
            trend_direction = 'insufficient_data'
        
        return {
            'daily_averages': daily_averages,
            'trend_direction': trend_direction,
            'volatility': np.std([day['sentiment'] for day in daily_averages]) if daily_averages else 0,
            'peak_sentiment': max([day['sentiment'] for day in daily_averages]) if daily_averages else 0,
            'lowest_sentiment': min([day['sentiment'] for day in daily_averages]) if daily_averages else 0
        }
    
    def _generate_program_comparison(self, data: List[Dict]) -> Dict:
        """Generate housing program comparison"""
        program_data = defaultdict(list)
        
        for item in data:
            program = item.get('program_mentioned')
            if program:
                program_data[program].append(item['scores']['compound'])
        
        comparison = {}
        for program, sentiments in program_data.items():
            if len(sentiments) >= self.config.min_data_points:
                comparison[program] = {
                    'avg_sentiment': np.mean(sentiments),
                    'count': len(sentiments),
                    'positive_ratio': sum(1 for s in sentiments if s > 0.1) / len(sentiments),
                    'program_name': self.housing_programs.get(program, program)
                }
        
        return comparison
    
    def _generate_regional_analysis(self, data: List[Dict]) -> Dict:
        """Generate regional sentiment analysis"""
        regional_data = defaultdict(list)
        
        for item in data:
            region = item.get('region_mentioned')
            if region:
                regional_data[region].append(item['scores']['compound'])
        
        analysis = {}
        for region, sentiments in regional_data.items():
            if len(sentiments) >= self.config.min_data_points:
                analysis[region] = {
                    'avg_sentiment': np.mean(sentiments),
                    'count': len(sentiments),
                    'region_name': self.regions.get(region, region),
                    'sentiment_category': self._categorize_sentiment(np.mean(sentiments))
                }
        
        return analysis
    
    def _generate_engagement_metrics(self, data: List[Dict]) -> Dict:
        """Generate engagement metrics"""
        engagement_data = [item['engagement'] for item in data if 'engagement' in item]
        
        if not engagement_data:
            return {'total_engagement': 0, 'avg_likes': 0, 'avg_shares': 0, 'avg_comments': 0}
        
        total_likes = sum(e['likes'] for e in engagement_data)
        total_shares = sum(e['shares'] for e in engagement_data)
        total_comments = sum(e['comments'] for e in engagement_data)
        
        return {
            'total_engagement': total_likes + total_shares + total_comments,
            'avg_likes': total_likes / len(engagement_data),
            'avg_shares': total_shares / len(engagement_data),
            'avg_comments': total_comments / len(engagement_data),
            'engagement_by_sentiment': self._calculate_engagement_by_sentiment(data)
        }
    
    def _calculate_engagement_by_sentiment(self, data: List[Dict]) -> Dict:
        """Calculate engagement metrics by sentiment"""
        positive_engagement = []
        negative_engagement = []
        
        for item in data:
            if 'engagement' in item:
                total_eng = sum(item['engagement'].values())
                if item['scores']['compound'] > 0.1:
                    positive_engagement.append(total_eng)
                elif item['scores']['compound'] < -0.1:
                    negative_engagement.append(total_eng)
        
        return {
            'positive_avg_engagement': np.mean(positive_engagement) if positive_engagement else 0,
            'negative_avg_engagement': np.mean(negative_engagement) if negative_engagement else 0
        }
    
    def _generate_keyword_analysis(self, data: List[Dict]) -> Dict:
        """Generate keyword frequency analysis"""
        all_keywords = []
        for item in data:
            all_keywords.extend(item.get('keywords', []))
        
        keyword_counts = Counter(all_keywords)
        
        return {
            'top_keywords': dict(keyword_counts.most_common(20)),
            'total_unique_keywords': len(keyword_counts),
            'keyword_sentiment_mapping': self._map_keywords_to_sentiment(data)
        }
    
    def _map_keywords_to_sentiment(self, data: List[Dict]) -> Dict:
        """Map keywords to their associated sentiment"""
        keyword_sentiments = defaultdict(list)
        
        for item in data:
            sentiment = item['scores']['compound']
            for keyword in item.get('keywords', []):
                keyword_sentiments[keyword].append(sentiment)
        
        # Calculate average sentiment for each keyword
        keyword_mapping = {}
        for keyword, sentiments in keyword_sentiments.items():
            if len(sentiments) >= 3:  # Minimum occurrences
                keyword_mapping[keyword] = {
                    'avg_sentiment': np.mean(sentiments),
                    'count': len(sentiments)
                }
        
        return keyword_mapping
    
    def _generate_alerts(self, data: List[Dict]) -> List[Dict]:
        """Generate alerts based on data analysis"""
        alerts = []
        
        # Check for sudden negative sentiment spike
        recent_data = [item for item in data 
                      if datetime.fromisoformat(item['analyzed_at']) > datetime.now() - timedelta(days=1)]
        
        if recent_data:
            recent_sentiment = np.mean([item['scores']['compound'] for item in recent_data])
            if recent_sentiment < -0.3:
                alerts.append({
                    'type': 'negative_sentiment_spike',
                    'severity': 'high',
                    'message': 'Significant increase in negative sentiment detected in the last 24 hours',
                    'value': recent_sentiment,
                    'timestamp': datetime.now().isoformat()
                })
        
        # Check for low data volume
        if len(data) < self.config.min_data_points:
            alerts.append({
                'type': 'low_data_volume',
                'severity': 'medium',
                'message': f'Data volume is below recommended threshold ({len(data)} vs {self.config.min_data_points})',
                'value': len(data),
                'timestamp': datetime.now().isoformat()
            })
        
        return alerts
    
    def _categorize_sentiment(self, sentiment: float) -> str:
        """Categorize sentiment score"""
        if sentiment > 0.1:
            return 'positive'
        elif sentiment < -0.1:
            return 'negative'
        else:
            return 'neutral'
    
    def _calculate_trends(self, data: List[Dict], granularity: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Calculate trends based on granularity"""
        # This is a simplified implementation
        # In production, you'd want more sophisticated time series analysis
        
        trends = []
        current = start_date
        
        if granularity == 'day':
            delta = timedelta(days=1)
        elif granularity == 'hour':
            delta = timedelta(hours=1)
        elif granularity == 'week':
            delta = timedelta(weeks=1)
        else:  # month
            delta = timedelta(days=30)
        
        while current <= end_date:
            period_data = [
                item for item in data
                if start <= datetime.fromisoformat(item['analyzed_at']) < current + delta
            ]
            
            if period_data:
                avg_sentiment = np.mean([item['scores']['compound'] for item in period_data])
                trends.append({
                    'timestamp': current.isoformat(),
                    'sentiment': avg_sentiment,
                    'count': len(period_data)
                })
            
            current += delta
        
        return trends
    
    def _calculate_trend_statistics(self, trends: List[Dict]) -> Dict:
        """Calculate statistical measures for trends"""
        if not trends:
            return {}
        
        sentiments = [trend['sentiment'] for trend in trends]
        
        return {
            'mean': np.mean(sentiments),
            'std': np.std(sentiments),
            'min': np.min(sentiments),
            'max': np.max(sentiments),
            'trend_slope': self._calculate_slope(sentiments)
        }
    
    def _calculate_slope(self, values: List[float]) -> float:
        """Calculate trend slope using linear regression"""
        if len(values) < 2:
            return 0
        
        x = np.arange(len(values))
        return np.polyfit(x, values, 1)[0]
    
    def _generate_trend_insights(self, trends: List[Dict]) -> List[str]:
        """Generate insights from trend data"""
        insights = []
        
        if not trends:
            return ["Insufficient data for trend analysis"]
        
        sentiments = [trend['sentiment'] for trend in trends]
        slope = self._calculate_slope(sentiments)
        
        if slope > 0.01:
            insights.append("Sentiment is showing an improving trend")
        elif slope < -0.01:
            insights.append("Sentiment is showing a declining trend")
        else:
            insights.append("Sentiment remains relatively stable")
        
        if np.std(sentiments) > 0.2:
            insights.append("High volatility detected in sentiment")
        
        return insights
    
    def _get_export_data(self, data_type: str, filters: Dict) -> List[Dict]:
        """Get data for export based on type and filters"""
        # This would query the actual database in production
        # For now, return sample data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        return self._get_sample_sentiment_data(start_date, end_date)
    
    def _create_export_file(self, data: List[Dict], format_type: str, data_type: str) -> Dict:
        """Create export file in specified format"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"homewatch_{data_type}_{timestamp}.{format_type}"
        
        # In production, this would create actual files
        export_info = {
            'filename': filename,
            'format': format_type,
            'data_type': data_type,
            'record_count': len(data),
            'file_size': len(str(data)),  # Approximate
            'created_at': datetime.now().isoformat(),
            'download_url': f"/exports/{filename}",  # Would be actual download URL
            'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        return export_info
    
    def _send_export_email(self, email: str, export_info: Dict):
        """Send export file via email"""
        # This would integrate with actual email service
        logger.info(f"Export email would be sent to {email} with file {export_info['filename']}")
        
        # For demo, just log the action
        pass
