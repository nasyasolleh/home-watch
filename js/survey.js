// Survey Application JavaScript

class SurveyApp {
  constructor() {
    this.currentTab = "vote"
    this.surveys = []
    this.quickPolls = []
    this.policyIdeas = []
    this.surveyResponses = []
    this.userVotes = {}
    this.init()
  }

  init() {
    this.loadData()
    this.bindEvents()
    this.renderContent()
  }

  loadData() {
    // Load from localStorage
    this.surveyResponses = JSON.parse(localStorage.getItem("surveyResponses") || "[]")
    this.userVotes = JSON.parse(localStorage.getItem("userVotes") || "{}")
    this.policyIdeas = JSON.parse(localStorage.getItem("policyIdeas") || "[]")

    // Initialize with sample data if empty
    if (this.policyIdeas.length === 0) {
      this.policyIdeas = [
        {
          id: "idea_1",
          title: "Digital Housing Application Platform",
          description:
            "Create a unified digital platform where citizens can apply for all affordable housing schemes in one place, reducing bureaucracy and wait times.",
          category: "Technology",
          submittedBy: "Ahmad Rahman",
          submittedAt: new Date("2024-01-10").toISOString(),
          status: "approved",
          votes: 89,
          comments: [],
        },
        {
          id: "idea_2",
          title: "Community Housing Cooperatives",
          description:
            "Establish housing cooperatives where communities can pool resources to develop affordable housing projects with shared amenities and lower costs.",
          category: "Policy",
          submittedBy: "Dr. Siti Nurhaliza",
          submittedAt: new Date("2024-01-08").toISOString(),
          status: "approved",
          votes: 156,
          comments: [],
        },
      ]
      this.savePolicyIdeas()
    }

    // Sample surveys data
    this.surveys = [
      {
        id: "pr1ma-eligibility",
        title: "PR1MA Eligibility Criteria Review",
        description:
          "Should the income ceiling for PR1MA be adjusted to reflect current economic conditions and inflation rates?",
        responses: 1247,
        daysLeft: 5,
        duration: "3 min",
        type: "Multiple choice",
        questions: [
          {
            id: "income-ceiling",
            text: "Should the income ceiling for PR1MA be adjusted to reflect current economic conditions?",
            type: "multiple-choice",
            options: ["Yes, increase significantly", "Yes, increase moderately", "Keep current levels", "No, decrease"],
          },
          {
            id: "qualification-criteria",
            text: "Which additional criteria should be considered for PR1MA eligibility?",
            type: "checkbox",
            options: [
              "Employment duration",
              "Credit score",
              "Family size",
              "Current housing status",
              "Location preference",
            ],
          },
        ],
      },
      {
        id: "myfirst-enhancement",
        title: "MyFirst Home Scheme Enhancement",
        description:
          "What improvements would make the MyFirst Home scheme more accessible to young professionals and first-time buyers?",
        responses: 892,
        daysLeft: 12,
        duration: "5 min",
        type: "Rating scale",
        questions: [
          {
            id: "accessibility-barriers",
            text: "What are the main barriers preventing access to MyFirst Home scheme?",
            type: "checkbox",
            options: [
              "Complex application process",
              "Limited property options",
              "High down payment requirements",
              "Lengthy approval time",
              "Lack of information",
            ],
          },
          {
            id: "improvement-priority",
            text: "Which improvement should be prioritized?",
            type: "multiple-choice",
            options: [
              "Simplified application",
              "More property locations",
              "Lower down payment",
              "Faster processing",
              "Better support services",
            ],
          },
        ],
      },
      {
        id: "transport-integration",
        title: "Public Transport Integration",
        description:
          "How important is proximity to public transport when selecting affordable housing locations in urban areas?",
        responses: 2156,
        daysLeft: 8,
        duration: "2 min",
        type: "Quick poll",
        questions: [
          {
            id: "transport-importance",
            text: "How important is proximity to public transport when choosing affordable housing?",
            type: "rating",
            scale: 5,
          },
        ],
      },
      {
        id: "digital-process",
        title: "Digital Application Process",
        description:
          "Rate your experience with online housing scheme applications and suggest improvements for better user experience.",
        responses: 634,
        daysLeft: 15,
        duration: "4 min",
        type: "Open feedback",
        questions: [
          {
            id: "digital-experience",
            text: "Rate your overall experience with online housing applications",
            type: "rating",
            scale: 5,
          },
          {
            id: "additional-features",
            text: "What additional digital features would be helpful?",
            type: "text",
          },
        ],
      },
    ]

    // Sample quick polls data
    this.quickPolls = [
      {
        id: "poll_1",
        question: "Should the government increase the budget for affordable housing?",
        options: ["Yes, significantly", "Yes, moderately", "No change needed", "No, reduce it"],
        votes: [145, 89, 23, 12],
        totalVotes: 269,
        endDate: "2024-02-15",
      },
      {
        id: "poll_2",
        question: "What is the most important factor in choosing a home?",
        options: ["Price", "Location", "Size", "Amenities"],
        votes: [156, 134, 67, 45],
        totalVotes: 402,
        endDate: "2024-02-20",
      },
    ]
  }

  bindEvents() {
    // Policy idea form submission
    document.getElementById("policy-idea-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.submitPolicyIdea()
    })
  }

  renderContent() {
    this.renderQuickPolls()
    this.renderSurveys()
    this.renderPolicyIdeas()
    this.renderResults()
    this.updateCounts()
  }

  renderQuickPolls() {
    const container = document.getElementById("quick-polls")
    container.innerHTML = this.quickPolls
      .map((poll) => {
        return `
                <div class="poll-card">
                    <h4 class="poll-question">${poll.question}</h4>
                    <div class="poll-options">
                        ${poll.options
                          .map((option, index) => {
                            const percentage =
                              poll.totalVotes > 0 ? ((poll.votes[index] / poll.totalVotes) * 100).toFixed(1) : 0
                            const hasVoted = this.userVotes[poll.id] !== undefined
                            const isSelected = this.userVotes[poll.id] === index

                            return `
                                <div class="poll-option">
                                    <button class="poll-option-btn ${isSelected ? "voted" : ""}" 
                                            onclick="window.surveyApp.voteOnPoll('${poll.id}', ${index})"
                                            ${hasVoted ? "disabled" : ""}>
                                        ${option}
                                    </button>
                                    <div class="vote-bar">
                                        <div class="vote-progress">
                                            <div class="vote-fill" style="width: ${percentage}%"></div>
                                        </div>
                                        <span class="vote-count">${poll.votes[index]} (${percentage}%)</span>
                                    </div>
                                </div>
                            `
                          })
                          .join("")}
                    </div>
                    <div class="poll-footer">
                        <span>${poll.totalVotes} total votes</span>
                        <span>Ends ${poll.endDate}</span>
                    </div>
                </div>
            `
      })
      .join("")
  }

  renderSurveys() {
    const container = document.getElementById("active-surveys")
    container.innerHTML = this.surveys
      .map((survey) => {
        return `
                <div class="survey-card">
                    <div class="survey-header">
                        <div class="survey-status">
                            <i class="fas fa-circle"></i>
                            <span>Active</span>
                        </div>
                        <div class="survey-deadline ${survey.daysLeft <= 5 ? "urgent" : ""}">
                            <i class="fas fa-clock"></i>
                            <span>${survey.daysLeft} days left</span>
                        </div>
                    </div>
                    
                    <h3 class="survey-title">${survey.title}</h3>
                    <p class="survey-description">${survey.description}</p>
                    
                    <div class="survey-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 73%"></div>
                        </div>
                        <span class="progress-text">73% participation goal</span>
                    </div>
                    
                    <div class="survey-meta">
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${survey.responses} votes</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${survey.duration}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-chart-pie"></i>
                            <span>${survey.type}</span>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary" onclick="window.surveyApp.takeSurvey('${survey.id}')" style="width: 100%;">
                        <span>Take Survey</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            `
      })
      .join("")
  }

  renderPolicyIdeas() {
    const container = document.getElementById("policy-ideas")
    const approvedIdeas = this.policyIdeas.filter((idea) => idea.status === "approved")

    container.innerHTML = approvedIdeas
      .map((idea) => {
        const hasVoted = this.userVotes[`idea_${idea.id}`] !== undefined

        return `
                <div class="idea-card">
                    <div class="idea-header">
                        <span class="idea-category">${idea.category}</span>
                        <span class="idea-status ${idea.status}">${this.getStatusText(idea.status)}</span>
                    </div>
                    
                    <h3 class="idea-title">${idea.title}</h3>
                    <p class="idea-description">${idea.description}</p>
                    
                    <div class="idea-meta">
                        <span>By ${idea.submittedBy}</span>
                        <span>${new Date(idea.submittedAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div class="idea-actions">
                        <button class="vote-btn ${hasVoted ? "voted" : ""}" 
                                onclick="window.surveyApp.voteOnIdea('${idea.id}')"
                                ${hasVoted ? "disabled" : ""}>
                            <i class="fas fa-thumbs-up"></i>
                            <span>${idea.votes}</span>
                        </button>
                        <button class="vote-btn">
                            <i class="fas fa-comment"></i>
                            <span>${idea.comments.length}</span>
                        </button>
                    </div>
                </div>
            `
      })
      .join("")
  }

  renderResults() {
    const statsContainer = document.getElementById("results-stats")
    const listContainer = document.getElementById("results-list")

    const totalResponses = this.surveyResponses.length
    const totalVotes = Object.keys(this.userVotes).length
    const uniqueSurveys = new Set(this.surveyResponses.map((r) => r.surveyId)).size

    statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${totalResponses}</div>
                <div class="stat-label">Total Survey Responses</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalVotes}</div>
                <div class="stat-label">Quick Poll Votes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${uniqueSurveys}</div>
                <div class="stat-label">Surveys Completed</div>
            </div>
        `

    if (this.surveyResponses.length > 0) {
      listContainer.innerHTML = `
                <div class="results-list">
                    <h3 style="margin-bottom: 1rem;">Your Recent Responses</h3>
                    ${this.surveyResponses
                      .slice(-5)
                      .map((response) => {
                        const survey = this.surveys.find((s) => s.id === response.surveyId)
                        return `
                            <div class="result-item">
                                <div class="result-info">
                                    <h4>${survey ? survey.title : "Unknown Survey"}</h4>
                                    <p>Submitted on ${new Date(response.timestamp).toLocaleDateString()}</p>
                                </div>
                                <div class="result-status">Completed</div>
                            </div>
                        `
                      })
                      .join("")}
                </div>
            `
    } else {
      listContainer.innerHTML = `
                <div class="results-list">
                    <p style="text-align: center; color: #6b7280; padding: 2rem;">
                        No survey responses yet. Take a survey to see your results here!
                    </p>
                </div>
            `
    }
  }

  updateCounts() {
    const approvedIdeas = this.policyIdeas.filter((idea) => idea.status === "approved").length
    const totalResponses = this.surveyResponses.length

    document.getElementById("ideas-count").textContent = approvedIdeas
    document.getElementById("results-count").textContent = totalResponses
  }

  takeSurvey(surveyId) {
    const survey = this.surveys.find((s) => s.id === surveyId)
    if (!survey) return

    this.showSurveyModal(survey)
  }

  showSurveyModal(survey) {
    const modal = document.getElementById("survey-modal")
    const container = document.getElementById("survey-form-container")

    container.innerHTML = `
            <h2>${survey.title}</h2>
            <form id="survey-form" class="survey-form">
                ${survey.questions
                  .map((question, index) => {
                    return `
                        <div class="question-group">
                            <h3 class="question-title">${index + 1}. ${question.text}</h3>
                            ${this.renderQuestion(question)}
                        </div>
                    `
                  })
                  .join("")}
                
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="window.surveyApp.closeSurveyModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Submit Survey</button>
                </div>
            </form>
        `

    modal.style.display = "block"

    // Bind form submission
    document.getElementById("survey-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.submitSurvey(survey.id)
    })
  }

  renderQuestion(question) {
    switch (question.type) {
      case "multiple-choice":
        return `
                    <div class="radio-group">
                        ${question.options
                          .map(
                            (option, index) => `
                            <label class="radio-option">
                                <input type="radio" name="${question.id}" value="${option}" required>
                                <span>${option}</span>
                            </label>
                        `,
                          )
                          .join("")}
                    </div>
                `

      case "checkbox":
        return `
                    <div class="checkbox-group">
                        ${question.options
                          .map(
                            (option, index) => `
                            <label class="checkbox-option">
                                <input type="checkbox" name="${question.id}" value="${option}">
                                <span>${option}</span>
                            </label>
                        `,
                          )
                          .join("")}
                    </div>
                `

      case "rating":
        return `
                    <div class="rating-group">
                        ${Array.from(
                          { length: question.scale || 5 },
                          (_, i) => `
                            <label class="rating-option">
                                <input type="radio" name="${question.id}" value="${i + 1}" required>
                                <span>${i + 1}</span>
                            </label>
                        `,
                        ).join("")}
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                        <span>Not Important</span>
                        <span>Very Important</span>
                    </div>
                `

      case "text":
        return `
                    <textarea name="${question.id}" rows="4" placeholder="Enter your response..." 
                              style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;"></textarea>
                `

      default:
        return ""
    }
  }

  submitSurvey(surveyId) {
    const form = document.getElementById("survey-form")
    const formData = new FormData(form)
    const responses = {}

    // Collect responses
    for (const [key, value] of formData.entries()) {
      if (responses[key]) {
        if (Array.isArray(responses[key])) {
          responses[key].push(value)
        } else {
          responses[key] = [responses[key], value]
        }
      } else {
        responses[key] = value
      }
    }

    // Save response
    const newResponse = {
      surveyId: surveyId,
      responses: responses,
      timestamp: new Date().toISOString(),
    }

    this.surveyResponses.push(newResponse)
    this.saveSurveyResponses()

    this.showToast("Survey submitted successfully! Thank you for your participation.", "success")
    this.closeSurveyModal()
    this.renderResults()
    this.updateCounts()
  }

  voteOnPoll(pollId, optionIndex) {
    if (this.userVotes[pollId] !== undefined) {
      this.showToast("You have already voted on this poll.", "warning")
      return
    }

    // Update poll data
    const poll = this.quickPolls.find((p) => p.id === pollId)
    if (poll) {
      poll.votes[optionIndex]++
      poll.totalVotes++

      // Save user vote
      this.userVotes[pollId] = optionIndex
      this.saveUserVotes()

      this.showToast("Vote submitted successfully!", "success")
      this.renderQuickPolls()
      this.renderResults()
      this.updateCounts()
    }
  }

  voteOnIdea(ideaId) {
    const voteKey = `idea_${ideaId}`
    if (this.userVotes[voteKey] !== undefined) {
      this.showToast("You have already voted on this idea.", "warning")
      return
    }

    // Update idea votes
    const idea = this.policyIdeas.find((i) => i.id === ideaId)
    if (idea) {
      idea.votes++
      this.userVotes[voteKey] = true

      this.saveUserVotes()
      this.savePolicyIdeas()

      this.showToast("Vote submitted successfully!", "success")
      this.renderPolicyIdeas()
    }
  }

  submitPolicyIdea() {
    const form = document.getElementById("policy-idea-form")
    const formData = new FormData(form)

    const newIdea = {
      id: `idea_${Date.now()}`,
      title: formData.get("idea-title"),
      category: formData.get("idea-category"),
      description: formData.get("idea-description"),
      benefits: formData.get("idea-benefits"),
      submittedBy: "Current User",
      submittedAt: new Date().toISOString(),
      status: "pending",
      votes: 0,
      comments: [],
    }

    this.policyIdeas.push(newIdea)
    this.savePolicyIdeas()

    this.showToast("Policy idea submitted successfully! It will be reviewed before appearing publicly.", "success")
    this.closePolicyIdeaModal()
    form.reset()
    this.renderPolicyIdeas()
    this.updateCounts()
  }

  // Storage methods
  saveSurveyResponses() {
    localStorage.setItem("surveyResponses", JSON.stringify(this.surveyResponses))
  }

  saveUserVotes() {
    localStorage.setItem("userVotes", JSON.stringify(this.userVotes))
  }

  savePolicyIdeas() {
    localStorage.setItem("policyIdeas", JSON.stringify(this.policyIdeas))
  }

  // Utility methods
  getStatusText(status) {
    const statusMap = {
      pending: "Under Review",
      approved: "Approved",
      rejected: "Rejected",
    }
    return statusMap[status] || status
  }

  showToast(message, type = "success") {
    const toast = document.getElementById("toast")
    const messageEl = document.getElementById("toast-message")

    messageEl.textContent = message
    toast.className = `toast ${type} show`

    setTimeout(() => {
      toast.classList.remove("show")
    }, 3000)
  }

  closeSurveyModal() {
    document.getElementById("survey-modal").style.display = "none"
  }

  closePolicyIdeaModal() {
    document.getElementById("policy-idea-modal").style.display = "none"
  }
}

// Global functions for HTML onclick events
function showTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active")
  })

  // Remove active class from all tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  // Show selected tab content
  document.getElementById(`${tabName}-tab`).classList.add("active")

  // Add active class to selected tab button
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")

  window.surveyApp.currentTab = tabName
}

function showPolicyIdeaModal() {
  document.getElementById("policy-idea-modal").style.display = "block"
}

function closePolicyIdeaModal() {
  window.surveyApp.closePolicyIdeaModal()
}

function closeSurveyModal() {
  window.surveyApp.closeSurveyModal()
}

function hideToast() {
  document.getElementById("toast").classList.remove("show")
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.surveyApp = new SurveyApp()
})

// Close modals when clicking outside
window.addEventListener("click", (event) => {
  const surveyModal = document.getElementById("survey-modal")
  const policyModal = document.getElementById("policy-idea-modal")

  if (event.target === surveyModal) {
    surveyModal.style.display = "none"
  }
  if (event.target === policyModal) {
    policyModal.style.display = "none"
  }
})
