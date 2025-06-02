// Community page functionality with Backend Integration
import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyD6cjEQ-ljbUX9S5IzHyMXpxQm9KNM-OoA",
    authDomain: "home-watch-dfe87.firebaseapp.com",
    projectId: "home-watch-dfe87",
    storageBucket: "home-watch-dfe87.firebasestorage.app",
    messagingSenderId: "53573656505",
    appId: "1:53573656505:web:4249ebd5a88c929a436068",
    measurementId: "G-74HLL3SWR5"
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const postsCollection = db.collection('posts');

// DOM Elements
const loadingElement = document.getElementById('loading');
const postsContainer = document.getElementById('posts-container');
const postsTableBody = document.getElementById('posts-table-body');
const emptyState = document.getElementById('empty-state');
const toastElement = document.getElementById('toast');

// Show toast message
function showToast(message, type = 'success') {
    toastElement.textContent = message;
    toastElement.className = `toast ${type} show`;

    setTimeout(() => {
        toastElement.className = 'toast';
    }, 3000);
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }

    try {
        await postsCollection.doc(postId).delete();
        showToast('Post deleted successfully');
        fetchPosts(); // Refresh the list
    } catch (error) {
        console.error('Error deleting post:', error);
        showToast('Error deleting post', 'error');
    }
}

// Render posts
function renderPosts(posts) {
    if (posts.length === 0) {
        postsTableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    console.log("posts: ", posts)

    emptyState.style.display = 'none';
    postsTableBody.innerHTML = posts.map(post => `
                <tr>
                    <td class="truncate">${post.title || 'Untitled'}</td>
                    <td class="truncate">${post.content || 'No content'}</td>
                    <td class="date-col">${formatDate(post.createdAt)}</td>
                    <td>
                        <button class="btn btn-danger" onclick="deletePost('${post.id}')">Delete</button>
                    </td>
                </tr>
            `).join('');
}

// Fetch posts from Firestore
async function fetchPosts() {
    loadingElement.style.display = 'flex';
    postsContainer.style.display = 'none';

    try {
        const snapshot = await postsCollection.orderBy('createdAt', 'desc').get();
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderPosts(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        showToast('Error fetching posts', 'error');
    } finally {
        loadingElement.style.display = 'none';
        postsContainer.style.display = 'block';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
});