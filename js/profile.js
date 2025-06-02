// Profile Page JavaScript
import { auth, db } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, where, collection, getDocs, getDoc, setDoc, query, orderBy, limit, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userProfile = {};
        this.activityChart = null;
        this.authInitialized = false;
        this.init();
    }

    async init() {
        // Show loading state while Firebase auth initializes
        document.body.style.visibility = 'hidden';

        console.log('ProfileManager initializing...');

        // Check if Firebase is available
        if (!auth) {
            console.error('Firebase auth not available, using fallback mode');
            this.initFallbackMode();
            return;
        }

        // Check if user is authenticated using Firebase
        onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed:', user ? 'User logged in' : 'No user');
            this.authInitialized = true;

            if (user) {
                console.log("user: ", user)
                this.currentUser = user;
                document.body.style.visibility = 'visible';
                this.bindEvents();
                await this.loadUserProfile();
                this.initializeTabs();
                this.updateUI();
                this.loadProfileData();

            } else {
                // User is not authenticated, redirect to login
                console.log('No authenticated user found, redirecting to login');
                window.location.href = 'index.html';
            }
        }, (error) => {
            console.error('Firebase auth error:', error);
            this.initFallbackMode();
        });

        // Fallback timeout in case Firebase doesn't respond
        setTimeout(() => {
            if (!this.authInitialized) {
                console.log('Firebase auth initialization timeout, using fallback mode');
                this.initFallbackMode();
            }
        }, 10000); // Increased timeout for slower connections
    }

    initFallbackMode() {
        console.log('Initializing fallback mode with demo profile');
        this.authInitialized = true;

        // Create a mock user for demo purposes
        this.currentUser = {
            uid: 'demo-user',
            email: 'demo@homewatch.my',
            displayName: 'Demo User'
        };

        // Create a demo profile
        this.userProfile = {
            id: 'demo-user',
            name: 'Demo User',
            email: 'demo@homewatch.my',
            location: 'Malaysia',
            bio: 'This is a demo profile running in offline mode.',
            joinDate: new Date(),
            avatar: 'images/user-avatar.svg',
            banner: 'images/profile-banner.svg',
            stats: {
                posts: 5,
                followers: 23,
                following: 15,
                surveys: 3,
                likesReceived: 45,
                commentsReceived: 12,
                sharesReceived: 8
            },
            achievements: [
                { id: 'early_adopter', name: 'Early Adopter', description: 'Joined HomeWatch!', icon: 'fas fa-rocket' },
                { id: 'active_user', name: 'Active User', description: 'Made 5 posts', icon: 'fas fa-star' }
            ]
        };

        document.body.style.visibility = 'visible';
        this.bindEvents();
        this.updateProfileDisplay();
        this.initializeTabs();
        this.updateUI();
        this.loadProfileData();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async handleLogout() {
        try {
            await signOut(auth);
            console.log('User logged out successfully');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            this.showAlert('Error logging out. Please try again.', 'error');
        }
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.profile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Profile editing
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            this.openEditModal();
        });

        // Logout functionality
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Avatar and banner uploads
        document.getElementById('editAvatarBtn').addEventListener('click', () => {
            document.getElementById('avatarUpload').click();
        });

        document.getElementById('editBannerBtn').addEventListener('click', () => {
            document.getElementById('bannerUpload').click();
        });

        document.getElementById('avatarUpload').addEventListener('change', (e) => {
            this.handleAvatarUpload(e.target.files[0]);
        });

        document.getElementById('bannerUpload').addEventListener('change', (e) => {
            this.handleBannerUpload(e.target.files[0]);
        });

        // Settings form
        const settingsForm = document.getElementById('profileSettingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfileSettings();
            });
        }

        // Activity filters
        const activityFilter = document.getElementById('activityFilter');
        const activityPeriod = document.getElementById('activityPeriod');

        if (activityFilter) {
            activityFilter.addEventListener('change', () => {
                this.filterActivity();
            });
        }

        if (activityPeriod) {
            activityPeriod.addEventListener('change', () => {
                this.filterActivity();
            });
        }

        // Posts filter
        const postsFilter = document.getElementById('postsFilter');
        if (postsFilter) {
            postsFilter.addEventListener('change', () => {
                this.filterPosts();
            });
        }

        // Bookmark filters
        document.querySelectorAll('.bookmark-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterBookmarksBy(e.target.dataset.type);
            });
        });

        // Account actions
        document.getElementById('changePasswordBtn').addEventListener('click', () => {
            this.openChangePasswordModal();
        });

        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportUserData();
        });

        document.getElementById('deleteAccountBtn').addEventListener('click', () => {
            this.openDeleteAccountModal();
        });
    }

    async loadUserProfile() {
        try {
            // Load user profile from Firebase Firestore
            const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
            const adminButton = document.getElementById('admin_button')

            if (userDoc.exists()) {
                const userData = userDoc.data();

                console.log("userData: ", userData)

                const adminButton = document.getElementById('admin_button')
                if (userData.isAdmin) {
                    adminButton.style = "display: block"
                }

                this.userProfile = {
                    id: this.currentUser.uid,
                    name: userData.name || this.currentUser.displayName || this.currentUser.email || 'User',
                    email: this.currentUser.email,
                    location: userData.location || 'Malaysia',
                    bio: userData.bio || 'Welcome to HomeWatch! Update your bio in settings.',
                    joinDate: userData.joinDate ? new Date(userData.joinDate) : new Date(),
                    avatar: userData.profilePicture || 'images/user-avatar.svg',
                    banner: userData.banner || 'images/profile-banner.svg',
                    stats: {
                        posts: userData.stats?.posts || 0,
                        followers: userData.followers?.length || 0,
                        following: userData.following?.length || 0,
                        surveys: userData.stats?.surveys || 0,
                        likesReceived: userData.stats?.likesReceived || 0,
                        commentsReceived: userData.stats?.commentsReceived || 0,
                        sharesReceived: userData.stats?.sharesReceived || 0
                    },
                    achievements: userData.achievements || [
                        { id: 'early_adopter', name: 'Early Adopter', description: 'Joined HomeWatch!', icon: 'fas fa-rocket' }
                    ]
                };
            } else {

                // Create default profile if user document doesn't exist
                this.userProfile = {
                    id: this.currentUser.uid,
                    name: this.currentUser.displayName || this.currentUser.email || 'User',
                    email: this.currentUser.email,
                    location: 'Malaysia',
                    bio: 'Welcome to HomeWatch! Update your bio in settings.',
                    joinDate: new Date(),
                    avatar: 'images/user-avatar.svg',
                    banner: 'images/profile-banner.svg',
                    stats: {
                        posts: 0,
                        followers: 0,
                        following: 0,
                        surveys: 0,
                        likesReceived: 0,
                        commentsReceived: 0,
                        sharesReceived: 0
                    },
                    achievements: [
                        { id: 'early_adopter', name: 'Early Adopter', description: 'Joined HomeWatch!', icon: 'fas fa-rocket' }
                    ]
                };

                // Save the new profile to Firestore
                try {
                    await setDoc(doc(db, 'users', this.currentUser.uid), {
                        name: this.userProfile.name,
                        email: this.userProfile.email,
                        location: this.userProfile.location,
                        bio: this.userProfile.bio,
                        joinDate: this.userProfile.joinDate.toISOString(),
                        stats: this.userProfile.stats,
                        achievements: this.userProfile.achievements
                    });
                    console.log('New user profile created in Firestore');
                } catch (error) {
                    console.error('Error creating user profile:', error);
                }
            }

            this.updateProfileDisplay();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showAlert('Error loading profile data', 'error');
        }
    }

    updateProfileDisplay() {
        const profile = this.userProfile;

        // Update profile header
        document.getElementById('profileName').textContent = profile.name;
        document.getElementById('profileLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${profile.location}`;
        document.getElementById('profileJoinDate').innerHTML = `<i class="fas fa-calendar"></i> Member since ${this.formatDate(profile.joinDate, { month: 'long', year: 'numeric' })}`;
        document.getElementById('profileBio').textContent = profile.bio;

        // Update avatar and banner
        document.getElementById('avatarImage').src = profile.avatar;
        document.getElementById('profileBanner').style.backgroundImage = `url(${profile.banner})`;

        // Update stats
        document.getElementById('postsCount').textContent = profile.stats.posts;
        document.getElementById('followersCount').textContent = profile.stats.followers;
        document.getElementById('followingCount').textContent = profile.stats.following;
        document.getElementById('surveysCount').textContent = profile.stats.surveys;
        document.getElementById('likesReceived').textContent = profile.stats.likesReceived;
        document.getElementById('commentsReceived').textContent = profile.stats.commentsReceived;
        document.getElementById('sharesReceived').textContent = profile.stats.sharesReceived;

        // Update settings form
        document.getElementById('settingsName').value = profile.name;
        document.getElementById('settingsEmail').value = profile.email;
        document.getElementById('settingsLocation').value = profile.location;
        document.getElementById('settingsBio').value = profile.bio;
    }

    initializeTabs() {
        this.switchTab('posts');
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.profile-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load tab-specific content
        switch (tabName) {
            case 'overview':
                this.loadOverviewTab();
                break;
            case 'activity':
                this.loadActivityTab();
                break;
            case 'posts':
                this.loadPostsTab();
                break;
            case 'surveys':
                this.loadSurveysTab();
                break;
            case 'bookmarks':
                this.loadBookmarksTab();
                break;
            case 'settings':
                // Settings tab is static
                break;
        }
    }

    loadOverviewTab() {
        this.renderActivityChart();
        this.renderRecentActivity();
        this.renderAchievements();
    }

    renderActivityChart() {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;

        if (this.activityChart) {
            this.activityChart.destroy();
        }

        const data = {
            labels: ['Posts', 'Comments', 'Votes', 'Surveys', 'Bookmarks'],
            datasets: [{
                label: 'Activity Count',
                data: [23, 45, 78, 12, 34],
                backgroundColor: [
                    'rgba(74, 144, 226, 0.8)',
                    'rgba(80, 227, 194, 0.8)',
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(255, 195, 113, 0.8)',
                    'rgba(196, 181, 253, 0.8)'
                ],
                borderColor: [
                    'rgba(74, 144, 226, 1)',
                    'rgba(80, 227, 194, 1)',
                    'rgba(255, 107, 107, 1)',
                    'rgba(255, 195, 113, 1)',
                    'rgba(196, 181, 253, 1)'
                ],
                borderWidth: 2
            }]
        };

        this.activityChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        const activities = [
            {
                type: 'post',
                icon: 'fas fa-comment',
                text: 'Created a new post about PR1MA housing scheme',
                time: '2 hours ago'
            },
            {
                type: 'vote',
                icon: 'fas fa-vote-yea',
                text: 'Voted on housing affordability survey',
                time: '5 hours ago'
            },
            {
                type: 'comment',
                icon: 'fas fa-reply',
                text: 'Commented on community discussion',
                time: '1 day ago'
            },
            {
                type: 'survey',
                icon: 'fas fa-poll',
                text: 'Completed survey about rental preferences',
                time: '2 days ago'
            },
            {
                type: 'bookmark',
                icon: 'fas fa-bookmark',
                text: 'Bookmarked Youth Housing Initiative program',
                time: '3 days ago'
            }
        ];

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    renderAchievements() {
        const container = document.getElementById('achievementsList');
        if (!container) return;

        const achievements = this.userProfile.achievements;

        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-item">
                <div class="achievement-icon">
                    <i class="${achievement.icon}"></i>
                </div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `).join('');
    }

    loadActivityTab() {
        this.renderActivityList();
    }

    renderActivityList() {
        const container = document.getElementById('activityList');
        if (!container) return;

        // Generate mock activity data
        const activities = this.generateMockActivities();

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.description}</div>
                    <div class="activity-time">${this.formatDate(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    loadPostsTab() {
        this.renderUserPosts();
    }

    // Format timestamp to relative time
    formatTime(timestamp) {
        if (!timestamp) return 'Unknown time';

        const now = new Date();
        const postTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diffMs = now - postTime;

        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return postTime.toLocaleDateString();
    }

    async renderUserPosts() {
        const container = document.getElementById('userPosts');
        if (!container) return;

        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('timestamp', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);

        let _userPosts = [];

        _userPosts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            type: 'user_post',
            ...doc.data(),
            date: this.formatTime(doc.data().timestamp)
        }));

        container.innerHTML = _userPosts.map(post => `
            <div class="post-card">
                <div class="post-header">
                    <h4 class="post-title">${post.title}</h4>
                    <span class="post-date">${this.formatDate(post.date)}</span>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-stats">
                    <span class="post-stat">
                        <i class="fas fa-heart"></i> ${post.likes}
                    </span>
                    <span class="post-stat">
                        <i class="fas fa-comment"></i> ${post.comments}
                    </span>
                    <span class="post-stat">
                        <i class="fas fa-share"></i> ${post.shares}
                    </span>
                </div>
            </div>
        `).join('');
    }


    loadSurveysTab() {
        this.renderCompletedSurveys();
        this.renderCreatedSurveys();
    }

    renderCompletedSurveys() {
        const container = document.getElementById('completedSurveys');
        if (!container) return;

        const surveys = [
            {
                id: 'survey_1',
                title: 'Housing Affordability Priorities',
                completedDate: new Date('2024-01-19'),
                responses: 234
            },
            {
                id: 'survey_2',
                title: 'Community Feedback on New Developments',
                completedDate: new Date('2024-01-16'),
                responses: 156
            }
        ];

        container.innerHTML = surveys.map(survey => `
            <div class="survey-item">
                <div class="survey-title">${survey.title}</div>
                <div class="survey-meta">
                    <span>Completed on ${this.formatDate(survey.completedDate)}</span>
                    <span>${survey.responses} total responses</span>
                </div>
            </div>
        `).join('');
    }

    renderCreatedSurveys() {
        const container = document.getElementById('createdSurveys');
        if (!container) return;

        const surveys = [
            {
                id: 'survey_3',
                title: 'Transportation Preferences for New Housing',
                createdDate: new Date('2024-01-10'),
                responses: 67,
                status: 'active'
            }
        ];

        container.innerHTML = surveys.map(survey => `
            <div class="survey-item">
                <div class="survey-title">${survey.title}</div>
                <div class="survey-meta">
                    <span>Created on ${this.formatDate(survey.createdDate)}</span>
                    <span>${survey.responses} responses</span>
                    <span class="status-${survey.status}">${survey.status}</span>
                </div>
            </div>
        `).join('');
    }

    loadBookmarksTab() {
        this.renderBookmarks();
    }

    renderBookmarks() {
        const container = document.getElementById('bookmarksGrid');
        if (!container) return;

        // Load bookmarks from localStorage
        const bookmarkedPrograms = JSON.parse(localStorage.getItem('bookmarkedPrograms')) || [];
        const bookmarkedPosts = JSON.parse(localStorage.getItem('bookmarkedPosts')) || [];

        const bookmarks = [
            ...bookmarkedPrograms.map(id => ({
                type: 'programs',
                title: this.getProgramTitle(id),
                description: 'Housing program bookmark',
                date: new Date()
            })),
            ...bookmarkedPosts.map(id => ({
                type: 'posts',
                title: 'Community Discussion',
                description: 'Bookmarked community post',
                date: new Date()
            }))
        ];

        if (bookmarks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bookmark"></i>
                    <h4>No bookmarks yet</h4>
                    <p>Items you bookmark will appear here for easy access.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = bookmarks.map(bookmark => `
            <div class="bookmark-item">
                <div class="bookmark-type">${bookmark.type}</div>
                <div class="bookmark-title">${bookmark.title}</div>
                <div class="bookmark-description">${bookmark.description}</div>
            </div>
        `).join('');
    }

    async handleAvatarUpload(file) {
        if (!file) return;

        try {
            // Simulate file upload
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('avatarImage').src = e.target.result;
                this.userProfile.avatar = e.target.result;
                this.showAlert('Profile picture updated successfully!', 'success');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.showAlert('Error uploading profile picture', 'error');
        }
    }

    async handleBannerUpload(file) {
        if (!file) return;

        try {
            // Simulate file upload
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('profileBanner').style.backgroundImage = `url(${e.target.result})`;
                this.userProfile.banner = e.target.result;
                this.showAlert('Banner updated successfully!', 'success');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading banner:', error);
            this.showAlert('Error uploading banner image', 'error');
        }
    }

    async saveProfileSettings() {
        try {
            const formData = new FormData(document.getElementById('profileSettingsForm'));

            // Update profile data
            const updatedData = {
                name: formData.get('name'),
                location: formData.get('location'),
                bio: formData.get('bio')
            };

            // Update local profile object
            this.userProfile.name = updatedData.name;
            this.userProfile.location = updatedData.location;
            this.userProfile.bio = updatedData.bio;

            // Update display
            this.updateProfileDisplay();

            // Save to Firebase Firestore
            await updateDoc(doc(db, 'users', this.currentUser.uid), updatedData);

            this.showAlert('Profile settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving profile:', error);
            this.showAlert('Error saving profile settings', 'error');
        }
    }

    filterActivity() {
        const type = document.getElementById('activityFilter').value;
        const period = document.getElementById('activityPeriod').value;

        // Filter and re-render activity list based on selections
        this.renderActivityList();
    }

    filterPosts() {
        const filter = document.getElementById('postsFilter').value;

        // Filter and re-render posts based on selection
        this.renderUserPosts();
    }

    filterBookmarksBy(type) {
        // Update active filter button
        document.querySelectorAll('.bookmark-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        // Filter and re-render bookmarks
        this.renderBookmarks();
    }

    openEditModal() {
        // Quick edit functionality - could open a modal for detailed editing
        this.switchTab('settings');
    }

    openChangePasswordModal() {
        // Implementation for password change modal
        this.showAlert('Password change feature coming soon!', 'info');
    }

    async exportUserData() {
        try {
            const userData = {
                profile: this.userProfile,
                posts: [], // Would load actual posts
                activity: [], // Would load actual activity
                bookmarks: JSON.parse(localStorage.getItem('bookmarkedPrograms') || '[]')
            };

            const dataStr = JSON.stringify(userData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `homewatch-data-${Date.now()}.json`;
            link.click();

            URL.revokeObjectURL(url);
            this.showAlert('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showAlert('Error exporting data', 'error');
        }
    }

    openDeleteAccountModal() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
                this.deleteAccount();
            }
        }
    }

    async deleteAccount() {
        try {
            // In real app, would call Firebase auth and Firestore delete
            localStorage.clear();
            this.showAlert('Account deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            console.error('Error deleting account:', error);
            this.showAlert('Error deleting account', 'error');
        }
    }

    generateMockActivities() {
        const activities = [
            { type: 'post', description: 'Created a new post about PR1MA housing scheme', timestamp: new Date('2024-01-20T10:30:00') },
            { type: 'vote', description: 'Voted on housing affordability survey', timestamp: new Date('2024-01-20T08:15:00') },
            { type: 'comment', description: 'Commented on community discussion about rental prices', timestamp: new Date('2024-01-19T16:45:00') },
            { type: 'survey', description: 'Completed survey about rental preferences', timestamp: new Date('2024-01-19T14:20:00') },
            { type: 'bookmark', description: 'Bookmarked Youth Housing Initiative program', timestamp: new Date('2024-01-18T11:10:00') }
        ];

        return activities.sort((a, b) => b.timestamp - a.timestamp);
    }

    getActivityIcon(type) {
        const icons = {
            post: 'fas fa-comment',
            vote: 'fas fa-vote-yea',
            comment: 'fas fa-reply',
            survey: 'fas fa-poll',
            bookmark: 'fas fa-bookmark'
        };
        return icons[type] || 'fas fa-circle';
    }

    getProgramTitle(programId) {
        const programs = {
            'pr1ma': 'PR1MA',
            'rumah-selangorku': 'Rumah Selangorku',
            'my-first-home': 'My First Home Scheme',
            'rent-to-own': 'Rent-to-Own',
            'social-housing': 'Social Housing',
            'youth-housing': 'Youth Housing Initiative'
        };
        return programs[programId] || 'Housing Program';
    }

    updateUI() {
        // Update any user-specific UI elements
        document.querySelector('.user-avatar img')?.setAttribute('src', this.userProfile.avatar);
    }

    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }

    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;

        const container = document.getElementById('alertsContainer') || document.body;
        container.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    loadProfileData() {
        // Load additional profile data as needed
        if (this.currentUser) {
            const userName = this.userProfile.name || this.currentUser.displayName || this.currentUser.email || 'Unknown User';
            console.log('Profile loaded for user:', userName);
            console.log('User email:', this.currentUser.email);
            console.log('User UID:', this.currentUser.uid);
        } else {
            console.log('Profile loaded but no current user found');
        }
    }
}

// Initialize Profile Manager
let profileManager;

document.addEventListener('DOMContentLoaded', function () {
    profileManager = new ProfileManager();
});

// Export for global access
window.profileManager = profileManager;
