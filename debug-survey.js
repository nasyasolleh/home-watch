// Debug script for survey page
console.log('🛠️ Debug script loaded');

// Function to force show ideas section
function debugShowIdeas() {
    console.log('🔧 Debug: Forcing ideas section to show');
    
    // Hide all sections
    document.querySelectorAll('.survey-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show ideas section
    const ideasSection = document.getElementById('ideasSection');
    if (ideasSection) {
        ideasSection.style.display = 'block';
        console.log('✅ Ideas section made visible');
    } else {
        console.error('❌ Ideas section not found');
    }
    
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const ideasTab = document.querySelector('.nav-tab[data-section="ideas"]');
    if (ideasTab) {
        ideasTab.classList.add('active');
        console.log('✅ Ideas tab made active');
    }
    
    // Force render policy ideas if survey manager exists
    if (window.surveyManager) {
        console.log('🔄 Forcing renderPolicyIdeas...');
        window.surveyManager.renderPolicyIdeas();
    } else {
        console.error('❌ surveyManager not found');
    }
}

// Function to force show results section
function debugShowResults() {
    console.log('🔧 Debug: Forcing results section to show');
    
    // Hide all sections
    document.querySelectorAll('.survey-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show results section
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.style.display = 'block';
        console.log('✅ Results section made visible');
    } else {
        console.error('❌ Results section not found');
    }
    
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const resultsTab = document.querySelector('.nav-tab[data-section="results"]');
    if (resultsTab) {
        resultsTab.classList.add('active');
        console.log('✅ Results tab made active');
    }
    
    // Force update charts if survey manager exists
    if (window.surveyManager) {
        console.log('📊 Forcing updateResultCharts...');
        window.surveyManager.updateResultCharts();
    } else {
        console.error('❌ surveyManager not found');
    }
}

// Function to check DOM elements
function debugCheckDOM() {
    console.log('🔍 Checking DOM elements...');
    
    // Check containers
    const containers = [
        'policyIdeasContainer',
        'surveysContainer',
        'quickPollsContainer',
        'affordabilityChart',
        'schemesChart',
        'locationChart'
    ];
    
    containers.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id} found:`, element);
        } else {
            console.error(`❌ ${id} not found`);
        }
    });
    
    // Check survey manager state
    if (window.surveyManager) {
        console.log('📋 Survey manager state:');
        console.log('- Policy ideas:', window.surveyManager.policyIdeas.length);
        console.log('- Surveys:', window.surveyManager.surveys.length);
        console.log('- Current user:', window.surveyManager.currentUser);
    }
}

// Make functions globally available
window.debugShowIdeas = debugShowIdeas;
window.debugShowResults = debugShowResults;
window.debugCheckDOM = debugCheckDOM;

// Auto-run DOM check when script loads
setTimeout(debugCheckDOM, 1000);

console.log('🛠️ Debug functions ready: debugShowIdeas(), debugShowResults(), debugCheckDOM()');
