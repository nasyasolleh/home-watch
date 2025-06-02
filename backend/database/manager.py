"""
Database Manager for HomeWatch

Handles database operations for sentiment data, user posts, and analytics
Supports both SQLite (development) and PostgreSQL (production)
"""

import sqlite3
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
import json
import psycopg2
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manages database connections and operations for HomeWatch
    """
    
    def __init__(self):
        self.db_type = os.getenv('DB_TYPE', 'sqlite')  # sqlite or postgresql
        self.db_path = os.getenv('DB_PATH', 'data/homewatch.db')
        self.pg_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'homewatch'),
            'user': os.getenv('DB_USER', 'homewatch'),
            'password': os.getenv('DB_PASSWORD', '')
        }
        
        self.initialized = False
        logger.info(f"DatabaseManager initialized with {self.db_type} backend")
    
    def initialize(self):
        """Initialize database and create tables"""
        try:
            if self.db_type == 'sqlite':
                self._initialize_sqlite()
            else:
                self._initialize_postgresql()
            
            self.initialized = True
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            raise
    
    def _initialize_sqlite(self):
        """Initialize SQLite database"""
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Create sentiment_results table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sentiment_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    source VARCHAR(50) NOT NULL,
                    sentiment_label VARCHAR(20) NOT NULL,
                    confidence REAL NOT NULL,
                    compound_score REAL NOT NULL,
                    positive_score REAL NOT NULL,
                    negative_score REAL NOT NULL,
                    neutral_score REAL NOT NULL,
                    keywords TEXT,
                    housing_relevance REAL,
                    region_mentioned VARCHAR(50),
                    program_mentioned VARCHAR(50),
                    metadata TEXT,
                    analyzed_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create posts table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    external_id VARCHAR(100) UNIQUE,
                    platform VARCHAR(50),
                    content TEXT NOT NULL,
                    author VARCHAR(100),
                    posted_at TIMESTAMP,
                    engagement_data TEXT,
                    sentiment_result_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sentiment_result_id) REFERENCES sentiment_results (id)
                )
            ''')
            
            # Create analytics_cache table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS analytics_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cache_key VARCHAR(255) UNIQUE NOT NULL,
                    data TEXT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sentiment_analyzed_at ON sentiment_results(analyzed_at)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sentiment_source ON sentiment_results(source)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sentiment_label ON sentiment_results(sentiment_label)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_posted_at ON posts(posted_at)')
            
            conn.commit()
    
    def _initialize_postgresql(self):
        """Initialize PostgreSQL database"""
        try:
            with psycopg2.connect(**self.pg_config) as conn:
                cursor = conn.cursor()
                
                # Create sentiment_results table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS sentiment_results (
                        id SERIAL PRIMARY KEY,
                        text TEXT NOT NULL,
                        source VARCHAR(50) NOT NULL,
                        sentiment_label VARCHAR(20) NOT NULL,
                        confidence REAL NOT NULL,
                        compound_score REAL NOT NULL,
                        positive_score REAL NOT NULL,
                        negative_score REAL NOT NULL,
                        neutral_score REAL NOT NULL,
                        keywords JSONB,
                        housing_relevance REAL,
                        region_mentioned VARCHAR(50),
                        program_mentioned VARCHAR(50),
                        metadata JSONB,
                        analyzed_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Create posts table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS posts (
                        id SERIAL PRIMARY KEY,
                        external_id VARCHAR(100) UNIQUE,
                        platform VARCHAR(50),
                        content TEXT NOT NULL,
                        author VARCHAR(100),
                        posted_at TIMESTAMP,
                        engagement_data JSONB,
                        sentiment_result_id INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (sentiment_result_id) REFERENCES sentiment_results (id)
                    )
                ''')
                
                # Create analytics_cache table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS analytics_cache (
                        id SERIAL PRIMARY KEY,
                        cache_key VARCHAR(255) UNIQUE NOT NULL,
                        data JSONB NOT NULL,
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Create indexes
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_sentiment_analyzed_at ON sentiment_results(analyzed_at)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_sentiment_source ON sentiment_results(source)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_sentiment_label ON sentiment_results(sentiment_label)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_posts_posted_at ON posts(posted_at)')
                
                conn.commit()
                
        except psycopg2.Error as e:
            logger.error(f"PostgreSQL initialization error: {str(e)}")
            raise
    
    @contextmanager
    def get_connection(self):
        """Get database connection context manager"""
        if not self.initialized:
            self.initialize()
        
        if self.db_type == 'sqlite':
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Enable column access by name
        else:
            conn = psycopg2.connect(**self.pg_config)
        
        try:
            yield conn
        finally:
            conn.close()
    
    def store_sentiment_result(self, result: Dict) -> int:
        """
        Store sentiment analysis result in database
        
        Args:
            result: Sentiment analysis result dictionary
            
        Returns:
            ID of the stored record
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Prepare data
                keywords_json = json.dumps(result.get('keywords', []))
                metadata_json = json.dumps(result.get('metadata', {}))
                
                if self.db_type == 'sqlite':
                    query = '''
                        INSERT INTO sentiment_results 
                        (text, source, sentiment_label, confidence, compound_score, 
                         positive_score, negative_score, neutral_score, keywords, 
                         housing_relevance, region_mentioned, program_mentioned, 
                         metadata, analyzed_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    '''
                    cursor.execute(query, (
                        result['text'],
                        result['source'],
                        result['sentiment_label'],
                        result['confidence'],
                        result['scores']['compound'],
                        result['scores']['positive'],
                        result['scores']['negative'],
                        result['scores']['neutral'],
                        keywords_json,
                        result.get('housing_relevance'),
                        result.get('region_mentioned'),
                        result.get('program_mentioned'),
                        metadata_json,
                        result['analyzed_at']
                    ))
                    record_id = cursor.lastrowid
                    
                else:  # PostgreSQL
                    query = '''
                        INSERT INTO sentiment_results 
                        (text, source, sentiment_label, confidence, compound_score, 
                         positive_score, negative_score, neutral_score, keywords, 
                         housing_relevance, region_mentioned, program_mentioned, 
                         metadata, analyzed_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    '''
                    cursor.execute(query, (
                        result['text'],
                        result['source'],
                        result['sentiment_label'],
                        result['confidence'],
                        result['scores']['compound'],
                        result['scores']['positive'],
                        result['scores']['negative'],
                        result['scores']['neutral'],
                        result.get('keywords', []),
                        result.get('housing_relevance'),
                        result.get('region_mentioned'),
                        result.get('program_mentioned'),
                        result.get('metadata', {}),
                        result['analyzed_at']
                    ))
                    record_id = cursor.fetchone()[0]
                
                conn.commit()
                logger.debug(f"Stored sentiment result with ID: {record_id}")
                return record_id
                
        except Exception as e:
            logger.error(f"Error storing sentiment result: {str(e)}")
            raise
    
    def store_post(self, post: Dict, sentiment_result_id: Optional[int] = None) -> int:
        """
        Store social media post or news article
        
        Args:
            post: Post data dictionary
            sentiment_result_id: Optional linked sentiment result ID
            
        Returns:
            ID of the stored record
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                engagement_json = json.dumps(post.get('engagement', {}))
                
                if self.db_type == 'sqlite':
                    query = '''
                        INSERT OR REPLACE INTO posts 
                        (external_id, platform, content, author, posted_at, 
                         engagement_data, sentiment_result_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    '''
                    cursor.execute(query, (
                        post.get('id'),
                        post.get('platform'),
                        post['content'],
                        post.get('author'),
                        post.get('posted_date'),
                        engagement_json,
                        sentiment_result_id
                    ))
                    record_id = cursor.lastrowid
                    
                else:  # PostgreSQL
                    query = '''
                        INSERT INTO posts 
                        (external_id, platform, content, author, posted_at, 
                         engagement_data, sentiment_result_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (external_id) DO UPDATE SET
                        content = EXCLUDED.content,
                        engagement_data = EXCLUDED.engagement_data,
                        sentiment_result_id = EXCLUDED.sentiment_result_id
                        RETURNING id
                    '''
                    cursor.execute(query, (
                        post.get('id'),
                        post.get('platform'),
                        post['content'],
                        post.get('author'),
                        post.get('posted_date'),
                        post.get('engagement', {}),
                        sentiment_result_id
                    ))
                    record_id = cursor.fetchone()[0]
                
                conn.commit()
                logger.debug(f"Stored post with ID: {record_id}")
                return record_id
                
        except Exception as e:
            logger.error(f"Error storing post: {str(e)}")
            raise
    
    def get_sentiment_data(self, start_date: datetime, end_date: datetime, 
                          source: Optional[str] = None, 
                          region: Optional[str] = None,
                          program: Optional[str] = None) -> List[Dict]:
        """
        Retrieve sentiment data within date range with optional filters
        
        Args:
            start_date: Start date for data retrieval
            end_date: End date for data retrieval
            source: Optional source filter
            region: Optional region filter
            program: Optional program filter
            
        Returns:
            List of sentiment result dictionaries
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Build query with optional filters
                query = '''
                    SELECT * FROM sentiment_results 
                    WHERE analyzed_at BETWEEN ? AND ?
                '''
                params = [start_date.isoformat(), end_date.isoformat()]
                
                if source and source != 'all':
                    query += ' AND source = ?'
                    params.append(source)
                
                if region and region != 'all':
                    query += ' AND region_mentioned = ?'
                    params.append(region)
                
                if program and program != 'all':
                    query += ' AND program_mentioned = ?'
                    params.append(program)
                
                query += ' ORDER BY analyzed_at DESC'
                
                if self.db_type == 'postgresql':
                    query = query.replace('?', '%s')
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                # Convert to dictionaries
                results = []
                for row in rows:
                    if self.db_type == 'sqlite':
                        result = dict(row)
                        result['keywords'] = json.loads(result['keywords'] or '[]')
                        result['metadata'] = json.loads(result['metadata'] or '{}')
                    else:
                        result = {
                            'id': row[0],
                            'text': row[1],
                            'source': row[2],
                            'sentiment_label': row[3],
                            'confidence': row[4],
                            'compound_score': row[5],
                            'positive_score': row[6],
                            'negative_score': row[7],
                            'neutral_score': row[8],
                            'keywords': row[9] or [],
                            'housing_relevance': row[10],
                            'region_mentioned': row[11],
                            'program_mentioned': row[12],
                            'metadata': row[13] or {},
                            'analyzed_at': row[14],
                            'created_at': row[15]
                        }
                    
                    # Reconstruct scores dict
                    result['scores'] = {
                        'compound': result['compound_score'],
                        'positive': result['positive_score'],
                        'negative': result['negative_score'],
                        'neutral': result['neutral_score']
                    }
                    
                    results.append(result)
                
                logger.debug(f"Retrieved {len(results)} sentiment records")
                return results
                
        except Exception as e:
            logger.error(f"Error retrieving sentiment data: {str(e)}")
            raise
    
    def cache_analytics(self, cache_key: str, data: Dict, expires_at: datetime):
        """
        Cache analytics data for faster retrieval
        
        Args:
            cache_key: Unique key for the cached data
            data: Analytics data to cache
            expires_at: When the cache expires
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                data_json = json.dumps(data)
                
                if self.db_type == 'sqlite':
                    query = '''
                        INSERT OR REPLACE INTO analytics_cache 
                        (cache_key, data, expires_at) VALUES (?, ?, ?)
                    '''
                    cursor.execute(query, (cache_key, data_json, expires_at.isoformat()))
                else:
                    query = '''
                        INSERT INTO analytics_cache (cache_key, data, expires_at) 
                        VALUES (%s, %s, %s)
                        ON CONFLICT (cache_key) DO UPDATE SET
                        data = EXCLUDED.data, expires_at = EXCLUDED.expires_at
                    '''
                    cursor.execute(query, (cache_key, data, expires_at))
                
                conn.commit()
                logger.debug(f"Cached analytics data with key: {cache_key}")
                
        except Exception as e:
            logger.error(f"Error caching analytics: {str(e)}")
            raise
    
    def get_cached_analytics(self, cache_key: str) -> Optional[Dict]:
        """
        Retrieve cached analytics data if not expired
        
        Args:
            cache_key: Key for the cached data
            
        Returns:
            Cached data if found and not expired, None otherwise
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                query = '''
                    SELECT data FROM analytics_cache 
                    WHERE cache_key = ? AND expires_at > ?
                '''
                params = [cache_key, datetime.now().isoformat()]
                
                if self.db_type == 'postgresql':
                    query = query.replace('?', '%s')
                
                cursor.execute(query, params)
                row = cursor.fetchone()
                
                if row:
                    if self.db_type == 'sqlite':
                        data = json.loads(row[0])
                    else:
                        data = row[0]
                    
                    logger.debug(f"Retrieved cached analytics for key: {cache_key}")
                    return data
                
                return None
                
        except Exception as e:
            logger.error(f"Error retrieving cached analytics: {str(e)}")
            return None
    
    def cleanup_expired_cache(self):
        """Remove expired cache entries"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                query = 'DELETE FROM analytics_cache WHERE expires_at < ?'
                params = [datetime.now().isoformat()]
                
                if self.db_type == 'postgresql':
                    query = query.replace('?', '%s')
                
                cursor.execute(query, params)
                deleted_count = cursor.rowcount
                conn.commit()
                
                logger.info(f"Cleaned up {deleted_count} expired cache entries")
                
        except Exception as e:
            logger.error(f"Error cleaning up cache: {str(e)}")
    
    def get_database_stats(self) -> Dict:
        """Get database statistics"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                stats = {}
                
                # Count sentiment results
                cursor.execute('SELECT COUNT(*) FROM sentiment_results')
                stats['sentiment_results_count'] = cursor.fetchone()[0]
                
                # Count posts
                cursor.execute('SELECT COUNT(*) FROM posts')
                stats['posts_count'] = cursor.fetchone()[0]
                
                # Count cache entries
                cursor.execute('SELECT COUNT(*) FROM analytics_cache')
                stats['cache_entries_count'] = cursor.fetchone()[0]
                
                # Latest sentiment result
                cursor.execute('SELECT MAX(analyzed_at) FROM sentiment_results')
                latest_sentiment = cursor.fetchone()[0]
                stats['latest_sentiment_at'] = latest_sentiment
                
                return stats
                
        except Exception as e:
            logger.error(f"Error getting database stats: {str(e)}")
            return {}
