// SpinX Main Application
class SpinXApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'home';
        this.isAuthenticated = false;
        // Currency management (store in NGN internally; display can switch)
        this.selectedCurrency = localStorage.getItem('spinx_currency') || 'GHS';
        // Approximate NGN per unit of currency (1 GHS ≈ 106 NGN, 1 USD ≈ 1600 NGN)
        this.currencyRatesNGN = { NGN: 1, GHS: 106, USD: 1600 };
        this.currencyLocales = { NGN: 'en-NG', GHS: 'en-GH', USD: 'en-US' };
        this.gameSettings = {
            wheel: {
                houseEdge: 5,
                minBet: 10,
                maxBet: 100000,
                multipliers: { red: 2, yellow: 5, blue: 10 },
                enabled: true
            },
            dice: {
                houseEdge: 5,
                minBet: 10,
                maxBet: 100000,
                evenOddMultiplier: 2,
                specificMultiplier: 6,
                enabled: true
            },
            mines: {
                houseEdge: 5,
                minBet: 10,
                maxBet: 100000,
                gridSize: 5,
                maxMines: 12,
                enabled: true
            }
        };
        this.init();
    }

    init() {
        try {
            this.loadStoredData();
            this.setupEventListeners();
            this.updateUI();
            this.loadLeaderboard();
            this.loadTransactions();
            this.checkAuthStatus();
            this.syncUserWithAuthManager();
        } catch (error) {
            console.error('Error initializing SpinX app:', error);
            this.showToast('Failed to initialize application. Please refresh the page.', 'error');
        }
    }
    
    syncUserWithAuthManager() {
        if (this.currentUser && window.authManager) {
            console.log('Syncing user with auth manager...'); // Debug log
            window.authManager.syncCurrentUser();
        }
    }

    loadStoredData() {
        // Load user data
        const userData = localStorage.getItem('spinx_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.isAuthenticated = true;
        }

        // Load game settings
        const gameSettings = localStorage.getItem('spinx_game_settings');
        if (gameSettings) {
            this.gameSettings = { ...this.gameSettings, ...JSON.parse(gameSettings) };
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });

        // Mobile menu
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }

        // Currency selector
        const currencySelect = document.getElementById('currency-select');
        if (currencySelect) {
            currencySelect.value = this.selectedCurrency;
            currencySelect.addEventListener('change', () => {
                this.selectedCurrency = currencySelect.value;
                localStorage.setItem('spinx_currency', this.selectedCurrency);
                this.updateUI();
                
                // Update admin panel if it's open
                if (window.adminManager && typeof window.adminManager.updateDashboard === 'function') {
                    window.adminManager.updateDashboard();
                }
            });
        }

        // Auth buttons
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginBtn) loginBtn.addEventListener('click', () => this.openAuthModal('login'));
        if (registerBtn) registerBtn.addEventListener('click', () => this.openAuthModal('register'));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Window resize for responsive updates
        window.addEventListener('resize', () => {
            this.updateUI();
        });

        // Wallet tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parent = e.target.closest('.wallet-tabs, .leaderboard-tabs');
                if (parent) {
                    const tabName = e.target.textContent.toLowerCase().replace(/\s+/g, '-');
                    if (parent.classList.contains('wallet-tabs')) {
                        this.showWalletTab(tabName);
                    } else if (parent.classList.contains('leaderboard-tabs')) {
                        this.showLeaderboardTab(tabName);
                    }
                }
            });
        });
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[href="#${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentSection = sectionName;
        this.updateSectionContent(sectionName);

        // Close mobile nav if open
        const navMenu = document.getElementById('nav-menu');
        if (navMenu && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
        }
    }

    updateSectionContent(sectionName) {
        switch (sectionName) {
            case 'wallet':
                if (window.walletManager && typeof window.walletManager.updateWalletUI === 'function') {
                    window.walletManager.updateWalletUI();
                }
                this.updateWalletContent && this.updateWalletContent();
                break;
            case 'leaderboard':
                this.updateLeaderboardContent();
                break;
            case 'profile':
                this.updateProfileContent();
                break;
        }
    }

    openAuthModal(type = 'login') {
        const modal = document.getElementById('auth-modal');
        const title = document.getElementById('auth-title');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (type === 'login') {
            title.textContent = 'Login to SpinX';
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            title.textContent = 'Join SpinX';
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    closeAuthModal() {
        this.closeModal('auth-modal');
    }

    showLoginForm() {
        this.openAuthModal('login');
    }

    showRegisterForm() {
        this.openAuthModal('register');
    }

    updateUI() {
        console.log('updateUI called, current user balance:', this.currentUser ? this.currentUser.balance : 'no user'); // Debug log
        this.updateBalance();
        this.updateAuthButtons();
        this.updateNavigationVisibility();
        // Also update the in-game balance display if a game is loaded
        if (window.gameManager && typeof window.gameManager.updateGameBalanceDisplay === 'function') {
            window.gameManager.updateGameBalanceDisplay();
        }
    }

    updateBalance() {
        const balanceElements = document.querySelectorAll('#user-balance, #wallet-balance');
        const balance = this.currentUser ? this.currentUser.balance : 0;
        const formattedBalance = this.formatCurrency(balance);
        
        console.log('updateBalance called:', { balance, formattedBalance, elementsFound: balanceElements.length }); // Debug log

        balanceElements.forEach(element => {
            if (element) {
                console.log('Updating element:', element.id, 'to:', formattedBalance); // Debug log
                element.textContent = formattedBalance;
            }
        });
    }

    updateAuthButtons() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const balanceDisplay = document.getElementById('balance-display');

        if (this.isAuthenticated) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (registerBtn) registerBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (balanceDisplay) balanceDisplay.classList.remove('hidden');
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (registerBtn) registerBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (balanceDisplay) balanceDisplay.classList.add('hidden');
        }
    }

    updateNavigationVisibility() {
        const profileLink = document.querySelector('[href="#profile"]');
        const walletLink = document.querySelector('[href="#wallet"]');

        if (this.isAuthenticated) {
            if (profileLink) profileLink.style.display = 'block';
            if (walletLink) walletLink.style.display = 'block';
        } else {
            if (profileLink) profileLink.style.display = 'none';
            if (walletLink) walletLink.style.display = 'none';
        }
    }

    checkAuthStatus() {
        if (this.isAuthenticated && this.currentUser) {
            // Refresh user data
            this.updateUI();
        }
    }

    formatCurrency(amount) {
        const locale = this.currencyLocales[this.selectedCurrency] || 'en-NG';
        const symbolCurrency = this.selectedCurrency;
        const displayAmount = this.convertFromBase(amount);
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: symbolCurrency,
            minimumFractionDigits: 2
        }).format(displayAmount);
    }

    formatNumber(number) {
        const locale = this.currencyLocales[this.selectedCurrency] || 'en-NG';
        return new Intl.NumberFormat(locale).format(number);
    }

    getCurrencySymbol() {
        const symbols = { NGN: '₦', GHS: '₵', USD: '$' };
        return symbols[this.selectedCurrency] || '₦';
    }

    // Convert from base (NGN) to display currency
    convertFromBase(amountNGN) {
        try {
            const rate = this.currencyRatesNGN[this.selectedCurrency] || 1;
            if (rate <= 0) {
                console.warn('Invalid currency rate:', rate);
                return 0;
            }
            return (amountNGN || 0) / rate;
        } catch (error) {
            console.error('Error converting from base currency:', error);
            return 0;
        }
    }

    // Convert from display currency to base (NGN)
    convertToBase(amountDisplay) {
        try {
            const rate = this.currencyRatesNGN[this.selectedCurrency] || 1;
            if (rate <= 0) {
                console.warn('Invalid currency rate:', rate);
                return 0;
            }
            return Math.round((amountDisplay || 0) * rate);
        } catch (error) {
            console.error('Error converting to base currency:', error);
            return 0;
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        try {
            const toast = document.getElementById('toast');
            if (!toast) {
                console.warn('Toast element not found');
                return;
            }
            
            const toastIcon = toast.querySelector('.toast-icon');
            const toastMessage = toast.querySelector('.toast-message');
            
            if (!toastMessage) {
                console.warn('Toast message element not found');
                return;
            }

            // Set message
            toastMessage.textContent = message;

            // Set icon based on type
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };

            if (toastIcon) {
                toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
            }
            toast.className = `toast ${type}`;

            // Show toast
            toast.classList.add('show');

            // Auto hide
            setTimeout(() => {
                toast.classList.remove('show');
            }, duration);
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }

    showLoading() {
        try {
            const loading = document.getElementById('loading');
            if (loading) {
                loading.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error showing loading:', error);
        }
    }

    hideLoading() {
        try {
            const loading = document.getElementById('loading');
            if (loading) {
                loading.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error hiding loading:', error);
        }
    }

    // Wallet functionality
    showWalletTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show target tab content
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    updateWalletContent() {
        this.loadTransactions();
    }

    loadTransactions() {
        const transactionList = document.getElementById('transaction-list');
        if (!transactionList || !this.currentUser) return;

        const transactions = this.currentUser.transactions || [];
        
        if (transactions.length === 0) {
            transactionList.innerHTML = `
                <div class="empty-state">
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }

        transactionList.innerHTML = transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${transaction.type}">
                        <i class="fas ${this.getTransactionIcon(transaction.type)}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.description}</h4>
                        <p>${this.formatDate(transaction.date)}</p>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
                    ${transaction.amount >= 0 ? '+' : ''}${this.formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
    }

    getTransactionIcon(type) {
        const icons = {
            deposit: 'fa-arrow-down',
            withdrawal: 'fa-arrow-up',
            game: 'fa-gamepad',
            referral: 'fa-users',
            bonus: 'fa-gift'
        };
        return icons[type] || 'fa-exchange-alt';
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Leaderboard functionality
    showLeaderboardTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('#leaderboard .tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show target tab content
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Update tab buttons
        document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`.leaderboard-tabs .tab-btn[onclick*="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        this.loadLeaderboardData(tabName);
    }

    updateLeaderboardContent() {
        this.loadLeaderboardData('top-players');
    }

    loadLeaderboard() {
        this.loadLeaderboardData('top-players');
    }

    loadLeaderboardData(type) {
        const container = document.getElementById(`${type}-list`);
        if (!container) return;

        // Generate sample leaderboard data
        const sampleData = this.generateSampleLeaderboardData(type);
        
        container.innerHTML = sampleData.map((item, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank ${this.getRankClass(index)}">
                    ${index + 1}
                </div>
                <div class="leaderboard-user">
                    <h4>${item.username}</h4>
                    <p>${item.subtitle}</p>
                </div>
                <div class="leaderboard-value">
                    ${item.value}
                </div>
            </div>
        `).join('');
    }

    generateSampleLeaderboardData(type) {
        const usernames = ['SpinMaster', 'LuckyCharm', 'WheelWinner', 'DiceDominator', 'MineExplorer', 'GoldenSpinner', 'FortuneSeeker', 'RiskTaker', 'BigBettor', 'StreakKing'];
        
        switch (type) {
            case 'top-players':
                return usernames.slice(0, 10).map((username, index) => ({
                    username,
                    subtitle: `${Math.floor(Math.random() * 500) + 50} games played`,
                    value: this.formatCurrency(Math.floor(Math.random() * 100000) + 10000)
                }));
            
            case 'win-streaks':
                return usernames.slice(0, 10).map((username, index) => ({
                    username,
                    subtitle: 'Current streak',
                    value: `${Math.floor(Math.random() * 20) + 5} wins`
                }));
            
            case 'biggest-wins':
                return usernames.slice(0, 10).map((username, index) => ({
                    username,
                    subtitle: 'Single game win',
                    value: this.formatCurrency(Math.floor(Math.random() * 50000) + 5000)
                }));
            
            default:
                return [];
        }
    }

    getRankClass(index) {
        if (index === 0) return 'gold';
        if (index === 1) return 'silver';
        if (index === 2) return 'bronze';
        return 'other';
    }

    // Profile functionality
    updateProfileContent() {
        if (!this.isAuthenticated || !this.currentUser) return;

        const profileUsername = document.getElementById('profile-username');
        const profileEmail = document.getElementById('profile-email');
        const verificationStatus = document.getElementById('verification-status');
        const totalPlayed = document.getElementById('total-played');
        const totalWon = document.getElementById('total-won');
        const currentStreak = document.getElementById('current-streak');
        const referralsCount = document.getElementById('referrals-count');

        if (profileUsername) profileUsername.textContent = this.currentUser.username || 'Guest User';
        if (profileEmail) profileEmail.textContent = this.currentUser.email || 'Not logged in';
        
        if (verificationStatus) {
            const kycStatus = this.currentUser.kycStatus || 'pending';
            verificationStatus.innerHTML = `<span class="status-badge ${kycStatus}">KYC ${kycStatus.charAt(0).toUpperCase() + kycStatus.slice(1)}</span>`;
        }

        if (totalPlayed) totalPlayed.textContent = this.formatNumber(this.currentUser.gamesPlayed || 0);
        if (totalWon) totalWon.textContent = this.formatCurrency(this.currentUser.totalWinnings || 0);
        if (currentStreak) currentStreak.textContent = this.formatNumber(this.currentUser.currentStreak || 0);
        if (referralsCount) referralsCount.textContent = this.formatNumber(this.currentUser.referralsCount || 0);
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('spinx_user');
        this.updateUI();
        this.showSection('home');
        this.showToast('Logged out successfully', 'success');
    }

    // Game functionality
    openGame(gameType) {
        if (!this.isAuthenticated) {
            this.showToast('Please login to play games', 'warning');
            this.openAuthModal('login');
            return;
        }
        // Only allow new games
        if (!["coin", "dice", "lucky"].includes(gameType)) {
            this.showToast('Invalid game selected', 'error');
            return;
        }
        window.gameManager.openGame(gameType);
    }

    // Modal functionality
    openDepositModal() {
        if (!this.isAuthenticated) {
            this.showToast('Please login to access wallet features', 'warning');
            this.openAuthModal('login');
            return;
        }

        window.walletManager.openDepositModal();
    }

    openWithdrawModal() {
        if (!this.isAuthenticated) {
            this.showToast('Please login to access wallet features', 'warning');
            this.openAuthModal('login');
            return;
        }

        window.walletManager.openWithdrawModal();
    }

    openKYCModal() {
        if (!this.isAuthenticated) {
            this.showToast('Please login to complete KYC', 'warning');
            this.openAuthModal('login');
            return;
        }

        const modal = document.getElementById('kyc-modal');
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    openReferralModal() {
        if (!this.isAuthenticated) {
            this.showToast('Please login to access referral features', 'warning');
            this.openAuthModal('login');
            return;
        }

        const modal = document.getElementById('referral-modal');
        const referralCode = document.getElementById('user-referral-code');
        const referralCount = document.getElementById('referral-count');
        const referralEarnings = document.getElementById('referral-earnings');

        if (referralCode) referralCode.textContent = this.currentUser.referralCode || 'SPINX123';
        if (referralCount) referralCount.textContent = this.currentUser.referralsCount || 0;
        if (referralEarnings) referralEarnings.textContent = this.formatCurrency(this.currentUser.referralEarnings || 0);

        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    copyReferralCode() {
        const referralCode = document.getElementById('user-referral-code');
        if (referralCode) {
            navigator.clipboard.writeText(referralCode.textContent).then(() => {
                this.showToast('Referral code copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Failed to copy referral code', 'error');
            });
        }
    }

    // Payment method selection
    selectPaymentMethod(method) {
        if (!this.isAuthenticated) {
            this.showToast('Please login first', 'warning');
            return;
        }

        window.walletManager.selectPaymentMethod(method);
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^[\+]?[0-9]{10,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    validateCardNumber(cardNumber) {
        // Remove spaces and non-digits
        const cleaned = cardNumber.replace(/\s/g, '').replace(/\D/g, '');
        
        // Check if it's a valid length (13-19 digits)
        if (cleaned.length < 13 || cleaned.length > 19) {
            return false;
        }
        
        // Luhn algorithm validation
        let sum = 0;
        let isEven = false;
        
        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned[i]);
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }

    validateExpiryDate(expiry) {
        const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
        if (!expiryRegex.test(expiry)) {
            return false;
        }
        
        const [month, year] = expiry.split('/');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;
        
        const expYear = parseInt(year);
        const expMonth = parseInt(month);
        
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
            return false;
        }
        
        return true;
    }

    validateCVV(cvv) {
        const cvvRegex = /^[0-9]{3,4}$/;
        return cvvRegex.test(cvv);
    }

    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
}

// Test wallet functionality
window.testWallet = function() {
    console.log('Testing wallet functionality...');
    console.log('Current user:', window.app.currentUser);
    console.log('Auth manager:', window.authManager);
    console.log('Wallet manager:', window.walletManager);
    
    if (window.app.currentUser && window.authManager) {
        console.log('Auth manager users:', window.authManager.users);
        console.log('User exists in auth manager:', !!window.authManager.users[window.app.currentUser.id]);
        
        if (!window.authManager.users[window.app.currentUser.id]) {
            console.log('User not found in auth manager, syncing...');
            window.authManager.syncCurrentUser();
        }
        
        console.log('Testing balance update...');
        const oldBalance = window.app.currentUser.balance;
        const result = window.authManager.updateUserBalance(
            window.app.currentUser.id,
            1000, // Add 1000 to balance
            'test',
            'Test transaction',
            'TEST_' + Date.now()
        );
        console.log('Update result:', result);
        console.log('Balance changed from', oldBalance, 'to', window.app.currentUser.balance);
    }
};

// Test currency conversion
window.testCurrency = function() {
    console.log('Testing currency conversion...');
    console.log('Selected currency:', window.app.selectedCurrency);
    console.log('Currency rates:', window.app.currencyRatesNGN);
    
    const testAmount = 1060; // 10 GHS in base currency
    console.log('Test amount (base):', testAmount);
    
    const converted = window.app.convertFromBase(testAmount);
    console.log('Converted amount:', converted);
    
    const formatted = window.app.formatCurrency(testAmount);
    console.log('Formatted amount:', formatted);
    
    // Test deposit method amounts
    if (window.walletManager) {
        console.log('Deposit methods:', window.walletManager.depositMethods);
        const mobileMoney = window.walletManager.depositMethods['mobile-money'];
        console.log('Mobile Money min amount:', mobileMoney.minAmount);
        console.log('Mobile Money min converted:', window.app.convertFromBase(mobileMoney.minAmount));
        console.log('Mobile Money min formatted:', window.app.formatCurrency(mobileMoney.minAmount));
    }
};

// Global functions that are called from HTML
function showSection(sectionName) {
    window.app.showSection(sectionName);
}

function openGame(gameType) {
    window.app.openGame(gameType);
}

function closeGameModal() {
    window.app.closeModal('game-modal');
}

function closeAuthModal() {
    window.app.closeAuthModal();
}

function showLoginForm() {
    window.app.showLoginForm();
}

function showRegisterForm() {
    window.app.showRegisterForm();
}

function openDepositModal() {
    window.app.openDepositModal();
}

function openWithdrawModal() {
    window.app.openWithdrawModal();
}

function openKYCModal() {
    window.app.openKYCModal();
}

function openReferralModal() {
    window.app.openReferralModal();
}

function copyReferralCode() {
    window.app.copyReferralCode();
}

function selectPaymentMethod(method) {
    window.app.selectPaymentMethod(method);
}

function showWalletTab(tabName) {
    window.app.showWalletTab(tabName);
}

function showLeaderboardTab(tabName) {
    window.app.showLeaderboardTab(tabName);
}

function closeModal(modalId) {
    window.app.closeModal(modalId);
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.app && typeof window.app.showToast === 'function') {
        window.app.showToast('An unexpected error occurred. Please try again.', 'error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.app && typeof window.app.showToast === 'function') {
        window.app.showToast('An unexpected error occurred. Please try again.', 'error');
    }
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new SpinXApp();
    } catch (error) {
        console.error('Failed to initialize SpinX app:', error);
        // Show a basic error message if the app fails to initialize
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif;">
                <h1 style="color: #ff6b6b; margin-bottom: 1rem;">SpinX</h1>
                <p style="color: #666; text-align: center; max-width: 400px;">
                    Failed to load the application. Please refresh the page or check your internet connection.
                </p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4ecdc4; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpinXApp;
}
