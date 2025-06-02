// Global functions for survey page - Enhanced with aggressive cache busting
console.log('🔄 Loading survey-global.js with timestamp:', Date.now());

// Initialize survey manager
let surveyManager;

// Flag to track initialization
let isInitialized = false;

// Global function declarations with enhanced error handling
function showSubmitIdeaModal() {
    console.log('📝 showSubmitIdeaModal called');
    try {
        if (surveyManager && typeof surveyManager.showSubmitIdeaModal === 'function') {
            surveyManager.showSubmitIdeaModal();
        } else {
            console.error('Survey manager not initialized or method not available');
            showErrorAlert('Error loading submission form. Please refresh the page and try again.');
        }
    } catch (error) {
        console.error('Error in showSubmitIdeaModal:', error);
        showErrorAlert('Error loading submission form. Please refresh the page and try again.');
    }
}

function showAllIdeas() {
    console.log('💡 showAllIdeas called');
    try {
        if (surveyManager && typeof surveyManager.showAllIdeas === 'function') {
            surveyManager.showAllIdeas();
        } else {
            console.error('Survey manager not initialized or method not available');
            showErrorAlert('Error loading ideas browser. Please refresh the page and try again.');
        }
    } catch (error) {
        console.error('Error in showAllIdeas:', error);
        showErrorAlert('Error loading ideas browser. Please refresh the page and try again.');
    }
}

function showSection(sectionId) {
    console.log('📋 showSection called with:', sectionId);
    try {
        // Validate section ID
        const validSections = ['vote', 'ideas', 'results'];
        if (!validSections.includes(sectionId)) {
            console.error('Invalid section ID:', sectionId);
            return;
        }

        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.section === sectionId) {
                tab.classList.add('active');
            }
        });

        // Hide all sections
        document.querySelectorAll('.survey-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const selectedSection = document.getElementById(`${sectionId}Section`);
        if (selectedSection) {
            selectedSection.classList.add('active');
        }
        
        // Update UI based on the active section
        if (surveyManager && typeof surveyManager.updateUI === 'function') {
            surveyManager.updateUI(sectionId);
        }
        
        // Save current section to session storage for persistence
        sessionStorage.setItem('currentSurveySection', sectionId);
    } catch (error) {
        console.error('Error in showSection:', error);
    }
}

function takeSurvey(surveyId) {
    console.log('📊 takeSurvey called with:', surveyId);
    try {
        if (surveyManager && typeof surveyManager.takeSurvey === 'function') {
            surveyManager.takeSurvey(surveyId);
        } else {
            console.error('Survey manager not initialized or method not available');
            showErrorAlert('Error loading survey. Please refresh the page and try again.');
        }
    } catch (error) {
        console.error('Error in takeSurvey:', error);
        showErrorAlert('Error loading survey. Please refresh the page and try again.');
    }
}

function shareIdea(ideaId) {
    console.log('🔗 shareIdea called with:', ideaId);
    try {
        if (navigator.share) {
            const idea = surveyManager?.policyIdeas.find(i => i.id === ideaId);
            if (!idea) return;
            
            navigator.share({
                title: `HomeWatch Policy Idea: ${idea.title}`,
                text: `Check out this policy idea for affordable housing: ${idea.title}`,
                url: window.location.href + '?idea=' + ideaId
            }).catch(error => console.error('Error sharing:', error));
        } else {
            // Fallback for browsers that don't support Web Share API
            const url = window.location.href + '?idea=' + ideaId;
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                showSuccessAlert('Link copied to clipboard! You can now paste it to share this idea.');
            } catch (err) {
                console.error('Failed to copy link:', err);
                showErrorAlert('Failed to copy link. Please manually copy the URL.');
            }
            
            document.body.removeChild(textArea);
        }
    } catch (error) {
        console.error('Error in shareIdea:', error);
    }
}

function closeModal(modalId) {
    console.log('❌ closeModal called with:', modalId);
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            // Remove any form data if it's a form modal
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    } catch (error) {
        console.error('Error in closeModal:', error);
    }
}

// Submit policy idea function
async function submitPolicyIdea(ideaData) {
    console.log('📝 submitPolicyIdea called with:', ideaData);
    try {
        // Ensure we have a survey manager
        if (!surveyManager) {
            console.error('Survey manager not available');
            showErrorAlert('System not ready. Please refresh the page and try again.');
            return;
        }
        
        // Create a new policy idea object
        const newIdea = {
            id: 'idea_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: ideaData.title,
            category: ideaData.category,
            description: ideaData.description,
            benefits: ideaData.benefits,
            status: 'pending',
            votes: 0,
            comments: [],
            submittedBy: surveyManager.currentUser?.name || 'Anonymous User',
            submittedAt: new Date().toISOString(),
            tags: [] // Can be enhanced later
        };
        
        console.log('📝 Creating new idea:', newIdea);
        
        // Add to survey manager's policy ideas array
        surveyManager.policyIdeas.push(newIdea);
        
        // Save to localStorage
        surveyManager.savePolicyIdeas();
        
        // Update user submissions tracking
        const userId = surveyManager.currentUser?.id || 'anonymous';
        if (!surveyManager.userSubmissions.has(userId)) {
            surveyManager.userSubmissions.set(userId, []);
        }
        surveyManager.userSubmissions.get(userId).push(newIdea.id);
        surveyManager.saveUserSubmissions();
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Show success notification
        surveyManager.showAlert('Policy idea submitted successfully! It will be reviewed before appearing publicly.', 'success');
        
        // Close modal and reset form
        closeModal('submitIdeaModal');
        
        // Update UI if we're on the ideas section
        const activeTab = document.querySelector('.nav-tab.active');
        if (activeTab && activeTab.dataset.section === 'ideas') {
            surveyManager.renderPolicyIdeas();
        }
        
        // Update header stats
        surveyManager.updateHeaderStats();
        
        console.log('✅ Policy idea saved successfully:', newIdea.id);
        
    } catch (error) {
        console.error('Error submitting policy idea:', error);
        
        // Show error notification
        if (surveyManager && typeof surveyManager.showAlert === 'function') {
            surveyManager.showAlert('Error submitting policy idea. Please try again.', 'error');
        } else {
            alert('Error submitting policy idea. Please try again.');
        }
    }
}

// Helper function to show field-specific errors
function showFieldError(field, message) {
    if (!field) return;
    
    // Add error styling to field
    field.classList.add('error');
    
    // Remove existing error message if present
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create and add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
    `;
    errorDiv.textContent = message;
    
    // Insert error message after the field
    field.parentNode.appendChild(errorDiv);
}

// Helper functions for user feedback
function showErrorAlert(message) {
    // Use custom alert if available, otherwise fallback to browser alert
    if (typeof showAlert === 'function') {
        showAlert(message, 'error');
    } else {
        alert(message);
    }
}

function showSuccessAlert(message) {
    // Use custom alert if available, otherwise fallback to browser alert
    if (typeof showAlert === 'function') {
        showAlert(message, 'success');
    } else {
        alert(message);
    }
}

// Immediately assign functions to window object for global access
window.showSubmitIdeaModal = showSubmitIdeaModal;
window.showAllIdeas = showAllIdeas;
window.showSection = showSection;
window.takeSurvey = takeSurvey;
window.shareIdea = shareIdea;
window.closeModal = closeModal;

console.log('🌐 Global functions assigned to window:', {
    takeSurvey: typeof window.takeSurvey,
    showSection: typeof window.showSection,
    closeModal: typeof window.closeModal,
    showSubmitIdeaModal: typeof window.showSubmitIdeaModal,
    showAllIdeas: typeof window.showAllIdeas,
    shareIdea: typeof window.shareIdea
});

// Initialize survey manager with retry logic
let initRetryCount = 0;
const maxRetries = 10; // Increase max retries

function initializeSurveyManager() {
    if (isInitialized) {
        console.log('Survey manager already initialized');
        return;
    }
    
    initRetryCount++;
    console.log(`🚀 Attempting to initialize survey manager (attempt ${initRetryCount}/${maxRetries})...`);
    
    if (window.SurveyManager && typeof window.SurveyManager === 'function') {
        try {
            surveyManager = new window.SurveyManager();
            isInitialized = true;
            console.log('✅ Survey manager initialized successfully');
            
            // Initialize event listeners
            initializeEventListeners();
            
            // Restore previous section if any
            const savedSection = sessionStorage.getItem('currentSurveySection');
            if (savedSection && ['vote', 'ideas', 'results'].includes(savedSection)) {
                showSection(savedSection);
            }
            
            // Force an initial render of the current section
            setTimeout(() => {
                const activeTab = document.querySelector('.nav-tab.active');
                const section = activeTab ? activeTab.dataset.section : 'vote';
                showSection(section);
            }, 100);
            
        } catch (error) {
            console.error('❌ Error creating SurveyManager:', error);
            isInitialized = false;
        }
    } else {
        if (initRetryCount < maxRetries) {
            console.warn(`⚠️ SurveyManager class not available, retrying in 500ms... (${initRetryCount}/${maxRetries})`);
            setTimeout(initializeSurveyManager, 500);
        } else {
            console.error('❌ Failed to initialize SurveyManager after maximum retries');
            console.log('Available on window:', Object.keys(window).filter(key => key.includes('Survey')));
        }
    }
}

// Initialize event listeners for UI elements
function initializeEventListeners() {
    // Add event listeners for filter buttons in the ideas section
    document.querySelectorAll('.ideas-filter .filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.dataset.filter;
            // Remove active class from all filter buttons
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Filter ideas if surveyManager is available
            if (surveyManager && typeof surveyManager.filterIdeas === 'function') {
                surveyManager.filterIdeas(filter);
            }
        });
    });
    
    // Initialize the current section
    const currentSection = document.querySelector('.nav-tab.active')?.dataset.section || 'vote';
    showSection(currentSection);
}

// Setup static form handlers for HTML forms
function setupStaticFormHandlers() {
    console.log('📝 Setting up static form handlers...');
    
    // Handle the static HTML policy idea form
    const staticForm = document.getElementById('submitIdeaForm');
    if (staticForm) {
        // Remove any existing event listeners
        const newForm = staticForm.cloneNode(true);
        staticForm.parentNode.replaceChild(newForm, staticForm);
        
        // Add new event listener
        newForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Prevent page refresh
            console.log('📝 Static form submission intercepted');
            
            try {
                // Get form data
                const formData = new FormData(newForm);
                const ideaData = {
                    title: formData.get('ideaTitle')?.trim(),
                    category: formData.get('ideaCategory'),
                    description: formData.get('ideaDescription')?.trim(),
                    benefits: formData.get('ideaBenefits')?.trim()
                };
                
                // Clear previous errors
                newForm.querySelectorAll('.error-message').forEach(error => error.remove());
                newForm.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
                
                let hasErrors = false;
                
                // Enhanced validation with field-specific error messages
                if (!ideaData.title) {
                    showFieldError(newForm.querySelector('#ideaTitle'), 'Title is required');
                    hasErrors = true;
                } else if (ideaData.title.length < 5) {
                    showFieldError(newForm.querySelector('#ideaTitle'), 'Title must be at least 5 characters');
                    hasErrors = true;
                } else if (ideaData.title.length > 100) {
                    showFieldError(newForm.querySelector('#ideaTitle'), 'Title must be 100 characters or less');
                    hasErrors = true;
                }

                if (!ideaData.category) {
                    showFieldError(newForm.querySelector('#ideaCategory'), 'Please select a category');
                    hasErrors = true;
                }

                if (!ideaData.description) {
                    showFieldError(newForm.querySelector('#ideaDescription'), 'Description is required');
                    hasErrors = true;
                } else if (ideaData.description.length < 20) {
                    showFieldError(newForm.querySelector('#ideaDescription'), 'Description must be at least 20 characters');
                    hasErrors = true;
                } else if (ideaData.description.length > 1000) {
                    showFieldError(newForm.querySelector('#ideaDescription'), 'Description must be 1000 characters or less');
                    hasErrors = true;
                }

                if (!ideaData.benefits) {
                    showFieldError(newForm.querySelector('#ideaBenefits'), 'Expected benefits are required');
                    hasErrors = true;
                } else if (ideaData.benefits.length < 10) {
                    showFieldError(newForm.querySelector('#ideaBenefits'), 'Benefits must be at least 10 characters');
                    hasErrors = true;
                } else if (ideaData.benefits.length > 500) {
                    showFieldError(newForm.querySelector('#ideaBenefits'), 'Benefits must be 500 characters or less');
                    hasErrors = true;
                }
                
                if (hasErrors) {
                    if (surveyManager && typeof surveyManager.showAlert === 'function') {
                        surveyManager.showAlert('Please fix the errors above', 'error');
                    }
                    return;
                }
                
                // Call the submit function
                if (window.submitPolicyIdea) {
                    await window.submitPolicyIdea(ideaData);
                } else if (surveyManager && typeof surveyManager.submitPolicyIdea === 'function') {
                    await surveyManager.submitPolicyIdea(ideaData);
                } else {
                    // Fallback: simulate submission
                    console.log('📝 Submitting policy idea:', ideaData);
                    
                    // Show success notification
                    if (surveyManager && typeof surveyManager.showAlert === 'function') {
                        surveyManager.showAlert('Policy idea submitted successfully!', 'success');
                    } else {
                        alert('Policy idea submitted successfully!');
                    }
                    
                    // Close modal and reset form
                    if (window.closeModal) {
                        window.closeModal('submitIdeaModal');
                    }
                    newForm.reset();
                }
                
            } catch (error) {
                console.error('Error submitting policy idea:', error);
                showErrorAlert('Error submitting policy idea. Please try again.');
            }
        });
        
        console.log('✅ Static form handler attached');
    } else {
        console.log('⚠️ Static form not found');
    }
}

// Multiple initialization triggers to ensure robust loading
function setupInitialization() {
    console.log('📋 Setting up initialization triggers...');
    
    // Try immediate initialization
    initializeSurveyManager();
    
    // Setup static form handlers
    setupStaticFormHandlers();
    
    // Also try on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM loaded, initializing...');
            initializeSurveyManager();
            setupStaticFormHandlers();
        });
    }
    
    // And as a fallback, try after delays
    setTimeout(() => {
        console.log('⏰ Fallback initialization attempt (1s)');
        initializeSurveyManager();
        setupStaticFormHandlers();
    }, 1000);
    
    setTimeout(() => {
        console.log('⏰ Final initialization attempt (2s)');
        initializeSurveyManager();
        setupStaticFormHandlers();
    }, 2000);
}

// Start initialization process
setupInitialization();

// Global availability check
setTimeout(() => {
    console.log('🔍 Final global function check:', {
        takeSurvey: typeof window.takeSurvey,
        showSection: typeof window.showSection,
        closeModal: typeof window.closeModal,
        surveyManagerReady: !!surveyManager,
        timestamp: new Date().toISOString()
    });
}, 3000);

console.log('📋 Survey-global.js loaded completely at:', new Date().toISOString());
