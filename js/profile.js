// Fixed version - handles the Firestore index issue
import { auth, db } from "./firebase-config.js"
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
import {
  where,
  collection,
  getDocs,
  getDoc,
  setDoc,
  query,
  limit,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"

class ProfileManager {
  constructor() {
    this.currentUser = null
    this.userProfile = {}
    this.activityChart = null
    this.authInitialized = false
    this.init()
  }

  async init() {
    document.body.style.visibility = "hidden"

    if (!auth) {
      console.error("Firebase auth not available, using fallback mode")
      this.initFallbackMode()
      return
    }

    onAuthStateChanged(
      auth,
      async (user) => {
        console.log("Auth state changed:", user ? "User logged in" : "No user")
        this.authInitialized = true

        if (user) {
          this.currentUser = user
          document.body.style.visibility = "visible"
          this.bindEvents()
          await this.loadUserProfile()
          this.initializeTabs()
          this.updateUI()
          this.loadProfileData()
        } else {
          console.log("No authenticated user found, redirecting to login")
          window.location.href = "index.html"
        }
      },
      (error) => {
        console.error("Firebase auth error:", error)
        this.initFallbackMode()
      },
    )

    setTimeout(() => {
      if (!this.authInitialized) {
        console.log("Firebase auth initialization timeout, using fallback mode")
        this.initFallbackMode()
      }
    }, 10000)
  }

  async loadUserProfile() {
    try {
      const userDoc = await getDoc(doc(db, "users", this.currentUser.uid))

      if (userDoc.exists()) {
        const userData = userDoc.data()

        const adminButton = document.getElementById("admin_button")
        if (userData.isAdmin && adminButton) {
          adminButton.style.display = "block"
        }

        this.userProfile = {
          id: this.currentUser.uid,
          name: userData.name || this.currentUser.displayName || this.currentUser.email || "User",
          email: this.currentUser.email,
          location: userData.location || "Malaysia",
          bio: userData.bio || "Welcome to HomeWatch! Update your bio in settings.",
          joinDate: userData.joinDate ? new Date(userData.joinDate) : new Date(),
          avatar: userData.profilePicture || "images/user-avatar.svg",
          banner: userData.banner || "images/profile-banner.svg",
          stats: {
            posts: userData.stats?.posts || 0,
            followers: userData.followers?.length || 0,
            following: userData.following?.length || 0,
            surveys: userData.stats?.surveys || 0,
            likesReceived: userData.stats?.likesReceived || 0,
            commentsReceived: userData.stats?.commentsReceived || 0,
            sharesReceived: userData.stats?.sharesReceived || 0,
          },
          achievements: userData.achievements || [
            { id: "early_adopter", name: "Early Adopter", description: "Joined HomeWatch!", icon: "fas fa-rocket" },
          ],
        }
      } else {
        // Create default profile if user document doesn't exist
        this.userProfile = {
          id: this.currentUser.uid,
          name: this.currentUser.displayName || this.currentUser.email || "User",
          email: this.currentUser.email,
          location: "Malaysia",
          bio: "Welcome to HomeWatch! Update your bio in settings.",
          joinDate: new Date(),
          avatar: "images/user-avatar.svg",
          banner: "images/profile-banner.svg",
          stats: {
            posts: 0,
            followers: 0,
            following: 0,
            surveys: 0,
            likesReceived: 0,
            commentsReceived: 0,
            sharesReceived: 0,
          },
          achievements: [
            { id: "early_adopter", name: "Early Adopter", description: "Joined HomeWatch!", icon: "fas fa-rocket" },
          ],
        }

        // Save the new profile to Firestore
        try {
          await setDoc(doc(db, "users", this.currentUser.uid), {
            name: this.userProfile.name,
            email: this.userProfile.email,
            location: this.userProfile.location,
            bio: this.userProfile.bio,
            joinDate: this.userProfile.joinDate.toISOString(),
            stats: this.userProfile.stats,
            achievements: this.userProfile.achievements,
          })
          console.log("New user profile created in Firestore")
        } catch (error) {
          console.error("Error creating user profile:", error)
        }
      }

      this.updateProfileDisplay()
    } catch (error) {
      console.error("Error loading profile:", error)
      this.showAlert("Error loading profile data", "error")
    }
  }

  // 🔥 FIXED: Simplified query to avoid index requirement
  async renderUserPosts() {
    const container = document.getElementById("userPosts")
    if (!container) return

    try {
      console.log("Loading posts for user:", this.currentUser.uid)

      const postsRef = collection(db, "posts")

      // 🔥 SOLUTION 1: Use only the where filter, no orderBy to avoid index requirement
      const q = query(postsRef, where("authorId", "==", this.currentUser.uid), limit(50))

      const querySnapshot = await getDocs(q)

      let userPosts = []

      userPosts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "user_post",
        ...doc.data(),
        date: this.formatTime(doc.data().timestamp),
      }))

      // 🔥 Sort in JavaScript instead of Firestore to avoid index requirement
      userPosts.sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0)
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0)
        return bTime - aTime // Newest first
      })

      console.log(`Found ${userPosts.length} posts for user`)

      // Update post count in user stats
      if (userPosts.length !== this.userProfile.stats.posts) {
        this.userProfile.stats.posts = userPosts.length
        try {
          await updateDoc(doc(db, "users", this.currentUser.uid), {
            "stats.posts": userPosts.length,
          })
          console.log("Post count updated in Firestore")

          // Update display
          const postsCountElement = document.getElementById("postsCount")
          if (postsCountElement) postsCountElement.textContent = userPosts.length
        } catch (updateError) {
          console.error("Error updating post count:", updateError)
        }
      }

      if (userPosts.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comment-alt"></i>
                        <h4>No posts yet</h4>
                        <p>You haven't created any posts yet. Start sharing your thoughts about housing!</p>
                        <small style="color: #666; font-size: 0.8em;">Looking for posts with authorId: ${this.currentUser.uid}</small>
                    </div>
                `
        return
      }

      container.innerHTML = userPosts
        .map(
          (post) => `
                <div class="post-card">
                    <div class="post-header">
                        <h4 class="post-title">${post.title || "Untitled Post"}</h4>
                        <span class="post-date">${post.date}</span>
                    </div>
                    <div class="post-content">${post.content || "No content"}</div>
                    <div class="post-meta">
                        <span class="post-category">${post.category || "general"}</span>
                        ${post.sentimentLabel ? `<span class="sentiment-${post.sentimentLabel}">${post.sentimentLabel}</span>` : ""}
                    </div>
                    <div class="post-stats">
                        <span class="post-stat">
                            <i class="fas fa-heart"></i> ${post.likes || 0}
                        </span>
                        <span class="post-stat">
                            <i class="fas fa-comment"></i> ${post.comments || 0}
                        </span>
                        <span class="post-stat">
                            <i class="fas fa-share"></i> ${post.shares || 0}
                        </span>
                    </div>
                </div>
            `,
        )
        .join("")
    } catch (error) {
      console.error("Error loading user posts:", error)

      // 🔥 SOLUTION 2: Fallback to load all posts and filter in JavaScript
      if (error.message.includes("index")) {
        console.log("Index error detected, trying fallback method...")
        await this.renderUserPostsFallback()
      } else {
        container.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Error loading posts</h4>
                        <p>There was an error loading your posts. Please try again.</p>
                        <small>Error: ${error.message}</small>
                    </div>
                `
      }
    }
  }

  // 🔥 FALLBACK METHOD: Load all posts and filter in JavaScript
  async renderUserPostsFallback() {
    const container = document.getElementById("userPosts")
    if (!container) return

    try {
      console.log("Using fallback method - loading all posts and filtering in JavaScript")

      const postsRef = collection(db, "posts")
      const q = query(postsRef, limit(100)) // Load recent posts without complex query

      const querySnapshot = await getDocs(q)

      const allPosts = []
      querySnapshot.docs.forEach((doc) => {
        allPosts.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      // Filter posts by current user in JavaScript
      const userPosts = allPosts
        .filter((post) => post.authorId === this.currentUser.uid)
        .map((post) => ({
          ...post,
          type: "user_post",
          date: this.formatTime(post.timestamp),
        }))
        .sort((a, b) => {
          const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0)
          const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0)
          return bTime - aTime
        })

      console.log(`Fallback method found ${userPosts.length} posts for user`)

      if (userPosts.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comment-alt"></i>
                        <h4>No posts yet</h4>
                        <p>You haven't created any posts yet. Start sharing your thoughts about housing!</p>
                        <small style="color: #666; font-size: 0.8em;">Searched ${allPosts.length} total posts for authorId: ${this.currentUser.uid}</small>
                    </div>
                `
        return
      }

      container.innerHTML = userPosts
        .map(
          (post) => `
                <div class="post-card">
                    <div class="post-header">
                        <h4 class="post-title">${post.title || "Untitled Post"}</h4>
                        <span class="post-date">${post.date}</span>
                    </div>
                    <div class="post-content">${post.content || "No content"}</div>
                    <div class="post-meta">
                        <span class="post-category">${post.category || "general"}</span>
                        ${post.sentimentLabel ? `<span class="sentiment-${post.sentimentLabel}">${post.sentimentLabel}</span>` : ""}
                    </div>
                    <div class="post-stats">
                        <span class="post-stat">
                            <i class="fas fa-heart"></i> ${post.likes || 0}
                        </span>
                        <span class="post-stat">
                            <i class="fas fa-comment"></i> ${post.comments || 0}
                        </span>
                        <span class="post-stat">
                            <i class="fas fa-share"></i> ${post.shares || 0}
                        </span>
                    </div>
                </div>
            `,
        )
        .join("")
    } catch (error) {
      console.error("Fallback method also failed:", error)
      container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error loading posts</h4>
                    <p>Unable to load posts. Please check your connection and try again.</p>
                </div>
            `
    }
  }

  async saveProfileSettings() {
    try {
      const formData = new FormData(document.getElementById("profileSettingsForm"))

      const updatedData = {
        name: formData.get("name"),
        location: formData.get("location"),
        bio: formData.get("bio"),
      }

      // Update local profile object
      this.userProfile.name = updatedData.name
      this.userProfile.location = updatedData.location
      this.userProfile.bio = updatedData.bio

      // Save to Firebase Firestore
      await updateDoc(doc(db, "users", this.currentUser.uid), updatedData)

      // Update display immediately
      this.updateProfileDisplay()

      this.showAlert("Profile settings saved successfully!", "success")

      console.log("Profile updated in Firestore:", updatedData)
    } catch (error) {
      console.error("Error saving profile:", error)
      this.showAlert("Error saving profile settings", "error")
    }
  }

  async handleAvatarUpload(file) {
    if (!file) return

    try {
      // Simulate file upload
      const reader = new FileReader()
      reader.onload = async (e) => {
        const avatarImage = document.getElementById("avatarImage")
        if (avatarImage) avatarImage.src = e.target.result

        this.userProfile.avatar = e.target.result

        // Save avatar to Firestore
        await updateDoc(doc(db, "users", this.currentUser.uid), {
          profilePicture: e.target.result,
        })

        this.showAlert("Profile picture updated successfully!", "success")
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading avatar:", error)
      this.showAlert("Error uploading profile picture", "error")
    }
  }

  async handleBannerUpload(file) {
    if (!file) return

    try {
      // Simulate file upload
      const reader = new FileReader()
      reader.onload = async (e) => {
        const profileBanner = document.getElementById("profileBanner")
        if (profileBanner) profileBanner.style.backgroundImage = `url(${e.target.result})`

        this.userProfile.banner = e.target.result

        // Save banner to Firestore
        await updateDoc(doc(db, "users", this.currentUser.uid), {
          banner: e.target.result,
        })

        this.showAlert("Banner updated successfully!", "success")
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading banner:", error)
      this.showAlert("Error uploading banner image", "error")
    }
  }

  updateProfileDisplay() {
    const profile = this.userProfile

    // Update profile header
    const profileName = document.getElementById("profileName")
    const profileLocation = document.getElementById("profileLocation")
    const profileJoinDate = document.getElementById("profileJoinDate")
    const profileBio = document.getElementById("profileBio")

    if (profileName) profileName.textContent = profile.name
    if (profileLocation) profileLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${profile.location}`
    if (profileJoinDate)
      profileJoinDate.innerHTML = `<i class="fas fa-calendar"></i> Member since ${this.formatDate(profile.joinDate, { month: "long", year: "numeric" })}`
    if (profileBio) profileBio.textContent = profile.bio

    // Update avatar and banner
    const avatarImage = document.getElementById("avatarImage")
    const profileBanner = document.getElementById("profileBanner")

    if (avatarImage) avatarImage.src = profile.avatar
    if (profileBanner) profileBanner.style.backgroundImage = `url(${profile.banner})`

    // Update stats
    const statsElements = {
      postsCount: profile.stats.posts,
      followersCount: profile.stats.followers,
      followingCount: profile.stats.following,
      surveysCount: profile.stats.surveys,
      likesReceived: profile.stats.likesReceived,
      commentsReceived: profile.stats.commentsReceived,
      sharesReceived: profile.stats.sharesReceived,
    }

    Object.entries(statsElements).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId)
      if (element) element.textContent = value
    })

    // Update settings form
    const settingsName = document.getElementById("settingsName")
    const settingsEmail = document.getElementById("settingsEmail")
    const settingsLocation = document.getElementById("settingsLocation")
    const settingsBio = document.getElementById("settingsBio")

    if (settingsName) settingsName.value = profile.name
    if (settingsEmail) settingsEmail.value = profile.email
    if (settingsLocation) settingsLocation.value = profile.location
    if (settingsBio) settingsBio.value = profile.bio
  }

  // Keep all your existing methods...
  bindEvents() {
    // Tab navigation
    document.querySelectorAll(".profile-nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab)
      })
    })

    // Profile editing
    const editProfileBtn = document.getElementById("editProfileBtn")
    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", () => {
        this.openEditModal()
      })
    }

    // Logout functionality
    const logoutBtn = document.getElementById("logoutBtn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault()
        this.handleLogout()
      })
    }

    // Avatar and banner uploads
    const editAvatarBtn = document.getElementById("editAvatarBtn")
    const editBannerBtn = document.getElementById("editBannerBtn")

    if (editAvatarBtn) {
      editAvatarBtn.addEventListener("click", () => {
        document.getElementById("avatarUpload").click()
      })
    }

    if (editBannerBtn) {
      editBannerBtn.addEventListener("click", () => {
        document.getElementById("bannerUpload").click()
      })
    }

    const avatarUpload = document.getElementById("avatarUpload")
    const bannerUpload = document.getElementById("bannerUpload")

    if (avatarUpload) {
      avatarUpload.addEventListener("change", (e) => {
        this.handleAvatarUpload(e.target.files[0])
      })
    }

    if (bannerUpload) {
      bannerUpload.addEventListener("change", (e) => {
        this.handleBannerUpload(e.target.files[0])
      })
    }

    // Settings form
    const settingsForm = document.getElementById("profileSettingsForm")
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault()
        this.saveProfileSettings()
      })
    }

    // Other event bindings...
  }

  async handleLogout() {
    try {
      await signOut(auth)
      console.log("User logged out successfully")
      window.location.href = "index.html"
    } catch (error) {
      console.error("Error logging out:", error)
      this.showAlert("Error logging out. Please try again.", "error")
    }
  }

  initializeTabs() {
    this.switchTab("posts")
  }

  switchTab(tabName) {
    // Update navigation
    document.querySelectorAll(".profile-nav-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`)
    if (activeTab) activeTab.classList.add("active")

    // Update content
    document.querySelectorAll(".profile-tab").forEach((tab) => {
      tab.classList.remove("active")
    })
    const activeContent = document.getElementById(`${tabName}-tab`)
    if (activeContent) activeContent.classList.add("active")

    // Load tab-specific content
    switch (tabName) {
      case "posts":
        this.loadPostsTab()
        break
      case "settings":
        // Settings tab is static
        break
    }
  }

  loadPostsTab() {
    this.renderUserPosts()
  }

  openEditModal() {
    this.switchTab("settings")
  }

  formatTime(timestamp) {
    if (!timestamp) return "Unknown time"

    const now = new Date()
    const postTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diffMs = now - postTime

    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

    return postTime.toLocaleDateString()
  }

  formatDate(date, options = {}) {
    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
    return new Date(date).toLocaleDateString("en-US", { ...defaultOptions, ...options })
  }

  showAlert(message, type = "info") {
    const alert = document.createElement("div")
    alert.className = `alert alert-${type}`
    alert.innerHTML = `
            <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
            ${message}
        `

    const container = document.getElementById("alertsContainer") || document.body
    container.appendChild(alert)

    setTimeout(() => {
      alert.remove()
    }, 5000)
  }

  updateUI() {
    // Update any user-specific UI elements
    const userAvatar = document.querySelector(".user-avatar img")
    if (userAvatar) userAvatar.setAttribute("src", this.userProfile.avatar)
  }

  loadProfileData() {
    // Load additional profile data as needed
    if (this.currentUser) {
      const userName = this.userProfile.name || this.currentUser.displayName || this.currentUser.email || "Unknown User"
      console.log("Profile loaded for user:", userName)
      console.log("User email:", this.currentUser.email)
      console.log("User UID:", this.currentUser.uid)
    }
  }

  initFallbackMode() {
    console.log("Initializing fallback mode with demo profile")
    this.authInitialized = true

    // Create a mock user for demo purposes
    this.currentUser = {
      uid: "demo-user",
      email: "demo@homewatch.my",
      displayName: "Demo User",
    }

    // Create a demo profile
    this.userProfile = {
      id: "demo-user",
      name: "Demo User",
      email: "demo@homewatch.my",
      location: "Malaysia",
      bio: "This is a demo profile running in offline mode.",
      joinDate: new Date(),
      avatar: "images/user-avatar.svg",
      banner: "images/profile-banner.svg",
      stats: {
        posts: 5,
        followers: 23,
        following: 15,
        surveys: 3,
        likesReceived: 45,
        commentsReceived: 12,
        sharesReceived: 8,
      },
      achievements: [
        { id: "early_adopter", name: "Early Adopter", description: "Joined HomeWatch!", icon: "fas fa-rocket" },
        { id: "active_user", name: "Active User", description: "Made 5 posts", icon: "fas fa-star" },
      ],
    }

    document.body.style.visibility = "visible"
    this.bindEvents()
    this.updateProfileDisplay()
    this.initializeTabs()
    this.updateUI()
    this.loadProfileData()
  }
}

// Initialize Profile Manager
let profileManager

document.addEventListener("DOMContentLoaded", () => {
  profileManager = new ProfileManager()
})

// Export for global access
window.profileManager = profileManager
