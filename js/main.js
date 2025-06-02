// Main JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Active navigation link highlighting
    window.addEventListener('scroll', function() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            if (scrollY >= sectionTop && scrollY <= sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Initialize animations on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = '0.1s';
                entry.target.style.animationFillMode = 'both';
                entry.target.style.animation = 'fadeInUp 0.6s ease-out';
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    document.querySelectorAll('.about-card, .feature-card, .stat-card').forEach(card => {
        observer.observe(card);
    });
});

// Register Service Worker for PWA
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', function() {
//         navigator.serviceWorker.register('sw.js')
//             .then(function(registration) {
//                 console.log('ServiceWorker registration successful with scope: ', registration.scope);
//             })
//             .catch(function(err) {
//                 console.log('ServiceWorker registration failed: ', err);
//             });
//     });
// }

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Update UI to notify the user they can install the PWA
    showInstallPrompt();
});

function showInstallPrompt() {
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', installPWA);
    }
}

function installPWA() {
    if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    }
}

// Modal functions
function showLogin() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function showRegister() {
    const registerModal = document.getElementById('registerModal');
    if (registerModal) {
        registerModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function switchToRegister() {
    closeModal('loginModal');
    showRegister();
}

function switchToLogin() {
    closeModal('registerModal');
    showLogin();
}

// Submit Idea Modal function
function showSubmitIdeaModal() {
    console.log('📝 showSubmitIdeaModal called from main.js');
    
    const modal = document.getElementById('submitIdeaModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Add modal backdrop if it doesn't exist
        if (!document.querySelector('.modal-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1040;
            `;
            document.body.appendChild(backdrop);
            
            // Close modal when clicking backdrop
            backdrop.addEventListener('click', () => closeModal('submitIdeaModal'));
        }
        
        // Focus on first input field
        const firstInput = modal.querySelector('input, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Initialize form validation
        initializeIdeaFormValidation();
        
        console.log('✅ Submit Idea Modal opened successfully');
    } else {
        console.error('❌ Submit Idea Modal not found in DOM');
        // Create a fallback modal if it doesn't exist
        createFallbackIdeaModal();
    }
}

// Initialize form validation for idea submission
function initializeIdeaFormValidation() {
    const form = document.getElementById('submitIdeaForm');
    if (!form) return;
    
    const titleInput = document.getElementById('ideaTitle');
    const categorySelect = document.getElementById('ideaCategory');
    const descriptionTextarea = document.getElementById('ideaDescription');
    const benefitsTextarea = document.getElementById('ideaBenefits');
    
    // Real-time validation
    [titleInput, categorySelect, descriptionTextarea, benefitsTextarea].forEach(field => {
        if (field) {
            field.addEventListener('input', validateIdeaField);
            field.addEventListener('blur', validateIdeaField);
        }
    });
    
    // Form submission handler
    form.addEventListener('submit', handleIdeaSubmission);
}

// Validate individual form fields
function validateIdeaField(event) {
    const field = event.target;
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error styling
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Validation rules
    switch (field.id) {
        case 'ideaTitle':
            if (!value) {
                errorMessage = 'Title is required';
                isValid = false;
            } else if (value.length < 5) {
                errorMessage = 'Title must be at least 5 characters';
                isValid = false;
            } else if (value.length > 100) {
                errorMessage = 'Title must be less than 100 characters';
                isValid = false;
            }
            break;
            
        case 'ideaCategory':
            if (!value) {
                errorMessage = 'Please select a category';
                isValid = false;
            }
            break;
            
        case 'ideaDescription':
            if (!value) {
                errorMessage = 'Description is required';
                isValid = false;
            } else if (value.length < 20) {
                errorMessage = 'Description must be at least 20 characters';
                isValid = false;
            } else if (value.length > 1000) {
                errorMessage = 'Description must be less than 1000 characters';
                isValid = false;
            }
            break;
            
        case 'ideaBenefits':
            if (!value) {
                errorMessage = 'Expected benefits are required';
                isValid = false;
            } else if (value.length < 10) {
                errorMessage = 'Benefits must be at least 10 characters';
                isValid = false;
            } else if (value.length > 500) {
                errorMessage = 'Benefits must be less than 500 characters';
                isValid = false;
            }
            break;
    }
    
    // Show error if invalid
    if (!isValid) {
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        `;
        errorDiv.textContent = errorMessage;
        field.parentNode.appendChild(errorDiv);
    }
    
    return isValid;
}

// Handle form submission
function handleIdeaSubmission(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validate all fields
    const fields = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isFormValid = true;
    
    fields.forEach(field => {
        const fieldValid = validateIdeaField({ target: field });
        if (!fieldValid) {
            isFormValid = false;
        }
    });
    
    if (!isFormValid) {
        showNotification('Please fix the errors above', 'error');
        return;
    }
    
    // Prepare submission data
    const ideaData = {
        title: formData.get('ideaTitle'),
        category: formData.get('ideaCategory'),
        description: formData.get('ideaDescription'),
        benefits: formData.get('ideaBenefits'),
        timestamp: new Date().toISOString(),
        author: getCurrentUser() || 'Anonymous',
        status: 'pending'
    };
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;
    
    // Submit the idea
    submitPolicyIdea(ideaData)
        .then(() => {
            showNotification('Your policy idea has been submitted successfully!', 'success');
            form.reset();
            closeModal('submitIdeaModal');
        })
        .catch(error => {
            console.error('Failed to submit idea:', error);
            showNotification('Failed to submit idea. Please try again.', 'error');
        })
        .finally(() => {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        });
}

// Submit policy idea to backend/storage
async function submitPolicyIdea(ideaData) {
    try {
        // Try to submit to backend API
        if (window.apiService && typeof window.apiService.submitPolicyIdea === 'function') {
            return await window.apiService.submitPolicyIdea(ideaData);
        }
        
        // Fallback: store in localStorage
        const existingIdeas = JSON.parse(localStorage.getItem('policyIdeas') || '[]');
        ideaData.id = Date.now().toString();
        existingIdeas.push(ideaData);
        localStorage.setItem('policyIdeas', JSON.stringify(existingIdeas));
        
        console.log('Policy idea stored locally:', ideaData);
        return Promise.resolve(ideaData);
        
    } catch (error) {
        console.error('Error submitting policy idea:', error);
        throw error;
    }
}

// Get current user information
function getCurrentUser() {
    // Try to get from auth system
    if (window.authManager && window.authManager.currentUser) {
        return window.authManager.currentUser.displayName || window.authManager.currentUser.email;
    }
    
    // Fallback: check localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        const user = JSON.parse(userData);
        return user.displayName || user.email || user.name;
    }
    
    return null;
}

// Create fallback modal if it doesn't exist in DOM
function createFallbackIdeaModal() {
    console.log('🛠️ Creating fallback Submit Idea Modal...');
    
    const modalHTML = `
        <div id="submitIdeaModal" class="modal" style="display: none;">
            <div class="modal-content large">
                <span class="close" onclick="closeModal('submitIdeaModal')">&times;</span>
                <h2>Submit Policy Idea</h2>
                <form id="submitIdeaForm">
                    <div class="form-group">
                        <label for="ideaTitle">Idea Title *</label>
                        <input type="text" id="ideaTitle" name="ideaTitle" placeholder="Brief, descriptive title for your idea" required>
                    </div>
                    <div class="form-group">
                        <label for="ideaCategory">Category *</label>
                        <select id="ideaCategory" name="ideaCategory" required>
                            <option value="">Select category</option>
                            <option value="eligibility">Eligibility Criteria</option>
                            <option value="application">Application Process</option>
                            <option value="financing">Financing & Loans</option>
                            <option value="location">Location & Development</option>
                            <option value="maintenance">Maintenance & Management</option>
                            <option value="digital">Digital Innovation</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="ideaDescription">Detailed Description *</label>
                        <textarea id="ideaDescription" name="ideaDescription" rows="6" placeholder="Explain your idea in detail, including the problem it solves and how it could be implemented..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="ideaBenefits">Expected Benefits *</label>
                        <textarea id="ideaBenefits" name="ideaBenefits" rows="3" placeholder="What positive impact would this idea have on housing policies or citizens?" required></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal('submitIdeaModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Submit Idea</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add modal styles if they don't exist
    if (!document.querySelector('#modal-styles')) {
        const modalStyles = document.createElement('style');
        modalStyles.id = 'modal-styles';
        modalStyles.textContent = `
            .modal {
                position: fixed;
                z-index: 1050;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: none;
            }
            
            .modal.show {
                display: block;
            }
            
            .modal-content {
                background-color: white;
                margin: 5% auto;
                padding: 20px;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            }
            
            .modal-content.large {
                max-width: 800px;
            }
            
            .close {
                position: absolute;
                right: 15px;
                top: 15px;
                color: #aaa;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }
            
            .close:hover {
                color: #000;
            }
            
            .form-group {
                margin-bottom: 1rem;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 1rem;
                box-sizing: border-box;
            }
            
            .form-group textarea {
                resize: vertical;
                min-height: 80px;
            }
            
            .form-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
                margin-top: 2rem;
            }
            
            .btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                text-decoration: none;
                display: inline-block;
                text-align: center;
                transition: all 0.3s ease;
            }
            
            .btn-primary {
                background-color: #3b82f6;
                color: white;
            }
            
            .btn-primary:hover {
                background-color: #2563eb;
            }
            
            .btn-outline {
                background-color: transparent;
                color: #6b7280;
                border: 1px solid #d1d5db;
            }
            
            .btn-outline:hover {
                background-color: #f9fafb;
            }
            
            .error {
                border-color: #ef4444 !important;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
            }
            
            .error-message {
                color: #ef4444;
                font-size: 0.875rem;
                margin-top: 0.25rem;
            }
        `;
        document.head.appendChild(modalStyles);
    }
    
    // Now show the modal
    setTimeout(() => showSubmitIdeaModal(), 100);
}

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInFromRight 0.3s ease-out;
    `;
    
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#10b981';
            break;
        case 'error':
            notification.style.backgroundColor = '#ef4444';
            break;
        case 'warning':
            notification.style.backgroundColor = '#f59e0b';
            break;
        default:
            notification.style.backgroundColor = '#3b82f6';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutToRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Add animation styles if they don't exist
    if (!document.querySelector('#notification-styles')) {
        const notificationStyles = document.createElement('style');
        notificationStyles.id = 'notification-styles';
        notificationStyles.textContent = `
            @keyframes slideInFromRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutToRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(notificationStyles);
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const submitIdeaModal = document.getElementById('submitIdeaModal');
    
    if (event.target === loginModal) {
        closeModal('loginModal');
    }
    if (event.target === registerModal) {
        closeModal('registerModal');
    }
    if (event.target === submitIdeaModal) {
        closeModal('submitIdeaModal');
    }
});

// Utility function for smooth scrolling to sections
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Form validation helper
function validateForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });

    return isValid;
}

// Password strength checker
function checkPasswordStrength(password) {
    const strength = {
        score: 0,
        feedback: []
    };

    if (password.length >= 8) strength.score++;
    else strength.feedback.push('At least 8 characters');

    if (/[A-Z]/.test(password)) strength.score++;
    else strength.feedback.push('At least one uppercase letter');

    if (/[a-z]/.test(password)) strength.score++;
    else strength.feedback.push('At least one lowercase letter');

    if (/\d/.test(password)) strength.score++;
    else strength.feedback.push('At least one number');

    if (/[^A-Za-z0-9]/.test(password)) strength.score++;
    else strength.feedback.push('At least one special character');

    return strength;
}

// Email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Add CSS for animations
const animationCSS = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .error {
        border-color: var(--error-color) !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }
`;

// Add the animation styles to the document
const style = document.createElement('style');
style.textContent = animationCSS;
document.head.appendChild(style);

// Global functions for window access
window.showLogin = showLogin;
window.showRegister = showRegister;
window.closeModal = closeModal;
window.switchToRegister = switchToRegister;
window.switchToLogin = switchToLogin;
window.scrollToSection = scrollToSection;
window.showSubmitIdeaModal = showSubmitIdeaModal;
