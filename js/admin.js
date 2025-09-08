// SpinX Admin Panel Manager
class AdminManager {
    constructor() {
        this.isAdminAuthenticated = false;
        this.adminUser = null;
        this.currentSection = 'dashboard';
        // Always robustly seed settings before using
        let settings = localStorage.getItem('spinx_admin_settings');
        let parsed = null;
        try {
            parsed = settings ? JSON.parse(settings) : null;
        } catch (e) {
            console.warn('Failed to parse spinx_admin_settings:', e);
        }
        if (!parsed || typeof parsed.platformName === 'undefined') {
            parsed = {
                platformName: 'SpinX',
                supportEmail: 'support@spinx.com',
                minWithdrawal: 1000,
                transactionFee: 3,
                maintenanceMode: false,
                sessionTimeout: 30,
                maxLoginAttempts: 5,
                lockoutDuration: 15,
                requireKyc: true,
                twoFactorAuth: false,
                referralBonus: 500,
                maxReferrals: 100,
                referralMinDeposit: 1000,
                referralEnabled: true
            };
            localStorage.setItem('spinx_admin_settings', JSON.stringify(parsed));
            console.log('Default admin settings seeded:', parsed);
        } else {
            console.log('Loaded admin settings:', parsed);
        }
        this.settings = parsed;
        this.init();
    }

    init() {
        this.checkAdminAuth();
        this.setupEventListeners();
        this.updateDashboard();
        this.startLiveUpdates();
    }

    startLiveUpdates() {
        // Poll every 5 seconds for live updates
        this.liveUpdateInterval = setInterval(() => {
            this.loadSectionData(this.currentSection);
        }, 5000);
    }
    loadSettings() {
        let settings = localStorage.getItem('spinx_admin_settings');
        let parsed = null;
        try {
            parsed = settings ? JSON.parse(settings) : null;
        } catch (e) {
            console.warn('Failed to parse spinx_admin_settings:', e);
        }
        if (!parsed || typeof parsed.platformName === 'undefined') {
            parsed = {
                platformName: 'SpinX',
                supportEmail: 'support@spinx.com',
                minWithdrawal: 1000,
                transactionFee: 3,
                maintenanceMode: false,
                sessionTimeout: 30,
                maxLoginAttempts: 5,
                lockoutDuration: 15,
                requireKyc: true,
                twoFactorAuth: false,
                referralBonus: 500,
                maxReferrals: 100,
                referralMinDeposit: 1000,
                referralEnabled: true
            };
            localStorage.setItem('spinx_admin_settings', JSON.stringify(parsed));
            console.log('Default admin settings seeded:', parsed);
        } else {
            console.log('Loaded admin settings:', parsed);
        }
        return parsed;
    }

    saveSettings() {
        localStorage.setItem('spinx_admin_settings', JSON.stringify(this.settings));
    }

    checkAdminAuth() {
        const adminData = localStorage.getItem('spinx_admin_user');
        if (adminData) {
            try {
                const parsed = JSON.parse(adminData);
                if (parsed && parsed.username) {
                    this.adminUser = parsed;
                    this.isAdminAuthenticated = true;
                    return;
                }
            } catch (_) {}
        }
        this.showAdminLogin();
    }

    showAdminLogin() {
        console.log('Injecting admin login overlay...');
        const loginHtml = `
            <div class="admin-login-overlay" style="display:flex !important; z-index:99999;">
                <div class="admin-login-modal">
                    <h2>Admin Login</h2>
                    <form id="admin-login-form" onsubmit="adminManager.handleAdminLogin(event)">
                        <div class="form-group">
                            <input type="text" id="admin-username" placeholder="Username" required>
                        </div>
                        <div class="form-group">
                            <input type="password" id="admin-password" placeholder="Password" required>
                        </div>
                        <button type="submit" class="btn-primary">Login</button>
                    </form>
                    <p class="demo-credentials">Demo: admin / admin123</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loginHtml);
        setTimeout(() => {
            const overlay = document.querySelector('.admin-login-overlay');
            if (overlay) overlay.style.display = 'flex';
        }, 100);
    }

    handleAdminLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        
        // Demo credentials - normalize username
        if (username.trim().toLowerCase() === 'admin' && password === 'admin123') {
            this.adminUser = {
                id: 'admin_1',
                username: 'admin',
                role: 'super_admin',
                lastLogin: new Date().toISOString()
            };

            localStorage.setItem('spinx_admin_user', JSON.stringify(this.adminUser));
            this.isAdminAuthenticated = true;

            // Remove login overlay
            const overlay = document.querySelector('.admin-login-overlay');
            if (overlay) overlay.remove();

            // Show sidebar and main content
            const sidebar = document.querySelector('.admin-sidebar');
            const main = document.querySelector('.admin-main');
            if (sidebar) sidebar.style.display = 'block';
            if (main) main.style.display = 'block';

            // Initialize admin panel
            this.updateDashboard();
            this.showToast('Admin login successful', 'success');
        } else {
            this.showToast('Invalid credentials', 'error');
        }
    }

    setupEventListeners() {
        // Section navigation
        document.querySelectorAll('.admin-nav .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.showAdminSection(section);
            });
        });

        // Search and filter events
        this.setupSearchAndFilters();
    }

    setupSearchAndFilters() {
        // User search
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        // KYC filter
        const kycFilter = document.getElementById('kyc-filter');
        if (kycFilter) {
            kycFilter.addEventListener('change', (e) => {
                this.filterKYCRequests(e.target.value);
            });
        }

        // Transaction filters
        const transactionTypeFilter = document.getElementById('transaction-type-filter');
        const transactionDateFrom = document.getElementById('transaction-date-from');
        const transactionDateTo = document.getElementById('transaction-date-to');
        
        if (transactionTypeFilter) {
            transactionTypeFilter.addEventListener('change', () => this.filterTransactions());
        }
        if (transactionDateFrom) {
            transactionDateFrom.addEventListener('change', () => this.filterTransactions());
        }
        if (transactionDateTo) {
            transactionDateTo.addEventListener('change', () => this.filterTransactions());
        }

        // Withdrawal filter
        const withdrawalFilter = document.getElementById('withdrawal-status-filter');
        if (withdrawalFilter) {
            withdrawalFilter.addEventListener('change', (e) => {
                this.filterWithdrawals(e.target.value);
            });
        }
    }

    showAdminSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.admin-nav .nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`.admin-nav [href="#${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentSection = sectionName;
        this.loadSectionData(sectionName);
    }

    loadSectionData(sectionName) {
        // Ensure demo data is loaded if managers are not ready
        if (!window.authManager) {
            window.authManager = {
                getAllUsers: function() {
                    const users = localStorage.getItem('spinx_users');
                    console.log('Loaded users from localStorage:', users);
                    return users ? Object.values(JSON.parse(users)) : [];
                }
            };
        }
        if (!window.walletManager) {
            window.walletManager = {
                getAllWithdrawals: function() {
                    const withdrawals = localStorage.getItem('spinx_withdrawals');
                    console.log('Loaded withdrawals from localStorage:', withdrawals);
                    return withdrawals ? JSON.parse(withdrawals) : [];
                }
            };
        }
        switch (sectionName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'kyc':
                this.loadKYCRequests();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'withdrawals':
                this.loadWithdrawals();
                break;
            case 'games':
                this.loadGameSettings();
                break;
            case 'referrals':
                this.loadReferrals();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    updateDashboard() {
        if (!window.authManager) return;
        
        const users = window.authManager.getAllUsers();
        const withdrawals = window.walletManager ? window.walletManager.getAllWithdrawals() : [];
        
    // Update summary stats
    const totalUsersEl = document.getElementById('total-users');
    if (totalUsersEl) totalUsersEl.textContent = users.length;

    const totalRevenue = users.reduce((sum, user) => sum + (user.totalDeposits || 0), 0);
    const totalRevenueEl = document.getElementById('total-revenue');
    if (totalRevenueEl) totalRevenueEl.textContent = this.formatCurrency(totalRevenue);

    const gamesPlayed = users.reduce((sum, user) => sum + (user.gamesPlayed || 0), 0);
    const gamesPlayedEl = document.getElementById('games-played');
    if (gamesPlayedEl) gamesPlayedEl.textContent = gamesPlayed;

    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
    const pendingWithdrawalsEl = document.getElementById('pending-withdrawals');
    if (pendingWithdrawalsEl) pendingWithdrawalsEl.textContent = pendingWithdrawals;

    // Update game stats
    this.updateGameStats(users);

    // Load recent activity
    this.loadRecentActivity();
    }

    updateGameStats(users) {
        // For demo purposes, generate some stats
        const coinPlays = Math.floor(Math.random() * 1000) + 500;
        const dicePlays = Math.floor(Math.random() * 800) + 300;
        const luckyPlays = Math.floor(Math.random() * 600) + 200;
        
        const coinElement = document.getElementById('coin-plays');
        const diceElement = document.getElementById('dice-plays');
        const luckyElement = document.getElementById('lucky-plays');
        
        if (coinElement) coinElement.textContent = coinPlays;
        if (diceElement) diceElement.textContent = dicePlays;
        if (luckyElement) luckyElement.textContent = luckyPlays;
    }

    loadRecentActivity() {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;
        
        // Generate sample recent activity
        const activities = [
            'New user registration: User123',
            'Withdrawal request: ₦50,000',
            'Game win: ₦25,000 (Wheel)',
            'KYC verification completed',
            'Deposit processed: ₦10,000',
            'Referral bonus paid: ₦500'
        ];
        
        activityContainer.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span>${activity}</span>
                <span class="activity-time">${Math.floor(Math.random() * 60)} minutes ago</span>
            </div>
        `).join('');
    }

    loadUsers() {
        if (!window.authManager) return;
        
        const users = window.authManager.getAllUsers();
        const tableBody = document.getElementById('users-table-body');
        
        if (!tableBody) return;
        
        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id.substr(-8)}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${this.formatCurrency(user.balance || 0)}</td>
                <td><span class="status-badge ${user.kycStatus || 'pending'}">${user.kycStatus || 'pending'}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-sm btn-view" onclick="adminManager.viewUser('${user.id}')">View</button>
                        <button class="btn-sm btn-edit" onclick="adminManager.editUser('${user.id}')">Edit</button>
                        ${user.isActive ? 
                            `<button class="btn-sm btn-reject" onclick="adminManager.suspendUser('${user.id}')">Suspend</button>` :
                            `<button class="btn-sm btn-approve" onclick="adminManager.activateUser('${user.id}')">Activate</button>`
                        }
                    </div>
                </td>
            </tr>
        `).join('');
    }

    filterUsers(searchTerm) {
        if (!window.authManager) return;
        
        const users = window.authManager.getAllUsers();
        const filteredUsers = users.filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone?.includes(searchTerm)
        );
        
        this.displayFilteredUsers(filteredUsers);
    }

    displayFilteredUsers(users) {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id.substr(-8)}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${this.formatCurrency(user.balance || 0)}</td>
                <td><span class="status-badge ${user.kycStatus || 'pending'}">${user.kycStatus || 'pending'}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-sm btn-view" onclick="adminManager.viewUser('${user.id}')">View</button>
                        <button class="btn-sm btn-edit" onclick="adminManager.editUser('${user.id}')">Edit</button>
                        ${user.isActive ? 
                            `<button class="btn-sm btn-reject" onclick="adminManager.suspendUser('${user.id}')">Suspend</button>` :
                            `<button class="btn-sm btn-approve" onclick="adminManager.activateUser('${user.id}')">Activate</button>`
                        }
                    </div>
                </td>
            </tr>
        `).join('');
    }

    loadKYCRequests() {
        if (!window.authManager) return;
        
        const users = window.authManager.getAllUsers();
        const kycRequests = users.filter(user => user.kycData).map(user => ({
            ...user.kycData,
            userId: user.id,
            username: user.username,
            userKycStatus: user.kycStatus
        }));
        
        const container = document.getElementById('kyc-requests-grid');
        if (!container) return;
        
        container.innerHTML = kycRequests.map(request => `
            <div class="kyc-request-card">
                <div class="kyc-header">
                    <span class="kyc-user">${request.username}</span>
                    <span class="status-badge ${request.userKycStatus}">${request.userKycStatus}</span>
                </div>
                <div class="kyc-details">
                    <div class="kyc-detail">
                        <span class="kyc-detail-label">Full Name:</span>
                        <span class="kyc-detail-value">${request.fullName}</span>
                    </div>
                    <div class="kyc-detail">
                        <span class="kyc-detail-label">ID Type:</span>
                        <span class="kyc-detail-value">${request.idType}</span>
                    </div>
                    <div class="kyc-detail">
                        <span class="kyc-detail-label">ID Number:</span>
                        <span class="kyc-detail-value">${request.idNumber}</span>
                    </div>
                    <div class="kyc-detail">
                        <span class="kyc-detail-label">Submitted:</span>
                        <span class="kyc-detail-value">${new Date(request.submittedAt).toLocaleDateString()}</span>
                    </div>
                </div>
                ${request.userKycStatus === 'pending' ? `
                    <div class="kyc-actions">
                        <button class="btn-sm btn-approve" onclick="adminManager.approveKYC('${request.userId}')">Approve</button>
                        <button class="btn-sm btn-reject" onclick="adminManager.rejectKYC('${request.userId}')">Reject</button>
                        <button class="btn-sm btn-view" onclick="adminManager.viewKYC('${request.userId}')">View Details</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    loadTransactions() {
        if (!window.authManager) return;
        
        const users = window.authManager.getAllUsers();
        const allTransactions = [];
        
        users.forEach(user => {
            if (user.transactions) {
                user.transactions.forEach(transaction => {
                    allTransactions.push({
                        ...transaction,
                        username: user.username,
                        userId: user.id
                    });
                });
            }
        });
        
        // Sort by date (newest first)
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this.displayTransactions(allTransactions);
    }

    displayTransactions(transactions) {
        const tableBody = document.getElementById('transactions-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = transactions.slice(0, 100).map(transaction => `
            <tr>
                <td>${transaction.id.substr(-8)}</td>
                <td>${transaction.username}</td>
                <td><span class="transaction-type ${transaction.type}">${transaction.type}</span></td>
                <td class="${transaction.amount >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(transaction.amount)}</td>
                <td><span class="status-badge ${transaction.status || 'completed'}">${transaction.status || 'completed'}</span></td>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${transaction.reference || 'N/A'}</td>
                <td>
                    <button class="btn-sm btn-view" onclick="adminManager.viewTransaction('${transaction.id}')">View</button>
                </td>
            </tr>
        `).join('');
    }

    loadWithdrawals() {
        if (!window.walletManager) return;
        
        const withdrawals = window.walletManager.getAllWithdrawals();
        const tableBody = document.getElementById('withdrawals-table-body');
        
        if (!tableBody) return;
        
        tableBody.innerHTML = withdrawals.map(withdrawal => `
            <tr>
                <td>${withdrawal.id.substr(-8)}</td>
                <td>${withdrawal.username}</td>
                <td>${this.formatCurrency(withdrawal.amount)}</td>
                <td>${withdrawal.method}</td>
                <td>${this.formatAccountDetails(withdrawal.accountDetails)}</td>
                <td><span class="status-badge ${withdrawal.status}">${withdrawal.status}</span></td>
                <td>${new Date(withdrawal.date).toLocaleDateString()}</td>
                <td>
                    <div class="table-actions">
                        ${withdrawal.status === 'pending' ? `
                            <button class="btn-sm btn-approve" onclick="adminManager.approveWithdrawal('${withdrawal.id}')">Approve</button>
                            <button class="btn-sm btn-reject" onclick="adminManager.rejectWithdrawal('${withdrawal.id}')">Reject</button>
                        ` : ''}
                        <button class="btn-sm btn-view" onclick="adminManager.viewWithdrawal('${withdrawal.id}')">View</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    formatAccountDetails(details) {
        if (!details) return 'N/A';
        
        if (details.phone) {
            return `${details.network}: ${details.phone}`;
        }
        
        if (details.accountNumber) {
            return `${details.bank}: ${details.accountNumber}`;
        }
        
        return 'N/A';
    }

    loadGameSettings() {
        // Game settings are loaded from the main app settings
        // This would typically come from a server in a real application
        this.populateGameSettingsForms();
    }

    populateGameSettingsForms() {
        // Populate coin settings
        if (window.app && window.app.gameSettings) {
            const coinSettings = window.app.gameSettings.coin;
            if (coinSettings) {
                this.setFormValue('coin-house-edge', coinSettings.houseEdge);
                this.setFormValue('coin-min-bet', coinSettings.minBet);
                this.setFormValue('coin-max-bet', coinSettings.maxBet);
                this.setFormValue('coin-multiplier', coinSettings.multiplier || 2);
                this.setFormValue('coin-enabled', coinSettings.enabled);
            }
            
            // Populate dice settings
            const diceSettings = window.app.gameSettings.dice;
            if (diceSettings) {
                this.setFormValue('dice-house-edge', diceSettings.houseEdge);
                this.setFormValue('dice-min-bet', diceSettings.minBet);
                this.setFormValue('dice-max-bet', diceSettings.maxBet);
                this.setFormValue('dice-even-odd-multiplier', diceSettings.payouts?.even || 2);
                this.setFormValue('dice-specific-multiplier', diceSettings.payouts?.specific || 6);
                this.setFormValue('dice-enabled', diceSettings.enabled);
            }
            
            // Populate lucky settings
            const luckySettings = window.app.gameSettings.lucky;
            if (luckySettings) {
                this.setFormValue('lucky-house-edge', luckySettings.houseEdge);
                this.setFormValue('lucky-min-bet', luckySettings.minBet);
                this.setFormValue('lucky-max-bet', luckySettings.maxBet);
                this.setFormValue('lucky-multiplier', luckySettings.multiplier || 10);
                this.setFormValue('lucky-enabled', luckySettings.enabled);
            }
        }
    }

    setFormValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    }

    loadReferrals() {
        // Load referral settings
        const settingsForm = document.getElementById('referral-settings-form');
        if (settingsForm) {
            this.setFormValue('referral-bonus', this.settings.referralBonus);
            this.setFormValue('max-referrals', this.settings.maxReferrals);
            this.setFormValue('referral-min-deposit', this.settings.referralMinDeposit);
            this.setFormValue('referral-enabled', this.settings.referralEnabled);
        }
        
        // Load referral data
        this.loadReferralData();
    }

    loadReferralData() {
        if (!window.authManager) return;
        
        const users = window.authManager.getAllUsers();
        const referrals = [];
        
        users.forEach(user => {
            if (user.pendingReferrals) {
                user.pendingReferrals.forEach(referral => {
                    referrals.push({
                        referrerId: user.id,
                        referrerUsername: user.username,
                        referredUserId: referral.userId,
                        referredUsername: referral.username,
                        bonusAmount: referral.bonusAmount || this.settings.referralBonus,
                        status: referral.activated ? 'activated' : 'pending',
                        date: referral.registeredAt
                    });
                });
            }
        });
        
        const tableBody = document.getElementById('referrals-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = referrals.map(referral => `
            <tr>
                <td>${referral.referrerUsername}</td>
                <td>${referral.referredUsername}</td>
                <td>${this.formatCurrency(referral.bonusAmount)}</td>
                <td><span class="status-badge ${referral.status}">${referral.status}</span></td>
                <td>${new Date(referral.date).toLocaleDateString()}</td>
                <td>
                    <button class="btn-sm btn-view" onclick="adminManager.viewReferral('${referral.referrerId}', '${referral.referredUserId}')">View</button>
                </td>
            </tr>
        `).join('');
    }

    loadAnalytics() {
        // Load analytics data
        const period = document.getElementById('analytics-period')?.value || '30';
        this.updateAnalyticsData(parseInt(period));
    }

    updateAnalyticsData(days) {
        if (!window.authManager) return;
        
        const users = window.authManager.getAllUsers();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        // Calculate analytics
        const analytics = {
            deposits: 0,
            withdrawals: 0,
            houseEdge: 0,
            fees: 0,
            newUsers: 0,
            activeUsers: 0,
            verifiedUsers: 0,
            totalGames: 0
        };
        
        users.forEach(user => {
            const userDate = new Date(user.createdAt);
            if (userDate >= cutoffDate) {
                analytics.newUsers++;
            }
            
            if (user.lastLogin && new Date(user.lastLogin) >= cutoffDate) {
                analytics.activeUsers++;
            }
            
            if (user.kycStatus === 'verified') {
                analytics.verifiedUsers++;
            }
            
            analytics.totalGames += user.gamesPlayed || 0;
            
            if (user.transactions) {
                user.transactions.forEach(transaction => {
                    const transactionDate = new Date(transaction.date);
                    if (transactionDate >= cutoffDate) {
                        if (transaction.type === 'deposit') {
                            analytics.deposits += transaction.amount;
                            analytics.fees += transaction.amount * 0.03; // 3% fee
                        } else if (transaction.type === 'withdrawal') {
                            analytics.withdrawals += Math.abs(transaction.amount);
                        } else if (transaction.type === 'game' && transaction.amount < 0) {
                            analytics.houseEdge += Math.abs(transaction.amount) * 0.05; // 5% house edge
                        }
                    }
                });
            }
        });
        
        // Update UI
        this.setAnalyticsValue('analytics-deposits', analytics.deposits);
        this.setAnalyticsValue('analytics-withdrawals', analytics.withdrawals);
        this.setAnalyticsValue('analytics-house-edge', analytics.houseEdge);
        this.setAnalyticsValue('analytics-fees', analytics.fees);
        
        document.getElementById('analytics-new-users').textContent = analytics.newUsers;
        document.getElementById('analytics-active-users').textContent = analytics.activeUsers;
        document.getElementById('analytics-verified-users').textContent = analytics.verifiedUsers;
        document.getElementById('analytics-total-games').textContent = analytics.totalGames;
    }

    setAnalyticsValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = this.formatCurrency(value);
        }
    }

    loadSettings() {
        // Populate general settings
        this.setFormValue('platform-name', this.settings.platformName);
        this.setFormValue('support-email', this.settings.supportEmail);
        this.setFormValue('min-withdrawal', this.settings.minWithdrawal);
        this.setFormValue('transaction-fee', this.settings.transactionFee);
        this.setFormValue('maintenance-mode', this.settings.maintenanceMode);
        
        // Populate security settings
        this.setFormValue('session-timeout', this.settings.sessionTimeout);
        this.setFormValue('max-login-attempts', this.settings.maxLoginAttempts);
        this.setFormValue('lockout-duration', this.settings.lockoutDuration);
        this.setFormValue('require-kyc', this.settings.requireKyc);
        this.setFormValue('two-factor-auth', this.settings.twoFactorAuth);
    }

    // Action handlers
    viewUser(userId) {
        if (!window.authManager) return;
        
        const users = window.authManager.getAllUsers();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            this.showToast('User not found', 'error');
            return;
        }
        
        const modal = document.getElementById('user-details-modal');
        const content = document.getElementById('user-details-content');
        
        content.innerHTML = `
            <div class="user-details">
                <h4>${user.username}</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">Email:</span>
                        <span class="value">${user.email}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Phone:</span>
                        <span class="value">${user.phone || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Balance:</span>
                        <span class="value">${this.formatCurrency(user.balance || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Total Deposits:</span>
                        <span class="value">${this.formatCurrency(user.totalDeposits || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Total Winnings:</span>
                        <span class="value">${this.formatCurrency(user.totalWinnings || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Games Played:</span>
                        <span class="value">${user.gamesPlayed || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">KYC Status:</span>
                        <span class="value"><span class="status-badge ${user.kycStatus || 'pending'}">${user.kycStatus || 'pending'}</span></span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Registered:</span>
                        <span class="value">${new Date(user.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Last Login:</span>
                        <span class="value">${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</span>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    approveKYC(userId) {
        if (window.authManager.updateUserKYCStatus(userId, 'verified')) {
            this.showToast('KYC approved successfully', 'success');
            this.loadKYCRequests();
        } else {
            this.showToast('Failed to approve KYC', 'error');
        }
    }

    rejectKYC(userId) {
        const reason = prompt('Enter rejection reason:');
        if (reason && window.authManager.updateUserKYCStatus(userId, 'rejected', reason)) {
            this.showToast('KYC rejected', 'success');
            this.loadKYCRequests();
        }
    }

    suspendUser(userId) {
        const reason = prompt('Enter suspension reason:');
        if (reason && window.authManager.suspendUser(userId, reason)) {
            this.showToast('User suspended', 'success');
            this.loadUsers();
        }
    }

    activateUser(userId) {
        if (window.authManager.activateUser(userId)) {
            this.showToast('User activated', 'success');
            this.loadUsers();
        }
    }

    approveWithdrawal(withdrawalId) {
        if (window.walletManager.approveWithdrawal(withdrawalId)) {
            this.showToast('Withdrawal approved', 'success');
            this.loadWithdrawals();
        }
    }

    rejectWithdrawal(withdrawalId) {
        const reason = prompt('Enter rejection reason:');
        if (reason && window.walletManager.rejectWithdrawal(withdrawalId, reason)) {
            this.showToast('Withdrawal rejected and refunded', 'success');
            this.loadWithdrawals();
        }
    }

    // Form handlers
    updateGameSettings(event, gameType) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const settings = {};
        
        for (let [key, value] of formData.entries()) {
            if (key.includes('enabled')) {
                settings[key.replace(`${gameType}-`, '')] = true;
            } else {
                const numValue = parseFloat(value);
                settings[key.replace(`${gameType}-`, '')] = isNaN(numValue) ? value : numValue;
            }
        }
        
        // Update game settings
        if (window.app && window.app.gameSettings) {
            window.app.gameSettings[gameType] = { ...window.app.gameSettings[gameType], ...settings };
            localStorage.setItem('spinx_game_settings', JSON.stringify(window.app.gameSettings));
        }
        
        this.showToast(`${gameType} settings updated successfully`, 'success');
    }

    updateReferralSettings(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        
        this.settings.referralBonus = parseInt(formData.get('referral-bonus'));
        this.settings.maxReferrals = parseInt(formData.get('max-referrals'));
        this.settings.referralMinDeposit = parseInt(formData.get('referral-min-deposit'));
        this.settings.referralEnabled = formData.has('referral-enabled');
        
        this.saveSettings();
        this.showToast('Referral settings updated successfully', 'success');
    }

    updateGeneralSettings(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        
        this.settings.platformName = formData.get('platform-name');
        this.settings.supportEmail = formData.get('support-email');
        this.settings.minWithdrawal = parseInt(formData.get('min-withdrawal'));
        this.settings.transactionFee = parseFloat(formData.get('transaction-fee'));
        this.settings.maintenanceMode = formData.has('maintenance-mode');
        
        this.saveSettings();
        this.showToast('General settings updated successfully', 'success');
    }

    updateSecuritySettings(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        
        this.settings.sessionTimeout = parseInt(formData.get('session-timeout'));
        this.settings.maxLoginAttempts = parseInt(formData.get('max-login-attempts'));
        this.settings.lockoutDuration = parseInt(formData.get('lockout-duration'));
        this.settings.requireKyc = formData.has('require-kyc');
        this.settings.twoFactorAuth = formData.has('two-factor-auth');
        
        this.saveSettings();
        this.showToast('Security settings updated successfully', 'success');
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(amount);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('admin-toast');
        if (!toast) return;
        
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');
        
        toastMessage.textContent = message;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
        toast.className = `toast ${type}`;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    adminLogout() {
    try { localStorage.removeItem('spinx_admin_user'); } catch (_) {}
    this.isAdminAuthenticated = false;
    this.adminUser = null;
    this.hideAdminPanel();
    this.showAdminLogin();
    this.showToast('Logged out', 'success');
    }
}

// Global functions for admin panel
function showAdminSection(sectionName) {
    if (window.adminManager) {
        window.adminManager.showAdminSection(sectionName);
    }
}

function filterKYCRequests() {
    // Implementation for filtering KYC requests
}

function filterTransactions() {
    // Implementation for filtering transactions
}

function filterWithdrawals() {
    // Implementation for filtering withdrawals
}

function updateAnalytics() {
    if (window.adminManager) {
        const period = document.getElementById('analytics-period').value;
        window.adminManager.updateAnalyticsData(parseInt(period));
    }
}

function updateGameSettings(event, gameType) {
    if (window.adminManager) {
        window.adminManager.updateGameSettings(event, gameType);
    }
}

function updateReferralSettings(event) {
    if (window.adminManager) {
        window.adminManager.updateReferralSettings(event);
    }
}

function updateGeneralSettings(event) {
    if (window.adminManager) {
        window.adminManager.updateGeneralSettings(event);
    }
}

function updateSecuritySettings(event) {
    if (window.adminManager) {
        window.adminManager.updateSecuritySettings(event);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function exportUsers() {
    window.adminManager.showToast('User export feature would be implemented here', 'info');
}

function exportReferrals() {
    window.adminManager.showToast('Referral export feature would be implemented here', 'info');
}

function exportAnalytics() {
    window.adminManager.showToast('Analytics export feature would be implemented here', 'info');
}

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('admin-body')) {
        window.adminManager = new AdminManager();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
}
