// Debug version of profile.js with extensive logging
import { auth, db } from "./firebase-config.js"
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
import {
  where,
  collection,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
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
    console.log("🚀 ProfileManager constructor called")
    this.init()
  }

  async init() {
    console.log("🔄 ProfileManager init() called")
    document.body.style.visibility = "hidden"

    if (!auth) {
      console.error("❌ Firebase auth not available")
      this.initFallbackMode()
      return
    }

    console.log("✅ Firebase auth available, setting up listener")

    onAuthStateChanged(
      auth,
      async (user) => {
        console.log("🔔 Auth state changed:", user ? `User: ${user.email}` : "No user")
        this.authInitialized = true

        if (user) {
          console.log("👤 User details:", {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          })

          this.currentUser = user
          document.body.style.visibility = "visible"
          this.bindEvents()
          await this.loadUserProfile()
          this.initializeTabs()
          this.updateUI()
          this.loadProfileData()
        } else {
          console.log("🚫 No authenticated user, redirecting to login")
          window.location.href = "index.html"
        }
      },
      (error) => {
        console.error("❌ Firebase auth error:", error)
        this.initFallbackMode()
      },
    )

    setTimeout(() => {
      if (!this.authInitialized) {
        console.log("⏰ Auth timeout, using fallback")
        this.initFallbackMode()
      }
    }, 10000)
  }

  async loadUserProfile() {
    console.log("📋 Loading user profile for UID:", this.currentUser.uid)

    try {
      const userDocRef = doc(db, "users", this.currentUser.uid)
      console.log("📄 Fetching user document from:", userDocRef.path)

      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        console.log("✅ User document found:", userData)

        this.userProfile = {
          id: this.currentUser.uid,
          name: userData.name || this.currentUser.displayName || this.currentUser.email || "User",
          email: this.currentUser.email,
          location: userData.location || "Malaysia",
          bio: userData.bio || "Welcome to HomeWatch! Update your bio in settings.",
          joinDate: userData.joinDate ? new Date(userData.joinDate) : new Date(),
          avatar: userData.profilePicture || "images/user-avatar.svg",
          banner: userData.banner || "images/profile-banner.svg",
          stats: userData.stats || {
            posts: 0,
            followers: 0,
            following: 0,
            surveys: 0,
            likesReceived: 0,
            commentsReceived: 0,
            sharesReceived: 0,
          },
          achievements: userData.achievements || [
            { id: "early_adopter", name: "Early Adopter", description: "Joined HomeWatch!", icon: "fas fa-rocket" },
          ],
        }

        console.log("✅ Profile loaded:", this.userProfile)
      } else {
        console.log("❌ No user document found, creating new profile")
        await this.createNewProfile()
      }

      this.updateProfileDisplay()
    } catch (error) {
      console.error("❌ Error loading profile:", error)
      this.showAlert("Error loading profile data", "error")
    }
  }

  async createNewProfile() {
    console.log("🆕 Creating new profile for user:", this.currentUser.uid)

    const newProfile = {
      name: this.currentUser.displayName || this.currentUser.email || "User",
      email: this.currentUser.email,
      location: "Malaysia",
      bio: "Welcome to HomeWatch! Update your bio in settings.",
      joinDate: new Date().toISOString(),
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

    try {
      await setDoc(doc(db, "users", this.currentUser.uid), newProfile)
      console.log("✅ New profile created successfully")
      await this.loadUserProfile() // Reload after creation
    } catch (error) {
      console.error("❌ Error creating profile:", error)
    }
  }

  // 🔍 DEBUG VERSION: Enhanced post loading with detailed logging
  async renderUserPosts() {
    console.log("📝 renderUserPosts() called")
    const container = document.getElementById("userPosts")

    if (!container) {
      console.error("❌ userPosts container not found!")
      return
    }

    console.log("✅ userPosts container found")

    try {
      console.log("🔍 Querying posts for user:", this.currentUser.uid)

      const postsRef = collection(db, "posts")
      console.log("📚 Posts collection reference created")

      // 🔍 DEBUG: Let's first check ALL posts to see what's in the database
      console.log("🔍 First, let's see ALL posts in the database:")
      const allPostsQuery = query(postsRef, orderBy("timestamp", "desc"), limit(10))
      const allPostsSnapshot = await getDocs(allPostsQuery)

      console.log(`📊 Total posts in database: ${allPostsSnapshot.size}`)
      allPostsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data()
        console.log(`📄 Post ${index + 1}:`, {
          id: doc.id,
          title: data.title,
          author: data.author,
          authorId: data.authorId,
          currentUserId: this.currentUser.uid,
          matches: data.authorId === this.currentUser.uid,
        })
      })

      // 🔍 Now let's try the filtered query
      console.log("🔍 Now querying posts filtered by authorId...")
      const userPostsQuery = query(
        postsRef,
        where("authorId", "==", this.currentUser.uid),
        orderBy("timestamp", "desc"),
        limit(20),
      )

      console.log("🔍 Executing filtered query...")
      const querySnapshot = await getDocs(userPostsQuery)

      console.log(`📊 User posts found: ${querySnapshot.size}`)

      const userPosts = []
      querySnapshot.docs.forEach((doc, index) => {
        const data = doc.data()
        console.log(`📄 User Post ${index + 1}:`, {
          id: doc.id,
          title: data.title,
          content: data.content,
          author: data.author,
          authorId: data.authorId,
          timestamp: data.timestamp,
        })

        userPosts.push({
          id: doc.id,
          type: "user_post",
          ...data,
          date: this.formatTime(data.timestamp),
        })
      })

      console.log("📋 Final userPosts array:", userPosts)

      // Update post count
      if (userPosts.length !== this.userProfile.stats.posts) {
        console.log(`📊 Updating post count from ${this.userProfile.stats.posts} to ${userPosts.length}`)
        this.userProfile.stats.posts = userPosts.length

        try {
          await updateDoc(doc(db, "users", this.currentUser.uid), {
            "stats.posts": userPosts.length,
          })
          console.log("✅ Post count updated in Firestore")
        } catch (updateError) {
          console.error("❌ Error updating post count:", updateError)
        }
      }

      // Render posts
      if (userPosts.length === 0) {
        console.log("📭 No posts found, showing empty state")
        container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comment-alt"></i>
                        <h4>No posts yet</h4>
                        <p>You haven't created any posts yet. Start sharing your thoughts about housing!</p>
                        <small>Debug: Looking for authorId = "${this.currentUser.uid}"</small>
                    </div>
                `
      } else {
        console.log(`📝 Rendering ${userPosts.length} posts`)
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
                            <small class="debug-info">ID: ${post.id}</small>
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
      }
    } catch (error) {
      console.error("❌ Error in renderUserPosts:", error)
      container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error loading posts</h4>
                    <p>Error: ${error.message}</p>
                    <small>Check console for details</small>
                </div>
            `
    }
  }

  // 🔍 DEBUG VERSION: Enhanced profile saving with detailed logging
  async saveProfileSettings() {
    console.log("💾 saveProfileSettings() called")

    try {
      const form = document.getElementById("profileSettingsForm")
      if (!form) {
        console.error("❌ Profile settings form not found!")
        return
      }

      const formData = new FormData(form)
      const updatedData = {
        name: formData.get("name"),
        location: formData.get("location"),
        bio: formData.get("bio"),
      }

      console.log("📝 Form data collected:", updatedData)
      console.log("👤 Current user ID:", this.currentUser.uid)

      // Update local profile object
      this.userProfile.name = updatedData.name
      this.userProfile.location = updatedData.location
      this.userProfile.bio = updatedData.bio

      console.log("🔄 Local profile updated:", this.userProfile)

      // Save to Firestore
      console.log("💾 Saving to Firestore...")
      const userDocRef = doc(db, "users", this.currentUser.uid)
      await updateDoc(userDocRef, updatedData)

      console.log("✅ Profile saved to Firestore successfully!")

      // Update display
      this.updateProfileDisplay()

      this.showAlert("Profile settings saved successfully!", "success")

      // 🔍 DEBUG: Verify the save by reading back from Firestore
      console.log("🔍 Verifying save by reading back from Firestore...")
      const verifyDoc = await getDoc(userDocRef)
      if (verifyDoc.exists()) {
        console.log("✅ Verification successful. Current data in Firestore:", verifyDoc.data())
      } else {
        console.error("❌ Verification failed - document not found!")
      }
    } catch (error) {
      console.error("❌ Error saving profile:", error)
      this.showAlert(`Error saving profile: ${error.message}`, "error")
    }
  }

  updateProfileDisplay() {
    console.log("🎨 updateProfileDisplay() called")
    const profile = this.userProfile

    // Update profile header with null checks and logging
    const elements = {
      profileName: profile.name,
      profileLocation: `<i class="fas fa-map-marker-alt"></i> ${profile.location}`,
      profileJoinDate: `<i class="fas fa-calendar"></i> Member since ${this.formatDate(profile.joinDate, { month: "long", year: "numeric" })}`,
      profileBio: profile.bio,
    }

    Object.entries(elements).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId)
      if (element) {
        if (elementId === "profileName" || elementId === "profileBio") {
          element.textContent = value
        } else {
          element.innerHTML = value
        }
        console.log(`✅ Updated ${elementId}:`, value)
      } else {
        console.warn(`⚠️ Element ${elementId} not found`)
      }
    })

    // Update avatar and banner
    const avatarImage = document.getElementById("avatarImage")
    const profileBanner = document.getElementById("profileBanner")

    if (avatarImage) {
      avatarImage.src = profile.avatar
      console.log("✅ Avatar updated:", profile.avatar)
    } else {
      console.warn("⚠️ Avatar image element not found")
    }

    if (profileBanner) {
      profileBanner.style.backgroundImage = `url(${profile.banner})`
      console.log("✅ Banner updated:", profile.banner)
    } else {
      console.warn("⚠️ Profile banner element not found")
    }

    // Update settings form
    const settingsElements = {
      settingsName: profile.name,
      settingsEmail: profile.email,
      settingsLocation: profile.location,
      settingsBio: profile.bio,
    }

    Object.entries(settingsElements).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId)
      if (element) {
        element.value = value
        console.log(`✅ Updated form ${elementId}:`, value)
      } else {
        console.warn(`⚠️ Form element ${elementId} not found`)
      }
    })
  }

  // Keep all other methods the same but add this debug method
  debugFirestore() {
    console.log("🔍 FIRESTORE DEBUG INFO:")
    console.log("Current User:", this.currentUser)
    console.log("User Profile:", this.userProfile)
    console.log("Auth initialized:", this.authInitialized)
  }

  // Add the rest of your existing methods here...
  bindEvents() {
    console.log("🔗 Binding events...")

    // Tab navigation
    document.querySelectorAll(".profile-nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        console.log("📑 Tab clicked:", e.target.dataset.tab)
        this.switchTab(e.target.dataset.tab)
      })
    })

    // Settings form
    const settingsForm = document.getElementById("profileSettingsForm")
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault()
        console.log("📝 Settings form submitted")
        this.saveProfileSettings()
      })
      console.log("✅ Settings form event bound")
    } else {
      console.warn("⚠️ Settings form not found")
    }

    // Logout
    const logoutBtn = document.getElementById("logoutBtn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault()
        this.handleLogout()
      })
      console.log("✅ Logout button event bound")
    }

    console.log("✅ All events bound successfully")
  }

  async handleLogout() {
    try {
      await signOut(auth)
      console.log("✅ User logged out successfully")
      window.location.href = "index.html"
    } catch (error) {
      console.error("❌ Error logging out:", error)
      this.showAlert("Error logging out. Please try again.", "error")
    }
  }

  initializeTabs() {
    console.log("📑 Initializing tabs...")
    this.switchTab("posts")
  }

  switchTab(tabName) {
    console.log("📑 Switching to tab:", tabName)

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
    if (tabName === "posts") {
      console.log("📝 Loading posts tab")
      this.loadPostsTab()
    }
  }

  loadPostsTab() {
    console.log("📝 loadPostsTab() called")
    this.renderUserPosts()
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
    console.log(`🔔 Alert: ${type} - ${message}`)

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
    console.log("🎨 updateUI() called")
  }

  loadProfileData() {
    console.log("📊 loadProfileData() called")
  }

  initFallbackMode() {
    console.log("🔄 Fallback mode activated")
    // Your existing fallback code...
  }
}

// Initialize with debugging
let profileManager

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM loaded, initializing ProfileManager...")
  profileManager = new ProfileManager()

  // Add debug button to page
  setTimeout(() => {
    const debugBtn = document.createElement("button")
    debugBtn.textContent = "🔍 Debug Firestore"
    debugBtn.style.cssText = "position:fixed;top:10px;left:10px;z-index:9999;background:red;color:white;padding:10px;"
    debugBtn.onclick = () => profileManager.debugFirestore()
    document.body.appendChild(debugBtn)
  }, 2000)
})

window.profileManager = profileManager
