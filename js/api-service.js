/**
 * HomeWatch API Service
 * Handles communication between frontend and Flask backend
 */

class APIService {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Lazy initialization of config
    getConfig() {
        if (!window.AppConfig) {
            throw new Error('AppConfig not loaded. Make sure config.js is loaded before api-service.js');
        }
        return window.AppConfig;
    }

    get baseUrl() {
        return this.getConfig().api.baseUrl;
    }

    get timeout() {
        return this.getConfig().api.timeout;
    }

    /**
     * Generic HTTP request method with retry logic
     */
    async request(url, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: this.timeout,
            ...options
        };

        // Add auth token if available
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return { success: true, data };

            } catch (error) {
                console.warn(`API request attempt ${attempt} failed:`, error.message);
                
                if (attempt === this.retryAttempts) {
                    return { 
                        success: false, 
                        error: error.message,
                        code: error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'
                    };
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        return this.request(url.toString());
    }

    /**
     * POST request
     */
    async post(endpoint, data = {}) {
        return this.request(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data = {}) {
        return this.request(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE'
        });
    }

    // ===================
    // SENTIMENT ANALYSIS
    // ===================

    /**
     * Analyze sentiment of single text
     */
    async analyzeSentiment(text, options = {}) {
        try {
            const response = await this.post(this.getConfig().api.endpoints.sentiment, {
                text: text,
                language: options.language || 'en',
                context: options.context || 'housing',
                include_emotions: options.includeEmotions || true,
                include_keywords: options.includeKeywords || true
            });

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Sentiment analysis failed:', error);
            throw error;
        }
    }

    /**
     * Analyze sentiment of multiple texts in batch
     */
    async analyzeSentimentBatch(texts, options = {}) {
        try {
            const response = await this.post(this.getConfig().api.endpoints.sentimentBatch, {
                texts: texts,
                language: options.language || 'en',
                context: options.context || 'housing',
                include_emotions: options.includeEmotions || true,
                include_keywords: options.includeKeywords || true
            });

            if (response.success) {
                // The backend returns { success: true, results: [...], count: ..., timestamp: ... }
                // But the request method wraps it in { success: true, data: {...} }
                return response.data.results;
            } else {
                throw new Error(response.error || 'API request failed');
            }
        } catch (error) {
            console.error('Batch sentiment analysis failed:', error);
            throw error;
        }
    }

    // ===================
    // DATA COLLECTION
    // ===================

    /**
     * Trigger data collection from various sources
     */
    async collectData(sources = ['news', 'social'], options = {}) {
        try {
            const response = await this.post(this.getConfig().api.endpoints.data, {
                sources: sources,
                keywords: options.keywords || ['affordable housing', 'rumah mampu milik', 'housing policy'],
                limit: options.limit || 100,
                days_back: options.daysBack || 7
            });

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Data collection failed:', error);
            throw error;
        }
    }

    /**
     * Process collected data for sentiment analysis
     */
    async processData(dataIds = []) {
        try {
            const response = await this.post(this.getConfig().api.endpoints.dataProcess, {
                data_ids: dataIds,
                analyze_sentiment: true,
                extract_keywords: true,
                categorize: true
            });

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Data processing failed:', error);
            throw error;
        }
    }

    /**
     * Get news articles from the backend
     */
    async getNews(options = {}) {
        try {
            const params = new URLSearchParams({
                limit: options.limit || 10,
                category: options.category || 'all',
                days_back: options.daysBack || 30
            });

            const response = await this.get(`/api/data/news?${params}`);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Failed to fetch news');
            }
        } catch (error) {
            console.error('Get news error:', error);
            throw error;
        }
    }

    // ===================
    // ANALYTICS
    // ===================

    /**
     * Get dashboard analytics data
     */
    async getDashboardAnalytics(timeframe = '30d', filters = {}) {
        try {
            const params = {
                timeframe: timeframe,
                ...filters
            };

            const response = await this.get(this.getConfig().api.endpoints.analytics, params);

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Analytics fetch failed:', error);
            throw error;
        }
    }

    /**
     * Export analytics data
     */
    async exportAnalytics(format = 'json', filters = {}) {
        try {
            const params = {
                format: format,
                ...filters
            };

            const response = await this.get(this.getConfig().api.endpoints.analyticsExport, params);

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Analytics export failed:', error);
            throw error;
        }
    }

    // ===================
    // HEALTH & STATUS
    // ===================

    /**
     * Check API health status
     */
    async checkHealth() {
        try {
            const response = await this.get(this.getConfig().api.endpoints.health);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('Health check failed:', error);
            return null;
        }
    }

    /**
     * Get API status and statistics
     */
    async getStatus() {
        try {
            const response = await this.get(this.getConfig().api.endpoints.status);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('Status check failed:', error);
            return null;
        }
    }

    // ===================
    // REAL-TIME UPDATES
    // ===================

    /**
     * Subscribe to real-time sentiment updates (using polling for now)
     */
    startSentimentUpdates(callback, interval = 30000) {
        const updateInterval = setInterval(async () => {
            try {
                const analytics = await this.getDashboardAnalytics('1d');
                if (analytics) {
                    callback(analytics);
                }
            } catch (error) {
                console.error('Real-time update failed:', error);
            }
        }, interval);

        return updateInterval; // Return interval ID for cleanup
    }

    /**
     * Stop real-time updates
     */
    stopSentimentUpdates(intervalId) {
        if (intervalId) {
            clearInterval(intervalId);
        }
    }
}

// Create global API service instance
window.apiService = new APIService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
