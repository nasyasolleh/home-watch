#!/usr/bin/env python3
"""
HomeWatch Dataset Analyzer
Processes and analyzes survey data for comprehensive dashboard insights

Features:
- Cross-tabulation analysis (Location & Sentiment, Age & Sentiment, etc.)
- Section-wise analysis
- Sentiment classification and scoring
- Word clouds and text analysis
- Time series analysis
- Program-specific sentiment analysis
"""

import pandas as pd
import numpy as np
import json
import re
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import Dict, List, Any, Tuple
import logging
from textblob import TextBlob
from wordcloud import WordCloud
import base64
from io import BytesIO
import matplotlib.pyplot as plt
import seaborn as sns

logger = logging.getLogger(__name__)

class DatasetAnalyzer:
    """Analyzes HomeWatch survey dataset for comprehensive insights"""
    
    def __init__(self, csv_path: str = None):
        self.csv_path = csv_path or 'dataset/HomeWatch Sentiment Survey: Affordable Housing in Malaysia.csv'
        self.df = None
        self.processed_data = {}
        
        # Load and preprocess data
        self.load_data()
        self.preprocess_data()
        
        logger.info("DatasetAnalyzer initialized successfully")
    
    def load_data(self):
        """Load CSV data into pandas DataFrame"""
        try:
            self.df = pd.read_csv(self.csv_path)
            logger.info(f"Loaded {len(self.df)} survey responses")
            
            # Print column names for debugging
            logger.info(f"Columns: {list(self.df.columns)}")
            
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            raise
    
    def preprocess_data(self):
        """Clean and preprocess the survey data"""
        if self.df is None:
            return
        
        try:
            # Clean column names
            self.df.columns = [col.strip() for col in self.df.columns]
            
            # Convert timestamp to datetime
            self.df['Timestamp'] = pd.to_datetime(self.df['Timestamp'])
            
            # Create simplified column names for easier access
            self.column_mapping = {}
            
            # Map actual columns to simplified names
            for col in self.df.columns:
                if 'Age' in col:
                    self.column_mapping[col] = 'age_group'
                elif 'Employment' in col:
                    self.column_mapping[col] = 'employment'
                elif 'Income' in col:
                    self.column_mapping[col] = 'income'
                elif 'Housing' in col and 'Situation' in col:
                    self.column_mapping[col] = 'housing_situation'
                elif 'Location' in col or 'State' in col:
                    self.column_mapping[col] = 'location'
                elif 'familiar' in col.lower():
                    self.column_mapping[col] = 'familiarity'
                elif 'information' in col.lower():
                    self.column_mapping[col] = 'info_sources'
                elif 'applied' in col.lower():
                    self.column_mapping[col] = 'has_applied'
                elif 'experience' in col.lower() and 'rate' in col.lower():
                    self.column_mapping[col] = 'experience_rating'
                elif 'challenges' in col.lower() or 'faced' in col.lower():
                    self.column_mapping[col] = 'challenges'
                elif 'sentiment' in col.lower():
                    self.column_mapping[col] = 'sentiment_score'
                elif 'weakness' in col.lower():
                    self.column_mapping[col] = 'biggest_weakness'
                elif 'improvements' in col.lower():
                    self.column_mapping[col] = 'improvements'
                elif 'community' in col.lower() and 'participating' in col.lower():
                    self.column_mapping[col] = 'community_participation'
            
            # Create simplified DataFrame
            for original, simplified in self.column_mapping.items():
                if original in self.df.columns:
                    self.df[simplified] = self.df[original]
            
            # Convert sentiment scores to numeric
            self.df['sentiment_numeric'] = pd.to_numeric(self.df['sentiment_score'], errors='coerce')
            
            # Create sentiment categories
            self.df['sentiment_category'] = self.df['sentiment_numeric'].apply(self._categorize_sentiment)
            
            # Process challenges (multi-select field)
            self.df['challenges_list'] = self.df['challenges'].apply(self._parse_challenges)
            
            # Extract month and year from timestamp
            self.df['survey_month'] = self.df['Timestamp'].dt.month
            self.df['survey_year'] = self.df['Timestamp'].dt.year
            
            logger.info("Data preprocessing completed")
            
        except Exception as e:
            logger.error(f"Error preprocessing data: {str(e)}")
            raise
    
    def _categorize_sentiment(self, score):
        """Convert numeric sentiment score to category"""
        if pd.isna(score):
            return 'Unknown'
        elif score <= 2:
            return 'Negative'
        elif score == 3:
            return 'Neutral'
        else:
            return 'Positive'
    
    def _parse_challenges(self, challenges_str):
        """Parse the challenges field (semicolon-separated)"""
        if pd.isna(challenges_str) or challenges_str == '':
            return []
        return [challenge.strip() for challenge in challenges_str.split(';')]
    
    def generate_sentiment_overview(self) -> Dict[str, Any]:
        """Generate sentiment overview with pie chart data"""
        try:
            sentiment_counts = self.df['sentiment_category'].value_counts()
            
            overview = {
                'total_responses': len(self.df),
                'sentiment_distribution': {
                    'labels': sentiment_counts.index.tolist(),
                    'values': sentiment_counts.values.tolist(),
                    'percentages': (sentiment_counts / len(self.df) * 100).round(1).tolist()
                },
                'average_sentiment_score': float(self.df['sentiment_numeric'].mean()),
                'sentiment_breakdown': {
                    'positive': int(sentiment_counts.get('Positive', 0)),
                    'neutral': int(sentiment_counts.get('Neutral', 0)),
                    'negative': int(sentiment_counts.get('Negative', 0)),
                    'unknown': int(sentiment_counts.get('Unknown', 0))
                }
            }
            
            return overview
            
        except Exception as e:
            logger.error(f"Error generating sentiment overview: {str(e)}")
            return {}
    
    def generate_location_sentiment_analysis(self) -> Dict[str, Any]:
        """Analyze sentiment by location"""
        try:
            location_sentiment = pd.crosstab(
                self.df['location'], 
                self.df['sentiment_category'], 
                normalize='index'
            ) * 100
            
            location_data = {
                'chart_data': {
                    'labels': location_sentiment.index.tolist(),
                    'datasets': []
                },
                'summary': {}
            }
            
            # Prepare chart datasets
            for sentiment in ['Positive', 'Neutral', 'Negative']:
                if sentiment in location_sentiment.columns:
                    location_data['chart_data']['datasets'].append({
                        'label': sentiment,
                        'data': location_sentiment[sentiment].round(1).tolist(),
                        'backgroundColor': self._get_sentiment_color(sentiment)
                    })
            
            # Summary statistics
            for location in location_sentiment.index:
                location_data['summary'][location] = {
                    'total_responses': int(self.df[self.df['location'] == location].shape[0]),
                    'avg_sentiment_score': float(self.df[self.df['location'] == location]['sentiment_numeric'].mean()),
                    'dominant_sentiment': location_sentiment.loc[location].idxmax()
                }
            
            return location_data
            
        except Exception as e:
            logger.error(f"Error generating location sentiment analysis: {str(e)}")
            return {}
    
    def generate_age_sentiment_analysis(self) -> Dict[str, Any]:
        """Analyze sentiment by age group"""
        try:
            age_sentiment = pd.crosstab(
                self.df['age_group'], 
                self.df['sentiment_category'], 
                normalize='index'
            ) * 100
            
            age_data = {
                'chart_data': {
                    'labels': age_sentiment.index.tolist(),
                    'datasets': []
                },
                'summary': {}
            }
            
            # Prepare chart datasets
            for sentiment in ['Positive', 'Neutral', 'Negative']:
                if sentiment in age_sentiment.columns:
                    age_data['chart_data']['datasets'].append({
                        'label': sentiment,
                        'data': age_sentiment[sentiment].round(1).tolist(),
                        'backgroundColor': self._get_sentiment_color(sentiment)
                    })
            
            # Summary statistics
            for age_group in age_sentiment.index:
                age_data['summary'][age_group] = {
                    'total_responses': int(self.df[self.df['age_group'] == age_group].shape[0]),
                    'avg_sentiment_score': float(self.df[self.df['age_group'] == age_group]['sentiment_numeric'].mean()),
                    'dominant_sentiment': age_sentiment.loc[age_group].idxmax()
                }
            
            return age_data
            
        except Exception as e:
            logger.error(f"Error generating age sentiment analysis: {str(e)}")
            return {}
    
    def generate_employment_application_analysis(self) -> Dict[str, Any]:
        """Analyze employment status vs application behavior"""
        try:
            employment_app = pd.crosstab(
                self.df['employment'], 
                self.df['has_applied'], 
                normalize='index'
            ) * 100
            
            employment_data = {
                'chart_data': {
                    'labels': employment_app.index.tolist(),
                    'datasets': [
                        {
                            'label': 'Has Applied',
                            'data': employment_app['Yes'].tolist() if 'Yes' in employment_app.columns else [],
                            'backgroundColor': '#10b981'
                        },
                        {
                            'label': 'Has Not Applied',
                            'data': employment_app['No'].tolist() if 'No' in employment_app.columns else [],
                            'backgroundColor': '#ef4444'
                        }
                    ]
                },
                'summary': {}
            }
            
            return employment_data
            
        except Exception as e:
            logger.error(f"Error generating employment application analysis: {str(e)}")
            return {}
    
    def generate_income_barriers_analysis(self) -> Dict[str, Any]:
        """Analyze income vs perceived barriers"""
        try:
            # Flatten challenges data
            income_challenges = []
            for idx, row in self.df.iterrows():
                for challenge in row['challenges_list']:
                    if challenge:  # Skip empty challenges
                        income_challenges.append({
                            'income': row['income'],
                            'challenge': challenge
                        })
            
            challenges_df = pd.DataFrame(income_challenges)
            
            if challenges_df.empty:
                return {'error': 'No challenges data available'}
            
            # Count challenges by income group
            challenge_counts = challenges_df.groupby(['income', 'challenge']).size().unstack(fill_value=0)
            
            # Get top challenges
            top_challenges = challenges_df['challenge'].value_counts().head(10)
            
            income_barriers_data = {
                'top_challenges': {
                    'labels': top_challenges.index.tolist(),
                    'values': top_challenges.values.tolist()
                },
                'by_income_group': {}
            }
            
            # Analyze by income group
            for income_group in self.df['income'].unique():
                if pd.notna(income_group):
                    group_challenges = challenges_df[challenges_df['income'] == income_group]['challenge'].value_counts().head(5)
                    income_barriers_data['by_income_group'][income_group] = {
                        'challenges': group_challenges.index.tolist(),
                        'counts': group_challenges.values.tolist()
                    }
            
            return income_barriers_data
            
        except Exception as e:
            logger.error(f"Error generating income barriers analysis: {str(e)}")
            return {}
    
    def generate_awareness_sentiment_analysis(self) -> Dict[str, Any]:
        """Analyze familiarity/awareness vs sentiment score"""
        try:
            awareness_sentiment = self.df.groupby('familiarity')['sentiment_numeric'].agg(['mean', 'count', 'std']).round(2)
            
            awareness_data = {
                'chart_data': {
                    'labels': awareness_sentiment.index.tolist(),
                    'datasets': [
                        {
                            'label': 'Average Sentiment Score',
                            'data': awareness_sentiment['mean'].tolist(),
                            'backgroundColor': '#3b82f6',
                            'type': 'bar'
                        }
                    ]
                },
                'statistics': {
                    level: {
                        'avg_sentiment': float(awareness_sentiment.loc[level, 'mean']),
                        'response_count': int(awareness_sentiment.loc[level, 'count']),
                        'std_deviation': float(awareness_sentiment.loc[level, 'std'])
                    }
                    for level in awareness_sentiment.index
                }
            }
            
            return awareness_data
            
        except Exception as e:
            logger.error(f"Error generating awareness sentiment analysis: {str(e)}")
            return {}
    
    def generate_information_sources_analysis(self) -> Dict[str, Any]:
        """Analyze information sources preferences"""
        try:
            sources_count = self.df['info_sources'].value_counts()
            
            # Cross-reference with sentiment
            sources_sentiment = self.df.groupby('info_sources')['sentiment_numeric'].mean().round(2)
            
            sources_data = {
                'usage_distribution': {
                    'labels': sources_count.index.tolist(),
                    'values': sources_count.values.tolist(),
                    'percentages': (sources_count / len(self.df) * 100).round(1).tolist()
                },
                'sentiment_by_source': {
                    'labels': sources_sentiment.index.tolist(),
                    'values': sources_sentiment.values.tolist()
                },
                'detailed_analysis': {
                    source: {
                        'usage_count': int(sources_count[source]),
                        'avg_sentiment': float(sources_sentiment[source]),
                        'percentage': float(sources_count[source] / len(self.df) * 100)
                    }
                    for source in sources_count.index
                }
            }
            
            return sources_data
            
        except Exception as e:
            logger.error(f"Error generating information sources analysis: {str(e)}")
            return {}
    
    def generate_time_trend_analysis(self) -> Dict[str, Any]:
        """Analyze sentiment trends over time"""
        try:
            # Group by month and calculate average sentiment
            monthly_sentiment = self.df.groupby(['survey_year', 'survey_month'])['sentiment_numeric'].agg(['mean', 'count']).round(2)
            
            # Create time labels
            time_labels = []
            sentiment_values = []
            response_counts = []
            
            for (year, month), row in monthly_sentiment.iterrows():
                time_labels.append(f"{year}-{month:02d}")
                sentiment_values.append(row['mean'])
                response_counts.append(row['count'])
            
            time_data = {
                'trend_chart': {
                    'labels': time_labels,
                    'datasets': [
                        {
                            'label': 'Average Sentiment Score',
                            'data': sentiment_values,
                            'borderColor': '#3b82f6',
                            'backgroundColor': 'rgba(59, 130, 246, 0.1)',
                            'fill': True
                        }
                    ]
                },
                'response_volume': {
                    'labels': time_labels,
                    'data': response_counts
                },
                'summary': {
                    'total_months': len(time_labels),
                    'avg_sentiment_overall': float(np.mean(sentiment_values)),
                    'trend': 'increasing' if sentiment_values[-1] > sentiment_values[0] else 'decreasing'
                }
            }
            
            return time_data
            
        except Exception as e:
            logger.error(f"Error generating time trend analysis: {str(e)}")
            return {}
    
    def generate_program_specific_sentiment(self) -> Dict[str, Any]:
        """Analyze sentiment towards specific housing programs"""
        try:
            # Extract program mentions from text fields
            programs = ['PR1MA', 'RUMAWIP', 'PPA1M', 'Rumah Selangorku', 'MyFirst Home']
            program_sentiments = {}
            
            # Define potential text fields - check which ones exist
            potential_text_fields = ['biggest_weakness', 'improvements', 'challenges', 'info_sources']
            text_fields = [field for field in potential_text_fields if field in self.df.columns]
            
            for program in programs:
                program_mentions = []
                
                for field in text_fields:
                    if field in self.df.columns:
                        mentions = self.df[self.df[field].str.contains(program, case=False, na=False)]
                        program_mentions.extend(mentions['sentiment_numeric'].dropna().tolist())
                
                if program_mentions:
                    program_sentiments[program] = {
                        'avg_sentiment': float(np.mean(program_mentions)),
                        'mention_count': len(program_mentions),
                        'sentiment_distribution': {
                            'positive': len([s for s in program_mentions if s > 3]),
                            'neutral': len([s for s in program_mentions if s == 3]),
                            'negative': len([s for s in program_mentions if s < 3])
                        }
                    }
            
            return {
                'program_analysis': program_sentiments,
                'chart_data': {
                    'labels': list(program_sentiments.keys()),
                    'datasets': [
                        {
                            'label': 'Average Sentiment Score',
                            'data': [data['avg_sentiment'] for data in program_sentiments.values()],
                            'backgroundColor': '#10b981'
                        }
                    ]
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating program specific sentiment: {str(e)}")
            return {}
    
    def generate_text_analysis(self) -> Dict[str, Any]:
        """Analyze open-ended responses and generate insights"""
        try:
            # Combine all text responses
            all_text = []
            # Define potential text fields - check which ones exist
            potential_text_fields = ['biggest_weakness', 'improvements', 'challenges', 'info_sources']
            text_fields = [field for field in potential_text_fields if field in self.df.columns]
            
            for field in text_fields:
                if field in self.df.columns:
                    texts = self.df[field].dropna().tolist()
                    all_text.extend(texts)
            
            # Word frequency analysis
            word_freq = self._analyze_word_frequency(all_text)
            
            # Common complaints categorization
            complaints = self._categorize_complaints()
            
            # Improvement suggestions categorization
            improvements = self._categorize_improvements()
            
            text_analysis = {
                'word_frequency': word_freq,
                'common_complaints': complaints,
                'improvement_suggestions': improvements,
                'total_responses': len(all_text),
                'avg_response_length': np.mean([len(text.split()) for text in all_text])
            }
            
            return text_analysis
            
        except Exception as e:
            logger.error(f"Error generating text analysis: {str(e)}")
            return {}
    
    def _analyze_word_frequency(self, texts: List[str]) -> Dict[str, int]:
        """Analyze word frequency for word cloud generation"""
        try:
            # Combine all texts
            combined_text = ' '.join(texts).lower()
            
            # Remove common stop words and clean text
            stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'a', 'an', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
            
            # Extract words and count frequency
            words = re.findall(r'\b\w+\b', combined_text)
            word_counts = Counter([word for word in words if len(word) > 3 and word not in stop_words])
            
            return dict(word_counts.most_common(50))
            
        except Exception as e:
            logger.error(f"Error analyzing word frequency: {str(e)}")
            return {}
    
    def _categorize_complaints(self) -> Dict[str, Any]:
        """Categorize common complaints"""
        try:
            # Check if the column exists, if not return empty result
            if 'biggest_weakness' not in self.df.columns:
                logger.warning("'biggest_weakness' column not found, returning empty categorization")
                return {
                    'categories': {},
                    'total_complaints': 0,
                    'uncategorized': []
                }
            
            complaints = self.df['biggest_weakness'].dropna().tolist()
            
            categories = {
                'Pricing & Affordability': ['price', 'expensive', 'affordable', 'cost', 'budget'],
                'Location & Accessibility': ['location', 'accessibility', 'transport', 'remote', 'far'],
                'Process & Bureaucracy': ['process', 'application', 'bureaucracy', 'complicated', 'procedure'],
                'Transparency & Information': ['transparency', 'information', 'communication', 'clear'],
                'Quality & Standards': ['quality', 'standard', 'construction', 'build'],
                'Supply & Availability': ['supply', 'available', 'units', 'shortage', 'limited']
            }
            
            categorized = {category: [] for category in categories}
            
            for complaint in complaints:
                complaint_lower = complaint.lower()
                for category, keywords in categories.items():
                    if any(keyword in complaint_lower for keyword in keywords):
                        categorized[category].append(complaint)
                        break
            
            # Count and percentage
            complaint_summary = {}
            total_complaints = len(complaints)
            
            for category, items in categorized.items():
                complaint_summary[category] = {
                    'count': len(items),
                    'percentage': round(len(items) / total_complaints * 100, 1),
                    'examples': items[:3]  # First 3 examples
                }
            
            return complaint_summary
            
        except Exception as e:
            logger.error(f"Error categorizing complaints: {str(e)}")
            return {}
    
    def _categorize_improvements(self) -> Dict[str, Any]:
        """Categorize improvement suggestions"""
        try:
            improvements = self.df['improvements'].dropna().tolist()
            
            categories = {
                'Better Pricing': ['cheaper', 'affordable', 'reduce price', 'lower cost'],
                'Improved Locations': ['better location', 'accessibility', 'transport', 'connectivity'],
                'Simplified Process': ['simplify', 'easier', 'streamline', 'reduce bureaucracy'],
                'More Transparency': ['transparent', 'information', 'communication', 'updates'],
                'Quality Improvements': ['quality', 'better construction', 'standards'],
                'Increased Supply': ['more units', 'increase supply', 'availability']
            }
            
            categorized = {category: [] for category in categories}
            
            for improvement in improvements:
                improvement_lower = improvement.lower()
                for category, keywords in categories.items():
                    if any(keyword in improvement_lower for keyword in keywords):
                        categorized[category].append(improvement)
                        break
            
            # Count and percentage
            improvement_summary = {}
            total_improvements = len(improvements)
            
            for category, items in categorized.items():
                improvement_summary[category] = {
                    'count': len(items),
                    'percentage': round(len(items) / total_improvements * 100, 1),
                    'examples': items[:3]  # First 3 examples
                }
            
            return improvement_summary
            
        except Exception as e:
            logger.error(f"Error categorizing improvements: {str(e)}")
            return {}
    
    def _get_sentiment_color(self, sentiment: str) -> str:
        """Get color for sentiment visualization"""
        colors = {
            'Positive': '#10b981',
            'Neutral': '#64748b',
            'Negative': '#ef4444'
        }
        return colors.get(sentiment, '#6b7280')
    
    def generate_comprehensive_dashboard_data(self) -> Dict[str, Any]:
        """Generate all dashboard data in one call"""
        try:
            dashboard_data = {
                'overview': self.generate_sentiment_overview(),
                'location_sentiment': self.generate_location_sentiment_analysis(),
                'age_sentiment': self.generate_age_sentiment_analysis(),
                'employment_application': self.generate_employment_application_analysis(),
                'income_barriers': self.generate_income_barriers_analysis(),
                'awareness_sentiment': self.generate_awareness_sentiment_analysis(),
                'information_sources': self.generate_information_sources_analysis(),
                'time_trends': self.generate_time_trend_analysis(),
                'program_sentiment': self.generate_program_specific_sentiment(),
                'text_analysis': self.generate_text_analysis(),
                'metadata': {
                    'total_responses': len(self.df),
                    'survey_period': {
                        'start': self.df['Timestamp'].min().isoformat(),
                        'end': self.df['Timestamp'].max().isoformat()
                    },
                    'generated_at': datetime.now().isoformat()
                }
            }
            
            logger.info("Comprehensive dashboard data generated successfully")
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error generating comprehensive dashboard data: {str(e)}")
            return {'error': str(e)}
    
    def get_news_data(self) -> List[Dict]:
        """Load and return news articles from news.json"""
        try:
            news_path = 'dataset/news.json'
            with open(news_path, 'r', encoding='utf-8') as f:
                news_data = json.load(f)
            
            # Ensure it's a list
            if isinstance(news_data, dict):
                news_data = news_data.get('articles', []) or news_data.get('data', []) or [news_data]
            
            logger.info(f"Loaded {len(news_data)} news articles")
            return news_data
        except Exception as e:
            logger.error(f"Error loading news data: {str(e)}")
            return []
    
    def get_survey_responses_as_posts(self, limit: int = 50, location: str = '') -> List[Dict]:
        """Convert survey responses into social media post format"""
        try:
            df = self.df.copy()
            
            # Filter by location if specified
            if location and 'Location' in df.columns:
                df = df[df['Location'].str.contains(location, case=False, na=False)]
            
            # Limit results
            df = df.head(limit)
            
            posts = []
            for idx, row in df.iterrows():
                # Combine open-ended responses as content
                content_parts = []
                
                # Look for open-ended response columns
                for col in df.columns:
                    if 'open' in col.lower() or 'feedback' in col.lower() or 'comment' in col.lower():
                        if pd.notna(row[col]) and str(row[col]).strip():
                            content_parts.append(str(row[col]).strip())
                
                # If no open-ended responses, create content from other fields
                if not content_parts:
                    content_parts.append(f"Housing survey response from {row.get('Location', 'Malaysia')}")
                
                post = {
                    'id': f"survey_{idx}",
                    'content': ' | '.join(content_parts),
                    'location': row.get('Location', ''),
                    'age': row.get('Age', ''),
                    'employment': row.get('Employment_Status', ''),
                    'income': row.get('Income_Level', ''),
                    'platform': 'survey',
                    'author': f"Respondent_{idx}",
                    'posted_date': datetime.now().isoformat(),
                    'engagement': {'responses': 1}
                }
                posts.append(post)
            
            return posts
        except Exception as e:
            logger.error(f"Error creating survey posts: {str(e)}")
            return []

# Test the analyzer if run directly
if __name__ == '__main__':
    analyzer = DatasetAnalyzer()
    dashboard_data = analyzer.generate_comprehensive_dashboard_data()
    
    print("Dashboard data generated successfully!")
    print(f"Total responses: {dashboard_data.get('metadata', {}).get('total_responses', 0)}")
    print(f"Overview: {dashboard_data.get('overview', {})}")
