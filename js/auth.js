// Authentication functions
import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialLoad = true; // Track if this is the initial page load
        this.init();
    }

    init() {
        // Check if this page handles its own authentication
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const pagesWithOwnAuth = ['profile.html'];

        // If this page handles its own auth, only update UI, don't manage redirects
        if (pagesWithOwnAuth.includes(currentPage)) {
            onAuthStateChanged(auth, (user) => {
                this.currentUser = user;
                // Only update UI, let the page handle its own auth logic
                this.updateAuthUI(!!user);
            });
            return;
        }

        // Listen for authentication state changes on other pages
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            if (user) {
                // Only redirect on actual login, not on initial page load
                if (!this.isInitialLoad) {
                    this.handleUserLogin(user);
                } else {
                    // Just update UI on initial load
                    this.updateAuthUI(true);
                }
            } else {
                this.handleUserLogout();
            }
            // After first auth state change, subsequent ones are real login/logout events
            this.isInitialLoad = false;
        });
    }

    async register(userData) {
        try {
            const { email, password, name, username } = userData;

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            updateProfile(auth.currentUser, {
                displayName: username
            })

            console.log("user created: ", user)

            // Save additional user data to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: name,
                username: username,
                email: email,
                bio: '',
                profilePicture: '',
                followers: [],
                following: [],
                joinDate: new Date().toISOString(),
                activity: []
            });

            return { success: true, user };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserProfile(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                return { success: true, data: userDoc.data() };
            } else {
                return { success: false, error: 'User not found' };
            }
        } catch (error) {
            console.error('Get user profile error:', error);
            return { success: false, error: error.message };
        }
    }

    handleUserLogin(user) {
        // Hide auth modals (only if they exist)
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');

        if (loginModal) {
            loginModal.style.display = 'none';
        }
        if (registerModal) {
            registerModal.style.display = 'none';
        }

        // Update UI for logged-in user
        this.updateAuthUI(true);

        // Only redirect to dashboard if user is on the home page or login page
        const currentPage = window.location.pathname;
        const pageName = currentPage.split('/').pop() || 'index.html';

        if (pageName === 'index.html' || pageName === '' || pageName === '/') {
            window.location.href = 'dashboard.html';
        }
        // Otherwise, stay on the current page
    }

    handleUserLogout() {
        // Update UI for logged-out user
        this.updateAuthUI(false);

        // Redirect to home page if not already there
        if (window.location.pathname !== '/index.html' && !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
    }

    updateAuthUI(isLoggedIn) {
        const authButtons = document.querySelector('.auth-buttons');
        const navMenu = document.querySelector(".nav-link.profile")
        if (isLoggedIn) {
            authButtons.innerHTML = `
                <div class="user-menu">
                    <button class="btn btn-outline" onclick="authManager.logout()">Logout</button>
                </div>
            `;
        } else {
            navMenu.style = "display:none;"
            authButtons.innerHTML = `
             
                <button class="btn btn-outline" onclick="showLogin()">Login</button>
                <button class="btn btn-primary" onclick="showRegister()">Register</button>
            `;
        }
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Form handlers
document.addEventListener('DOMContentLoaded', function () {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

            const result = await authManager.login(email, password);

            if (!result.success) {
                alert('Login failed: ' + result.error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Login';
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const formData = {
                name: document.getElementById('registerName').value,
                username: document.getElementById('registerUsername').value,
                email: document.getElementById('registerEmail').value,
                password: document.getElementById('registerPassword').value
            };

            const confirmPassword = document.getElementById('registerConfirmPassword').value;

            if (formData.password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

            const result = await authManager.register(formData);

            if (!result.success) {
                alert('Registration failed: ' + result.error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Register';
            }
        });
    }
});

// Export for global access
window.authManager = authManager;
