// filepath: /Volumes/SSD 980 PRO 1/homewatch/js/dashboard.js
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

// Programs chart with real data
function initProgramsChart(programMentions = []) {
    const ctx = document.getElementById('programsChart').getContext('2d');
    
    let chartData;
    if (programMentions.length > 0) {
        chartData = {
            labels: programMentions.map(item => item.program),
            datasets: [{
                label: 'Mentions',
                data: programMentions.map(item => item.count),
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
                ],
                borderWidth: 0
            }]
        };
    } else {
        chartData = {
            labels: ['PR1MA', 'Rumah Selangorku', 'My First Home', 'Rumah Wilayah', 'PPR', 'Others'],
            datasets: [{
                label: 'Mentions',
                data: [350, 280, 220, 180, 150, 120],
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
                ],
                borderWidth: 0
            }]
        };
    }
    
    if (window.programsChart) {
        window.programsChart.destroy();
    }
    
    const programsChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
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
    
    window.programsChart = programsChart;
}

// Sources chart with real data
function initSourcesChart(sourceDistribution = []) {
    const ctx = document.getElementById('sourcesChart').getContext('2d');
    
    let chartData;
    if (sourceDistribution.length > 0) {
        chartData = {
            labels: sourceDistribution.map(item => item.source),
            datasets: [{
                data: sourceDistribution.map(item => item.percentage),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        };
    } else {
        chartData = {
            labels: ['Facebook', 'Twitter', 'News Articles', 'Forums'],
            datasets: [{
                data: [45, 30, 15, 10],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        };
    }
    
    if (window.sourcesChart) {
        window.sourcesChart.destroy();
    }
    
    const sourcesChart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    window.sourcesChart = sourcesChart;
}

// Update all charts with new data
function updateCharts() {
    if (currentAnalyticsData) {
        initSentimentChart(currentAnalyticsData.sentiment_trends || []);
        initSentimentPieChart(currentAnalyticsData.sentiment_distribution || {});
        initProgramsChart(currentAnalyticsData.program_mentions || []);
        initSourcesChart(currentAnalyticsData.source_distribution || []);
    }
}

// Start real-time updates
function startRealTimeUpdates() {
    if (realTimeUpdateInterval) {
        clearInterval(realTimeUpdateInterval);
    }
    
    realTimeUpdateInterval = window.apiService.startSentimentUpdates((data) => {
        currentAnalyticsData = data;
        updateSummaryCards(data);
        updateCharts();
    }, 60000); // Update every minute
}

// Stop real-time updates
function stopRealTimeUpdates() {
    if (realTimeUpdateInterval) {
        window.apiService.stopSentimentUpdates(realTimeUpdateInterval);
        realTimeUpdateInterval = null;
    }
}

// Export analytics data
async function exportAnalyticsData() {
    try {
        showLoadingState();
        const exportData = await window.apiService.exportAnalytics('json');
        
        // Create downloadable file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `homewatch-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showSuccess('Analytics data exported successfully');
        
    } catch (error) {
        console.error('Export failed:', error);
        showError('Failed to export analytics data');
    } finally {
        hideLoadingState();
    }
}

// Update recent activities
function updateRecentActivities(data) {
    if (!data || !data.recent_posts) return;
    
    const recentPostsList = document.getElementById('recent-posts-list');
    if (!recentPostsList) return;
    
    recentPostsList.innerHTML = '';
    
    data.recent_posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'recent-post-item';
        
        const sentimentClass = post.sentiment > 0.1 ? 'positive' : 
                              post.sentiment < -0.1 ? 'negative' : 'neutral';
        
        postElement.innerHTML = `
            <div class="post-content">
                <p>${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</p>
                <div class="post-meta">
                    <span class="post-source">${post.source}</span>
                    <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
                    <span class="sentiment-badge ${sentimentClass}">
                        ${(post.sentiment * 100).toFixed(1)}%
                    </span>
                </div>
            </div>
        `;
        
        recentPostsList.appendChild(postElement);
    });
}

// Initialize with demo data (fallback)
function initializeWithDemoData() {
    initSentimentChart([]);
    initSentimentPieChart({});
    initProgramsChart([]);
    initSourcesChart([]);
    loadRecentPosts();
    loadRecentNews();
}

// Demo data generators (kept for fallback)
function generateDateLabels(days) {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }));
    }
    return labels;
}

function generateSentimentData(days, type) {
    const data = [];
    let baseValue;
    
    switch(type) {
        case 'positive': baseValue = 65; break;
        case 'neutral': baseValue = 25; break;
        case 'negative': baseValue = 10; break;
        default: baseValue = 50;
    }
    
    for (let i = 0; i < days; i++) {
        const variation = (Math.random() - 0.5) * 20;
        data.push(Math.max(0, Math.min(100, baseValue + variation)));
    }
    
    return data;
}

// Load recent posts (demo data)
function loadRecentPosts() {
    const recentPosts = [
        {
            content: "PR1MA houses in my area are finally affordable! The government should build more of these.",
            source: "Facebook",
            time: "2 hours ago",
            sentiment: "positive"
        },
        {
            content: "Still waiting for Rumah Selangorku application approval. The process is taking too long.",
            source: "Twitter", 
            time: "4 hours ago",
            sentiment: "negative"
        },
        {
            content: "My First Home scheme helped me buy my first property. Great initiative!",
            source: "Forum",
            time: "6 hours ago", 
            sentiment: "positive"
        }
    ];
    
    const postsContainer = document.getElementById('recent-posts-list');
    if (postsContainer) {
        postsContainer.innerHTML = recentPosts.map(post => `
            <div class="recent-post">
                <p>${post.content}</p>
                <div class="post-meta">
                    <span class="source">${post.source}</span>
                    <span class="time">${post.time}</span>
                    <span class="sentiment ${post.sentiment}">${post.sentiment}</span>
                </div>
            </div>
        `).join('');
    }
}

// Load recent news (demo data)
function loadRecentNews() {
    const recentNews = [
        {
            title: "Government Announces New Affordable Housing Initiative",
            source: "The Star",
            time: "1 hour ago"
        },
        {
            title: "PR1MA Reports 80% Completion Rate for 2024 Projects",
            source: "New Straits Times",
            time: "3 hours ago"
        },
        {
            title: "Housing Prices Show Stabilization in Key Urban Areas",
            source: "Malaysiakini",
            time: "5 hours ago"
        }
    ];
    
    const newsContainer = document.getElementById('recent-news-list');
    if (newsContainer) {
        newsContainer.innerHTML = recentNews.map(news => `
            <div class="recent-news">
                <h4>${news.title}</h4>
                <div class="news-meta">
                    <span class="source">${news.source}</span>
                    <span class="time">${news.time}</span>
                </div>
            </div>
        `).join('');
    }
}

// Utility functions
function showLoadingState() {
    if (window.loadingState) {
        window.loadingState.show();
    }
}

function hideLoadingState() {
    if (window.loadingState) {
        window.loadingState.hide();
    }
}

function showError(message) {
    if (window.errorHandler) {
        window.errorHandler.showError(message);
    } else {
        console.error(message);
    }
}

function showSuccess(message) {
    if (window.errorHandler) {
        window.errorHandler.showSuccess(message);
    } else {
        console.log(message);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopRealTimeUpdates();
});
