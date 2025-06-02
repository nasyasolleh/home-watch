// Test Survey Manager - Minimal Version
console.log('🚀 Loading minimal survey manager...');

class MinimalSurveyManager {
    constructor() {
        console.log('✅ MinimalSurveyManager constructor called');
        this.initialized = true;
    }
    
    test() {
        console.log('✅ MinimalSurveyManager test method called');
        return 'Test successful';
    }
}

// Export to window
window.MinimalSurveyManager = MinimalSurveyManager;
console.log('📋 MinimalSurveyManager exported to window');

// Test instantiation
try {
    const testInstance = new MinimalSurveyManager();
    console.log('✅ Test instance created:', testInstance.test());
} catch (error) {
    console.error('❌ Error creating test instance:', error);
}
