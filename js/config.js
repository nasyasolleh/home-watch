// HomeWatch Application Configuration
const AppConfig = {
    // Application Info
    app: {
        name: 'HomeWatch',
        version: '1.0.0',
        description: 'Malaysia Housing Sentiment Analytics Platform',
        author: 'HomeWatch Team',
        contact: 'info@homewatch.my'
    },

    // API Endpoints - Flask Backend
    api: {
        baseUrl: 'http://localhost:5001',  // Force local development mode
        endpoints: {
            sentiment: '/api/sentiment/analyze',
            sentimentBatch: '/api/sentiment/batch',
            data: '/api/data/collect',
            dataProcess: '/api/data/process',
            analytics: '/api/dashboard/overview',
            analyticsExport: '/api/analytics/export',
            health: '/api/health',
            status: '/api/status',
            // Firebase will handle auth
            auth: '/auth',
            users: '/users',
            posts: '/posts',
            surveys: '/surveys',
            housing: '/housing-programs',
            news: '/news'
        },
        timeout: 30000 // 30 seconds
    },

    // Firebase Configuration
    // firebase: {
    //     // These should be replaced with actual Firebase config
    //     apiKey: "AIzaSyBlS5_t9mL7wOrtjaENqZLZMW78Drwa0AA",
    //     authDomain: "homewatch-demo.firebaseapp.com",
    //     projectId: "homewatch-demo",
    //     storageBucket: "homewatch-demo.appspot.com",
    //     messagingSenderId: "123456789",
    //     appId: "demo-app-id",
    //     measurementId: "G-XXXXXXXXXX"
    // },

    firebase: {
        apiKey: "AIzaSyD6cjEQ-ljbUX9S5IzHyMXpxQm9KNM-OoA",
        authDomain: "home-watch-dfe87.firebaseapp.com",
        projectId: "home-watch-dfe87",
        storageBucket: "home-watch-dfe87.firebasestorage.app",
        messagingSenderId: "53573656505",
        appId: "1:53573656505:web:4249ebd5a88c929a436068",
        measurementId: "G-74HLL3SWR5"
    },

    // Third-party Services
    services: {
        emailJS: {
            serviceId: 'demo-service',
            templateId: 'demo-template',
            publicKey: 'demo-key'
        },
        analytics: {
            googleAnalytics: 'GA-DEMO-123',
            hotjar: 'demo-hotjar'
        },
        social: {
            twitter: {
                bearerToken: 'demo-token'
            },
            facebook: {
                accessToken: 'demo-token'
            }
        }
    },

    // Feature Flags
    features: {
        enablePWA: true,
        enablePushNotifications: true,
        enableOfflineMode: true,
        enableSocialLogin: false, // Disabled until OAuth setup
        enableRealTimeUpdates: false, // Disabled until WebSocket setup
        enableAdvancedAnalytics: true,
        enableBetaFeatures: false,
        enableErrorTracking: true,
        enablePerformanceMonitoring: true
    },

    // UI Configuration
    ui: {
        theme: {
            primary: '#2563eb',
            secondary: '#64748b',
            accent: '#f59e0b',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        },
        animations: {
            duration: 300,
            easing: 'ease-in-out'
        },
        notifications: {
            duration: 5000,
            position: 'top-right'
        },
        pagination: {
            defaultPageSize: 10,
            maxPageSize: 50
        }
    },

    // Data Configuration
    data: {
        cache: {
            ttl: 5 * 60 * 1000, // 5 minutes
            maxSize: 100 // Max cached items
        },
        survey: {
            maxQuestions: 20,
            maxResponseLength: 1000,
            autoSaveInterval: 30000 // 30 seconds
        },
        posts: {
            maxLength: 2000,
            maxImages: 5,
            autoSaveInterval: 10000 // 10 seconds
        }
    },

    // Housing Programs Data
    housingPrograms: {
        pr1ma: {
            name: 'PR1MA',
            minIncome: 2500,
            maxIncome: 15000,
            description: 'Affordable housing for middle-income families',
            website: 'https://www.pr1ma.my',
            categories: ['first-time', 'middle-income']
        },
        rumahSelangorku: {
            name: 'Rumah Selangorku',
            minIncome: 3000,
            maxIncome: 10000,
            description: 'Selangor state affordable housing scheme',
            website: 'https://rumahselangorku.my',
            categories: ['state-scheme', 'affordable']
        },
        myFirstHome: {
            name: 'My First Home Scheme',
            minIncome: 3000,
            maxIncome: 10000,
            description: 'Federal government first-time buyer assistance',
            website: 'https://www.treasury.gov.my',
            categories: ['first-time', 'federal']
        },
        rentToOwn: {
            name: 'Rent-to-Own',
            minIncome: 2000,
            maxIncome: 8000,
            description: 'Gradual homeownership program',
            website: '#',
            categories: ['rent-to-own', 'flexible']
        }
    },

    // Sentiment Analysis Keywords
    sentimentKeywords: {
        positive: [
            'affordable', 'accessible', 'satisfied', 'happy', 'good', 'excellent',
            'helpful', 'successful', 'approved', 'fast', 'easy', 'convenient'
        ],
        negative: [
            'expensive', 'difficult', 'rejected', 'slow', 'complicated', 'unfair',
            'disappointed', 'frustrated', 'inadequate', 'insufficient', 'poor'
        ],
        neutral: [
            'process', 'application', 'requirement', 'document', 'information',
            'status', 'update', 'news', 'announcement', 'policy'
        ]
    },

    // Local Storage Keys
    storage: {
        user: 'homewatch_user',
        preferences: 'homewatch_preferences',
        cache: 'homewatch_cache',
        drafts: 'homewatch_drafts',
        bookmarks: 'homewatch_bookmarks',
        surveys: 'homewatch_surveys',
        analytics: 'homewatch_analytics'
    },

    // Security Configuration
    security: {
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        csrfProtection: true,
        encryptLocalStorage: false // Enable for sensitive data
    },

    // Development Configuration
    development: {
        enableDebugMode: window.location.hostname === 'localhost',
        enableVerboseLogging: false,
        mockApiCalls: true, // Use mock data when API not available
        skipAuthValidation: false
    }
};

// Validate configuration
function validateConfig() {
    const required = ['app.name', 'app.version'];
    const missing = required.filter(key => {
        const value = key.split('.').reduce((obj, prop) => obj?.[prop], AppConfig);
        return !value;
    });

    if (missing.length > 0) {
        console.warn('Missing required configuration:', missing);
    }
}

// Initialize configuration
validateConfig();

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
} else {
    window.AppConfig = AppConfig;
}
