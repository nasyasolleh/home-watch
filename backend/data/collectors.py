"""
Data Collection Module for HomeWatch

Collects data from various sources:
- News articles
- Social media posts
- Government announcements
- Forum discussions
"""

import requests
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import time
import json
import os
from urllib.parse import quote_plus
import feedparser
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class NewsCollector:
    """
    Collects and processes news articles related to Malaysian housing
    """
    
    def __init__(self):
        self.sources = {
            'the_star': {
                'rss_url': 'https://www.thestar.com.my/rss/business/property',
                'base_url': 'https://www.thestar.com.my',
                'name': 'The Star Online'
            },
            'new_straits_times': {
                'rss_url': 'https://www.nst.com.my/rss/property',
                'base_url': 'https://www.nst.com.my',
                'name': 'New Straits Times'
            },
            'malaysiakini': {
                'base_url': 'https://www.malaysiakini.com',
                'name': 'Malaysiakini'
            },
            'malay_mail': {
                'base_url': 'https://www.malaymail.com',
                'name': 'Malay Mail'
            }
        }
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'HomeWatch/1.0 (Housing Analytics Bot)'
        })
        
        logger.info("NewsCollector initialized")
    
    def collect_articles(self, keywords: List[str], limit: int = 20, days_back: int = 7) -> List[Dict]:
        """
        Collect news articles from various sources
        
        Args:
            keywords: List of keywords to search for
            limit: Maximum number of articles to collect
            days_back: Number of days to look back
            
        Returns:
            List of article dictionaries
        """
        articles = []
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        try:
            # Collect from RSS feeds
            for source_id, source_info in self.sources.items():
                if 'rss_url' in source_info:
                    rss_articles = self._collect_from_rss(
                        source_info['rss_url'], 
                        source_info['name'],
                        keywords,
                        cutoff_date
                    )
                    articles.extend(rss_articles)
            
            # Collect from NewsAPI (if API key available)
            newsapi_articles = self._collect_from_newsapi(keywords, cutoff_date)
            articles.extend(newsapi_articles)
            
            # Collect from government sources
            gov_articles = self._collect_government_news(keywords, cutoff_date)
            articles.extend(gov_articles)
            
            # Sort by date and limit results
            articles.sort(key=lambda x: x['published_date'], reverse=True)
            articles = articles[:limit]
            
            logger.info(f"Collected {len(articles)} news articles")
            return articles
            
        except Exception as e:
            logger.error(f"Error collecting news articles: {str(e)}")
            return []
    
    def _collect_from_rss(self, rss_url: str, source_name: str, keywords: List[str], cutoff_date: datetime) -> List[Dict]:
        """Collect articles from RSS feeds"""
        articles = []
        
        try:
            response = self.session.get(rss_url, timeout=30)
            feed = feedparser.parse(response.content)
            
            for entry in feed.entries:
                # Check if article is recent enough
                published_date = datetime(*entry.published_parsed[:6]) if hasattr(entry, 'published_parsed') else datetime.now()
                
                if published_date < cutoff_date:
                    continue
                
                # Check if keywords match
                title = entry.title.lower()
                description = getattr(entry, 'description', '').lower()
                content_text = f"{title} {description}"
                
                if not any(keyword.lower() in content_text for keyword in keywords):
                    continue
                
                # Extract full content if possible
                full_content = self._extract_article_content(entry.link)
                
                article = {
                    'id': f"rss_{hash(entry.link)}",
                    'title': entry.title,
                    'url': entry.link,
                    'content': full_content or description,
                    'summary': description,
                    'source': source_name,
                    'published_date': published_date.isoformat(),
                    'collected_at': datetime.now().isoformat(),
                    'keywords_matched': [kw for kw in keywords if kw.lower() in content_text]
                }
                
                articles.append(article)
                
                # Rate limiting
                time.sleep(0.5)
            
        except Exception as e:
            logger.error(f"Error collecting from RSS {rss_url}: {str(e)}")
        
        return articles
    
    def _collect_from_newsapi(self, keywords: List[str], cutoff_date: datetime) -> List[Dict]:
        """Collect articles from NewsAPI"""
        articles = []
        api_key = os.getenv('NEWSAPI_KEY')
        
        if not api_key:
            logger.warning("NewsAPI key not found, skipping NewsAPI collection")
            return articles
        
        try:
            query = ' OR '.join([f'"{keyword}"' for keyword in keywords])
            query += ' AND (Malaysia OR Kuala Lumpur OR Selangor)'
            
            url = 'https://newsapi.org/v2/everything'
            params = {
                'q': query,
                'domains': 'thestar.com.my,nst.com.my,malaymail.com,theedgemarkets.com',
                'language': 'en',
                'sortBy': 'publishedAt',
                'from': cutoff_date.strftime('%Y-%m-%d'),
                'pageSize': 50,
                'apiKey': api_key
            }
            
            response = self.session.get(url, params=params, timeout=30)
            data = response.json()
            
            if data.get('status') == 'ok':
                for item in data.get('articles', []):
                    article = {
                        'id': f"newsapi_{hash(item['url'])}",
                        'title': item['title'],
                        'url': item['url'],
                        'content': item.get('content', ''),
                        'summary': item.get('description', ''),
                        'source': item['source']['name'],
                        'published_date': item['publishedAt'],
                        'collected_at': datetime.now().isoformat(),
                        'keywords_matched': keywords  # Would need actual matching logic
                    }
                    articles.append(article)
            
        except Exception as e:
            logger.error(f"Error collecting from NewsAPI: {str(e)}")
        
        return articles
    
    def _collect_government_news(self, keywords: List[str], cutoff_date: datetime) -> List[Dict]:
        """Collect news from government sources"""
        articles = []
        
        gov_sources = [
            'https://www.kpkt.gov.my',  # Ministry of Housing
            'https://www.1malaysia.com.my',  # PR1MA
            'https://www.bnm.gov.my'  # Bank Negara Malaysia
        ]
        
        # This would require specific scrapers for each government site
        # For now, return empty list as demo
        logger.info("Government news collection not implemented yet")
        
        return articles
    
    def _extract_article_content(self, url: str) -> Optional[str]:
        """Extract full article content from URL"""
        try:
            response = self.session.get(url, timeout=15)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Common article content selectors
            content_selectors = [
                'article .content',
                '.article-content',
                '.story-content',
                '.post-content',
                '[itemprop="articleBody"]'
            ]
            
            for selector in content_selectors:
                content_div = soup.select_one(selector)
                if content_div:
                    # Extract text and clean up
                    content = content_div.get_text(strip=True)
                    return content[:2000]  # Limit content length
            
            # Fallback: get all paragraph text
            paragraphs = soup.find_all('p')
            if paragraphs:
                content = ' '.join([p.get_text(strip=True) for p in paragraphs[:10]])
                return content[:2000]
                
        except Exception as e:
            logger.debug(f"Could not extract content from {url}: {str(e)}")
        
        return None

class SocialMediaCollector:
    """
    Collects social media posts related to Malaysian housing
    """
    
    def __init__(self):
        self.twitter_bearer_token = os.getenv('TWITTER_BEARER_TOKEN')
        self.facebook_access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'HomeWatch/1.0 (Housing Analytics Bot)'
        })
        
        logger.info("SocialMediaCollector initialized")
    
    def collect_posts(self, platform: str, hashtags: List[str], limit: int = 50) -> List[Dict]:
        """
        Collect social media posts from specified platform
        
        Args:
            platform: 'twitter', 'facebook', 'instagram'
            hashtags: List of hashtags to search
            limit: Maximum number of posts to collect
            
        Returns:
            List of post dictionaries
        """
        posts = []
        
        try:
            if platform == 'twitter':
                posts = self._collect_twitter_posts(hashtags, limit)
            elif platform == 'facebook':
                posts = self._collect_facebook_posts(hashtags, limit)
            elif platform == 'instagram':
                posts = self._collect_instagram_posts(hashtags, limit)
            else:
                logger.warning(f"Unsupported platform: {platform}")
            
            logger.info(f"Collected {len(posts)} posts from {platform}")
            return posts
            
        except Exception as e:
            logger.error(f"Error collecting from {platform}: {str(e)}")
            return []
    
    def _collect_twitter_posts(self, hashtags: List[str], limit: int) -> List[Dict]:
        """Collect posts from Twitter API v2"""
        posts = []
        
        if not self.twitter_bearer_token:
            logger.warning("Twitter Bearer Token not found, returning demo data")
            return self._get_demo_twitter_posts()
        
        try:
            query = ' OR '.join([f"#{tag.replace('#', '')}" for tag in hashtags])
            query += ' lang:en OR lang:ms'  # English or Malay
            
            url = 'https://api.twitter.com/2/tweets/search/recent'
            headers = {'Authorization': f'Bearer {self.twitter_bearer_token}'}
            params = {
                'query': query,
                'max_results': min(limit, 100),
                'tweet.fields': 'created_at,author_id,public_metrics,context_annotations',
                'user.fields': 'username,name,public_metrics',
                'expansions': 'author_id'
            }
            
            response = self.session.get(url, headers=headers, params=params, timeout=30)
            data = response.json()
            
            if 'data' in data:
                users = {user['id']: user for user in data.get('includes', {}).get('users', [])}
                
                for tweet in data['data']:
                    author = users.get(tweet['author_id'], {})
                    
                    post = {
                        'id': f"twitter_{tweet['id']}",
                        'content': tweet['text'],
                        'platform': 'twitter',
                        'author': author.get('username', 'unknown'),
                        'author_name': author.get('name', 'Unknown'),
                        'posted_date': tweet['created_at'],
                        'engagement': {
                            'likes': tweet.get('public_metrics', {}).get('like_count', 0),
                            'retweets': tweet.get('public_metrics', {}).get('retweet_count', 0),
                            'replies': tweet.get('public_metrics', {}).get('reply_count', 0)
                        },
                        'url': f"https://twitter.com/{author.get('username', 'unknown')}/status/{tweet['id']}",
                        'collected_at': datetime.now().isoformat()
                    }
                    posts.append(post)
            
        except Exception as e:
            logger.error(f"Error collecting Twitter posts: {str(e)}")
            # Return demo data as fallback
            posts = self._get_demo_twitter_posts()
        
        return posts
    
    def _collect_facebook_posts(self, hashtags: List[str], limit: int) -> List[Dict]:
        """Collect posts from Facebook (requires special permissions)"""
        # Facebook Graph API requires special permissions for public content
        # For now, return demo data
        logger.info("Facebook collection using demo data (API restrictions)")
        return self._get_demo_facebook_posts()
    
    def _collect_instagram_posts(self, hashtags: List[str], limit: int) -> List[Dict]:
        """Collect posts from Instagram (requires special permissions)"""
        # Instagram API requires special permissions for hashtag searches
        # For now, return demo data
        logger.info("Instagram collection using demo data (API restrictions)")
        return self._get_demo_instagram_posts()
    
    def _get_demo_twitter_posts(self) -> List[Dict]:
        """Return demo Twitter posts for development"""
        return [
            {
                'id': 'twitter_demo_1',
                'content': 'Just got approved for #PR1MA housing! The process was smooth and the officers were helpful. Finally getting my own home! 🏠 #RumahMampu',
                'platform': 'twitter',
                'author': 'sarah_kl',
                'author_name': 'Sarah Ahmad',
                'posted_date': (datetime.now() - timedelta(hours=2)).isoformat(),
                'engagement': {'likes': 24, 'retweets': 8, 'replies': 12},
                'url': 'https://twitter.com/sarah_kl/status/demo1',
                'collected_at': datetime.now().isoformat()
            },
            {
                'id': 'twitter_demo_2',
                'content': 'Housing prices in KL are getting out of control. Even with all these schemes like #RumahSelangorku, still hard for young people to afford. Government needs to do more! 😓',
                'platform': 'twitter',
                'author': 'malaysian_youth',
                'author_name': 'Ahmad Rahman',
                'posted_date': (datetime.now() - timedelta(hours=5)).isoformat(),
                'engagement': {'likes': 156, 'retweets': 89, 'replies': 67},
                'url': 'https://twitter.com/malaysian_youth/status/demo2',
                'collected_at': datetime.now().isoformat()
            },
            {
                'id': 'twitter_demo_3',
                'content': 'Attending #PR1MA briefing today. Lots of good information about the application process. Hope they can speed up approvals! #AffordableHousing #Malaysia',
                'platform': 'twitter',
                'author': 'property_seeker',
                'author_name': 'Li Wei',
                'posted_date': (datetime.now() - timedelta(hours=8)).isoformat(),
                'engagement': {'likes': 45, 'retweets': 12, 'replies': 8},
                'url': 'https://twitter.com/property_seeker/status/demo3',
                'collected_at': datetime.now().isoformat()
            }
        ]
    
    def _get_demo_facebook_posts(self) -> List[Dict]:
        """Return demo Facebook posts for development"""
        return [
            {
                'id': 'facebook_demo_1',
                'content': 'Sharing my experience with MyFirst Home Scheme. The bank approval took 3 months but finally got 100% financing. Tips for others applying...',
                'platform': 'facebook',
                'author': 'Housing Malaysia Group',
                'author_name': 'Priya Devi',
                'posted_date': (datetime.now() - timedelta(days=1)).isoformat(),
                'engagement': {'likes': 89, 'shares': 23, 'comments': 34},
                'url': 'https://facebook.com/demo1',
                'collected_at': datetime.now().isoformat()
            }
        ]
    
    def _get_demo_instagram_posts(self) -> List[Dict]:
        """Return demo Instagram posts for development"""
        return [
            {
                'id': 'instagram_demo_1',
                'content': 'New home keys! 🗝️🏠 Thanks to #RumahSelangorku program. Dreams do come true! #NewHome #Grateful #AffordableHousing',
                'platform': 'instagram',
                'author': 'home_sweet_home_my',
                'author_name': 'Nurul Aini',
                'posted_date': (datetime.now() - timedelta(days=2)).isoformat(),
                'engagement': {'likes': 234, 'comments': 45},
                'url': 'https://instagram.com/p/demo1',
                'collected_at': datetime.now().isoformat()
            }
        ]

# Import os at the top of file
import os
