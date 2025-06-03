// Community page functionality with Backend Integration
import { db, auth } from "./firebase-config.js";
import {
  doc,
  increment,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  serverTimestamp,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

class CommunityManager {
  constructor() {
    this.currentFilter = "recent";
    this.currentCategory = "all";
    this.posts = [];
    this.sentimentCache = new Map();
    this.userLikes = new Set();
    this.init();
  }

  init() {
    document.addEventListener("DOMContentLoaded", () => {
      this.loadPosts();
      this.setupEventListeners();
      this.loadUserLikes();
    });
  }

  async loadUserLikes() {
    if (!auth.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        this.userLikes = new Set(userData.likedPosts || []);
      }
    } catch (error) {
      console.warn("Failed to load user likes:", error);
    }
  }

  setupEventListeners() {
    // Category filters
    document.querySelectorAll(".category-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".category-item")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentCategory = e.target.dataset.category;
        this.loadPosts();
      });
    });

    // Sort filters
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentFilter = e.target.dataset.filter;
        this.loadPosts();
      });
    });

    // Search functionality
    const searchInput = document.getElementById("searchInput");
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchPosts(e.target.value);
      }, 300);
    });

    // New post form
    const newPostForm = document.getElementById("newPostForm");
    newPostForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.createNewPost();
    });
  }

  async loadPosts() {
    const feed = document.getElementById("discussionFeed");
    this.showLoadingSkeleton(feed);

    try {
      let allPosts = [];

      try {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("timestamp", "desc"), limit(20));
        const querySnapshot = await getDocs(q);

        allPosts = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const postData = docSnapshot.data();
            const commentsRef = collection(
              db,
              "posts",
              docSnapshot.id,
              "comments",
            );
            const commentsSnapshot = await getDocs(commentsRef);

            return {
              id: docSnapshot.id,
              type: "user_post",
              ...postData,
              time: this.formatTime(postData.timestamp),
              comments: commentsSnapshot.size,
              liked: this.userLikes.has(docSnapshot.id),
            };
          }),
        );

        if (allPosts.length === 0) {
          allPosts = this.getSamplePosts();
        }
      } catch (error) {
        console.warn(
          "Failed to load from Firestore, using sample data:",
          error,
        );
        allPosts = this.getSamplePosts();
      }

      allPosts = await this.analyzeBatchSentiment(allPosts);
      const filteredPosts = this.filterPosts(allPosts);
      this.displayPosts(filteredPosts, feed);
    } catch (error) {
      console.error("Error loading posts:", error);
      const samplePosts = this.getSamplePosts();
      const filteredPosts = this.filterPosts(samplePosts);
      this.displayPosts(filteredPosts, feed);
    }
  }

  async toggleLike(postId) {
    if (!auth.currentUser) {
      this.showNotification("Please log in to like posts", "error");
      return;
    }

    const userId = auth.currentUser.uid;
    const postRef = doc(db, "posts", postId);
    const userRef = doc(db, "users", userId);

    try {
      const isLiked = this.userLikes.has(postId);
      const increment_value = isLiked ? -1 : 1;

      await updateDoc(postRef, {
        likes: increment(increment_value),
      });

      if (isLiked) {
        this.userLikes.delete(postId);
        await updateDoc(userRef, {
          likedPosts: arrayRemove(postId),
        });
      } else {
        this.userLikes.add(postId);
        await updateDoc(userRef, {
          likedPosts: arrayUnion(postId),
        });
      }

      const likeBtn = document.querySelector(
        `[data-post-id="${postId}"] .like-btn`,
      );
      if (likeBtn) {
        const currentCount = Number.parseInt(
          likeBtn.textContent.match(/\d+/)[0],
        );
        const newCount = currentCount + increment_value;
        likeBtn.innerHTML = `<i class="fas fa-heart"></i> ${newCount}`;
        likeBtn.classList.toggle("liked", !isLiked);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      this.showNotification("Failed to update like", "error");
    }
  }

  async addComment(postId, commentText) {
    if (!auth.currentUser) {
      this.showNotification("Please log in to comment", "error");
      return;
    }

    if (!commentText.trim()) {
      this.showNotification("Comment cannot be empty", "error");
      return;
    }

    try {
      const commentsRef = collection(db, "posts", postId, "comments");

      await addDoc(commentsRef, {
        text: commentText.trim(),
        author: auth.currentUser.displayName || "Anonymous",
        authorId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
      });

      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        comments: increment(1),
      });

      this.showNotification("Comment added successfully!", "success");

      if (
        document.getElementById("postDetailModal").style.display === "block"
      ) {
        this.showPostDetail(postId);
      }

      this.loadPosts();
    } catch (error) {
      console.error("Error adding comment:", error);
      this.showNotification("Failed to add comment", "error");
    }
  }

  async loadComments(postId) {
    try {
      const commentsRef = collection(db, "posts", postId, "comments");
      const q = query(commentsRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        time: this.formatTime(doc.data().timestamp),
      }));
    } catch (error) {
      console.error("Error loading comments:", error);
      return [];
    }
  }

  displayPosts(posts, container) {
    if (posts.length === 0) {
      container.innerHTML = `
        <div class="no-posts">
          <i class="fas fa-comments" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
          <h3>No discussions found</h3>
          <p>Be the first to start a discussion in this category!</p>
          <button class="btn btn-primary" onclick="showNewPostModal()">Create Post</button>
        </div>
      `;
      return;
    }

    container.innerHTML = posts
      .map(
        (post) => `
          <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
              <div class="post-meta">
                <div class="post-avatar">${post.authorInitials || (post.author ? post.author.substring(0, 2).toUpperCase() : "NA")}</div>
                <div class="post-author-info">
                  <span class="post-author">${post.author || "Unknown"}</span>
                  <span class="post-time">${post.time}</span>
                </div>
              </div>
              <div class="post-meta-right">
                <span class="post-category">${this.getCategoryName(post.category)}</span>
                ${this.getSentimentIndicator(post)}
              </div>
            </div>
            <div class="post-content">
              <h3 class="post-title">${post.title}</h3>
              <p class="post-excerpt">${post.content}</p>
              ${this.getKeywordsDisplay(post)}
            </div>
            <div class="post-footer">
              <div class="post-actions">
                <button class="action-btn like-btn ${post.liked ? "liked" : ""}" onclick="event.stopPropagation(); window.communityManager.toggleLike('${post.id}')">
                  <i class="fas fa-heart"></i> ${post.likes || 0}
                </button>
                <button class="action-btn comment-btn" onclick="event.stopPropagation(); window.communityManager.showPostDetail('${post.id}')">
                  <i class="fas fa-comment"></i> ${post.comments || 0}
                </button>
                <button class="action-btn" onclick="event.stopPropagation(); sharePost('${post.id}')">
                  <i class="fas fa-share"></i> Share
                </button>
              </div>
              <div class="post-stats">
                ${(post.likes || 0) + (post.comments || 0)} interactions
              </div>
            </div>
          </div>
        `,
      )
      .join("");
  }

  // FIXED: Single submitComment method with proper button handling
  async submitComment(postId) {
    const textarea = document.getElementById(`commentText-${postId}`);
    const submitBtn = document
      .querySelector(`#commentText-${postId}`)
      .closest(".comment-form")
      .querySelector(".btn-primary");

    if (!textarea || !textarea.value.trim()) {
      this.showNotification("Please enter a comment", "error");
      return;
    }

    // Show loading state
    const originalText = submitBtn.innerHTML;
    const originalDisabled = submitBtn.disabled;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

    try {
      await this.addComment(postId, textarea.value.trim());

      // Clear form
      textarea.value = "";

      // Update character counter if it exists
      const counter = textarea
        .closest(".comment-form")
        .querySelector(".char-counter");
      if (counter) {
        counter.textContent = "500 characters remaining";
        counter.classList.remove("warning", "error");
      }

      // Reset button state
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.6";
    } catch (error) {
      console.error("Error submitting comment:", error);
      this.showNotification("Failed to post comment", "error");

      // Restore button state on error
      submitBtn.disabled = originalDisabled;
      submitBtn.style.opacity = originalDisabled ? "0.6" : "1";
    } finally {
      submitBtn.innerHTML = originalText;
    }
  }

  // FIXED: Updated showPostDetail with proper form initialization
  async showPostDetail(postId) {
    const modal = document.getElementById("postDetailModal");
    const content = document.getElementById("postDetailContent");

    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    content.innerHTML = `
      <div class="modal-header">
        <h2><i class="fas fa-comments"></i> Post Details</h2>
      </div>
      <div class="modal-body">
        <div class="loading" style="text-align: center; padding: 2rem;">
          <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
          <p style="margin-top: 1rem; color: var(--text-secondary);">Loading post...</p>
        </div>
      </div>
    `;

    try {
      const postDoc = await getDoc(doc(db, "posts", postId));
      let post;

      if (!postDoc.exists()) {
        const samplePosts = this.getSamplePosts();
        post = samplePosts.find((p) => p.id === postId) || samplePosts[0];
      } else {
        post = { id: postDoc.id, ...postDoc.data() };
      }

      const comments = await this.loadComments(postId);

      content.innerHTML = `
        <div class="modal-header">
          <h2><i class="fas fa-comments"></i> Post Details</h2>
        </div>
        <div class="modal-body">
          <div class="post-detail">
            <div class="post-header">
              <div class="post-meta">
                <div class="post-avatar">${post.author ? post.author.substring(0, 2).toUpperCase() : "NA"}</div>
                <div class="post-author-info">
                  <span class="post-author">${post.author || "Unknown"}</span>
                  <span class="post-time"><i class="fas fa-clock"></i> ${this.formatTime(post.timestamp) || post.time}</span>
                </div>
              </div>
              <span class="post-category">${this.getCategoryName(post.category)}</span>
            </div>
            <div class="post-content">
              <h2>${post.title}</h2>
              <p>${post.content}</p>
            </div>
            <div class="post-actions">
              <button class="action-btn like-btn ${this.userLikes.has(postId) ? "liked" : ""}" onclick="window.communityManager.toggleLike('${postId}')">
                <i class="fas fa-heart"></i> ${post.likes || 0}
              </button>
              <button class="action-btn">
                <i class="fas fa-comment"></i> ${comments.length}
              </button>
              <button class="action-btn" onclick="sharePost('${postId}')">
                <i class="fas fa-share"></i> Share
              </button>
            </div>
            <div class="comments-section">
              <h3><i class="fas fa-comments"></i> Comments (${comments.length})</h3>
              <div class="comment-form">
                <div class="form-group">
                  <textarea
                    id="commentText-${postId}"
                    placeholder="Share your thoughts about this post..."
                    rows="3"
                    maxlength="500"
                    style="width: 100%; padding: 0.875rem; border: 2px solid var(--border-color); border-radius: 8px; resize: vertical; font-family: inherit; font-size: 0.9rem; line-height: 1.5; background-color: var(--surface-color); color: var(--text-primary); transition: all 0.2s ease;"
                  ></textarea>
                  <div class="char-counter" style="text-align: right; font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">500 characters remaining</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
                  <small style="color: var(--text-secondary); font-size: 0.75rem;">
                    <i class="fas fa-info-circle"></i> Be respectful and constructive
                  </small>
                  <button
                    class="btn btn-primary comment-submit-btn"
                    onclick="window.communityManager.submitComment('${postId}')"
                    disabled
                    style="background: var(--primary-color); color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 6px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s ease; opacity: 0.6;"
                  >
                    <i class="fas fa-paper-plane"></i> Post Comment
                  </button>
                </div>
              </div>
              <div class="comments-list" style="max-height: 300px; overflow-y: auto; margin-top: 1.5rem;">
                ${
                  comments.length > 0
                    ? comments
                        .map((comment) => {
                          const isAuthor =
                            auth.currentUser &&
                            comment.authorId === auth.currentUser.uid;
                          return `
                    <div class="comment" style="padding: 1rem 0; border-bottom: 1px solid var(--border-color); position: relative;">
                      <div class="comment-header" style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                        <div class="comment-avatar" style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.8rem; margin-right: 0.75rem;">${comment.author ? comment.author.substring(0, 2).toUpperCase() : "NA"}</div>
                        <div class="comment-meta">
                          <span class="comment-author" style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">${comment.author || "Unknown"}</span>
                          <span class="comment-time" style="color: var(--text-secondary); font-size: 0.75rem; display: block;">
                            <i class="fas fa-clock"></i> ${comment.time}
                          </span>
                        </div>
                      </div>
                      <div class="comment-content" style="margin-left: 2.5rem; color: var(--text-primary); line-height: 1.5; font-size: 0.9rem;">${comment.text}</div>
                      ${
                        isAuthor
                          ? `
                        <div class="comment-actions" style="position: absolute; top: 0.75rem; right: 0; opacity: 0; transition: opacity 0.2s ease;">
                          <button
                            class="comment-action-btn delete"
                            title="Delete comment"
                            onclick="window.communityManager.deleteComment('${postId}', '${comment.id}')"
                            style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.375rem; border-radius: 4px; transition: all 0.2s ease; font-size: 0.75rem;"
                          >
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      `
                          : ""
                      }
                    </div>
                  `;
                        })
                        .join("")
                    : `
                  <div class="no-comments" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-comments" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p>No comments yet. Be the first to share your thoughts!</p>
                  </div>
                `
                }
              </div>
            </div>
          </div>
        </div>
      `;

      // Initialize form validation after content is loaded
      setTimeout(() => {
        this.initializeCommentForm(postId);
      }, 100);
    } catch (error) {
      console.error("Error loading post detail:", error);
      content.innerHTML = `
        <div class="modal-header">
          <h2><i class="fas fa-exclamation-triangle"></i> Error</h2>
        </div>
        <div class="modal-body">
          <div class="error" style="text-align: center; padding: 2rem; color: var(--error-color);">
            <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Failed to load post details. Please try again.</p>
            <button class="btn btn-primary" onclick="window.communityManager.showPostDetail('${postId}')" style="margin-top: 1rem;">
              <i class="fas fa-redo"></i> Retry
            </button>
          </div>
        </div>
      `;
    }
  }

  // FIXED: Proper form initialization
  initializeCommentForm(postId) {
    const textarea = document.getElementById(`commentText-${postId}`);
    const submitBtn = textarea
      .closest(".comment-form")
      .querySelector(".btn-primary");
    const counter = textarea
      .closest(".comment-form")
      .querySelector(".char-counter");
    const maxLength = 500;

    // Add input validation
    textarea.addEventListener("input", () => {
      const remaining = maxLength - textarea.value.length;
      const isValid = textarea.value.trim().length > 0;

      // Update counter
      if (counter) {
        counter.textContent = `${remaining} characters remaining`;
        counter.classList.toggle("warning", remaining < 50);
        counter.classList.toggle("error", remaining < 10);
      }

      // Update button state
      if (submitBtn) {
        submitBtn.disabled = !isValid;
        submitBtn.style.opacity = isValid ? "1" : "0.6";
        submitBtn.style.cursor = isValid ? "pointer" : "not-allowed";
      }
    });

    // Focus event
    textarea.addEventListener("focus", () => {
      textarea.style.borderColor = "var(--primary-color)";
      textarea.style.boxShadow = "0 0 0 3px var(--focus-ring)";
    });

    // Blur event
    textarea.addEventListener("blur", () => {
      textarea.style.borderColor = "var(--border-color)";
      textarea.style.boxShadow = "none";
    });
  }

  // Delete comment function
  async deleteComment(postId, commentId) {
    if (!auth.currentUser) {
      this.showNotification("Please log in to delete comments", "error");
      return;
    }

    try {
      const commentRef = doc(db, "posts", postId, "comments", commentId);
      const commentSnap = await getDoc(commentRef);

      if (!commentSnap.exists()) {
        this.showNotification("Comment not found", "error");
        return;
      }

      const commentData = commentSnap.data();

      if (commentData.authorId !== auth.currentUser.uid) {
        this.showNotification("You can only delete your own comments", "error");
        return;
      }

      if (
        confirm(
          "Are you sure you want to delete this comment? This action cannot be undone.",
        )
      ) {
        await deleteDoc(commentRef);

        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, {
          comments: increment(-1),
        });

        this.showNotification("Comment deleted successfully", "success");

        if (
          document.getElementById("postDetailModal").style.display === "block"
        ) {
          this.showPostDetail(postId);
        }

        this.loadPosts();
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      this.showNotification("Failed to delete comment", "error");
    }
  }

  formatTime(timestamp) {
    if (!timestamp) return "Unknown time";

    const now = new Date();
    const postTime = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);
    const diffMs = now - postTime;

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return postTime.toLocaleDateString();
  }

  getSamplePosts() {
    return [
      {
        id: "1",
        title: "PR1MA Application Process - Tips and Experience",
        content:
          "Just completed my PR1MA application successfully! Here are some tips that might help others going through the process...",
        author: "Sarah Ahmad",
        authorInitials: "SA",
        category: "pr1ma",
        time: "2 hours ago",
        likes: 24,
        comments: 8,
        liked: false,
      },
      {
        id: "2",
        title:
          "MyFirst Home vs RUMAWIP - Which is better for young professionals?",
        content:
          "I'm a 28-year-old working in KL and trying to decide between these two schemes. Can anyone share their experience?",
        author: "Ahmad Rahman",
        authorInitials: "AR",
        category: "myfirst",
        time: "4 hours ago",
        likes: 18,
        comments: 15,
        liked: true,
      },
    ];
  }

  filterPosts(posts) {
    let filtered = posts;

    if (this.currentCategory !== "all") {
      filtered = filtered.filter(
        (post) => post.category === this.currentCategory,
      );
    }

    switch (this.currentFilter) {
      case "popular":
        filtered = filtered.sort((a, b) => b.likes - a.likes);
        break;
      case "trending":
        filtered = filtered.sort(
          (a, b) => b.likes + b.comments - (a.likes + a.comments),
        );
        break;
      case "recent":
      default:
        break;
    }

    return filtered;
  }

  searchPosts(query) {
    if (!query.trim()) {
      this.loadPosts();
      return;
    }

    const allPosts = this.getSamplePosts();
    const searchResults = allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.content.toLowerCase().includes(query.toLowerCase()),
    );

    const feed = document.getElementById("discussionFeed");
    this.displayPosts(searchResults, feed);
  }

  getSentimentIndicator(post) {
    if (!post.sentimentScore && post.sentimentScore !== 0) {
      return "";
    }

    const score = post.sentimentScore;
    let icon, color, title;
    if (score > 0.1) {
      icon = "fas fa-smile";
      color = "#10b981";
      title = "Positive sentiment";
    } else if (score < -0.1) {
      icon = "fas fa-frown";
      color = "#ef4444";
      title = "Negative sentiment";
    } else {
      icon = "fas fa-meh";
      color = "#64748b";
      title = "Neutral sentiment";
    }

    return `
      <div class="sentiment-indicator" title="${title} (${(score * 100).toFixed(1)}%)"
           style="color: ${color};">
        <i class="${icon}"></i>
        <span class="sentiment-score">${(Math.abs(score) * 100).toFixed(0)}%</span>
      </div>
    `;
  }

  getKeywordsDisplay(post) {
    if (!post.keywords || post.keywords.length === 0) {
      return "";
    }

    const topKeywords = post.keywords.slice(0, 3);
    return `
      <div class="post-keywords">
        ${topKeywords.map((keyword) => `<span class="keyword-tag">${keyword}</span>`).join("")}
      </div>
    `;
  }

  async analyzeBatchSentiment(posts) {
    if (!window.apiService) return posts;

    const textsToAnalyze = posts
      .filter((post) => !this.sentimentCache.has(post.id))
      .map((post) => ({ id: post.id, text: `${post.title} ${post.content}` }));

    if (textsToAnalyze.length === 0) return posts;

    try {
      const results = await window.apiService.analyzeSentimentBatch(
        textsToAnalyze,
        {
          context: "housing",
          includeKeywords: true,
        },
      );

      if (!results || !Array.isArray(results)) {
        return posts;
      }

      results.forEach((result) => {
        if (result && result.id) {
          this.sentimentCache.set(result.id, result);
        }
      });

      return posts.map((post) => {
        const sentiment = this.sentimentCache.get(post.id);
        if (sentiment) {
          return {
            ...post,
            sentimentScore: sentiment.scores?.compound || 0,
            sentimentLabel: sentiment.sentiment_label,
            keywords: sentiment.keywords || [],
          };
        }
        return post;
      });
    } catch (error) {
      console.warn("Batch sentiment analysis failed:", error);
      return posts;
    }
  }

  getCategoryName(category) {
    const categoryNames = {
      pr1ma: "PR1MA",
      myfirst: "MyFirst Home",
      ppr: "PPR Housing",
      rumawip: "RUMAWIP",
      ideas: "Policy Ideas",
      general: "General",
    };
    return categoryNames[category] || category;
  }

  async createNewPost() {
    const title = document.getElementById("postTitle").value;
    const category = document.getElementById("postCategory").value;
    const content = document.getElementById("postContent").value;

    if (!title || !category || !content) {
      alert("Please fill in all fields");
      return;
    }

    const submitBtn = document.querySelector(
      '#newPostForm button[type="submit"]',
    );
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="spinner"></span> Analyzing & Posting...';

    try {
      let sentimentData = null;
      if (window.apiService) {
        try {
          sentimentData = await window.apiService.analyzeSentiment(
            `${title} ${content}`,
            {
              context: "housing",
              includeEmotions: true,
              includeKeywords: true,
            },
          );
        } catch (sentimentError) {
          console.warn("Sentiment analysis failed:", sentimentError);
        }
      }

      const postData = {
        title: title,
        category: category,
        content: content,
        author: auth.currentUser?.displayName || "Anonymous",
        authorId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
        likes: 0,
        sentimentScore: sentimentData?.sentiment_score || 0,
        sentimentLabel: sentimentData?.sentiment_label || "neutral",
        emotions: sentimentData?.emotions || {},
        keywords: sentimentData?.keywords || [],
      };

      const postsRef = collection(db, "posts");
      await addDoc(postsRef, postData);

      closeModal("newPostModal");
      document.getElementById("newPostForm").reset();
      this.loadPosts();

      const sentimentInfo = sentimentData
        ? ` (Sentiment: ${sentimentData.sentiment_label})`
        : "";
      this.showNotification(
        `Post created successfully!${sentimentInfo}`,
        "success",
      );
    } catch (error) {
      console.error("Error creating post:", error);
      this.showNotification(
        "Failed to create post. Please try again.",
        "error",
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Post Discussion";
    }
  }

  showLoadingSkeleton(container) {
    const skeletonPosts = Array.from(
      { length: 5 },
      () => `
        <div class="post-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-avatar loading-skeleton"></div>
            <div style="flex: 1;">
              <div class="skeleton-text loading-skeleton short"></div>
              <div class="skeleton-text loading-skeleton medium"></div>
            </div>
          </div>
          <div class="skeleton-text loading-skeleton long"></div>
          <div class="skeleton-text loading-skeleton medium"></div>
          <div class="skeleton-text loading-skeleton short"></div>
        </div>
      `,
    ).join("");

    container.innerHTML = skeletonPosts;
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Global functions
function sharePost(postId) {
  if (navigator.share) {
    navigator.share({
      title: "HomeWatch Community Post",
      text: "Check out this discussion on HomeWatch",
      url: window.location.href + "#post-" + postId,
    });
  } else {
    navigator.clipboard.writeText(window.location.href + "#post-" + postId);
    window.communityManager.showNotification(
      "Link copied to clipboard!",
      "success",
    );
  }
}

function showNewPostModal() {
  document.getElementById("newPostModal").style.display = "block";
  document.body.style.overflow = "hidden";
}

function loadMorePosts() {
  const loadBtn = document.querySelector(".load-more button");
  loadBtn.disabled = true;
  loadBtn.innerHTML = '<span class="spinner"></span> Loading...';

  setTimeout(() => {
    loadBtn.disabled = false;
    loadBtn.innerHTML = "Load More Posts";
    window.communityManager.showNotification("All posts loaded!", "info");
  }, 2000);
}

// Initialize community manager
const communityManager = new CommunityManager();

// Export for global access
window.communityManager = communityManager;
window.sharePost = sharePost;
window.showNewPostModal = showNewPostModal;
window.loadMorePosts = loadMorePosts;
