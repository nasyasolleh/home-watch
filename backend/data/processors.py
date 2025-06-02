"""
Data Processing Module for HomeWatch

Processes and cleans collected data before sentiment analysis
"""

import logging
import re
from typing import List, Dict, Optional
from datetime import datetime
import html
import unicodedata

logger = logging.getLogger(__name__)

class DataProcessor:
    """
    Processes and cleans raw data collected from various sources
    """
    
    def __init__(self):
        # Common noise patterns to remove
        self.noise_patterns = [
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',  # URLs
            r'@[A-Za-z0-9_]+',  # Mentions
            r'#[A-Za-z0-9_]+',  # Hashtags (optional - might want to keep some)
            r'\b\d+\b',  # Numbers (optional)
            r'[^\w\s]',  # Special characters (optional)
        ]
        
        # Malaysian housing-specific keywords to preserve
        self.housing_keywords = [
            'rumah mampu milik', 'affordable housing', 'pr1ma', 'rumah selangorku',
            'myfirst home', 'bank negara', 'housing loan', 'housing policy',
            'property market', 'real estate', 'housing crisis', 'home ownership',
            'housing development', 'residential property', 'housing scheme'
        ]
        
        logger.info("DataProcessor initialized")
    
    def process_batch(self, data_items: List[Dict]) -> List[Dict]:
        """
        Process a batch of data items
        
        Args:
            data_items: List of raw data dictionaries
            
        Returns:
            List of processed data dictionaries
        """
        processed_items = []
        
        for item in data_items:
            try:
                processed_item = self.process_item(item)
                if processed_item:
                    processed_items.append(processed_item)
            except Exception as e:
                logger.error(f"Error processing item {item.get('id', 'unknown')}: {str(e)}")
                continue
        
        logger.info(f"Processed {len(processed_items)} out of {len(data_items)} items")
        return processed_items
    
    def process_item(self, item: Dict) -> Optional[Dict]:
        """
        Process a single data item
        
        Args:
            item: Raw data dictionary
            
        Returns:
            Processed data dictionary or None if processing fails
        """
        try:
            # Create a copy to avoid modifying original
            processed_item = item.copy()
            
            # Clean and process text content
            content = item.get('content', '')
            title = item.get('title', '')
            summary = item.get('summary', item.get('description', ''))
            
            # Process each text field
            processed_item['content'] = self.clean_text(content)
            processed_item['title'] = self.clean_text(title)
            processed_item['summary'] = self.clean_text(summary)
            
            # Create combined text for analysis
            combined_text = f"{title} {summary} {content}".strip()
            processed_item['combined_text'] = self.clean_text(combined_text)
            
            # Extract and preserve housing-related keywords
            processed_item['housing_keywords'] = self.extract_housing_keywords(combined_text)
            
            # Add processing metadata
            processed_item['processed_at'] = datetime.now().isoformat()
            processed_item['text_length'] = len(processed_item['combined_text'])
            processed_item['language'] = self.detect_language(processed_item['combined_text'])
            
            # Validate processed item
            if not self.validate_processed_item(processed_item):
                return None
            
            return processed_item
            
        except Exception as e:
            logger.error(f"Error processing item: {str(e)}")
            return None
    
    def clean_text(self, text: str) -> str:
        """
        Clean and normalize text content
        
        Args:
            text: Raw text string
            
        Returns:
            Cleaned text string
        """
        if not text:
            return ""
        
        # Decode HTML entities
        text = html.unescape(text)
        
        # Normalize unicode characters
        text = unicodedata.normalize('NFKD', text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        # Optional: Remove URLs (preserving for context in some cases)
        # text = re.sub(self.noise_patterns[0], '[URL]', text)
        
        # Optional: Replace mentions with placeholder
        # text = re.sub(self.noise_patterns[1], '[USER]', text)
        
        return text
    
    def extract_housing_keywords(self, text: str) -> List[str]:
        """
        Extract housing-related keywords from text
        
        Args:
            text: Text to search
            
        Returns:
            List of found housing keywords
        """
        found_keywords = []
        text_lower = text.lower()
        
        for keyword in self.housing_keywords:
            if keyword.lower() in text_lower:
                found_keywords.append(keyword)
        
        return list(set(found_keywords))  # Remove duplicates
    
    def detect_language(self, text: str) -> str:
        """
        Simple language detection for Malaysian content
        
        Args:
            text: Text to analyze
            
        Returns:
            Detected language code ('en', 'ms', 'zh', 'ta', 'mixed')
        """
        if not text:
            return 'unknown'
        
        # Common Malay words/phrases
        malay_indicators = [
            'rumah', 'mampu', 'milik', 'kerajaan', 'malaysia', 'kuala lumpur',
            'selangor', 'johor', 'penang', 'sabah', 'sarawak', 'melaka',
            'negeri', 'rakyat', 'projek', 'pembangunan', 'hartanah'
        ]
        
        # Common English words in housing context
        english_indicators = [
            'housing', 'property', 'development', 'affordable', 'government',
            'scheme', 'program', 'application', 'approval', 'mortgage'
        ]
        
        text_lower = text.lower()
        malay_count = sum(1 for word in malay_indicators if word in text_lower)
        english_count = sum(1 for word in english_indicators if word in text_lower)
        
        if malay_count > english_count and malay_count > 0:
            return 'ms'  # Malay
        elif english_count > 0:
            return 'en'  # English
        elif malay_count > 0 and english_count > 0:
            return 'mixed'  # Mixed language
        else:
            return 'unknown'
    
    def validate_processed_item(self, item: Dict) -> bool:
        """
        Validate that processed item meets quality standards
        
        Args:
            item: Processed data item
            
        Returns:
            True if item is valid, False otherwise
        """
        # Check for required fields
        required_fields = ['id', 'content', 'source', 'combined_text']
        for field in required_fields:
            if not item.get(field):
                logger.warning(f"Item missing required field: {field}")
                return False
        
        # Check minimum text length
        if len(item['combined_text']) < 10:
            logger.warning(f"Item text too short: {len(item['combined_text'])} characters")
            return False
        
        # Check maximum text length (to avoid processing very long content)
        if len(item['combined_text']) > 10000:
            logger.warning(f"Item text too long: {len(item['combined_text'])} characters")
            # Truncate instead of rejecting
            item['combined_text'] = item['combined_text'][:10000] + '...'
        
        return True
    
    def filter_by_relevance(self, items: List[Dict], min_keywords: int = 1) -> List[Dict]:
        """
        Filter items by housing relevance
        
        Args:
            items: List of processed items
            min_keywords: Minimum number of housing keywords required
            
        Returns:
            Filtered list of relevant items
        """
        relevant_items = []
        
        for item in items:
            housing_keywords = item.get('housing_keywords', [])
            if len(housing_keywords) >= min_keywords:
                relevant_items.append(item)
        
        logger.info(f"Filtered {len(relevant_items)} relevant items from {len(items)} total")
        return relevant_items
    
    def deduplicate(self, items: List[Dict]) -> List[Dict]:
        """
        Remove duplicate items based on content similarity
        
        Args:
            items: List of items to deduplicate
            
        Returns:
            Deduplicated list of items
        """
        unique_items = []
        seen_content = set()
        
        for item in items:
            # Create a simple content hash for deduplication
            content_hash = hash(item.get('combined_text', '')[:500])  # First 500 chars
            
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                unique_items.append(item)
        
        logger.info(f"Deduplicated {len(items)} items to {len(unique_items)} unique items")
        return unique_items
    
    def sort_by_relevance(self, items: List[Dict]) -> List[Dict]:
        """
        Sort items by relevance score
        
        Args:
            items: List of items to sort
            
        Returns:
            Sorted list of items (most relevant first)
        """
        def calculate_relevance(item):
            score = 0
            
            # More housing keywords = higher relevance
            score += len(item.get('housing_keywords', [])) * 10
            
            # Newer content = higher relevance
            try:
                published_date = datetime.fromisoformat(item.get('published_date', ''))
                days_old = (datetime.now() - published_date).days
                score += max(0, 30 - days_old)  # Bonus for recent content
            except:
                pass
            
            # Engagement metrics (if available)
            engagement = item.get('engagement', {})
            if isinstance(engagement, dict):
                score += engagement.get('likes', 0) * 0.1
                score += engagement.get('shares', 0) * 0.2
                score += engagement.get('comments', 0) * 0.1
            
            return score
        
        sorted_items = sorted(items, key=calculate_relevance, reverse=True)
        return sorted_items
