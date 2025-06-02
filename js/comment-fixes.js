// Enhanced comment form functionality
class CommentFormManager {
  constructor() {
    this.setupCommentForm()
  }

  setupCommentForm() {
    // Add character counter to comment textareas
    document.addEventListener("DOMContentLoaded", () => {
      this.addCharacterCounters()
      this.setupFormValidation()
    })
  }

  addCharacterCounters() {
    const textareas = document.querySelectorAll(".comment-form textarea")
    textareas.forEach((textarea) => {
      const maxLength = 500 // Set max length
      textarea.setAttribute("maxlength", maxLength)

      // Create counter element
      const counter = document.createElement("div")
      counter.className = "char-counter"

      const updateCounter = () => {
        const remaining = maxLength - textarea.value.length
        counter.textContent = `${remaining} characters remaining`

        // Add warning/error classes
        counter.classList.remove("warning", "error")
        if (remaining < 50) {
          counter.classList.add("warning")
        }
        if (remaining < 10) {
          counter.classList.add("error")
        }
      }

      textarea.addEventListener("input", updateCounter)
      textarea.parentNode.appendChild(counter)
      updateCounter()
    })
  }

  setupFormValidation() {
    // Add real-time validation
    document.addEventListener("input", (e) => {
      if (e.target.matches(".comment-form textarea")) {
        this.validateCommentForm(e.target)
      }
    })
  }

  validateCommentForm(textarea) {
    const submitBtn = textarea.parentNode.querySelector(".btn")
    const isValid = textarea.value.trim().length > 0

    if (submitBtn) {
      submitBtn.disabled = !isValid
      submitBtn.style.opacity = isValid ? "1" : "0.6"
    }
  }

  // Enhanced submit comment function
  async submitComment(postId) {
    const textarea = document.getElementById(`commentText-${postId}`)
    const submitBtn = textarea.parentNode.querySelector(".btn")

    if (!textarea || !textarea.value.trim()) {
      this.showError("Please enter a comment")
      return
    }

    // Show loading state
    const originalText = submitBtn.innerHTML
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...'

    try {
      await window.communityManager.addComment(postId, textarea.value.trim())

      // Clear form and show success
      textarea.value = ""
      this.validateCommentForm(textarea)

      // Update character counter
      const counter = textarea.parentNode.querySelector(".char-counter")
      if (counter) {
        counter.textContent = "500 characters remaining"
        counter.classList.remove("warning", "error")
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
      this.showError("Failed to post comment. Please try again.")
    } finally {
      // Reset button
      submitBtn.disabled = false
      submitBtn.innerHTML = originalText
    }
  }

  showError(message) {
    // Create or update error message
    const errorDiv = document.querySelector(".comment-error") || document.createElement("div")
    errorDiv.className = "comment-error"
    errorDiv.style.cssText = `
            color: var(--error-color);
            font-size: 0.8rem;
            margin-top: 0.5rem;
            padding: 0.5rem;
            background: rgba(239, 68, 68, 0.1);
            border-radius: 4px;
            border-left: 3px solid var(--error-color);
        `
    errorDiv.textContent = message

    const commentForm = document.querySelector(".comment-form")
    if (commentForm && !commentForm.querySelector(".comment-error")) {
      commentForm.appendChild(errorDiv)
    }

    // Remove error after 3 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv)
      }
    }, 3000)
  }
}

// Initialize comment form manager
const commentFormManager = new CommentFormManager()

// Export for global access
window.commentFormManager = commentFormManager
