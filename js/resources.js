// Resources Page JavaScript

// Global function that will be called from HTML
function calculateLoan() {
    if (window.resourcesManager) {
        window.resourcesManager.calculateLoan();
    } else {
        console.error('Resources manager not initialized');
    }
}

// Global function for tab switching
function showResourceSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.resource-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the selected section
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active class to the clicked button
    const targetButton = document.querySelector(`[data-section="${sectionName}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
    }
}

// Global function for FAQ toggle
function toggleFAQ(element) {
    const faqItem = element.closest('.faq-item');
    const answer = faqItem.querySelector('.faq-answer');
    const icon = element.querySelector('i');
    
    if (faqItem.classList.contains('active')) {
        faqItem.classList.remove('active');
        answer.style.display = 'none';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    } else {
        faqItem.classList.add('active');
        answer.style.display = 'block';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    }
}

class ResourcesManager {
    constructor() {
        this.currentUser = null;
        this.loanData = {
            amount: 0,
            interestRate: 4.35,
            tenure: 25,
            monthlyPayment: 0,
            totalPayment: 0,
            totalInterest: 0
        };
        this.programs = [];
        this.init();
    }

    async init() {
        this.currentUser = this.getCurrentUser();
        this.bindEvents();
        await this.loadPrograms();
        this.updateUI();
        this.initializeCalculator();
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser')) || null;
    }

    bindEvents() {
        // Calculator form
        const calculatorForm = document.getElementById('loanCalculatorForm');
        if (calculatorForm) {
            calculatorForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.calculateLoan();
            });

            // Real-time calculation for property price and down payment
            const propertyPrice = document.getElementById('propertyPrice');
            const downPayment = document.getElementById('downPayment');
            const loanAmount = document.getElementById('loanAmount');
            
            if (propertyPrice && downPayment && loanAmount) {
                const updateLoanAmount = () => {
                    const price = parseFloat(propertyPrice.value) || 0;
                    const percentage = parseFloat(downPayment.value) || 0;
                    const downPaymentValue = price * (percentage / 100);
                    const loan = Math.max(0, price - downPaymentValue);
                    loanAmount.value = loan.toFixed(0);
                };
                
                propertyPrice.addEventListener('input', updateLoanAmount);
                downPayment.addEventListener('input', updateLoanAmount);
            }
            
            // Real-time calculation on loan details change
            calculatorForm.addEventListener('input', (e) => {
                if (['loanAmount', 'interestRate', 'loanTenure'].includes(e.target.id)) {
                    this.calculateLoan();
                }
            });

            // Bind button clicks
            const calculateBtn = document.getElementById('calculateBtn');
            if (calculateBtn) {
                calculateBtn.addEventListener('click', () => this.calculateLoan());
            }

            const resetBtn = document.getElementById('resetBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => this.resetCalculator());
            }
        }

        // Program actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('program-cta')) {
                this.handleProgramAction(e.target);
            }
            if (e.target.classList.contains('bookmark-program')) {
                this.toggleBookmark(e.target);
            }
        });

        // Filter programs
        const programFilter = document.getElementById('programFilter');
        if (programFilter) {
            programFilter.addEventListener('change', (e) => {
                this.filterPrograms(e.target.value);
            });
        }

        // Search programs
        const programSearch = document.getElementById('programSearch');
        if (programSearch) {
            programSearch.addEventListener('input', (e) => {
                this.searchPrograms(e.target.value);
            });
        }
    }

    async loadPrograms() {
        try {
            // Simulate loading housing programs from API
            this.programs = [
                {
                    id: 'pr1ma',
                    name: 'PR1MA',
                    fullName: '1Malaysia People\'s Housing Programme',
                    description: 'Affordable housing scheme for middle-income earners with household income between RM2,500 to RM15,000.',
                    icon: 'fas fa-home',
                    category: 'ownership',
                    eligibility: [
                        'Malaysian citizen aged 21 and above',
                        'Household income RM2,500 - RM15,000',
                        'First-time homebuyer or do not own any property',
                        'Married or single parent with dependents'
                    ],
                    benefits: [
                        'Below market price properties',
                        'Strategic locations',
                        'Quality construction standards',
                        'Various property types available'
                    ],
                    interestRate: '3.5% - 4.5%',
                    maxLoan: 'Up to 90% of property value',
                    website: 'https://www.pr1ma.my',
                    status: 'active'
                },
                {
                    id: 'rumah-selangorku',
                    name: 'Rumah Selangorku',
                    fullName: 'Selangor State Affordable Housing',
                    description: 'State government initiative providing affordable housing for Selangor residents.',
                    icon: 'fas fa-building',
                    category: 'ownership',
                    eligibility: [
                        'Selangor resident for minimum 2 years',
                        'Malaysian citizen aged 21-55',
                        'Household income below RM10,000',
                        'Do not own property in Selangor'
                    ],
                    benefits: [
                        'Subsidized housing prices',
                        'Various housing types',
                        'Integrated township development',
                        'Easy financing options'
                    ],
                    interestRate: '4.0% - 4.6%',
                    maxLoan: 'Up to 95% of property value',
                    website: 'https://rumahselangorku.selangor.gov.my',
                    status: 'active'
                },
                {
                    id: 'my-first-home',
                    name: 'My First Home Scheme',
                    fullName: 'Skim Rumah Pertamaku',
                    description: 'Government scheme offering 100% financing for first-time homebuyers.',
                    icon: 'fas fa-key',
                    category: 'financing',
                    eligibility: [
                        'Malaysian citizen aged 18 and above',
                        'First-time homebuyer',
                        'Household income not exceeding RM10,000',
                        'Property price not exceeding RM500,000'
                    ],
                    benefits: [
                        '100% financing available',
                        'No down payment required',
                        'Flexible repayment terms',
                        'Lower interest rates'
                    ],
                    interestRate: '3.8% - 4.2%',
                    maxLoan: '100% of property value',
                    website: 'https://www.bnm.gov.my',
                    status: 'active'
                },
                {
                    id: 'rent-to-own',
                    name: 'Rent-to-Own',
                    fullName: 'Rent-to-Own Housing Scheme',
                    description: 'Innovative scheme allowing tenants to eventually own their rented property.',
                    icon: 'fas fa-handshake',
                    category: 'rental',
                    eligibility: [
                        'Malaysian citizen or permanent resident',
                        'Stable employment history',
                        'Monthly income RM2,000 - RM8,000',
                        'Clean credit record'
                    ],
                    benefits: [
                        'Gradual transition to ownership',
                        'Part of rent goes to down payment',
                        'Locked-in purchase price',
                        'Flexibility to walk away'
                    ],
                    interestRate: 'Market rate after conversion',
                    maxLoan: 'Based on final purchase',
                    website: 'https://www.kpkt.gov.my',
                    status: 'pilot'
                },
                {
                    id: 'social-housing',
                    name: 'Social Housing',
                    fullName: 'Public Housing Programme',
                    description: 'Government housing assistance for low-income families and vulnerable groups.',
                    icon: 'fas fa-users',
                    category: 'social',
                    eligibility: [
                        'Malaysian citizen',
                        'Household income below RM3,000',
                        'Do not own any property',
                        'Priority for disabled, elderly, single mothers'
                    ],
                    benefits: [
                        'Heavily subsidized rent',
                        'Basic amenities included',
                        'Community support programs',
                        'Maintenance services provided'
                    ],
                    interestRate: 'N/A (Rental)',
                    maxLoan: 'N/A (Rental)',
                    website: 'https://www.kpkt.gov.my',
                    status: 'active'
                },
                {
                    id: 'youth-housing',
                    name: 'Youth Housing Initiative',
                    fullName: 'Skim Perumahan Belia',
                    description: 'Special housing scheme designed for young professionals and graduates.',
                    icon: 'fas fa-graduation-cap',
                    category: 'ownership',
                    eligibility: [
                        'Malaysian citizen aged 21-35',
                        'Fresh graduate or young professional',
                        'Monthly income RM3,000 - RM8,000',
                        'First-time homebuyer'
                    ],
                    benefits: [
                        'Reduced down payment',
                        'Graduate incentive rates',
                        'Flexible payment terms',
                        'Career development support'
                    ],
                    interestRate: '3.2% - 4.0%',
                    maxLoan: 'Up to 95% of property value',
                    website: 'https://www.1malaysia.com.my',
                    status: 'active'
                }
            ];

            this.renderPrograms();
        } catch (error) {
            console.error('Error loading programs:', error);
            this.showAlert('Error loading housing programs. Please try again.', 'error');
        }
    }

    renderPrograms(programsToRender = this.programs) {
        const container = document.getElementById('programsContainer');
        if (!container) return;

        container.innerHTML = programsToRender.map(program => `
            <div class="program-card" data-program-id="${program.id}">
                <div class="program-icon">
                    <i class="${program.icon}"></i>
                </div>
                <div class="program-content">
                    <div class="program-header">
                        <h3>${program.name}</h3>
                        <span class="program-status status-${program.status}">${program.status}</span>
                    </div>
                    <h4 class="program-fullname">${program.fullName}</h4>
                    <p class="program-description">${program.description}</p>
                    
                    <div class="program-details">
                        <h5>Eligibility:</h5>
                        <ul>
                            ${program.eligibility.map(item => `<li><i class="fas fa-check"></i> ${item}</li>`).join('')}
                        </ul>
                        
                        <h5>Key Benefits:</h5>
                        <ul>
                            ${program.benefits.map(item => `<li><i class="fas fa-star"></i> ${item}</li>`).join('')}
                        </ul>
                        
                        <div class="program-financial">
                            <div class="financial-item">
                                <strong>Interest Rate:</strong> ${program.interestRate}
                            </div>
                            <div class="financial-item">
                                <strong>Max Financing:</strong> ${program.maxLoan}
                            </div>
                        </div>
                    </div>
                    
                    <div class="program-actions">
                        <button class="program-cta" data-program-id="${program.id}">
                            Learn More
                        </button>
                        <button class="bookmark-program" data-program-id="${program.id}">
                            <i class="far fa-bookmark"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    initializeCalculator() {
        const form = document.getElementById('loanCalculatorForm');
        if (!form) return;

        // Set default values only if elements exist
        // const loanAmountInput = document.getElementById('loanAmount');
        // const interestRateInput = document.getElementById('interestRate');
        // const loanTenureInput = document.getElementById('loanTenure');
        // const propertyPriceInput = document.getElementById('propertyPrice');
        // const downPaymentInput = document.getElementById('downPayment');
        
        // Default values
        // if (propertyPriceInput) propertyPriceInput.value = '500000';
        // if (downPaymentInput) downPaymentInput.value = '10';
        // if (loanAmountInput) loanAmountInput.value = '450000';
        // if (interestRateInput) interestRateInput.value = '4.35';
        // if (loanTenureInput) loanTenureInput.value = '25';

        // Only calculate if all required DOM elements for results exist
        if (document.getElementById('monthlyPayment') && 
            document.getElementById('totalPayable') && 
            document.getElementById('totalInterest')) {
            
            // Calculate with defaults
            this.calculateLoan();
        }

        // Update interest rate info
        this.updateInterestRateInfo();
    }

    calculateLoan() {
        console.log('calculateLoan() called');
        
        // Get input elements first
        const loanAmountInput = document.getElementById('loanAmount');
        const interestRateInput = document.getElementById('interestRate');
        const loanTenureInput = document.getElementById('loanTenure');
        
        // Make sure all required inputs exist
        if (!loanAmountInput || !interestRateInput || !loanTenureInput) {
            console.error('Required input fields not found');
            return;
        }
        
        const loanAmount = parseFloat(loanAmountInput.value) || 0;
        const annualRate = parseFloat(interestRateInput.value) || 0;
        const tenureYears = parseInt(loanTenureInput.value) || 0;

        console.log('Input values:', { loanAmount, annualRate, tenureYears });

        if (loanAmount <= 0 || annualRate <= 0 || tenureYears <= 0) {
            console.log('Invalid input values, clearing results');
            this.clearResults();
            return;
        }

        // Calculate monthly payment using loan formula
        const monthlyRate = annualRate / 100 / 12;
        const numberOfPayments = tenureYears * 12;
        
        let monthlyPayment;
        if (monthlyRate === 0) {
            monthlyPayment = loanAmount / numberOfPayments;
        } else {
            monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                           (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        }

        const totalPayment = monthlyPayment * numberOfPayments;
        const totalInterest = totalPayment - loanAmount;

        console.log('Calculated values:', { monthlyPayment, totalPayment, totalInterest });

        // Update loan data
        this.loanData = {
            amount: loanAmount,
            interestRate: annualRate,
            tenure: tenureYears,
            monthlyPayment: monthlyPayment,
            totalPayment: totalPayment,
            totalInterest: totalInterest
        };

        // Always display results when calculation is done
        this.displayResults();
        this.updateAffordabilityIndicator();
    }

    displayResults() {
        console.log('displayResults() called');
        const { amount, monthlyPayment, totalPayment, totalInterest } = this.loanData;
        console.log('Loan data:', this.loanData);

        // Safely update DOM elements if they exist
        // Use querySelector to target the result elements specifically within the calculator-results section
        const resultsSection = document.querySelector('.calculator-results');
        if (!resultsSection) {
            console.error('Results section not found');
            return;
        }
        
        const monthlyPaymentEl = resultsSection.querySelector('#monthlyPayment');
        const loanAmountResultEl = resultsSection.querySelector('#loanAmount');
        const totalPayableEl = resultsSection.querySelector('#totalPayable');
        const totalInterestEl = resultsSection.querySelector('#totalInterest');

        console.log('Result elements found:', {
            monthlyPaymentEl: !!monthlyPaymentEl,
            loanAmountResultEl: !!loanAmountResultEl,
            totalPayableEl: !!totalPayableEl,
            totalInterestEl: !!totalInterestEl
        });

        if (monthlyPaymentEl) monthlyPaymentEl.textContent = this.formatCurrency(monthlyPayment);
        if (loanAmountResultEl) loanAmountResultEl.textContent = this.formatCurrency(amount);
        if (totalPayableEl) totalPayableEl.textContent = this.formatCurrency(totalPayment);
        if (totalInterestEl) totalInterestEl.textContent = this.formatCurrency(totalInterest);

        // Update loan breakdown
        this.updateLoanBreakdown();
        
        // Add animation only if element exists
        if (resultsSection) resultsSection.classList.add('fade-in');
        
        console.log('Results updated successfully');
    }

    updateLoanBreakdown() {
        const { amount, monthlyPayment, totalPayment, totalInterest } = this.loanData;
        
        // Create payment breakdown chart
        const canvas = document.getElementById('paymentChart');
        if (!canvas) return;
        
        // Skip chart creation if Chart is not loaded
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not loaded');
            return;
        }
        
        // If there's already a chart, destroy it
        if (this.paymentChart) {
            this.paymentChart.destroy();
        }
        
        try {
            // Create a new chart
            this.paymentChart = new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: ['Principal Amount', 'Total Interest'],
                    datasets: [{
                        data: [amount, totalInterest],
                        backgroundColor: ['#3498db', '#e74c3c'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.parsed;
                                    return `${context.label}: ${this.formatCurrency(value)}`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating chart:', error);
        }
        
        // Calculate percentages for visual representation
        const principalPercent = (amount / totalPayment * 100).toFixed(1);
        const interestPercent = (totalInterest / totalPayment * 100).toFixed(1);

        // Update breakdown display
        const breakdownContainer = document.getElementById('loanBreakdown');
        if (breakdownContainer) {
            breakdownContainer.innerHTML = `
                <div class="breakdown-item">
                    <div class="breakdown-bar">
                        <div class="principal-bar" style="width: ${principalPercent}%"></div>
                        <div class="interest-bar" style="width: ${interestPercent}%"></div>
                    </div>
                    <div class="breakdown-legend">
                        <div class="legend-item">
                            <span class="legend-color principal"></span>
                            <span>Principal: RM ${this.formatNumber(amount)} (${principalPercent}%)</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color interest"></span>
                            <span>Interest: RM ${this.formatNumber(totalInterest)} (${interestPercent}%)</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    updateAffordabilityIndicator() {
        // Safely check if the affordability indicator exists first
        const affordabilityElement = document.getElementById('affordabilityIndicator');
        if (!affordabilityElement) return;
        
        const { monthlyPayment } = this.loanData;
        // Skip if monthly payment is not calculated
        if (!monthlyPayment) return;
        
        const userIncome = this.currentUser ? this.currentUser.monthlyIncome : 5000; // Default assumption
        
        const affordabilityRatio = (monthlyPayment / userIncome * 100);
        let indicator, message, colorClass;

        if (affordabilityRatio <= 30) {
            indicator = 'Excellent';
            message = 'This loan is well within your budget!';
            colorClass = 'excellent';
        } else if (affordabilityRatio <= 40) {
            indicator = 'Good';
            message = 'This loan is manageable for your income.';
            colorClass = 'good';
        } else if (affordabilityRatio <= 50) {
            indicator = 'Caution';
            message = 'This loan might strain your budget.';
            colorClass = 'caution';
        } else {
            indicator = 'High Risk';
            message = 'This loan may be too expensive for your income.';
            colorClass = 'high-risk';
        }

        affordabilityElement.innerHTML = `
            <div class="affordability-gauge ${colorClass}">
                <div class="gauge-header">
                    <h4>Affordability Assessment</h4>
                    <span class="affordability-score">${indicator}</span>
                </div>
                <div class="gauge-bar">
                    <div class="gauge-fill" style="width: ${Math.min(affordabilityRatio, 100)}%"></div>
                </div>
                <p class="affordability-message">${message}</p>
                <small>Based on ${affordabilityRatio.toFixed(1)}% of assumed monthly income</small>
            </div>
        `;
    }

    updateInterestRateInfo() {
        const rateInfo = document.getElementById('currentRates');
        if (!rateInfo) return;

        const rates = [
            { bank: 'Maybank', rate: '4.35%' },
            { bank: 'CIMB Bank', rate: '4.40%' },
            { bank: 'Public Bank', rate: '4.30%' },
            { bank: 'RHB Bank', rate: '4.45%' },
            { bank: 'Hong Leong Bank', rate: '4.38%' },
            { bank: 'AmBank', rate: '4.42%' }
        ];

        rateInfo.innerHTML = `
            <h4>Current Interest Rates</h4>
            <div class="rate-comparison">
                ${rates.map(rate => `
                    <div class="rate-item">
                        <span class="bank-name">${rate.bank}</span>
                        <span class="rate-value">${rate.rate}</span>
                    </div>
                `).join('')}
            </div>
            <small class="rate-disclaimer">
                *Rates are indicative and subject to change. Contact banks for latest rates.
            </small>
        `;
    }

    clearResults() {
        // Safely clear results if elements exist
        const resultsSection = document.querySelector('.calculator-results');
        if (!resultsSection) return;
        
        const monthlyPaymentEl = resultsSection.querySelector('#monthlyPayment');
        const loanAmountResultEl = resultsSection.querySelector('#loanAmount');
        const totalPayableEl = resultsSection.querySelector('#totalPayable');
        const totalInterestEl = resultsSection.querySelector('#totalInterest');

        if (monthlyPaymentEl) monthlyPaymentEl.textContent = '-';
        if (loanAmountResultEl) loanAmountResultEl.textContent = '-';
        if (totalPayableEl) totalPayableEl.textContent = '-';
        if (totalInterestEl) totalInterestEl.textContent = '-';
        
        // Clear chart if it exists
        if (this.paymentChart) {
            this.paymentChart.destroy();
            this.paymentChart = null;
        }
    }
    
    resetCalculator() {
        // Reset form fields to default values, safely checking if elements exist
        const propertyPrice = document.getElementById('propertyPrice');
        const downPayment = document.getElementById('downPayment');
        const loanAmount = document.getElementById('loanAmount');
        const interestRate = document.getElementById('interestRate');
        const loanTenure = document.getElementById('loanTenure');
        
        if (propertyPrice) propertyPrice.value = '';
        if (downPayment) downPayment.value = '';
        if (loanAmount) loanAmount.value = '';
        if (interestRate) interestRate.value = '4.35';
        if (loanTenure) loanTenure.value = '25';
        
        // Clear results
        this.clearResults();
        
        // Reset loan data
        this.loanData = {
            amount: 0,
            interestRate: 4.35,
            tenure: 25,
            monthlyPayment: 0,
            totalPayment: 0,
            totalInterest: 0
        };
    }

    handleProgramAction(button) {
        const programId = button.dataset.programId;
        const program = this.programs.find(p => p.id === programId);
        
        if (!program) return;

        this.showProgramDetails(program);
    }

    showProgramDetails(program) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content program-details-modal">
                <div class="modal-header">
                    <h3>${program.fullName}</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="program-overview">
                        <div class="overview-header">
                            <div class="program-icon">
                                <i class="${program.icon}"></i>
                            </div>
                            <div class="overview-info">
                                <h4>${program.name}</h4>
                                <p>${program.description}</p>
                                <span class="program-category">${this.getCategoryName(program.category)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-sections">
                        <div class="details-section">
                            <h5><i class="fas fa-list-check"></i> Eligibility Requirements</h5>
                            <ul class="requirements-list">
                                ${program.eligibility.map(req => `<li>${req}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="details-section">
                            <h5><i class="fas fa-gift"></i> Benefits & Features</h5>
                            <ul class="benefits-list">
                                ${program.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="details-section">
                            <h5><i class="fas fa-calculator"></i> Financial Information</h5>
                            <div class="financial-grid">
                                <div class="financial-card">
                                    <strong>Interest Rate</strong>
                                    <span>${program.interestRate}</span>
                                </div>
                                <div class="financial-card">
                                    <strong>Maximum Loan</strong>
                                    <span>${program.maxLoan}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <a href="${program.website}" target="_blank" class="btn-primary">
                            <i class="fas fa-external-link-alt"></i> Visit Official Website
                        </a>
                        <button class="btn-secondary bookmark-program" data-program-id="${program.id}">
                            <i class="far fa-bookmark"></i> Bookmark Program
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    toggleBookmark(button) {
        if (!this.currentUser) {
            this.showAlert('Please log in to bookmark programs', 'error');
            return;
        }

        const programId = button.dataset.programId;
        const isBookmarked = button.classList.contains('bookmarked');

        if (isBookmarked) {
            button.classList.remove('bookmarked');
            button.innerHTML = '<i class="far fa-bookmark"></i>';
            this.showAlert('Program removed from bookmarks', 'info');
        } else {
            button.classList.add('bookmarked');
            button.innerHTML = '<i class="fas fa-bookmark"></i>';
            this.showAlert('Program bookmarked successfully!', 'success');
        }

        // Save bookmarks to localStorage
        this.saveBookmarks(programId, !isBookmarked);
    }

    saveBookmarks(programId, isBookmarked) {
        let bookmarks = JSON.parse(localStorage.getItem('bookmarkedPrograms')) || [];
        
        if (isBookmarked) {
            if (!bookmarks.includes(programId)) {
                bookmarks.push(programId);
            }
        } else {
            bookmarks = bookmarks.filter(id => id !== programId);
        }
        
        localStorage.setItem('bookmarkedPrograms', JSON.stringify(bookmarks));
    }

    filterPrograms(category) {
        if (category === 'all') {
            this.renderPrograms();
        } else {
            const filtered = this.programs.filter(program => program.category === category);
            this.renderPrograms(filtered);
        }
    }

    searchPrograms(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderPrograms();
            return;
        }

        const filtered = this.programs.filter(program => 
            program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            program.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            program.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderPrograms(filtered);
    }

    getCategoryName(category) {
        const categories = {
            ownership: 'Home Ownership',
            financing: 'Financing Scheme',
            rental: 'Rental Program',
            social: 'Social Housing'
        };
        return categories[category] || category;
    }

    updateUI() {
        // Load and apply bookmarks
        const bookmarks = JSON.parse(localStorage.getItem('bookmarkedPrograms')) || [];
        bookmarks.forEach(programId => {
            const button = document.querySelector(`[data-program-id="${programId}"].bookmark-program`);
            if (button) {
                button.classList.add('bookmarked');
                button.innerHTML = '<i class="fas fa-bookmark"></i>';
            }
        });

        // Update user-specific elements
        if (this.currentUser) {
            document.querySelectorAll('.auth-required').forEach(el => {
                el.style.display = 'block';
            });
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatNumber(number) {
        return new Intl.NumberFormat('en-MY').format(number);
    }

    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;

        const container = document.querySelector('.alerts-container') || document.body;
        container.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Initialize Resources Manager
document.addEventListener('DOMContentLoaded', function() {
    // Create instance and assign to window object for global access
    window.resourcesManager = new ResourcesManager();
});
