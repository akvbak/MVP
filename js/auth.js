// SpinX Authentication System
class AuthManager {
    constructor() {
        this.users = this.loadUsersFromStorage();
        this.currentUser = null;
        this.loginAttempts = {};
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    }

    loadUsersFromStorage() {
        const users = localStorage.getItem('spinx_users');
        return users ? JSON.parse(users) : {};
    }

    saveUsersToStorage() {
        localStorage.setItem('spinx_users', JSON.stringify(this.users));
    }

    generateUserId() {
        return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateReferralCode(username) {
        return 'SPINX' + username.toUpperCase().substr(0, 3) + Math.floor(Math.random() * 1000);
    }

    hashPassword(password) {
        // Simple hash for demo purposes - in production, use bcrypt or similar
        let hash = 0;
        if (password.length === 0) return hash.toString();
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    validatePassword(password) {
        // Password validation rules
        const minLength = 6;
        const hasNumber = /\d/.test(password);
        const hasLetter = /[a-zA-Z]/.test(password);

        if (password.length < minLength) {
            return { valid: false, message: 'Password must be at least 6 characters long' };
        }

        if (!hasNumber || !hasLetter) {
            return { valid: false, message: 'Password must contain both letters and numbers' };
        }

        return { valid: true };
    }

    isEmailTaken(email) {
        return Object.values(this.users).some(user => user.email.toLowerCase() === email.toLowerCase());
    }

    isUsernameTaken(username) {
        return Object.values(this.users).some(user => user.username.toLowerCase() === username.toLowerCase());
    }

    isPhoneTaken(phone) {
        const cleanPhone = phone.replace(/\s/g, '');
        return Object.values(this.users).some(user => user.phone.replace(/\s/g, '') === cleanPhone);
    }

    checkLoginAttempts(email) {
        const attempts = this.loginAttempts[email];
        if (!attempts) return { allowed: true };

        if (attempts.count >= this.maxLoginAttempts) {
            const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
            if (timeSinceLastAttempt < this.lockoutDuration) {
                const remainingTime = Math.ceil((this.lockoutDuration - timeSinceLastAttempt) / 60000);
                return { 
                    allowed: false, 
                    message: `Account locked. Try again in ${remainingTime} minutes.` 
                };
            } else {
                // Reset attempts after lockout period
                delete this.loginAttempts[email];
                return { allowed: true };
            }
        }

        return { allowed: true };
    }

    recordLoginAttempt(email, success) {
        if (success) {
            delete this.loginAttempts[email];
        } else {
            if (!this.loginAttempts[email]) {
                this.loginAttempts[email] = { count: 0, lastAttempt: 0 };
            }
            this.loginAttempts[email].count++;
            this.loginAttempts[email].lastAttempt = Date.now();
        }
    }

    async register(userData) {
        try {
            // Validate input data
            const validation = this.validateRegistrationData(userData);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            // Check if user already exists
            if (this.isEmailTaken(userData.email)) {
                throw new Error('Email is already registered');
            }

            if (this.isUsernameTaken(userData.username)) {
                throw new Error('Username is already taken');
            }

            if (this.isPhoneTaken(userData.phone)) {
                throw new Error('Phone number is already registered');
            }

            // Create new user
            const userId = this.generateUserId();
            const user = {
                id: userId,
                username: userData.username.trim(),
                email: userData.email.toLowerCase().trim(),
                phone: userData.phone.trim(),
                passwordHash: this.hashPassword(userData.password),
                referralCode: this.generateReferralCode(userData.username),
                referredBy: userData.referralCode || null,
                balance: 0,
                totalDeposits: 0,
                totalWithdrawals: 0,
                totalWinnings: 0,
                gamesPlayed: 0,
                currentStreak: 0,
                longestStreak: 0,
                referralsCount: 0,
                referralEarnings: 0,
                kycStatus: 'pending',
                isActive: true,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                transactions: [],
                gameHistory: [],
                kycData: null,
                settings: {
                    notifications: true,
                    twoFactorAuth: false
                }
            };

            // Process referral if provided
            if (userData.referralCode) {
                const referrer = Object.values(this.users).find(u => u.referralCode === userData.referralCode);
                if (referrer) {
                    user.referredBy = referrer.id;
                    // Add referral bonus to referrer (will be activated on first deposit)
                    referrer.pendingReferrals = referrer.pendingReferrals || [];
                    referrer.pendingReferrals.push({
                        userId: userId,
                        username: user.username,
                        registeredAt: user.createdAt,
                        activated: false
                    });
                }
            }

            // Save user
            this.users[userId] = user;
            this.saveUsersToStorage();

            // Auto-login after registration
            const loginResult = await this.login(userData.email, userData.password);
            
            return {
                success: true,
                message: 'Registration successful! Welcome to SpinX!',
                user: this.sanitizeUser(user)
            };

        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    validateRegistrationData(userData) {
        // Username validation
        if (!userData.username || userData.username.trim().length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters long' };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
            return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
        }

        // Email validation
        if (!userData.email || !window.app.validateEmail(userData.email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }

        // Phone validation
        if (!userData.phone || !window.app.validatePhone(userData.phone)) {
            return { valid: false, message: 'Please enter a valid phone number' };
        }

        // Password validation
        const passwordValidation = this.validatePassword(userData.password);
        if (!passwordValidation.valid) {
            return passwordValidation;
        }

        // Confirm password
        if (userData.password !== userData.confirmPassword) {
            return { valid: false, message: 'Passwords do not match' };
        }

        return { valid: true };
    }

    async login(email, password) {
        try {
            const cleanEmail = email.toLowerCase().trim();

            // Check login attempts
            const attemptCheck = this.checkLoginAttempts(cleanEmail);
            if (!attemptCheck.allowed) {
                throw new Error(attemptCheck.message);
            }

            // Find user
            const user = Object.values(this.users).find(u => u.email === cleanEmail);
            if (!user) {
                this.recordLoginAttempt(cleanEmail, false);
                throw new Error('Invalid email or password');
            }

            // Check if account is active
            if (!user.isActive) {
                throw new Error('Account is suspended. Contact support.');
            }

            // Verify password
            const passwordHash = this.hashPassword(password);
            if (user.passwordHash !== passwordHash) {
                this.recordLoginAttempt(cleanEmail, false);
                throw new Error('Invalid email or password');
            }

            // Successful login
            this.recordLoginAttempt(cleanEmail, true);
            user.lastLogin = new Date().toISOString();
            this.saveUsersToStorage();

            // Set current user
            this.currentUser = user;
            localStorage.setItem('spinx_user', JSON.stringify(this.sanitizeUser(user)));

            // Update app state
            window.app.currentUser = this.sanitizeUser(user);
            window.app.isAuthenticated = true;
            window.app.updateUI();

            return {
                success: true,
                message: 'Login successful!',
                user: this.sanitizeUser(user)
            };

        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    sanitizeUser(user) {
        // Remove sensitive data before sending to frontend
        const sanitized = { ...user };
        delete sanitized.passwordHash;
        return sanitized;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('spinx_user');
        
        // Update app state
        window.app.currentUser = null;
        window.app.isAuthenticated = false;
        window.app.updateUI();
        window.app.showSection('home');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateUserBalance(userId, amount, type, description, reference = null) {
        let user = this.users[userId];
        if (!user) return false;

        const oldBalance = user.balance;
        user.balance += amount;

        // Record transaction
        const transaction = {
            id: window.app.generateId(),
            type: type, // 'deposit', 'withdrawal', 'game', 'referral', 'bonus'
            amount: amount,
            balance: user.balance,
            description: description,
            reference: reference,
            date: new Date().toISOString(),
            status: 'completed'
        };

        user.transactions = user.transactions || [];
        user.transactions.unshift(transaction);

        // Update totals
        if (amount > 0) {
            if (type === 'deposit') {
                user.totalDeposits += amount;
            } else if (type === 'game') {
                user.totalWinnings += amount;
            }
        } else {
            if (type === 'withdrawal') {
                user.totalWithdrawals += Math.abs(amount);
            }
        }

        this.saveUsersToStorage();

        // Always re-fetch the user from storage and update all references
        const usersFromStorage = this.loadUsersFromStorage();
        user = usersFromStorage[userId];
        if (this.currentUser && this.currentUser.id === userId) {
            this.currentUser = this.sanitizeUser(user);
            localStorage.setItem('spinx_user', JSON.stringify(this.currentUser));
            window.app.currentUser = this.currentUser;
            window.app.updateUI();
        }

        return true;
    }

    updateUserStats(userId, stats) {
        const user = this.users[userId];
        if (!user) return false;

        // Update user statistics
        Object.keys(stats).forEach(key => {
            if (key in user) {
                user[key] = stats[key];
            }
        });

        this.saveUsersToStorage();

        // Update current user if it's the same user
        if (this.currentUser && this.currentUser.id === userId) {
            this.currentUser = this.sanitizeUser(user);
            localStorage.setItem('spinx_user', JSON.stringify(this.currentUser));
            window.app.currentUser = this.currentUser;
            window.app.updateUI();
        }

        return true;
    }

    processReferral(userId, depositAmount) {
        const user = this.users[userId];
        if (!user || !user.referredBy) return;

        const referrer = this.users[user.referredBy];
        if (!referrer) return;

        // Check if this is the first deposit and meets minimum requirement
        const minDepositForReferral = 1000; // ₦1,000
        if (user.totalDeposits <= depositAmount && depositAmount >= minDepositForReferral) {
            const referralBonus = 500; // ₦500 referral bonus
            
            // Give bonus to referrer
            this.updateUserBalance(
                referrer.id,
                referralBonus,
                'referral',
                `Referral bonus for ${user.username}`,
                `REF_${user.id}`
            );

            // Update referrer stats
            referrer.referralsCount = (referrer.referralsCount || 0) + 1;
            referrer.referralEarnings = (referrer.referralEarnings || 0) + referralBonus;

            // Mark referral as activated
            if (referrer.pendingReferrals) {
                const pendingReferral = referrer.pendingReferrals.find(ref => ref.userId === userId);
                if (pendingReferral) {
                    pendingReferral.activated = true;
                    pendingReferral.activatedAt = new Date().toISOString();
                    pendingReferral.bonusAmount = referralBonus;
                }
            }

            this.saveUsersToStorage();

            // Notify referrer
            window.app.showToast(`Referral bonus: ${window.app.formatCurrency(referralBonus)} for referring ${user.username}!`, 'success');
        }
    }

    // KYC Management
    submitKYC(userId, kycData) {
        const user = this.users[userId];
        if (!user) return { success: false, message: 'User not found' };

        user.kycData = {
            ...kycData,
            submittedAt: new Date().toISOString(),
            status: 'pending'
        };

        user.kycStatus = 'pending';
        this.saveUsersToStorage();

        // Update current user
        if (this.currentUser && this.currentUser.id === userId) {
            this.currentUser = this.sanitizeUser(user);
            localStorage.setItem('spinx_user', JSON.stringify(this.currentUser));
            window.app.currentUser = this.currentUser;
            window.app.updateUI();
        }

        return { success: true, message: 'KYC submitted successfully. We will review it within 24 hours.' };
    }

    // Admin functions (for admin panel)
    getAllUsers() {
        return Object.values(this.users).map(user => this.sanitizeUser(user));
    }

    updateUserKYCStatus(userId, status, notes = null) {
        const user = this.users[userId];
        if (!user) return false;

        user.kycStatus = status;
        if (user.kycData) {
            user.kycData.status = status;
            user.kycData.reviewedAt = new Date().toISOString();
            if (notes) user.kycData.notes = notes;
        }

        this.saveUsersToStorage();
        return true;
    }

    suspendUser(userId, reason) {
        const user = this.users[userId];
        if (!user) return false;

        user.isActive = false;
        user.suspensionReason = reason;
        user.suspendedAt = new Date().toISOString();

        this.saveUsersToStorage();
        return true;
    }

    activateUser(userId) {
        const user = this.users[userId];
        if (!user) return false;

        user.isActive = true;
        delete user.suspensionReason;
        delete user.suspendedAt;

        this.saveUsersToStorage();
        return true;
    }
}

// Form handlers called from HTML
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        window.app.showToast('Please fill in all fields', 'error');
        return;
    }

    window.app.showLoading();

    // Simulate network delay
    setTimeout(async () => {
        const result = await window.authManager.login(email, password);
        window.app.hideLoading();

        if (result.success) {
            window.app.showToast(result.message, 'success');
            window.app.closeAuthModal();
        } else {
            window.app.showToast(result.message, 'error');
        }
    }, 1000);
}

function handleRegister(event) {
    event.preventDefault();

    const userData = {
        username: document.getElementById('register-username').value,
        email: document.getElementById('register-email').value,
        phone: document.getElementById('register-phone').value,
        password: document.getElementById('register-password').value,
        confirmPassword: document.getElementById('register-confirm').value,
        referralCode: document.getElementById('referral-code').value
    };

    // Basic validation
    if (!userData.username || !userData.email || !userData.phone || !userData.password || !userData.confirmPassword) {
        window.app.showToast('Please fill in all required fields', 'error');
        return;
    }

    window.app.showLoading();

    // Simulate network delay
    setTimeout(async () => {
        const result = await window.authManager.register(userData);
        window.app.hideLoading();

        if (result.success) {
            window.app.showToast(result.message, 'success');
            window.app.closeAuthModal();
            
            // Reset form
            event.target.reset();
        } else {
            window.app.showToast(result.message, 'error');
        }
    }, 1000);
}

function handleKYC(event) {
    event.preventDefault();

    if (!window.app.isAuthenticated) {
        window.app.showToast('Please login first', 'error');
        return;
    }

    const kycData = {
        fullName: document.getElementById('kyc-fullname').value,
        dateOfBirth: document.getElementById('kyc-dob').value,
        idType: document.getElementById('kyc-id-type').value,
        idNumber: document.getElementById('kyc-id-number').value,
        address: document.getElementById('kyc-address').value
    };

    // Validation
    if (!kycData.fullName || !kycData.dateOfBirth || !kycData.idType || !kycData.idNumber || !kycData.address) {
        window.app.showToast('Please fill in all fields', 'error');
        return;
    }

    window.app.showLoading();

    setTimeout(() => {
        const result = window.authManager.submitKYC(window.app.currentUser.id, kycData);
        window.app.hideLoading();

        if (result.success) {
            window.app.showToast(result.message, 'success');
            window.app.closeModal('kyc-modal');
            
            // Reset form
            event.target.reset();
        } else {
            window.app.showToast(result.message, 'error');
        }
    }, 1000);
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('spinx_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            window.authManager.currentUser = user;
            if (window.app) {
                window.app.currentUser = user;
                window.app.isAuthenticated = true;
                window.app.updateUI();
            }
        } catch (error) {
            localStorage.removeItem('spinx_user');
        }
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
