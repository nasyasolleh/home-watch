"""
Sentiment Analysis Module for HomeWatch

Advanced sentiment analysis using multiple techniques:
- VADER sentiment analysis for social media text
- TextBlob for general sentiment
- Custom housing domain classifier
- Malaysian context awareness
"""

import re
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

# NLP Libraries
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer

# Initialize logging first
logger = logging.getLogger(__name__)

# Download required NLTK data
def ensure_nltk_data():
    """Ensure required NLTK data is available"""
    try:
        # Try basic tokenization first
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        try:
            nltk.download('punkt', quiet=True)
        except Exception as e:
            logger.warning(f"Could not download punkt: {e}")
    
    try:
        # Try newer punkt_tab if available
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        try:
            nltk.download('punkt_tab', quiet=True)
        except Exception:
            pass  # Not critical if this fails
    
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        try:
            nltk.download('stopwords', quiet=True)
        except Exception as e:
            logger.warning(f"Could not download stopwords: {e}")

# Initialize NLTK data
try:
    ensure_nltk_data()
except Exception as e:
    print(f"NLTK initialization warning: {e}")

logger = logging.getLogger(__name__)

@dataclass
class SentimentResult:
    """Data class for sentiment analysis results"""
    text: str
    source: str
    sentiment_label: str  # positive, negative, neutral
    confidence: float
    scores: Dict[str, float]
    keywords: List[str]
    housing_relevance: float
    region_mentioned: Optional[str]
    program_mentioned: Optional[str]
    metadata: Dict
    analyzed_at: datetime

class SentimentAnalyzer:
    """
    Comprehensive sentiment analyzer for housing-related content
    """
    
    def __init__(self):
        self.vader = SentimentIntensityAnalyzer()
        self.stemmer = PorterStemmer()
        
        # Load Malaysian stopwords (English + some Malay)
        english_stopwords = set(stopwords.words('english'))
        malay_stopwords = {
            'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'pada', 
            'adalah', 'akan', 'atau', 'juga', 'tidak', 'ada', 'sebagai',
            'dalam', 'oleh', 'ini', 'itu', 'mereka', 'kami', 'kita'
        }
        self.stopwords = english_stopwords.union(malay_stopwords)
        
        # Housing-related keywords and their weights
        self.housing_keywords = {
            # Positive indicators
            'affordable': 2.0, 'approved': 2.0, 'successful': 1.5, 'good': 1.0,
            'excellent': 2.0, 'satisfied': 1.5, 'happy': 1.5, 'convenient': 1.0,
            'easy': 1.0, 'fast': 1.0, 'helpful': 1.0, 'mampu': 1.5, 'berjaya': 2.0,
            
            # Negative indicators
            'expensive': -2.0, 'rejected': -2.5, 'difficult': -1.5, 'slow': -1.0,
            'complicated': -1.5, 'unfair': -2.0, 'disappointed': -2.0, 'mahal': -2.0,
            'susah': -1.5, 'lambat': -1.0, 'ditolak': -2.5,
            
            # Neutral/factual
            'application': 0.0, 'process': 0.0, 'requirement': 0.0, 'status': 0.0,
            'permohonan': 0.0, 'syarat': 0.0
        }
        
        # Malaysian states and regions
        self.regions = {
            'kuala lumpur', 'kl', 'selangor', 'penang', 'johor', 'perak', 'sabah',
            'sarawak', 'kedah', 'kelantan', 'terengganu', 'pahang', 'negeri sembilan',
            'melaka', 'perlis', 'putrajaya', 'labuan'
        }
        
        # Housing programs
        self.programs = {
            'pr1ma': ['pr1ma', '1malaysia', 'prima'],
            'rumah-selangorku': ['rumah selangorku', 'selangorku', 'rsku'],
            'my-first-home': ['my first home', 'myfirst', 'rumah pertama'],
            'pprt': ['pprt', 'program perumahan rakyat'],
            'ppr': ['ppr', 'program perumahan awam'],
            'rumawip': ['rumawip', 'kuala lumpur city hall'],
            'rent-to-own': ['rent to own', 'sewa beli'],
            'social-housing': ['social housing', 'rumah awam']
        }
        
        logger.info("SentimentAnalyzer initialized successfully")
    
    def analyze(self, text: str, source: str = 'user_post', metadata: Dict = None) -> Dict:
        """
        Perform comprehensive sentiment analysis on text
        
        Args:
            text: Input text to analyze
            source: Source of the text (user_post, news, social_media)
            metadata: Additional metadata about the text
            
        Returns:
            Dictionary containing sentiment analysis results
        """
        if not text or not isinstance(text, str):
            raise ValueError("Text must be a non-empty string")
        
        if metadata is None:
            metadata = {}
        
        try:
            # Clean and preprocess text
            cleaned_text = self._preprocess_text(text)
            
            # Perform multiple sentiment analyses
            vader_scores = self._analyze_vader(cleaned_text)
            textblob_scores = self._analyze_textblob(cleaned_text)
            housing_scores = self._analyze_housing_context(cleaned_text)
            
            # Combine scores
            combined_scores = self._combine_scores(vader_scores, textblob_scores, housing_scores)
            
            # Extract features
            keywords = self._extract_keywords(cleaned_text)
            housing_relevance = self._calculate_housing_relevance(cleaned_text, keywords)
            region = self._extract_region(cleaned_text)
            program = self._extract_program(cleaned_text)
            
            # Determine final sentiment
            sentiment_label, confidence = self._determine_sentiment(combined_scores)
            
            result = {
                'text': text[:500],  # Limit stored text length
                'source': source,
                'sentiment_label': sentiment_label,
                'confidence': confidence,
                'scores': {
                    'compound': combined_scores['compound'],
                    'positive': combined_scores['positive'],
                    'negative': combined_scores['negative'],
                    'neutral': combined_scores['neutral'],
                    'vader': vader_scores,
                    'textblob': textblob_scores,
                    'housing_context': housing_scores
                },
                'keywords': keywords,
                'housing_relevance': housing_relevance,
                'region_mentioned': region,
                'program_mentioned': program,
                'metadata': metadata,
                'analyzed_at': datetime.utcnow().isoformat()
            }
            
            logger.debug(f"Sentiment analysis completed: {sentiment_label} ({confidence:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Sentiment analysis error: {str(e)}")
            raise
    
    def analyze_batch(self, texts: List[Dict]) -> List[Dict]:
        """
        Analyze sentiment for multiple texts in batch
        
        Args:
            texts: List of dictionaries with 'text', 'id', and optional metadata
            
        Returns:
            List of sentiment analysis results
        """
        results = []
        
        for item in texts:
            try:
                text = item.get('text', '')
                text_id = item.get('id', f"batch_{len(results)}")
                metadata = item.get('metadata', {})
                metadata['batch_id'] = text_id
                
                result = self.analyze(text, metadata=metadata)
                result['id'] = text_id
                results.append(result)
                
            except Exception as e:
                logger.error(f"Batch analysis error for item {item.get('id', 'unknown')}: {str(e)}")
                # Add error result
                results.append({
                    'id': item.get('id', f"error_{len(results)}"),
                    'error': str(e),
                    'analyzed_at': datetime.utcnow().isoformat()
                })
        
        logger.info(f"Batch analysis completed: {len(results)} items processed")
        return results
    
    def _preprocess_text(self, text: str) -> str:
        """Clean and preprocess text for analysis"""
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove email addresses
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', text)
        
        # Remove phone numbers
        text = re.sub(r'(\+?6?01[0-46-9]-*[0-9]{7,8})', '', text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s\.\!\?\,\-]', ' ', text)
        
        return text
    
    def _analyze_vader(self, text: str) -> Dict[str, float]:
        """Analyze sentiment using VADER"""
        scores = self.vader.polarity_scores(text)
        return {
            'compound': scores['compound'],
            'positive': scores['pos'],
            'negative': scores['neg'],
            'neutral': scores['neu']
        }
    
    def _analyze_textblob(self, text: str) -> Dict[str, float]:
        """Analyze sentiment using TextBlob"""
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity  # -1 to 1
        subjectivity = blob.sentiment.subjectivity  # 0 to 1
        
        # Convert to VADER-like scores
        if polarity > 0:
            positive = polarity
            negative = 0
        else:
            positive = 0
            negative = abs(polarity)
        
        neutral = 1 - (positive + negative)
        
        return {
            'compound': polarity,
            'positive': positive,
            'negative': negative,
            'neutral': neutral,
            'subjectivity': subjectivity
        }
    
    def _analyze_housing_context(self, text: str) -> Dict[str, float]:
        """Analyze sentiment in housing context"""
        words = word_tokenize(text)
        total_score = 0
        word_count = 0
        
        for word in words:
            if word in self.housing_keywords:
                total_score += self.housing_keywords[word]
                word_count += 1
        
        if word_count == 0:
            return {'compound': 0, 'positive': 0, 'negative': 0, 'neutral': 1}
        
        # Normalize score
        avg_score = total_score / word_count
        compound = max(-1, min(1, avg_score / 2))  # Normalize to -1 to 1
        
        if compound > 0:
            positive = compound
            negative = 0
        else:
            positive = 0
            negative = abs(compound)
        
        neutral = 1 - (positive + negative)
        
        return {
            'compound': compound,
            'positive': positive,
            'negative': negative,
            'neutral': neutral
        }
    
    def _combine_scores(self, vader: Dict, textblob: Dict, housing: Dict) -> Dict[str, float]:
        """Combine scores from different analyzers"""
        # Weighted combination
        weights = {
            'vader': 0.4,
            'textblob': 0.3,
            'housing': 0.3
        }
        
        compound = (
            vader['compound'] * weights['vader'] +
            textblob['compound'] * weights['textblob'] +
            housing['compound'] * weights['housing']
        )
        
        positive = (
            vader['positive'] * weights['vader'] +
            textblob['positive'] * weights['textblob'] +
            housing['positive'] * weights['housing']
        )
        
        negative = (
            vader['negative'] * weights['vader'] +
            textblob['negative'] * weights['textblob'] +
            housing['negative'] * weights['housing']
        )
        
        neutral = (
            vader['neutral'] * weights['vader'] +
            textblob['neutral'] * weights['textblob'] +
            housing['neutral'] * weights['housing']
        )
        
        return {
            'compound': compound,
            'positive': positive,
            'negative': negative,
            'neutral': neutral
        }
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text"""
        words = word_tokenize(text)
        
        # Filter out stopwords and short words
        keywords = [
            word for word in words 
            if len(word) > 2 and word not in self.stopwords
        ]
        
        # Include housing-specific keywords
        housing_keywords_found = [
            word for word in keywords 
            if word in self.housing_keywords
        ]
        
        # Combine and remove duplicates
        all_keywords = list(set(keywords + housing_keywords_found))
        
        # Return top 10 keywords
        return all_keywords[:10]
    
    def _calculate_housing_relevance(self, text: str, keywords: List[str]) -> float:
        """Calculate how relevant the text is to housing topics"""
        housing_terms = [
            'house', 'home', 'property', 'housing', 'apartment', 'condo',
            'rumah', 'hartanah', 'pr1ma', 'affordable', 'loan', 'mortgage',
            'rent', 'buy', 'purchase', 'development', 'project'
        ]
        
        text_words = set(word_tokenize(text))
        housing_word_count = sum(1 for word in text_words if word in housing_terms)
        keyword_housing_count = sum(1 for keyword in keywords if keyword in self.housing_keywords)
        
        # Calculate relevance score
        total_words = len(text_words)
        if total_words == 0:
            return 0.0
        
        relevance = (housing_word_count + keyword_housing_count * 2) / total_words
        return min(1.0, relevance * 5)  # Scale and cap at 1.0
    
    def _extract_region(self, text: str) -> Optional[str]:
        """Extract mentioned Malaysian state/region"""
        text_words = set(word_tokenize(text))
        
        for region in self.regions:
            if region in text or any(word in region.split() for word in text_words):
                return region
        
        return None
    
    def _extract_program(self, text: str) -> Optional[str]:
        """Extract mentioned housing program"""
        text_lower = text.lower()
        
        for program_id, variations in self.programs.items():
            for variation in variations:
                if variation in text_lower:
                    return program_id
        
        return None
    
    def _determine_sentiment(self, scores: Dict[str, float]) -> Tuple[str, float]:
        """Determine final sentiment label and confidence"""
        compound = scores['compound']
        positive = scores['positive']
        negative = scores['negative']
        neutral = scores['neutral']
        
        # Determine sentiment based on compound score
        if compound >= 0.05:
            sentiment = 'positive'
            confidence = positive
        elif compound <= -0.05:
            sentiment = 'negative'
            confidence = negative
        else:
            sentiment = 'neutral'
            confidence = neutral
        
        # Ensure confidence is between 0 and 1
        confidence = max(0.0, min(1.0, confidence))
        
        return sentiment, confidence
    
    def generate_wordcloud_data(self, texts: List[str], max_words: int = 100) -> Dict[str, int]:
        """
        Generate word frequency data for word cloud visualization
        
        Args:
            texts: List of text strings to analyze
            max_words: Maximum number of words to return
            
        Returns:
            Dictionary of word frequencies
        """
        from collections import Counter
        import string
        
        # Combine all texts
        all_text = ' '.join(texts).lower()
        
        # Clean and tokenize
        # Remove punctuation and numbers
        translator = str.maketrans('', '', string.punctuation + string.digits)
        cleaned_text = all_text.translate(translator)
        
        # Tokenize
        words = word_tokenize(cleaned_text)
        
        # Get Malaysian English stopwords
        stop_words = set(stopwords.words('english'))
        
        # Add custom stopwords relevant to housing discussions
        custom_stopwords = {
            'housing', 'house', 'home', 'property', 'malaysia', 'malaysian',
            'government', 'scheme', 'program', 'programme', 'policy', 'policies',
            'affordable', 'low', 'cost', 'income', 'price', 'prices',
            'rm', 'ringgit', 'thousand', 'million', 'billion',
            'people', 'person', 'individual', 'citizen', 'citizens',
            'country', 'nation', 'national', 'state', 'federal',
            'would', 'could', 'should', 'will', 'shall', 'may', 'might',
            'one', 'two', 'three', 'many', 'much', 'more', 'most',
            'also', 'even', 'still', 'yet', 'however', 'therefore',
            'said', 'says', 'according', 'reported', 'stated'
        }
        stop_words.update(custom_stopwords)
        
        # Filter words
        filtered_words = [
            word for word in words 
            if len(word) > 3  # Minimum word length
            and word not in stop_words
            and word.isalpha()  # Only alphabetic characters
            and not word.isdigit()  # No pure numbers
        ]
        
        # Apply stemming
        stemmer = PorterStemmer()
        stemmed_words = [stemmer.stem(word) for word in filtered_words]
        
        # Count word frequencies
        word_freq = Counter(stemmed_words)
        
        # Get top words
        top_words = dict(word_freq.most_common(max_words))
        
        # If we have housing-specific terms, boost their frequency
        housing_keywords = {
            'pr1ma', 'rumawip', 'pprt', 'ppr', 'mydeposit', 'myfirst',
            'develop', 'construct', 'build', 'project', 'unit',
            'owner', 'buyer', 'purchase', 'rent', 'rental',
            'loan', 'mortgage', 'financ', 'fund', 'subsidi',
            'eligibl', 'criteria', 'qualifi', 'applic',
            'kuala', 'lumpur', 'selangor', 'johor', 'penang',
            'perak', 'sabah', 'sarawak', 'kedah', 'negeri'
        }
        
        for word in top_words:
            if any(keyword in word for keyword in housing_keywords):
                top_words[word] = int(top_words[word] * 1.5)  # Boost relevance
        
        return top_words
