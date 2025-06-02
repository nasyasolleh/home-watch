// Survey Page JavaScript
// Global function to simulate login for testing
window.simulateLogin = function () {
    console.log('🔧 Simulating user login for testing...');

    const testUser = {
        uid: 'test-user-123',
        email: 'test@homewatch.my',
        displayName: 'Test User',
        name: 'Test User',
        role: 'user'
    };

    // Set in multiple places to ensure it's picked up
    localStorage.setItem('currentUser', JSON.stringify(testUser));

    if (window.authManager) {
        window.authManager.currentUser = testUser;
        console.log('✅ Set authManager.currentUser');
    }

    if (window.surveyManager) {
        window.surveyManager.currentUser = testUser;
        console.log('✅ Set surveyManager.currentUser');
        window.surveyManager.updateUserSpecificUI();
    }

    console.log('✅ Simulated login complete. Try voting now!');

    // Debug the state
    if (window.debugSurveyAuth) {
        window.debugSurveyAuth();
    }
};

// Global debugging function for testing authentication
window.debugSurveyAuth = function () {
    if (window.surveyManager) {
        console.log('=== SURVEY AUTHENTICATION DEBUG ===');
        window.surveyManager.debugAuthState();

        // Test voting functionality
        console.log('=== TESTING VOTE FUNCTIONALITY ===');
        const voteButtons = document.querySelectorAll('.vote-btn');
        console.log('Found vote buttons:', voteButtons.length);

        if (voteButtons.length > 0) {
            console.log('First vote button:', voteButtons[0]);
            console.log('Button dataset:', voteButtons[0].dataset);
        }

        // Manual authentication check
        const currentUser = window.surveyManager.getCurrentUser();
        console.log('Manual getCurrentUser() result:', currentUser);

        if (currentUser) {
            console.log('✅ User is authenticated, voting should work');
        } else {
            console.log('❌ User is not authenticated, voting will fail');

            // Try to find auth sources
            console.log('Checking auth sources:');
            console.log('  - window.authManager:', window.authManager);
            console.log('  - window.auth:', window.auth);
            console.log('  - localStorage currentUser:', localStorage.getItem('currentUser'));
        }
    } else {
        console.log('❌ surveyManager not found');
    }
};

console.log('🚀 Loading survey.js file...');

class SurveyManager {
    constructor() {
        this.currentUser = null;
        this.surveys = [];
        this.userVotes = new Map();
        this.policyIdeas = [];
        this.userSubmissions = new Map();
        this.init();
    }

    async init() {
        this.currentUser = this.getCurrentUser();
        this.bindEvents();

        // Listen for auth state changes to update current user
        this.setupAuthListener();

        // Initialize section visibility - ensure only the active section is shown
        this.initializeSectionVisibility();

        await this.loadSurveys();
        await this.loadPolicyIdeas();
        this.updateUI();

        // Debug authentication state on init
        console.log('🔐 SurveyManager initialized. Current user:', this.currentUser);
        this.debugAuthState();
    }

    setupAuthListener() {
        // Listen for changes to the global auth manager state
        if (window.authManager) {
            const checkAuthState = () => {
                const newUser = this.getCurrentUser();
                if (newUser !== this.currentUser) {
                    this.currentUser = newUser;
                    console.log('🔐 SurveyManager: Auth state changed, current user:', this.currentUser ? this.currentUser.email : 'none');
                    // Update UI when auth state changes
                    this.updateUserSpecificUI();
                }
            };

            // Check auth state periodically 
            setInterval(checkAuthState, 1000);
        }

        // Also listen for Firebase auth state changes directly if available
        if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
            window.auth.onAuthStateChanged((user) => {
                if (user !== this.currentUser) {
                    this.currentUser = user;
                    console.log('🔐 SurveyManager: Firebase auth state changed, current user:', this.currentUser ? this.currentUser.email : 'none');
                    this.updateUserSpecificUI();
                }
            });
        }
    }

    initializeSectionVisibility() {
        // Get the current active section or default to 'vote'
        let activeSection = sessionStorage.getItem('currentSurveySection') || 'vote';

        // Ensure the section exists in the DOM
        const sectionElement = document.getElementById(`${activeSection}Section`);
        if (!sectionElement) {
            activeSection = 'vote'; // Fallback to vote section
        }

        // Hide all sections first
        document.querySelectorAll('.survey-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show only the active section
        const activeElement = document.getElementById(`${activeSection}Section`);
        if (activeElement) {
            activeElement.classList.add('active');
        }

        // Update navigation tabs to match
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.section === activeSection) {
                tab.classList.add('active');
            }
        });

        console.log(`📋 Initialized section visibility: ${activeSection} section active`);
    }

    getCurrentUser() {
        // First try to get from global auth manager
        if (window.authManager && window.authManager.currentUser) {
            return window.authManager.currentUser;
        }

        // Fallback to direct Firebase auth if available
        if (window.auth && window.auth.currentUser) {
            return window.auth.currentUser;
        }

        // Final fallback: check localStorage (for backward compatibility)
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                console.warn('Invalid user data in localStorage:', e);
                localStorage.removeItem('currentUser');
            }
        }

        return null;
    }

    bindEvents() {
        // Voting buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('vote-btn')) {
                this.handleVote(e.target);
            }
            if (e.target.classList.contains('submit-idea-btn')) {
                this.handleIdeaSubmission();
            }
            if (e.target.classList.contains('create-survey-btn')) {
                this.showCreateSurveyModal();
            }
            if (e.target.classList.contains('vote-idea-btn')) {
                this.handleIdeaVote(e.target);
            }
            if (e.target.classList.contains('comment-idea-btn')) {
                this.handleIdeaComment(e.target);
            }
            if (e.target.classList.contains('submit-comment-btn')) {
                const ideaId = e.target.dataset.ideaId;
                this.submitComment(ideaId);
            }
            if (e.target.classList.contains('approve-idea-btn')) {
                const ideaId = e.target.dataset.ideaId;
                this.approveIdea(ideaId);
            }
            if (e.target.classList.contains('reject-idea-btn')) {
                const ideaId = e.target.dataset.ideaId;
                this.rejectIdea(ideaId);
            }
        });

        // Survey creation form
        const createSurveyForm = document.getElementById('createSurveyForm');
        if (createSurveyForm) {
            createSurveyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createSurvey();
            });
        }

        // Survey participation
        document.addEventListener('change', (e) => {
            if (e.target.name && e.target.name.startsWith('survey_')) {
                this.handleSurveyResponse(e.target);
            }
        });
    }

    async loadSurveys() {
        try {
            // Simulate loading from Firebase
            // this.surveys = [
            //     {
            //         id: 'survey_1',
            //         title: 'Housing Affordability Priorities',
            //         description: 'Help us understand what matters most to you in affordable housing.',
            //         type: 'multiple_choice',
            //         questions: [
            //             {
            //                 id: 'q1',
            //                 text: 'What is your primary concern about affordable housing in Malaysia?',
            //                 type: 'single_choice',
            //                 options: [
            //                     'High property prices',
            //                     'Limited housing supply',
            //                     'Location accessibility',
            //                     'Quality of construction',
            //                     'Loan approval process'
            //                 ]
            //             },
            //             {
            //                 id: 'q2',
            //                 text: 'Which housing program would benefit you most?',
            //                 type: 'single_choice',
            //                 options: [
            //                     'PR1MA',
            //                     'Rumah Selangorku',
            //                     'My First Home Scheme',
            //                     'Rent-to-Own',
            //                     'Social Housing'
            //                 ]
            //             }
            //         ],
            //         responses: 234,
            //         endDate: '2024-02-28',
            //         createdAt: new Date('2024-01-15'),
            //         createdBy: 'Housing Ministry'
            //     },
            //     {
            //         id: 'survey_2',
            //         title: 'Community Feedback on New Developments',
            //         description: 'Share your thoughts on upcoming housing projects in your area.',
            //         type: 'mixed',
            //         questions: [
            //             {
            //                 id: 'q1',
            //                 text: 'Rate your satisfaction with current housing policies',
            //                 type: 'rating',
            //                 scale: 5
            //             },
            //             {
            //                 id: 'q2',
            //                 text: 'What improvements would you like to see?',
            //                 type: 'text',
            //                 maxLength: 500
            //             }
            //         ],
            //         responses: 156,
            //         endDate: '2024-03-15',
            //         createdAt: new Date('2024-01-20'),
            //         createdBy: 'Community Council',
            //         color: '#111' // Force black text for this survey if used in rendering
            //     }
            // ];

            // Load quick polls
            this.quickPolls = [
                {
                    id: 'poll_1',
                    question: 'Should the government increase the budget for affordable housing?',
                    options: ['Yes, significantly', 'Yes, moderately', 'No change needed', 'No, reduce it'],
                    votes: [145, 89, 23, 12],
                    totalVotes: 269,
                    endDate: '2024-02-15'
                },
                {
                    id: 'poll_2',
                    question: 'What is the most important factor in choosing a home?',
                    options: ['Price', 'Location', 'Size', 'Amenities'],
                    votes: [156, 134, 67, 45],
                    totalVotes: 402,
                    endDate: '2024-02-20'
                }
            ];

            this.renderSurveys();
            this.renderQuickPolls();
        } catch (error) {
            console.error('Error loading surveys:', error);
            this.showAlert('Error loading surveys. Please try again.', 'error');
        }
    }

    async loadPolicyIdeas() {
        try {
            // Load from localStorage first
            const savedIdeas = localStorage.getItem('policyIdeas');
            const savedSubmissions = localStorage.getItem('userSubmissions');
            const savedVotes = localStorage.getItem('userVotes');

            if (savedIdeas) {
                this.policyIdeas = JSON.parse(savedIdeas);
                // Convert date strings back to Date objects
                this.policyIdeas.forEach(idea => {
                    idea.submittedAt = new Date(idea.submittedAt);
                    // Ensure comments array exists and process timestamps
                    if (idea.comments && Array.isArray(idea.comments)) {
                        idea.comments.forEach(comment => {
                            comment.timestamp = new Date(comment.timestamp);
                        });
                    } else {
                        // Initialize comments array if it doesn't exist
                        idea.comments = [];
                    }
                });
            } else {
                // Load default/mock data if no saved data
                this.policyIdeas = [
                    {
                        id: 'idea_1',
                        title: 'Digital Housing Application Platform',
                        description: 'Create a unified digital platform where citizens can apply for all affordable housing schemes in one place, reducing bureaucracy and wait times.',
                        category: 'Technology',
                        submittedBy: 'Ahmad Rahman',
                        submittedAt: new Date('2024-01-10'),
                        status: 'approved',
                        votes: 89,
                        comments: [
                            {
                                id: 'c1',
                                user: 'Sarah Lee',
                                text: 'This would save so much time! Great idea.',
                                timestamp: new Date('2024-01-12')
                            },
                            {
                                id: 'c2',
                                user: 'Mohamed Ali',
                                text: 'Would this integrate with existing systems?',
                                timestamp: new Date('2024-01-13')
                            }
                        ],
                        tags: ['digitalization', 'efficiency', 'user-experience']
                    },
                    {
                        id: 'idea_2',
                        title: 'Community Housing Cooperatives',
                        description: 'Establish housing cooperatives where communities can pool resources to develop affordable housing projects with shared amenities and lower costs.',
                        category: 'Policy',
                        submittedBy: 'Dr. Siti Nurhaliza',
                        submittedAt: new Date('2024-01-08'),
                        status: 'approved',
                        votes: 156,
                        comments: [
                            {
                                id: 'c3',
                                user: 'John Tan',
                                text: 'This works well in Singapore, we should adapt it here.',
                                timestamp: new Date('2024-01-09')
                            }
                        ],
                        tags: ['community', 'cooperation', 'affordability']
                    },
                    {
                        id: 'idea_3',
                        title: 'Green Building Incentives',
                        description: 'Provide tax incentives and grants for developers who build eco-friendly affordable housing with solar panels, rainwater harvesting, and energy-efficient designs.',
                        category: 'Environment',
                        submittedBy: 'Lisa Wong',
                        submittedAt: new Date('2024-01-05'),
                        status: 'under_review',
                        votes: 73,
                        comments: [],
                        tags: ['environment', 'sustainability', 'incentives']
                    },
                    {
                        id: 'idea_4',
                        title: 'Young Professional Housing Zones',
                        description: 'Create special housing zones near business districts specifically for young professionals with flexible lease terms and co-working spaces.',
                        category: 'Urban Planning',
                        submittedBy: 'Alex Chong',
                        submittedAt: new Date('2024-01-15'),
                        status: 'pending',
                        votes: 42,
                        comments: [],
                        tags: ['youth', 'professionals', 'urban-planning']
                    }
                ];
            }

            if (savedSubmissions) {
                this.userSubmissions = new Map(JSON.parse(savedSubmissions));
            }

            if (savedVotes) {
                this.userVotes = new Map(JSON.parse(savedVotes));
            }

            this.renderPolicyIdeas();
        } catch (error) {
            console.error('Error loading policy ideas:', error);
            this.showAlert('Error loading policy ideas. Please try again.', 'error');
        }
    }

    renderSurveys() {
        const container = document.getElementById('surveysContainer');
        if (!container) return;

        container.innerHTML = this.surveys.map(survey => `
            <div class="survey-card" data-survey-id="${survey.id}">
                <div class="survey-header">
                    <h3>${survey.title}</h3>
                    <span class="survey-status ${this.getSurveyStatus(survey)}">
                        ${this.getSurveyStatusText(survey)}
                    </span>
                </div>
                <p class="survey-description">${survey.description}</p>
                <div class="survey-meta">
                    <div class="survey-info">
                        <span><i class="fas fa-users"></i> ${survey.responses} responses</span>
                        <span><i class="fas fa-calendar"></i> Ends ${this.formatDate(survey.endDate)}</span>
                        <span><i class="fas fa-user"></i> By ${survey.createdBy}</span>
                    </div>
                </div>
                <div class="survey-actions">
                    <button class="btn-primary participate-btn" onclick="surveyManager.participateInSurvey('${survey.id}')">
                        Participate
                    </button>
                    <button class="btn-secondary view-results-btn" onclick="surveyManager.viewSurveyResults('${survey.id}')">
                        View Results
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderQuickPolls() {
        const container = document.getElementById('quickPollsContainer');
        if (!container) return;

        container.innerHTML = this.quickPolls.map(poll => `
            <div class="poll-card" data-poll-id="${poll.id}">
                <h4>${poll.question}</h4>
                <div class="poll-options">
                    ${poll.options.map((option, index) => {
            const percentage = poll.totalVotes > 0 ? (poll.votes[index] / poll.totalVotes * 100).toFixed(1) : 0;
            return `
                            <div class="poll-option" data-option-index="${index}">
                                <button class="vote-btn" data-poll-id="${poll.id}" data-option="${index}">
                                    ${option}
                                </button>
                                <div class="vote-bar">
                                    <div class="vote-fill" style="width: ${percentage}%"></div>
                                    <span class="vote-count">${poll.votes[index]} (${percentage}%)</span>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
                <div class="poll-footer">
                    <span class="total-votes">${poll.totalVotes} total votes</span>
                    <span class="poll-deadline">Ends ${this.formatDate(poll.endDate)}</span>
                </div>
            </div>
        `).join('');
    }

    renderPolicyIdeas() {
        console.log('🔍 renderPolicyIdeas called');
        const container = document.getElementById('policyIdeasContainer');
        if (!container) {
            console.error('❌ policyIdeasContainer not found in DOM');
            return;
        }

        console.log('📊 Total policy ideas:', this.policyIdeas.length);
        console.log('📋 Policy ideas data:', this.policyIdeas);

        // Temporarily show all ideas for debugging
        // const approvedIdeas = this.policyIdeas.filter(idea => idea.status === 'approved');
        const approvedIdeas = this.policyIdeas; // Show all ideas for now
        console.log('🎯 Ideas to render:', approvedIdeas.length);

        container.innerHTML = approvedIdeas.map(idea => `
            <div class="idea-card" data-idea-id="${idea.id}">
                <div class="idea-header">
                    <div class="idea-category">
                        <span class="category-badge ${idea.category.toLowerCase().replace(' ', '-')}">${idea.category}</span>
                        <span class="idea-status status-${idea.status}">${this.getStatusText(idea.status)}</span>
                    </div>
                    <div class="idea-votes">
                        <button class="vote-idea-btn ${this.hasUserVotedForIdea(idea.id) ? 'voted' : ''}" 
                                data-idea-id="${idea.id}">
                            <i class="fas fa-thumbs-up"></i>
                            <span>${idea.votes}</span>
                        </button>
                    </div>
                </div>
                
                <div class="idea-content">
                    <h3>${idea.title}</h3>
                    <p>${idea.description}</p>
                    
                    <div class="idea-tags">
                        ${(idea.tags || []).map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                    
                    <div class="idea-meta">
                        <div class="idea-author">
                            <i class="fas fa-user"></i>
                            <span>By ${idea.submittedBy || 'Anonymous'}</span>
                        </div>
                        <div class="idea-date">
                            <i class="fas fa-calendar"></i>
                            <span>${this.formatDate(idea.submittedAt)}</span>
                        </div>
                        <div class="idea-comments-count">
                            <i class="fas fa-comments"></i>
                            <span>${(idea.comments || []).length} comments</span>
                        </div>
                    </div>
                </div>
                
                <div class="idea-actions">
                    <button class="btn-outline comment-idea-btn" data-idea-id="${idea.id}">
                        <i class="fas fa-comment"></i> Comment
                    </button>
                    <button class="btn-outline share-idea-btn" data-idea-id="${idea.id}">
                        <i class="fas fa-share"></i> Share
                    </button>
                </div>
                
                <div class="idea-comments" id="comments-${idea.id}" style="display: none;">
                    <div class="comments-list">
                        ${(idea.comments || []).map(comment => `
                            <div class="comment">
                                <div class="comment-header">
                                    <strong>${comment.user}</strong>
                                    <span class="comment-date">${this.formatDate(comment.timestamp)}</span>
                                </div>
                                <p>${comment.text}</p>
                            </div>
                        `).join('')}
                    </div>
                    <div class="comment-form">
                        <textarea placeholder="Add a comment..." rows="3"></textarea>
                        <button class="btn-primary submit-comment-btn" data-idea-id="${idea.id}">
                            Post Comment
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async participateInSurvey(surveyId) {
        if (!this.currentUser) {
            this.showAlert('Please log in to participate in surveys', 'error');
            return;
        }

        const survey = this.surveys.find(s => s.id === surveyId);
        if (!survey) return;

        this.showSurveyModal(survey);
    }

    showSurveyModal(survey) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content survey-modal">
                <div class="modal-header">
                    <h3>${survey.title}</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>${survey.description}</p>
                    <form id="surveyForm_${survey.id}" class="survey-form">
                        ${survey.questions.map((question, index) => this.renderQuestion(question, index)).join('')}
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Submit Survey</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind form submission
        const form = modal.querySelector(`#surveyForm_${survey.id}`);
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitSurvey(survey.id, form);
        });
    }

    renderQuestion(question, index) {
        switch (question.type) {
            case 'single_choice':
                return `
                    <div class="question-group">
                        <label class="question-label">${index + 1}. ${question.text}</label>
                        <div class="radio-group">
                            ${question.options.map((option, optIndex) => `
                                <label class="radio-option">
                                    <input type="radio" name="question_${question.id}" value="${optIndex}" required>
                                    <span class="radio-custom"></span>
                                    ${option}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;

            case 'rating':
                return `
                    <div class="question-group">
                        <label class="question-label">${index + 1}. ${question.text}</label>
                        <div class="rating-group">
                            ${Array.from({ length: question.scale }, (_, i) => `
                                <label class="rating-option">
                                    <input type="radio" name="question_${question.id}" value="${i + 1}" required>
                                    <span class="rating-star">★</span>
                                    <span class="rating-label">${i + 1}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;

            case 'text':
                return `
                    <div class="question-group">
                        <label class="question-label">${index + 1}. ${question.text}</label>
                        <textarea 
                            name="question_${question.id}" 
                            maxlength="${question.maxLength || 500}"
                            placeholder="Enter your response..."
                            required
                        ></textarea>
                    </div>
                `;

            default:
                return '';
        }
    }

    async submitSurvey(surveyId, form) {
        try {
            const formData = new FormData(form);
            const responses = {};

            for (let [key, value] of formData.entries()) {
                responses[key] = value;
            }

            // Simulate API call
            await this.simulateApiCall();

            // Update survey response count
            const survey = this.surveys.find(s => s.id === surveyId);
            if (survey) {
                survey.responses++;
            }

            this.showAlert('Survey submitted successfully! Thank you for your participation.', 'success');
            document.querySelector('.modal-overlay').remove();
            this.renderSurveys();

        } catch (error) {
            console.error('Error submitting survey:', error);
            this.showAlert('Error submitting survey. Please try again.', 'error');
        }
    }


    generateRealResults(surveyId) {
        const allResponses = JSON.parse(localStorage.getItem('surveyResponses') || '{}');
        const allUserResponses = Object.values(allResponses)
            .map(entry => entry[surveyId]?.responses)
            .filter(r => r);

        const survey = this.surveys.find(s => s.id === surveyId);
        if (!survey || allUserResponses.length === 0) return null;

        const results = {};

        for (const question of survey.questions) {
            if (question.type === 'single_choice' || question.type === 'multiple-choice') {
                const counts = {};
                for (const resp of allUserResponses) {
                    const answer = resp[question.id];
                    if (answer) {
                        counts[answer] = (counts[answer] || 0) + 1;
                    }
                }
                const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
                results[question.id] = {
                    type: 'choice',
                    counts,
                    total
                };
            }
            // Rating support can be added similarly
        }

        return results;
    }

    async viewSurveyResults(surveyId) {
        const survey = this.surveys.find(s => s.id === surveyId);
        if (!survey) return;

        const results = this.generateRealResults(surveyId);
        if (!results) {
            this.showAlert('Not enough data to show results yet.', 'info');
            return;
        }

        this.showResultsModal(survey, results);
    }



    showResultsModal(survey, results) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content results-modal">
                <div class="modal-header">
                    <h3>Survey Results: ${survey.title}</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="results-summary">
                        <p><strong>Total Responses:</strong> ${survey.responses}</p>
                        <p><strong>Survey Period:</strong> ${this.formatDate(survey.createdAt)} - ${this.formatDate(survey.endDate)}</p>
                    </div>
                    ${survey.questions.map((question, index) => this.renderQuestionResults(question, results[question.id], index)).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // renderQuestionResults(question, result, index) {
    //     if (!result) return '';

    //     if (result.type === 'choice') {
    //         return `
    //             <div class="result-section">
    //                 <h4>${index + 1}. ${question.text}</h4>
    //                 <div class="choice-results">
    //                     ${question.options.map((option, i) => `
    //                         <div class="result-bar">
    //                             <span class="option-text">${option}</span>
    //                             <div class="bar-container">
    //                                 <div class="bar-fill" style="width: ${result.percentages[i]}%"></div>
    //                                 <span class="result-count">${result.votes[i]} (${result.percentages[i]}%)</span>
    //                             </div>
    //                         </div>
    //                     `).join('')}
    //                 </div>
    //             </div>
    //         `;
    //     } else if (result.type === 'rating') {
    //         return `
    //             <div class="result-section">
    //                 <h4>${index + 1}. ${question.text}</h4>
    //                 <div class="rating-results">
    //                     <div class="average-rating">
    //                         <span class="rating-value">${result.average}</span>
    //                         <span class="rating-stars">
    //                             ${Array.from({ length: 5 }, (_, i) =>
    //             `<i class="fas fa-star ${i < Math.round(result.average) ? 'active' : ''}"></i>`
    //         ).join('')}
    //                         </span>
    //                         <span class="rating-total">(${result.total} responses)</span>
    //                     </div>
    //                     <div class="rating-breakdown">
    //                         ${result.ratings.map((count, i) => `
    //                             <div class="rating-row">
    //                                 <span>${i + 1} star${i > 0 ? 's' : ''}</span>
    //                                 <div class="rating-bar">
    //                                     <div class="rating-fill" style="width: ${(count / result.total * 100).toFixed(1)}%"></div>
    //                                 </div>
    //                                 <span>${count}</span>
    //                             </div>
    //                         `).join('')}
    //                     </div>
    //                 </div>
    //             </div>
    //         `;
    //     }

    //     return '';
    // }

    renderQuestionResults(question, result, index) {
    if (!result || result.type !== 'choice') return '';

    const total = result.total || 1;
    const options = question.options || [];

    return `
        <div class="result-section">
            <h4>${index + 1}. ${question.text}</h4>
            <div class="choice-results">
                ${options.map(option => {
                    const count = result.counts[option] || 0;
                    const percent = ((count / total) * 100).toFixed(1);
                    return `
                        <div class="result-bar">
                            <span class="option-text">${option}</span>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: ${percent}%"></div>
                                <span class="result-count">${count} (${percent}%)</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}


    async handleVote(button) {
        // Force refresh current user before voting
        this.currentUser = this.getCurrentUser();

        // Debug authentication state
        console.log('🗳️ handleVote called');
        console.log('  - this.currentUser:', this.currentUser);
        console.log('  - getCurrentUser() fresh check:', this.getCurrentUser());
        this.debugAuthState();

        if (!this.currentUser) {
            console.log('❌ Authentication check failed - showing login message');
            this.showAlert('Please log in to vote', 'error');
            return;
        }

        console.log('✅ Authentication check passed - proceeding with vote');
        const pollId = button.dataset.pollId;
        const optionIndex = parseInt(button.dataset.option);

        // Check if user already voted
        const voteKey = `vote_${pollId}`;
        if (this.userVotes.has(voteKey)) {
            this.showAlert('You have already voted on this poll', 'info');
            return;
        }

        try {
            // Simulate API call
            await this.simulateApiCall();

            // Update local data
            const poll = this.quickPolls.find(p => p.id === pollId);
            if (poll) {
                poll.votes[optionIndex]++;
                poll.totalVotes++;
                this.userVotes.set(voteKey, optionIndex);

                // Save to localStorage
                localStorage.setItem('userVotes', JSON.stringify(Array.from(this.userVotes.entries())));

                this.renderQuickPolls();
                this.showAlert('Vote submitted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error submitting vote:', error);
            this.showAlert('Error submitting vote. Please try again.', 'error');
        }
    }

    // Take a survey - opens survey modal
    takeSurvey(surveyId) {
        const modal = document.getElementById('surveyModal');
        const content = document.getElementById('surveyContent');

        if (!modal || !content) {
            console.error('Survey modal elements not found');
            this.showAlert('Error loading survey interface', 'error');
            return;
        }

        // Define survey data
        const surveys = {
            'pr1ma-eligibility': {
                title: 'PR1MA Eligibility Criteria Review',
                questions: [
                    {
                        id: 'income-ceiling',
                        text: 'Should the income ceiling for PR1MA be adjusted to reflect current economic conditions?',
                        type: 'multiple-choice',
                        options: ['Yes, increase significantly', 'Yes, increase moderately', 'Keep current levels', 'No, decrease']
                    },
                    {
                        id: 'qualification-criteria',
                        text: 'Which additional criteria should be considered for PR1MA eligibility?',
                        type: 'checkbox',
                        options: ['Employment duration', 'Credit score', 'Family size', 'Current housing status', 'Location preference']
                    },
                    {
                        id: 'impact-rating',
                        text: 'How would adjusting income eligibility impact housing accessibility?',
                        type: 'rating',
                        scale: 5
                    }
                ]
            },
            'myfirst-enhancement': {
                title: 'MyFirst Home Scheme Enhancement',
                questions: [
                    {
                        id: 'accessibility-barriers',
                        text: 'What are the main barriers preventing access to MyFirst Home scheme?',
                        type: 'checkbox',
                        options: ['Complex application process', 'Limited property options', 'High down payment requirements', 'Lengthy approval time', 'Lack of information']
                    },
                    {
                        id: 'improvement-priority',
                        text: 'Which improvement should be prioritized?',
                        type: 'multiple-choice',
                        options: ['Simplified application', 'More property locations', 'Lower down payment', 'Faster processing', 'Better support services']
                    }
                ]
            },
            'transport-integration': {
                title: 'Public Transport Integration',
                questions: [
                    {
                        id: 'transport-importance',
                        text: 'How important is proximity to public transport when choosing affordable housing?',
                        type: 'rating',
                        scale: 5
                    },
                    {
                        id: 'transport-types',
                        text: 'Which public transport options are most important?',
                        type: 'checkbox',
                        options: ['MRT/LRT stations', 'Bus stops', 'KTM stations', 'Express bus terminals', 'Taxi/Grab services']
                    }
                ]
            },
            'digital-process': {
                title: 'Digital Application Process',
                questions: [
                    {
                        id: 'digital-experience',
                        text: 'Rate your overall experience with online housing applications',
                        type: 'rating',
                        scale: 5
                    },
                    {
                        id: 'improvement-areas',
                        text: 'Which areas need improvement in the digital application process?',
                        type: 'checkbox',
                        options: ['User interface design', 'Application speed', 'Document upload process', 'Status tracking', 'Help and support']
                    },
                    {
                        id: 'additional-features',
                        text: 'What additional digital features would be helpful?',
                        type: 'text',
                        placeholder: 'Describe any additional features or improvements...'
                    }
                ]
            }
        };

        const survey = surveys[surveyId];
        if (!survey) {
            this.showAlert('Survey not found', 'error');
            return;
        }

        // Generate survey HTML
        const surveyHTML = this.generateSurveyHTML(survey, surveyId);
        content.innerHTML = surveyHTML;

        // Show modal
        modal.style.display = 'block';

        // Add event listener for form submission
        const form = content.querySelector('#surveyForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSurveySubmission(e, surveyId));
        }
    }

    // Generate survey HTML
    generateSurveyHTML(survey, surveyId) {
        let html = `
            <div class="survey-container">
                <h2>${survey.title}</h2>
                <form id="surveyForm">
                    <div class="survey-questions">
        `;

        survey.questions.forEach((question, index) => {
            html += `<div class="question-group">`;
            html += `<h3>Question ${index + 1}</h3>`;
            html += `<p class="question-text">${question.text}</p>`;

            switch (question.type) {
                case 'multiple-choice':
                    question.options.forEach((option, optionIndex) => {
                        html += `
                            <label class="radio-option">
                                <input type="radio" name="${question.id}" value="${option}" required>
                                <span class="radio-custom"></span>
                                ${option}
                            </label>
                        `;
                    });
                    break;

                case 'checkbox':
                    question.options.forEach((option, optionIndex) => {
                        html += `
                            <label class="checkbox-option">
                                <input type="checkbox" name="${question.id}" value="${option}">
                                <span class="checkbox-custom"></span>
                                ${option}
                            </label>
                        `;
                    });
                    break;

                case 'rating':
                    html += `<div class="rating-scale">`;
                    for (let i = 1; i <= question.scale; i++) {
                        html += `
                            <label class="rating-option">
                                <input type="radio" name="${question.id}" value="${i}" required>
                                <span class="rating-number">${i}</span>
                            </label>
                        `;
                    }
                    html += `</div>`;
                    html += `<div class="rating-labels">
                        <span>Not Important</span>
                        <span>Very Important</span>
                    </div>`;
                    break;

                case 'text':
                    html += `
                        <textarea name="${question.id}" placeholder="${question.placeholder}" rows="4" class="survey-textarea"></textarea>
                    `;
                    break;
            }

            html += `</div>`;
        });

        html += `
                    </div>
                    <div class="survey-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal('surveyModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Submit Survey</button>
                    </div>
                </form>
            </div>
        `;

        return html;
    }

    // Handle survey submission
    handleSurveySubmission(event, surveyId) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const responses = {};

        // Collect all responses
        for (let [key, value] of formData.entries()) {
            if (responses[key]) {
                // Handle multiple values (checkboxes)
                if (Array.isArray(responses[key])) {
                    responses[key].push(value);
                } else {
                    responses[key] = [responses[key], value];
                }
            } else {
                responses[key] = value;
            }
        }

        // Save survey response
        this.saveSurveyResponse(surveyId, responses);

        // Show success message
        this.showAlert('Thank you for participating! Your responses have been recorded.', 'success');

        // Close modal
        closeModal('surveyModal');

        // Update UI to reflect participation
        this.updateUI();
    }

    // Save survey response
    saveSurveyResponse(surveyId, responses) {
        const surveyResponses = JSON.parse(localStorage.getItem('surveyResponses') || '{}');
        const userId = 'current_user'; // In a real app, this would come from authentication

        if (!surveyResponses[userId]) {
            surveyResponses[userId] = {};
        }

        surveyResponses[userId][surveyId] = {
            responses: responses,
            timestamp: new Date().toISOString(),
            completed: true
        };

        localStorage.setItem('surveyResponses', JSON.stringify(surveyResponses));

        console.log('Survey response saved:', surveyId, responses);
    }

    // Helper methods for policy ideas
    getStatusText(status) {
        const statusMap = {
            'pending': 'Under Review',
            'under_review': 'In Review',
            'approved': 'Approved',
            'rejected': 'Rejected',
            'implemented': 'Implemented'
        };
        return statusMap[status] || status;
    }

    hasUserVotedForIdea(ideaId) {
        if (!this.currentUser) return false;
        const voteKey = `idea_vote_${ideaId}`;
        return this.userVotes.has(voteKey);
    }

    // Idea voting handler
    async handleIdeaVote(button) {
        // Force refresh current user before voting
        this.currentUser = this.getCurrentUser();

        if (!this.currentUser) {
            console.log('❌ Authentication check failed for idea vote - showing login message');
            this.showAlert('Please log in to vote on ideas', 'error');
            return;
        }

        console.log('✅ Authentication check passed for idea vote - proceeding');
        const ideaId = button.dataset.ideaId;
        const voteKey = `idea_vote_${ideaId}`;

        if (this.userVotes.has(voteKey)) {
            this.showAlert('You have already voted on this idea', 'info');
            return;
        }

        try {
            // Find the idea and increment votes
            const idea = this.policyIdeas.find(i => i.id === ideaId);
            if (idea) {
                idea.votes++;
                this.userVotes.set(voteKey, true);

                // Update button state
                button.classList.add('voted');
                button.querySelector('span').textContent = idea.votes;

                // Save to localStorage
                this.saveUserVotes();

                this.showAlert('Vote submitted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error voting on idea:', error);
            this.showAlert('Error submitting vote. Please try again.', 'error');
        }
    }

    // Idea comment handler
    async handleIdeaComment(button) {
        const ideaId = button.dataset.ideaId;
        const commentsSection = document.getElementById(`comments-${ideaId}`);

        if (commentsSection.style.display === 'none') {
            commentsSection.style.display = 'block';
            button.innerHTML = '<i class="fas fa-comment"></i> Hide Comments';
        } else {
            commentsSection.style.display = 'none';
            button.innerHTML = '<i class="fas fa-comment"></i> Comment';
        }
    }

    // Show idea submission modal
    showSubmitIdeaModal() {
        // For testing purposes, temporarily bypass authentication
        if (!this.currentUser) {
            console.log('🔧 Testing mode: Creating temporary user');
            this.currentUser = {
                name: 'Test User',
                email: 'test@example.com',
                role: 'user'
            };
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content idea-submission-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-lightbulb"></i> Submit Policy Idea</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="ideaSubmissionForm">
                        <div class="form-group">
                            <label for="ideaTitle">Idea Title *</label>
                            <input type="text" id="ideaTitle" name="ideaTitle" required maxlength="100" 
                                   placeholder="Enter a clear, descriptive title">
                            <small class="form-hint">Keep it concise and descriptive (max 100 characters)</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="ideaCategory">Category *</label>
                            <select id="ideaCategory" name="ideaCategory" required>
                                <option value="">Select a category</option>
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
                            <textarea id="ideaDescription" name="ideaDescription" required rows="6" maxlength="1000"
                                      placeholder="Explain your idea in detail, including the problem it solves and how it could be implemented..."></textarea>
                            <small class="form-hint">Provide a detailed explanation (max 1000 characters)</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="ideaBenefits">Expected Benefits *</label>
                            <textarea id="ideaBenefits" name="ideaBenefits" required rows="3" maxlength="500"
                                      placeholder="What positive impact would this idea have on housing policies or citizens?"></textarea>
                            <small class="form-hint">Describe the expected benefits (max 500 characters)</small>
                        </div>
                        
                        <div class="form-group checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="agreeTerms" required>
                                <span class="checkmark"></span>
                                I agree that my submission will be reviewed by administrators and may be published for public voting
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                Cancel
                            </button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-paper-plane"></i> Submit Idea
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Attach form submission event handler
        const form = modal.querySelector('#ideaSubmissionForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitPolicyIdea();
            });
        }
    }

    // Submit policy idea
    async submitPolicyIdea() {
        const form = document.getElementById('ideaSubmissionForm');
        if (!form) return;

        const formData = new FormData(form);
        const title = formData.get('ideaTitle')?.trim();
        const category = formData.get('ideaCategory');
        const description = formData.get('ideaDescription')?.trim();
        const benefits = formData.get('ideaBenefits')?.trim();
        const agreeTerms = form.querySelector('#agreeTerms')?.checked;

        // Clear previous errors
        form.querySelectorAll('.error-message').forEach(error => error.remove());
        form.querySelectorAll('.error').forEach(field => field.classList.remove('error'));

        let hasErrors = false;

        // Enhanced validation with field-specific error messages
        if (!title) {
            this.showFieldError(form.querySelector('#ideaTitle'), 'Title is required');
            hasErrors = true;
        } else if (title.length < 5) {
            this.showFieldError(form.querySelector('#ideaTitle'), 'Title must be at least 5 characters');
            hasErrors = true;
        } else if (title.length > 100) {
            this.showFieldError(form.querySelector('#ideaTitle'), 'Title must be 100 characters or less');
            hasErrors = true;
        }

        if (!category) {
            this.showFieldError(form.querySelector('#ideaCategory'), 'Please select a category');
            hasErrors = true;
        }

        if (!description) {
            this.showFieldError(form.querySelector('#ideaDescription'), 'Description is required');
            hasErrors = true;
        } else if (description.length < 20) {
            this.showFieldError(form.querySelector('#ideaDescription'), 'Description must be at least 20 characters');
            hasErrors = true;
        } else if (description.length > 1000) {
            this.showFieldError(form.querySelector('#ideaDescription'), 'Description must be 1000 characters or less');
            hasErrors = true;
        }

        if (!benefits) {
            this.showFieldError(form.querySelector('#ideaBenefits'), 'Expected benefits are required');
            hasErrors = true;
        } else if (benefits.length < 10) {
            this.showFieldError(form.querySelector('#ideaBenefits'), 'Benefits must be at least 10 characters');
            hasErrors = true;
        } else if (benefits.length > 500) {
            this.showFieldError(form.querySelector('#ideaBenefits'), 'Benefits must be 500 characters or less');
            hasErrors = true;
        }

        if (!agreeTerms) {
            this.showFieldError(form.querySelector('#agreeTerms'), 'You must agree to the terms to submit your idea');
            hasErrors = true;
        }

        if (hasErrors) {
            this.showAlert('Please fix the errors above', 'error');
            return;
        }

        try {
            // Simulate API call
            await this.simulateApiCall();

            // Create new idea
            const newIdea = {
                id: `idea_${Date.now()}`,
                title,
                description,
                benefits,
                category,
                submittedBy: this.currentUser.name || this.currentUser.email,
                submittedAt: new Date(),
                status: 'pending',
                votes: 0,
                comments: []
            };

            // Add to ideas array
            this.policyIdeas.push(newIdea);

            // Track user submission
            this.userSubmissions.set(newIdea.id, {
                submissionDate: new Date(),
                status: 'pending'
            });

            // Save to localStorage
            this.savePolicyIdeas();
            this.saveUserSubmissions();

            // Close modal and show success
            document.querySelector('.modal-overlay').remove();
            this.showAlert('Your idea has been submitted for review! You will be notified when it is approved.', 'success');

            // Refresh ideas display if on admin view
            this.renderPolicyIdeas();

        } catch (error) {
            console.error('Error submitting idea:', error);
            this.showAlert('Error submitting idea. Please try again.', 'error');
        }
    }

    // Show all ideas (including pending ones for admins)
    showAllIdeas() {
        if (!this.currentUser) {
            this.showAlert('Please log in to browse ideas', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content ideas-browser-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-lightbulb"></i> All Policy Ideas</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="ideas-filter">
                        <button class="filter-btn active" data-filter="all" onclick="surveyManager.filterIdeas('all', this)">
                            All Ideas
                        </button>
                        <button class="filter-btn" data-filter="approved" onclick="surveyManager.filterIdeas('approved', this)">
                            Approved
                        </button>
                        <button class="filter-btn" data-filter="pending" onclick="surveyManager.filterIdeas('pending', this)">
                            Pending Review
                        </button>
                        <button class="filter-btn" data-filter="under_review" onclick="surveyManager.filterIdeas('under_review', this)">
                            Under Review
                        </button>
                        ${this.isAdmin() ? `
                            <button class="filter-btn" data-filter="rejected" onclick="surveyManager.filterIdeas('rejected', this)">
                                Rejected
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="ideas-search">
                        <input type="text" id="ideasSearch" placeholder="Search ideas..." 
                               onkeyup="surveyManager.searchIdeas(this.value)">
                        <i class="fas fa-search"></i>
                    </div>
                    
                    <div id="allIdeasContainer" class="all-ideas-container">
                        ${this.renderAllIdeas()}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Filter ideas by status
    filterIdeas(status, button) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const container = document.getElementById('allIdeasContainer');
        if (!container) return;

        let filteredIdeas = this.policyIdeas;

        if (status !== 'all') {
            filteredIdeas = this.policyIdeas.filter(idea => idea.status === status);
        }

        container.innerHTML = this.renderFilteredIdeas(filteredIdeas);
    }

    // Search ideas by title, description, or tags
    searchIdeas(query) {
        const container = document.getElementById('allIdeasContainer');
        if (!container) return;

        const searchTerm = query.toLowerCase().trim();

        let filteredIdeas = this.policyIdeas;

        if (searchTerm) {
            filteredIdeas = this.policyIdeas.filter(idea =>
                idea.title.toLowerCase().includes(searchTerm) ||
                idea.description.toLowerCase().includes(searchTerm) ||
                (idea.tags || []).some(tag => tag.includes(searchTerm)) ||
                idea.category.toLowerCase().includes(searchTerm)
            );
        }

        container.innerHTML = this.renderFilteredIdeas(filteredIdeas);
    }

    // Render all ideas with admin controls
    renderAllIdeas() {
        return this.renderFilteredIdeas(this.policyIdeas);
    }

    // Render filtered ideas
    renderFilteredIdeas(ideas) {
        if (ideas.length === 0) {
            return `
                <div class="no-ideas">
                    <i class="fas fa-lightbulb"></i>
                    <p>No ideas found matching your criteria.</p>
                </div>
            `;
        }

        return ideas.map(idea => `
            <div class="idea-card-full" data-idea-id="${idea.id}">
                <div class="idea-header">
                    <div class="idea-meta-top">
                        <span class="category-badge ${idea.category.toLowerCase().replace(' ', '-')}">${idea.category}</span>
                        <span class="idea-status status-${idea.status}">${this.getStatusText(idea.status)}</span>
                        ${this.isAdmin() && idea.status === 'pending' ? `
                            <div class="admin-actions">
                                <button class="btn-small btn-success approve-idea-btn" data-idea-id="${idea.id}">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="btn-small btn-danger reject-idea-btn" data-idea-id="${idea.id}">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="idea-votes">
                        <button class="vote-idea-btn ${this.hasUserVotedForIdea(idea.id) ? 'voted' : ''}" 
                                data-idea-id="${idea.id}" ${idea.status !== 'approved' ? 'disabled' : ''}>
                            <i class="fas fa-thumbs-up"></i>
                            <span>${idea.votes}</span>
                        </button>
                    </div>
                </div>
                
                <div class="idea-content">
                    <h3>${idea.title}</h3>
                    <p>${idea.description}</p>
                    
                    <div class="idea-tags">
                        ${(idea.tags || []).map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                    
                    <div class="idea-meta">
                        <div class="idea-author">
                            <i class="fas fa-user"></i>
                            <span>By ${idea.submittedBy || 'Anonymous'}</span>
                        </div>
                        <div class="idea-date">
                            <i class="fas fa-calendar"></i>
                            <span>${this.formatDate(idea.submittedAt)}</span>
                        </div>
                        <div class="idea-comments-count">
                            <i class="fas fa-comments"></i>
                            <span>${idea.comments.length} comments</span>
                        </div>
                    </div>
                </div>
                
                <div class="idea-actions">
                    <button class="btn-outline comment-idea-btn" data-idea-id="${idea.id}">
                        <i class="fas fa-comment"></i> Comment
                    </button>
                    <button class="btn-outline share-idea-btn" data-idea-id="${idea.id}">
                        <i class="fas fa-share"></i> Share
                    </button>
                </div>
                
                <div class="idea-comments" id="modal-comments-${idea.id}" style="display: none;">
                    <div class="comments-list">
                        ${idea.comments.map(comment => `
                            <div class="comment">
                                <div class="comment-header">
                                    <strong>${comment.user}</strong>
                                    <span class="comment-date">${this.formatDate(comment.timestamp)}</span>
                                </div>
                                <p>${comment.text}</p>
                            </div>
                        `).join('')}
                    </div>
                    ${idea.status === 'approved' ? `
                        <div class="comment-form">
                            <textarea placeholder="Add a comment..." rows="3" id="comment-text-${idea.id}"></textarea>
                            <button class="btn-primary submit-comment-btn" data-idea-id="${idea.id}">
                                Post Comment
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Submit comment on idea
    async submitComment(ideaId) {
        if (!this.currentUser) {
            this.showAlert('Please log in to comment', 'error');
            return;
        }

        const textarea = document.getElementById(`comment-text-${ideaId}`);
        if (!textarea) return;

        const commentText = textarea.value.trim();
        if (!commentText) {
            this.showAlert('Please enter a comment', 'error');
            return;
        }

        try {
            await this.simulateApiCall();

            const idea = this.policyIdeas.find(i => i.id === ideaId);
            if (idea) {
                const newComment = {
                    id: `comment_${Date.now()}`,
                    user: this.currentUser.name || this.currentUser.email,
                    text: commentText,
                    timestamp: new Date()
                };

                idea.comments.push(newComment);
                textarea.value = '';

                // Save changes
                this.savePolicyIdeas();

                // Update display
                this.renderPolicyIdeas();

                // Update modal if open
                const modalComments = document.getElementById(`modal-comments-${ideaId}`);
                if (modalComments && modalComments.style.display !== 'none') {
                    const commentsList = modalComments.querySelector('.comments-list');
                    if (commentsList) {
                        commentsList.innerHTML += `
                            <div class="comment">
                                <div class="comment-header">
                                    <strong>${newComment.user}</strong>
                                    <span class="comment-date">${this.formatDate(newComment.timestamp)}</span>
                                </div>
                                <p>${newComment.text}</p>
                            </div>
                        `;
                    }
                }

                this.showAlert('Comment posted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            this.showAlert('Error posting comment. Please try again.', 'error');
        }
    }

    // Admin approve idea
    async approveIdea(ideaId) {
        if (!this.isAdmin()) {
            this.showAlert('Access denied', 'error');
            return;
        }

        try {
            await this.simulateApiCall();

            const idea = this.policyIdeas.find(i => i.id === ideaId);
            if (idea) {
                idea.status = 'approved';
                this.savePolicyIdeas();

                // Update display
                this.renderPolicyIdeas();
                this.showAlert('Idea approved successfully!', 'success');

                // Refresh modal view
                const container = document.getElementById('allIdeasContainer');
                if (container) {
                    container.innerHTML = this.renderAllIdeas();
                }
            }
        } catch (error) {
            console.error('Error approving idea:', error);
            this.showAlert('Error approving idea. Please try again.', 'error');
        }
    }

    // Admin reject idea
    async rejectIdea(ideaId) {
        if (!this.isAdmin()) {
            this.showAlert('Access denied', 'error');
            return;
        }

        try {
            await this.simulateApiCall();

            const idea = this.policyIdeas.find(i => i.id === ideaId);
            if (idea) {
                idea.status = 'rejected';
                this.savePolicyIdeas();

                this.showAlert('Idea rejected', 'info');

                // Refresh modal view
                const container = document.getElementById('allIdeasContainer');
                if (container) {
                    container.innerHTML = this.renderAllIdeas();
                }
            }
        } catch (error) {
            console.error('Error rejecting idea:', error);
            this.showAlert('Error rejecting idea. Please try again.', 'error');
        }
    }

    // Check if current user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    // Save policy ideas to localStorage
    savePolicyIdeas() {
        localStorage.setItem('policyIdeas', JSON.stringify(this.policyIdeas));
    }

    // Save user submissions to localStorage
    saveUserSubmissions() {
        localStorage.setItem('userSubmissions', JSON.stringify(Array.from(this.userSubmissions.entries())));
    }

    // Save user votes to localStorage
    saveUserVotes() {
        localStorage.setItem('userVotes', JSON.stringify(Array.from(this.userVotes.entries())));
    }

    // Update UI based on current state and active section
    updateUI(activeSection = null) {
        // Get currently active section if not specified
        if (!activeSection) {
            const activeTab = document.querySelector('.nav-tab.active');
            activeSection = activeTab ? activeTab.dataset.section : 'vote';
        }

        // Ensure proper section visibility
        this.ensureSectionVisibility(activeSection);

        // Update header stats
        this.updateHeaderStats();

        // Update UI based on active section
        switch (activeSection) {
            case 'vote':
                this.renderSurveys();
                break;
            case 'ideas':
                this.renderPolicyIdeas();
                break;
            case 'results':
                // Update charts if they exist
                this.updateResultCharts();
                break;
        }

        // Update user-specific UI elements
        this.updateUserSpecificUI();
    }

    // Ensure only the specified section is visible
    ensureSectionVisibility(activeSection) {
        // Hide all sections
        document.querySelectorAll('.survey-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show only the active section
        const activeElement = document.getElementById(`${activeSection}Section`);
        if (activeElement) {
            activeElement.classList.add('active');
        }

        // Update navigation tabs to match
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.section === activeSection) {
                tab.classList.add('active');
            }
        });

        console.log(`📋 Ensured section visibility: ${activeSection} section active`);
    }

    // Update the statistics in the header
    updateHeaderStats() {
        // Update participant count
        const participantEl = document.querySelector('.header-stats .stat-number:nth-child(1)');
        if (participantEl) {
            const participantCount = this.generateTotalParticipants();
            participantEl.textContent = this.formatNumber(participantCount);
        }

        // Update policy ideas count
        const ideasEl = document.querySelector('.header-stats .stat-number:nth-child(3)');
        if (ideasEl) {
            const approvedIdeas = this.policyIdeas.filter(idea => idea.status === 'approved').length;
            ideasEl.textContent = approvedIdeas;
        }

        // Update active surveys count
        const surveysEl = document.querySelector('.header-stats .stat-number:nth-child(5)');
        if (surveysEl) {
            const activeSurveys = this.surveys.length;
            surveysEl.textContent = activeSurveys;
        }

        // Update tab badges
        const ideaCountBadge = document.querySelector('.nav-tab[data-section="ideas"] .tab-badge');
        if (ideaCountBadge) {
            const approvedIdeas = this.policyIdeas.filter(idea => idea.status === 'approved').length;
            ideaCountBadge.textContent = approvedIdeas;
        }

        const surveyCountBadge = document.querySelector('.nav-tab[data-section="vote"] .tab-badge');
        if (surveyCountBadge) {
            surveyCountBadge.textContent = this.surveys.length;
        }
    }

    // Update user-specific UI elements
    updateUserSpecificUI() {
        // Show/hide admin controls
        const isAdmin = this.isAdmin();
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
        });

        // Update user vote status for ideas
        this.policyIdeas.forEach(idea => {
            const voteBtn = document.querySelector(`.vote-idea-btn[data-idea-id="${idea.id}"]`);
            if (voteBtn) {
                if (this.hasUserVotedForIdea(idea.id)) {
                    voteBtn.classList.add('voted');
                } else {
                    voteBtn.classList.remove('voted');
                }
            }
        });
    }

    // Update charts in the results section
    updateResultCharts() {
        console.log('📊 updateResultCharts called');
        console.log('🔍 Chart.js available:', typeof window.Chart);

        if (window.Chart) {
            console.log('✅ Chart.js loaded, creating charts...');
            // Affordability Chart
            this.createAffordabilityChart();

            // Housing Schemes Chart
            this.createSchemesChart();

            // Location Chart
            this.createLocationChart();
        } else {
            console.error('❌ Chart.js not loaded');
        }
    }

    // Create affordability chart
    createAffordabilityChart() {
        console.log('📈 Creating affordability chart...');
        const affordabilityCtx = document.getElementById('affordabilityChart');
        if (!affordabilityCtx) {
            console.error('❌ affordabilityChart canvas not found');
            return;
        }

        console.log('✅ Canvas found:', affordabilityCtx);

        // Destroy existing chart if it exists
        if (this.affordabilityChart) {
            this.affordabilityChart.destroy();
        }

        this.affordabilityChart = new Chart(affordabilityCtx, {
            type: 'pie',
            data: {
                labels: ['Very Unaffordable', 'Unaffordable', 'Neutral', 'Affordable', 'Very Affordable'],
                datasets: [{
                    data: [45, 28, 15, 9, 3],
                    backgroundColor: [
                        '#FF6B6B', '#FFA06B', '#FFEAAE', '#A0D2EB', '#6BB5FF'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 15,
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    // Create schemes chart
    createSchemesChart() {
        const schemesCtx = document.getElementById('schemesChart');
        if (!schemesCtx) return;

        // Destroy existing chart if it exists
        if (this.schemesChart) {
            this.schemesChart.destroy();
        }

        this.schemesChart = new Chart(schemesCtx, {
            type: 'bar',
            data: {
                labels: ['PR1MA', 'My First Home', 'Rumah Selangorku', 'Rent-to-Own', 'PPAM'],
                datasets: [{
                    label: 'Preference Score',
                    data: [32, 27, 18, 15, 8],
                    backgroundColor: '#6BB5FF',
                    borderWidth: 0,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
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
    }

    // Create location chart
    createLocationChart() {
        console.log('📍 Creating location chart...');
        const locationCtx = document.getElementById('locationChart');
        if (!locationCtx) {
            console.error('❌ locationChart canvas not found');
            return;
        }

        console.log('✅ Location canvas found:', locationCtx);

        // Destroy existing chart if it exists
        if (this.locationChart) {
            this.locationChart.destroy();
        }

        this.locationChart = new Chart(locationCtx, {
            type: 'doughnut',
            data: {
                labels: ['Proximity to Work', 'Price/Affordability', 'Amenities', 'School Districts', 'Transport Links'],
                datasets: [{
                    data: [35, 25, 15, 15, 10],
                    backgroundColor: [
                        '#FF6B6B', '#FFB366', '#FFEAAE', '#A0D2EB', '#6BB5FF'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    // Generate total participants count (mock data)
    generateTotalParticipants() {
        let count = 0;

        // Sum survey responses
        this.surveys.forEach(survey => {
            count += survey.responses;
        });

        // Add quick poll votes
        this.quickPolls.forEach(poll => {
            count += poll.totalVotes;
        });

        // Since not all users vote in everything, add some more to represent unique users
        return Math.round(count * 1.25);
    }

    // Format number with commas
    formatNumber(number) {
        return new Intl.NumberFormat('en-MY').format(number);
    }

    // Helper for simulating API calls
    async simulateApiCall() {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    // Show alert/notification
    showAlert(message, type) {
        const alertElement = document.createElement('div');
        alertElement.className = `notification-toast notification-${type}`;
        alertElement.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                    'fa-info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(alertElement);

        // Auto-remove after a delay
        setTimeout(() => {
            alertElement.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => alertElement.remove(), 300);
        }, 3000);

        // Allow manual close
        alertElement.querySelector('.notification-close').addEventListener('click', () => {
            alertElement.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => alertElement.remove(), 300);
        });
    }

    // Format date
    formatDate(date) {
        if (!date) {
            return 'Date not available';
        }

        if (!(date instanceof Date)) {
            date = new Date(date);
        }

        // Check if date is invalid
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }

        // Format as "Jan 15, 2024"
        return date.toLocaleDateString('en-MY', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Get survey status (active, completed, upcoming)
    getSurveyStatus(survey) {
        const now = new Date();
        const endDate = new Date(survey.endDate);

        if (endDate < now) {
            return 'completed';
        }

        return 'active';
    }

    // Get formatted survey status text
    getSurveyStatusText(survey) {
        const status = this.getSurveyStatus(survey);

        switch (status) {
            case 'completed':
                return 'Completed';
            case 'active':
                return 'Active';
            default:
                return status;
        }
    }

    // Show field-specific error
    showFieldError(field, message) {
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

    // Debug function to validate data integrity
    validateDataIntegrity() {
        console.log('🔍 Validating data integrity...');

        // Check policy ideas
        if (this.policyIdeas) {
            this.policyIdeas.forEach((idea, index) => {
                if (!idea.submittedBy) {
                    console.warn(`⚠️ Idea ${index} missing submittedBy:`, idea);
                }
                if (!idea.submittedAt) {
                    console.warn(`⚠️ Idea ${index} missing submittedAt:`, idea);
                }
                if (idea.submittedAt && isNaN(new Date(idea.submittedAt).getTime())) {
                    console.warn(`⚠️ Idea ${index} has invalid submittedAt date:`, idea.submittedAt);
                }
            });
        }

        // Check surveys
        if (this.surveys) {
            this.surveys.forEach((survey, index) => {
                if (survey.endDate && isNaN(new Date(survey.endDate).getTime())) {
                    console.warn(`⚠️ Survey ${index} has invalid endDate:`, survey.endDate);
                }
                if (survey.createdAt && isNaN(new Date(survey.createdAt).getTime())) {
                    console.warn(`⚠️ Survey ${index} has invalid createdAt:`, survey.createdAt);
                }
            });
        }

        // Check quick polls
        if (this.quickPolls) {
            this.quickPolls.forEach((poll, index) => {
                if (poll.endDate && isNaN(new Date(poll.endDate).getTime())) {
                    console.warn(`⚠️ Poll ${index} has invalid endDate:`, poll.endDate);
                }
            });
        }
    }

    // Debug authentication state
    debugAuthState() {
        console.log('🔐 SurveyManager Authentication Debug:');
        console.log('  - this.currentUser:', this.currentUser);
        console.log('  - window.authManager?.currentUser:', window.authManager?.currentUser);
        console.log('  - window.auth?.currentUser:', window.auth?.currentUser);
        console.log('  - localStorage currentUser:', localStorage.getItem('currentUser'));
        console.log('  - getCurrentUser() result:', this.getCurrentUser());

        if (this.currentUser) {
            console.log('  - User email:', this.currentUser.email);
            console.log('  - User UID:', this.currentUser.uid);
            console.log('  - User display name:', this.currentUser.displayName);
        } else {
            console.log('  - No current user found');
        }
    }
}

// Make SurveyManager accessible globally
console.log('📋 About to export SurveyManager to window...');
window.SurveyManager = SurveyManager;

// Log availability for debugging
console.log('📋 SurveyManager class is now available on window object');

// Trigger initialization if global functions are loaded
if (window.initializeSurveyManager && typeof window.initializeSurveyManager === 'function') {
    console.log('🔄 Triggering survey manager initialization...');
    setTimeout(() => window.initializeSurveyManager(), 100);
}

// Add this at the very end of your existing survey.js file

// Enhanced initialization with results integration
if (window.SurveyManager && !window.surveyManager) {
  console.log('🔄 Initializing enhanced survey manager...');
  
  // Create enhanced survey manager
  const originalInit = SurveyManager.prototype.init;
  SurveyManager.prototype.init = async function() {
    await originalInit.call(this);
    
    // Add results manager
    if (window.SurveyResultsManager) {
      this.resultsManager = new window.SurveyResultsManager(this);
      console.log('✅ Results manager attached');
    }
  };

  // Override updateResultCharts to use real data
  const originalUpdateResultCharts = SurveyManager.prototype.updateResultCharts;
  SurveyManager.prototype.updateResultCharts = function() {
    if (this.resultsManager) {
      this.resultsManager.updateResultsCharts();
    } else {
      originalUpdateResultCharts.call(this);
    }
  };

  // Override survey submission to trigger results update
  const originalSaveSurveyResponse = SurveyManager.prototype.saveSurveyResponse;
  SurveyManager.prototype.saveSurveyResponse = function(surveyId, responses) {
    originalSaveSurveyResponse.call(this, surveyId, responses);
    
    // Update results after saving
    setTimeout(() => {
      if (this.resultsManager) {
        this.resultsManager.updateResultsCharts();
      }
    }, 100);
  };

  // Override vote handling to trigger results update
  const originalHandleVote = SurveyManager.prototype.handleVote;
  SurveyManager.prototype.handleVote = async function(button) {
    const result = await originalHandleVote.call(this, button);
    
    // Update results after vote
    setTimeout(() => {
      if (this.resultsManager) {
        this.resultsManager.updateResultsCharts();
      }
    }, 100);
    
    return result;
  };
}