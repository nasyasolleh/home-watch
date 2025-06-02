// Dashboard JavaScript functionality with Backend Integration
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Global variables
let sentimentChart, sentimentPieChart, programsChart, sourcesChart;
let realTimeUpdateInterval;
let currentAnalyticsData = null;

// Initialize dashboard
async function initializeDashboard() {
    try {
        // Show loading state
        showLoadingState();
        
        // Check API health
        const healthStatus = await window.apiService.checkHealth();
        if (!healthStatus) {
            showError('Backend API is not available. Using demo data.');
            initializeWithDemoData();
            return;
        }
        
        // Load real analytics data
        await loadAnalyticsData();
        
        // Initialize charts with real data
        initializeCharts();
        
        // Set up real-time updates
        startRealTimeUpdates();
        
        // Set up event listeners
        setupEventListeners();
        
        hideLoadingState();
        
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        showError('Failed to load dashboard data. Using demo data.');
        initializeWithDemoData();
    }
}

// Load analytics data from backend
async function loadAnalyticsData(timeframe = '30d') {
    try {
        const response = await window.apiService.getDashboardAnalytics(timeframe);
        currentAnalyticsData = response;
        
        // Update summary cards
        updateSummaryCards(response);
        
        // Update recent activities
        updateRecentActivities(response);
        
        return response;
    } catch (error) {
        console.error('Failed to load analytics data:', error);
        throw error;
    }
}

// Update summary cards with real data
function updateSummaryCards(data) {
    if (!data || !data.summary) return;
    
    const summary = data.summary;
    
    // Update total posts
    const totalPostsElement = document.querySelector('.summary-card:nth-child(1) .summary-number');
    if (totalPostsElement) {
        totalPostsElement.textContent = (summary.total_posts || 0).toLocaleString();
    }
    
    // Update sentiment score
    const sentimentScoreElement = document.querySelector('.summary-card:nth-child(2) .summary-number');
    if (sentimentScoreElement) {
        const score = summary.average_sentiment || 0;
        sentimentScoreElement.textContent = `${(score * 100).toFixed(1)}%`;
        
        // Update color based on sentiment
        const card = sentimentScoreElement.closest('.summary-card');
        card.classList.remove('positive', 'neutral', 'negative');
        if (score > 0.1) card.classList.add('positive');
        else if (score < -0.1) card.classList.add('negative');
        else card.classList.add('neutral');
    }
    
    // Update engagement rate
    const engagementElement = document.querySelector('.summary-card:nth-child(3) .summary-number');
    if (engagementElement) {
        const rate = summary.engagement_rate || 0;
        engagementElement.textContent = `${(rate * 100).toFixed(1)}%`;
    }
    
    // Update trend indicators
    updateTrendIndicators(summary.trends || {});
}

// Update trend indicators
function updateTrendIndicators(trends) {
    const indicators = document.querySelectorAll('.trend-indicator');
    
    indicators.forEach((indicator, index) => {
        const trendKey = ['posts', 'sentiment', 'engagement'][index];
        const trend = trends[trendKey] || 0;
        
        indicator.classList.remove('trend-up', 'trend-down', 'trend-neutral');
        
        if (trend > 0.05) {
            indicator.classList.add('trend-up');
            indicator.innerHTML = '<i class="fas fa-arrow-up"></i>';
        } else if (trend < -0.05) {
            indicator.classList.add('trend-down');
            indicator.innerHTML = '<i class="fas fa-arrow-down"></i>';
        } else {
            indicator.classList.add('trend-neutral');
            indicator.innerHTML = '<i class="fas fa-minus"></i>';
        }
    });
}

// Initialize charts with real data
function initializeCharts() {
    if (currentAnalyticsData) {
        initSentimentChart(currentAnalyticsData.sentiment_trends || []);
        initSentimentPieChart(currentAnalyticsData.sentiment_distribution || {});
        initProgramsChart(currentAnalyticsData.program_mentions || []);
        initSourcesChart(currentAnalyticsData.source_distribution || []);
    } else {
        // Initialize with demo data
        initializeWithDemoData();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Time range selector
    const timeRangeSelect = document.getElementById('timeRange');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', async function() {
            showLoadingState();
            try {
                await loadAnalyticsData(this.value);
                updateCharts();
            } catch (error) {
                showError('Failed to update chart data');
            } finally {
                hideLoadingState();
            }
        });
    }
    
    // Export button
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportAnalyticsData);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            showLoadingState();
            try {
                await loadAnalyticsData();
                updateCharts();
                showSuccess('Data refreshed successfully');
            } catch (error) {
                showError('Failed to refresh data');
            } finally {
                hideLoadingState();
            }
        });
    }
}

// Sentiment trend chart with real data
function initSentimentChart(sentimentTrends = []) {
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    
    // Process real data or use demo data
    let chartData;
    if (sentimentTrends.length > 0) {
        chartData = processSentimentTrendsData(sentimentTrends);
    } else {
        chartData = {
            labels: generateDateLabels(30),
            datasets: [
                {
                    label: 'Positive',
                    data: generateSentimentData(30, 'positive'),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Neutral',
                    data: generateSentimentData(30, 'neutral'),
                    borderColor: '#64748b',
                    backgroundColor: 'rgba(100, 116, 139, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Negative',
                    data: generateSentimentData(30, 'negative'),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };
    }
    
    // Destroy existing chart if it exists
    if (window.sentimentChart) {
        window.sentimentChart.destroy();
    }
    
    const sentimentChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
    
    window.sentimentChart = sentimentChart;
}

// Process backend sentiment trends data for chart
function processSentimentTrendsData(trends) {
    const labels = trends.map(item => new Date(item.date).toLocaleDateString());
    
    return {
        labels: labels,
        datasets: [
            {
                label: 'Positive',
                data: trends.map(item => (item.positive * 100).toFixed(1)),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Neutral',
                data: trends.map(item => (item.neutral * 100).toFixed(1)),
                borderColor: '#64748b',
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Negative',
                data: trends.map(item => (item.negative * 100).toFixed(1)),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    };
}

// Sentiment distribution pie chart with real data
function initSentimentPieChart(distribution = {}) {
    const ctx = document.getElementById('sentimentPieChart').getContext('2d');
    
    // Process real data or use demo data
    let chartData;
    if (Object.keys(distribution).length > 0) {
        chartData = {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [
                    ((distribution.positive || 0) * 100).toFixed(1),
                    ((distribution.neutral || 0) * 100).toFixed(1),
                    ((distribution.negative || 0) * 100).toFixed(1)
                ],
                backgroundColor: ['#10b981', '#64748b', '#ef4444'],
                borderWidth: 0
            }]
        };
    } else {
        chartData = {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [72, 18, 10],
                backgroundColor: ['#10b981', '#64748b', '#ef4444'],
                borderWidth: 0
            }]
        };
    }
    
    // Destroy existing chart if it exists
    if (window.sentimentPieChart) {
        window.sentimentPieChart.destroy();
    }
    
    const sentimentPieChart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
    
    window.sentimentPieChart = sentimentPieChart;
}
                backgroundColor: [
                    '#10b981',
                    '#64748b',
                    '#ef4444'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Housing programs mentions chart
function initProgramsChart() {
    const ctx = document.getElementById('programsChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['PR1MA', 'MyFirst Home', 'PPR', 'RUMAWIP', 'PPA1M'],
            datasets: [{
                label: 'Mentions',
                data: [245, 189, 156, 134, 98],
                backgroundColor: [
                    '#2563eb',
                    '#3b82f6',
                    '#60a5fa',
                    '#93c5fd',
                    '#dbeafe'
                ],
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Data sources chart
function initSourcesChart() {
    const ctx = document.getElementById('sourcesChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Twitter', 'News Articles', 'Surveys', 'Facebook'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: [
                    '#1da1f2',
                    '#ff6b35',
                    '#2563eb',
                    '#1877f2'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update sentiment chart based on time range
function updateSentimentChart(days) {
    const chart = window.sentimentChart;
    if (chart) {
        chart.data.labels = generateDateLabels(parseInt(days));
        chart.data.datasets[0].data = generateSentimentData(parseInt(days), 'positive');
        chart.data.datasets[1].data = generateSentimentData(parseInt(days), 'neutral');
        chart.data.datasets[2].data = generateSentimentData(parseInt(days), 'negative');
        chart.update();
    }
}

// Generate date labels for charts
function generateDateLabels(days) {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }));
    }
    return labels;
}

// Generate sample sentiment data
function generateSentimentData(days, type) {
    const data = [];
    const baseValues = {
        positive: 65,
        neutral: 25,
        negative: 10
    };
    
    for (let i = 0; i < days; i++) {
        const variance = (Math.random() - 0.5) * 20;
        const value = Math.max(0, Math.min(100, baseValues[type] + variance));
        data.push(Math.round(value));
    }
    return data;
}

// Load recent social media posts
function loadRecentPosts() {
    const postsContainer = document.getElementById('recentPosts');
    
    // Show loading skeleton
    showLoadingSkeleton(postsContainer, 'posts');
    
    // Simulate API call
    setTimeout(() => {
        const samplePosts = [
            {
                author: '@homebuyer_my',
                time: '2 hours ago',
                content: 'Finally got approved for PR1MA! The process was smoother than expected. Great initiative by the government! 🏠',
                sentiment: 'positive'
            },
            {
                author: '@property_news',
                time: '4 hours ago',
                content: 'New MyFirst Home scheme applications opening next month. Interest rates looking competitive at 3.5%.',
                sentiment: 'neutral'
            },
            {
                author: '@kl_resident',
                time: '6 hours ago',
                content: 'PPR maintenance issues still not resolved after 3 months. When will authorities take action? #housingissues',
                sentiment: 'negative'
            },
            {
                author: '@young_professional',
                time: '8 hours ago',
                content: 'RUMAWIP scheme gives hope to young professionals like me. Affordable housing in KL is finally possible!',
                sentiment: 'positive'
            },
            {
                author: '@family_seeker',
                time: '10 hours ago',
                content: 'Comparing different housing schemes. PR1MA vs MyFirst Home - which offers better value?',
                sentiment: 'neutral'
            }
        ];
        
        displayPosts(samplePosts, postsContainer);
    }, 1500);
}

// Load recent news articles
function loadRecentNews() {
    const newsContainer = document.getElementById('recentNews');
    
    // Show loading skeleton
    showLoadingSkeleton(newsContainer, 'news');
    
    // Simulate API call
    setTimeout(() => {
        const sampleNews = [
            {
                source: 'The Star',
                time: '1 hour ago',
                content: 'Government announces new affordable housing initiative targeting 100,000 units by 2026'
            },
            {
                source: 'New Straits Times',
                time: '3 hours ago',
                content: 'PR1MA scheme shows 40% increase in applications compared to last quarter'
            },
            {
                source: 'Malay Mail',
                time: '5 hours ago',
                content: 'Housing Ministry reviews eligibility criteria for affordable housing programs'
            },
            {
                source: 'EdgeProp',
                time: '7 hours ago',
                content: 'Analysis: Impact of new housing policies on property market trends'
            },
            {
                source: 'FMT News',
                time: '9 hours ago',
                content: 'Urban planning experts discuss sustainable affordable housing development'
            }
        ];
        
        displayNews(sampleNews, newsContainer);
    }, 2000);
}

// Display posts in the container
function displayPosts(posts, container) {
    container.innerHTML = posts.map(post => `
        <div class="post-item">
            <div class="post-header">
                <span class="post-author">${post.author}</span>
                <span class="post-time">${post.time}</span>
            </div>
            <div class="post-content">${post.content}</div>
            <span class="post-sentiment sentiment-${post.sentiment}">${post.sentiment}</span>
        </div>
    `).join('');
}

// Display news in the container
function displayNews(news, container) {
    container.innerHTML = news.map(article => `
        <div class="news-item">
            <div class="news-header">
                <span class="news-source">${article.source}</span>
                <span class="news-time">${article.time}</span>
            </div>
            <div class="news-content">${article.content}</div>
        </div>
    `).join('');
}

// Show loading skeleton
function showLoadingSkeleton(container, type) {
    const skeletonItems = Array.from({ length: 5 }, () => `
        <div class="${type === 'posts' ? 'post' : 'news'}-skeleton">
            <div class="skeleton-line loading-skeleton short"></div>
            <div class="skeleton-line loading-skeleton medium"></div>
            <div class="skeleton-line loading-skeleton long"></div>
            ${type === 'posts' ? '<div class="skeleton-line loading-skeleton short"></div>' : ''}
        </div>
    `).join('');
    
    container.innerHTML = skeletonItems;
}

// Refresh functions
function refreshPosts() {
    loadRecentPosts();
}

function refreshNews() {
    loadRecentNews();
}

// Real-time updates simulation
function startRealTimeUpdates() {
    setInterval(() => {
        // Update statistics
        updateDashboardStats();
        
        // Refresh data every 5 minutes
        if (Math.random() > 0.8) {
            loadRecentPosts();
            loadRecentNews();
        }
    }, 30000); // Update every 30 seconds
}

// Update dashboard statistics
function updateDashboardStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const currentValue = parseInt(stat.textContent.replace(/[^\d]/g, ''));
        const variance = Math.floor(Math.random() * 10) - 5;
        const newValue = Math.max(0, currentValue + variance);
        
        if (stat.textContent.includes('%')) {
            stat.textContent = Math.min(100, newValue) + '%';
        } else {
            stat.textContent = newValue.toLocaleString();
        }
    });
}

// Start real-time updates when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(startRealTimeUpdates, 5000);
});

// Export functions for global access
window.refreshPosts = refreshPosts;
window.refreshNews = refreshNews;

// Enhanced Dashboard Analytics
class AdvancedAnalytics {
    constructor() {
        this.charts = {};
        this.realTimeData = null;
        this.filters = {
            timeRange: '30',
            category: 'all',
            region: 'all'
        };
        this.init();
    }

    init() {
        this.bindFilterEvents();
        this.loadAdvancedCharts();
        this.setupRealTimeUpdates();
        this.initializeInsights();
    }

    bindFilterEvents() {
        // Time range filter
        const timeRange = document.getElementById('timeRange');
        if (timeRange) {
            timeRange.addEventListener('change', (e) => {
                this.filters.timeRange = e.target.value;
                this.refreshData();
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.refreshData();
            });
        }

        // Region filter
        const regionFilter = document.getElementById('regionFilter');
        if (regionFilter) {
            regionFilter.addEventListener('change', (e) => {
                this.filters.region = e.target.value;
                this.refreshData();
            });
        }
    }

    async loadAdvancedCharts() {
        try {
            LoadingState.show('Loading analytics...');
            
            await Promise.all([
                this.createSentimentHeatmap(),
                this.createRegionalComparison(),
                this.createTrendAnalysis(),
                this.createTopicModeling(),
                this.createPredictiveAnalytics()
            ]);

            LoadingState.hide();
        } catch (error) {
            ErrorHandler.log(error, 'Loading advanced charts');
            ErrorHandler.show('Failed to load analytics data');
            LoadingState.hide();
        }
    }

    createSentimentHeatmap() {
        const ctx = document.getElementById('sentimentHeatmap');
        if (!ctx) return;

        const heatmapData = this.generateHeatmapData();
        
        this.charts.heatmap = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Sentiment by Time and Location',
                    data: heatmapData,
                    backgroundColor: (context) => {
                        const value = context.parsed.y;
                        if (value > 0.6) return 'rgba(16, 185, 129, 0.8)'; // Green
                        if (value > 0.4) return 'rgba(245, 158, 11, 0.8)'; // Yellow
                        return 'rgba(239, 68, 68, 0.8)'; // Red
                    }
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sentiment Heatmap by Region and Time'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Sentiment: ${(context.parsed.y * 100).toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time (Hours)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Sentiment Score'
                        },
                        min: 0,
                        max: 1
                    }
                }
            }
        });
    }

    createRegionalComparison() {
        const ctx = document.getElementById('regionalChart');
        if (!ctx) return;

        const regionData = this.generateRegionalData();

        this.charts.regional = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: regionData.labels,
                datasets: [
                    {
                        label: 'Positive Sentiment',
                        data: regionData.positive,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)'
                    },
                    {
                        label: 'Neutral Sentiment',
                        data: regionData.neutral,
                        backgroundColor: 'rgba(156, 163, 175, 0.8)'
                    },
                    {
                        label: 'Negative Sentiment',
                        data: regionData.negative,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Regional Sentiment Comparison'
                    }
                },
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Number of Posts'
                        }
                    }
                }
            }
        });
    }

    createTrendAnalysis() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        const trendData = this.generateTrendData();

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [
                    {
                        label: 'Overall Sentiment',
                        data: trendData.sentiment,
                        borderColor: 'rgb(37, 99, 235)',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Housing Prices',
                        data: trendData.prices,
                        borderColor: 'rgb(245, 158, 11)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Sentiment vs Housing Price Trends'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Sentiment Score'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Price Index'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    createTopicModeling() {
        const ctx = document.getElementById('topicsChart');
        if (!ctx) return;

        const topicData = this.generateTopicData();

        this.charts.topics = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topicData.labels,
                datasets: [{
                    data: topicData.values,
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Discussion Topics Distribution'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createPredictiveAnalytics() {
        const ctx = document.getElementById('predictiveChart');
        if (!ctx) return;

        const predictiveData = this.generatePredictiveData();

        this.charts.predictive = new Chart(ctx, {
            type: 'line',
            data: {
                labels: predictiveData.labels,
                datasets: [
                    {
                        label: 'Historical Data',
                        data: predictiveData.historical,
                        borderColor: 'rgb(37, 99, 235)',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)'
                    },
                    {
                        label: 'Predicted Trend',
                        data: predictiveData.predicted,
                        borderColor: 'rgb(245, 158, 11)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sentiment Prediction (Next 30 Days)'
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Sentiment Score'
                        },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    // Mock data generators
    generateHeatmapData() {
        const data = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let region = 0; region < 13; region++) {
                data.push({
                    x: hour,
                    y: Math.random(),
                    region: `Region ${region + 1}`
                });
            }
        }
        return data;
    }

    generateRegionalData() {
        return {
            labels: ['Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Perak', 'Sarawak'],
            positive: [45, 38, 42, 35, 30, 28],
            neutral: [30, 35, 32, 40, 38, 42],
            negative: [25, 27, 26, 25, 32, 30]
        };
    }

    generateTrendData() {
        const labels = [];
        const sentiment = [];
        const prices = [];
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
            sentiment.push(Math.random() * 40 + 40); // 40-80 range
            prices.push(Math.random() * 20 + 90); // 90-110 range
        }
        
        return { labels, sentiment, prices };
    }

    generateTopicData() {
        return {
            labels: ['Affordability', 'Location', 'Quality', 'Process', 'Timeline', 'Support'],
            values: [35, 20, 15, 12, 10, 8]
        };
    }

    generatePredictiveData() {
        const labels = [];
        const historical = [];
        const predicted = [];
        
        // Historical data (last 30 days)
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
            historical.push(Math.random() * 30 + 50);
        }
        
        // Predicted data (next 30 days)
        for (let i = 1; i <= 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            labels.push(date.toLocaleDateString());
            historical.push(null);
            predicted.push(Math.random() * 25 + 55);
        }
        
        return { labels, historical, predicted };
    }

    setupRealTimeUpdates() {
        if (!AppConfig.features.enableRealTimeUpdates) return;

        // Simulate real-time updates every 30 seconds
        setInterval(() => {
            this.updateRealTimeData();
        }, 30000);
    }

    updateRealTimeData() {
        // Update live statistics
        this.updateLiveStats();
        
        // Refresh charts with new data
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.update === 'function') {
                chart.update('none'); // No animation for real-time updates
            }
        });
    }

    updateLiveStats() {
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(stat => {
            const currentValue = parseInt(stat.textContent.replace(/,/g, ''));
            const newValue = currentValue + Math.floor(Math.random() * 5);
            stat.textContent = newValue.toLocaleString();
        });
    }

    async refreshData() {
        LoadingState.show('Refreshing data...');
        
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Refresh all charts
            await this.loadAdvancedCharts();
            
            ErrorHandler.showNotification('Data refreshed successfully', 'success');
        } catch (error) {
            ErrorHandler.log(error, 'Refreshing data');
            ErrorHandler.show('Failed to refresh data');
        } finally {
            LoadingState.hide();
        }
    }

    initializeInsights() {
        this.generateInsights();
        this.updateInsightsDisplay();
    }

    generateInsights() {
        // AI-powered insights (simulated)
        this.insights = [
            {
                type: 'trend',
                title: 'Positive Sentiment Increase',
                description: 'Housing sentiment has improved by 15% this month, primarily due to new PR1MA developments.',
                impact: 'high',
                icon: 'fas fa-chart-line'
            },
            {
                type: 'alert',
                title: 'Regional Disparity',
                description: 'Significant sentiment gap between urban and rural areas requires attention.',
                impact: 'medium',
                icon: 'fas fa-exclamation-triangle'
            },
            {
                type: 'opportunity',
                title: 'Peak Discussion Hours',
                description: 'Most active discussions occur between 7-9 PM. Consider timing announcements accordingly.',
                impact: 'low',
                icon: 'fas fa-clock'
            }
        ];
    }

    updateInsightsDisplay() {
        const container = document.getElementById('insightsContainer');
        if (!container) return;

        container.innerHTML = this.insights.map(insight => `
            <div class="insight-card insight-${insight.impact}">
                <div class="insight-icon">
                    <i class="${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
                <div class="insight-actions">
                    <button class="btn-sm btn-outline" onclick="advancedAnalytics.dismissInsight('${insight.type}')">
                        Dismiss
                    </button>
                </div>
            </div>
        `).join('');
    }

    dismissInsight(type) {
        this.insights = this.insights.filter(insight => insight.type !== type);
        this.updateInsightsDisplay();
    }

    exportData(format = 'csv') {
        try {
            LoadingState.show('Exporting data...');
            
            // Simulate export process
            setTimeout(() => {
                const data = this.generateExportData();
                this.downloadFile(data, `homewatch-analytics-${Date.now()}.${format}`);
                LoadingState.hide();
                ErrorHandler.showNotification('Data exported successfully', 'success');
            }, 2000);
        } catch (error) {
            ErrorHandler.log(error, 'Exporting data');
            ErrorHandler.show('Failed to export data');
            LoadingState.hide();
        }
    }

    generateExportData() {
        // Generate CSV data for export
        return 'Date,Sentiment,Posts,Engagement\n' +
               '2024-01-01,72.5,245,89.2\n' +
               '2024-01-02,74.1,267,91.5\n' +
               '2024-01-03,70.3,230,85.1\n' +
               '2024-01-04,68.7,210,82.4\n' +
               '2024-01-05,75.2,250,90.3\n';
    }

    downloadFile(data, filename) {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Initialize advanced analytics
let advancedAnalytics;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('sentimentHeatmap')) {
        advancedAnalytics = new AdvancedAnalytics();
    }
});
