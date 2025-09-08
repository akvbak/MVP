// SpinX Wallet Manager
class WalletManager {
    constructor() {
        this.pendingWithdrawals = this.loadPendingWithdrawals();
        this.depositMethods = {
            'mobile-money': {
                name: 'Mobile Money',
                providers: ['MTN', 'Airtel', 'Glo', '9mobile'],
                fee: 0,
                minAmount: 1060, // 10 GHS in base currency (NGN)
                maxAmount: 530000 // 5,000 GHS in base currency (NGN)
            },
            'card': {
                name: 'Debit/Credit Card',
                providers: ['Visa', 'Mastercard', 'Verve'],
                fee: 0,
                minAmount: 1060, // 10 GHS in base currency (NGN)
                maxAmount: 1060000 // 10,000 GHS in base currency (NGN)
            },
            'crypto': {
                name: 'Cryptocurrency',
                providers: ['Bitcoin', 'USDT', 'Ethereum'],
                fee: 0,
                minAmount: 1060, // 10 GHS in base currency (NGN)
                maxAmount: 5300000 // 50,000 GHS in base currency (NGN)
            }
        };
        this.withdrawalMethods = {
            'mobile-money': {
                name: 'Mobile Money',
                fee: 0.01,
                minAmount: 1060, // 10 GHS minimum in base currency (NGN)
                maxAmount: 1060000, // 10,000 GHS per day in base currency (NGN)
                processingTime: '5-10 minutes'
            },
            'bank': {
                name: 'Bank Transfer',
                fee: 0.01,
                minAmount: 1060, // 10 GHS minimum in base currency (NGN)
                maxAmount: 1060000, // 10,000 GHS per day in base currency (NGN)
                processingTime: '1-3 business days'
            }
        };
        this.initUI();
    }

    // --- UI Initialization ---
    initUI() {
        // Deposit button
        const depositBtn = document.querySelector('.btn-primary[onclick*="Deposit"]');
        if (depositBtn) depositBtn.onclick = () => this.showDepositModal();
        // Withdraw button
        const withdrawBtn = document.querySelector('.btn-secondary[onclick*="Withdraw"]');
        if (withdrawBtn) withdrawBtn.onclick = () => this.showWithdrawModal();
    }

    // --- Deposit Modal ---
    showDepositModal() {
        const modal = document.getElementById('deposit-modal');
        const content = document.getElementById('deposit-content');
        const title = document.getElementById('deposit-modal-title');
        
        if (!modal || !content) {
            console.error('Deposit modal or content not found');
            return;
        }
        
        if (title) title.textContent = 'Deposit Funds';
        content.innerHTML = this.getDepositHTML();
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Attach method selection
        const cards = content.querySelectorAll('.payment-method-card');
        cards.forEach(card => {
            card.onclick = () => this.showDepositForm(card.dataset.method);
        });
    }
    showDepositForm(method) {
        const container = document.getElementById('deposit-form-container');
        container.innerHTML = this.getDepositFormHTML(method);
        container.style.display = 'block';
        
        // Attach submit handler
        const form = container.querySelector('#deposit-form');
        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                this.processDeposit(form, method);
            });
        }
        
        // Update deposit button amount when user types
        const amountInput = container.querySelector('#deposit-amount');
        const buttonAmount = container.querySelector('#deposit-button-amount');
        if (amountInput && buttonAmount) {
            amountInput.addEventListener('input', () => {
                const amount = parseFloat(amountInput.value) || 0;
                buttonAmount.textContent = window.app.formatCurrency(window.app.convertToBase(amount));
            });
        }
    }
    processDeposit(form, method) {
        const amount = parseFloat(form.querySelector('#deposit-amount').value);
        const methodData = this.depositMethods[method];
        
        // Convert display amount to base currency for validation
        const amountBase = window.app.convertToBase(amount);
        const minAmountBase = methodData.minAmount; // Already in base currency
        const maxAmountBase = methodData.maxAmount; // Already in base currency
        
        if (isNaN(amount) || amountBase < minAmountBase || amountBase > maxAmountBase) {
            const minAmountDisplay = window.app.convertFromBase(minAmountBase);
            const maxAmountDisplay = window.app.convertFromBase(maxAmountBase);
            window.app.showToast(`Invalid deposit amount. Range: ${window.app.formatCurrency(minAmountDisplay)} - ${window.app.formatCurrency(maxAmountDisplay)}`, 'error');
            return;
        }
        
        // Validate additional form fields based on method
        if (!this.validateDepositForm(form, method)) {
            return;
        }
        
        // Simulate deposit
        window.app.showLoading();
        setTimeout(() => {
            window.app.hideLoading();
            window.authManager.updateUserBalance(
                window.app.currentUser.id,
                amountBase,
                'deposit',
                `${methodData.name} deposit`,
                `DEP_${Date.now()}`
            );
            window.app.showToast('Deposit successful!', 'success');
            this.updateWalletUI();
            window.app.updateUI();
            this.resetModal();
        }, 1200);
    }
    getDepositHTML() {
        return `<div class="deposit-methods">
            <h4>Choose Deposit Method</h4>
            <div class="payment-methods-grid">
                ${Object.entries(this.depositMethods).map(([key, method]) => {
                    const minDisplay = window.app.convertFromBase(method.minAmount);
                    const maxDisplay = window.app.convertFromBase(method.maxAmount);
                    return `
                    <div class="payment-method-card" data-method="${key}">
                        <div class="method-icon"><i class="fas ${this.getMethodIcon(key)}"></i></div>
                        <h5>${method.name}</h5>
                        <p>Fee: ${(method.fee * 100).toFixed(1)}%</p>
                            <p class="method-range">${window.app.formatCurrency(minDisplay)} - ${window.app.formatCurrency(maxDisplay)}</p>
                    </div>
                    `;
                }).join('')}
            </div>
            <div id="deposit-form-container" style="display:none;"></div>
        </div>`;
    }
    getDepositFormHTML(method) {
        const methodData = this.depositMethods[method];
        
        // Convert min/max amounts from base currency to display currency
        const minAmountDisplay = window.app.convertFromBase(methodData.minAmount);
        const maxAmountDisplay = window.app.convertFromBase(methodData.maxAmount);
        
        
        let formFields = `
            <div class="form-group">
                <label>Amount (${window.app.getCurrencySymbol()})</label>
                <input type="number" id="deposit-amount" min="${minAmountDisplay}" max="${maxAmountDisplay}" step="0.01" required>
                <small class="form-hint">Range: ${window.app.formatCurrency(minAmountDisplay)} - ${window.app.formatCurrency(maxAmountDisplay)}</small>
            </div>
        `;
        
        if (method === 'mobile-money') {
            formFields += `
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" id="deposit-phone" placeholder="08012345678" required>
                </div>
                <div class="form-group">
                    <label>Network</label>
                    <select id="deposit-network" required>
                        <option value="">Select Network</option>
                        ${methodData.providers.map(provider => `<option value="${provider}">${provider}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (method === 'card') {
            formFields += `
                <div class="form-group">
                    <label>Card Number</label>
                    <input type="text" id="deposit-card-number" placeholder="1234 5678 9012 3456" maxlength="19" required>
                </div>
                <div class="form-group">
                    <label>Expiry Date</label>
                    <input type="text" id="deposit-expiry" placeholder="MM/YY" maxlength="5" required>
                </div>
                <div class="form-group">
                    <label>CVV</label>
                    <input type="text" id="deposit-cvv" placeholder="123" maxlength="4" required>
                </div>
                <div class="form-group">
                    <label>Cardholder Name</label>
                    <input type="text" id="deposit-cardholder" placeholder="John Doe" required>
                </div>
            `;
        } else if (method === 'crypto') {
            formFields += `
                <div class="form-group">
                    <label>Cryptocurrency</label>
                    <select id="deposit-crypto" required>
                        <option value="">Select Crypto</option>
                        ${methodData.providers.map(crypto => `<option value="${crypto}">${crypto}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Wallet Address</label>
                    <input type="text" id="deposit-wallet" placeholder="Enter your wallet address" required>
                </div>
            `;
        }
        
        return `<form id="deposit-form">
            ${formFields}
            <button type="submit" class="btn-primary btn-full">Deposit <span id="deposit-button-amount">${window.app.formatCurrency(minAmountDisplay)}</span></button>
        </form>`;
    }

    // --- Withdraw Modal ---
    showWithdrawModal() {
        const modal = document.getElementById('deposit-modal');
        const content = document.getElementById('deposit-content');
        const title = document.getElementById('deposit-modal-title');
        
        if (!modal || !content) {
            console.error('Withdrawal modal or content not found');
            return;
        }
        
        if (title) title.textContent = 'Withdraw Funds';
        content.innerHTML = this.getWithdrawHTML();
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Attach submit handler
        const form = content.querySelector('#withdrawal-form');
        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                this.processWithdrawal(form);
            });
        }
        
        // Update withdrawal button amount when user types
        const amountInput = content.querySelector('#withdrawal-amount');
        const buttonAmount = content.querySelector('#withdrawal-button-amount');
        if (amountInput && buttonAmount) {
            amountInput.addEventListener('input', () => {
                const amount = parseFloat(amountInput.value) || 0;
                buttonAmount.textContent = window.app.formatCurrency(window.app.convertToBase(amount));
            });
        }
        
        // Handle method selection to show account details
        const methodSelect = content.querySelector('#withdrawal-method');
        if (methodSelect) {
            methodSelect.addEventListener('change', () => {
                this.updateWithdrawalAccountDetails(methodSelect.value);
            });
        }
    }
    processWithdrawal(form) {
        const method = form.querySelector('#withdrawal-method').value;
        const amount = parseFloat(form.querySelector('#withdrawal-amount').value);
        const methodData = this.withdrawalMethods[method];
        
        // Convert display amount to base currency for validation
        const amountBase = window.app.convertToBase(amount);
        const minAmountBase = methodData.minAmount; // Already in base currency
        const userBalanceBase = window.app.currentUser.balance; // Already in base currency
        
        // Check daily withdrawal limit
        const dailyWithdrawalLimit = 1060000; // 10,000 GHS per day in base currency
        const todayWithdrawals = this.getTodayWithdrawals();
        
        if (!method || isNaN(amount) || amountBase < minAmountBase || amountBase > userBalanceBase) {
            const minAmountDisplay = window.app.convertFromBase(minAmountBase);
            const userBalanceDisplay = window.app.convertFromBase(userBalanceBase);
            window.app.showToast(`Invalid withdrawal amount. Range: ${window.app.formatCurrency(minAmountDisplay)} - ${window.app.formatCurrency(userBalanceDisplay)}`, 'error');
            return;
        }
        
        // Check if this withdrawal would exceed daily limit
        if (todayWithdrawals + amountBase > dailyWithdrawalLimit) {
            const remainingLimit = dailyWithdrawalLimit - todayWithdrawals;
            const remainingLimitDisplay = window.app.convertFromBase(remainingLimit);
            window.app.showToast(`Daily withdrawal limit exceeded. You can withdraw up to ${window.app.formatCurrency(remainingLimitDisplay)} more today.`, 'error');
            return;
        }
        
        // Validate additional form fields based on method
        if (!this.validateWithdrawalForm(form, method)) {
            return;
        }
        
        window.app.showLoading();
        setTimeout(() => {
            window.app.hideLoading();
            window.authManager.updateUserBalance(
                window.app.currentUser.id,
                -amountBase,
                'withdrawal',
                `${methodData.name} withdrawal`,
                `WD_${Date.now()}`
            );
            window.app.showToast('Withdrawal request submitted!', 'success');
            this.updateWalletUI();
            window.app.updateUI();
            this.resetModal();
        }, 1200);
    }
    getWithdrawHTML() {
        const user = window.app.currentUser;
        const userBalanceDisplay = window.app.formatCurrency(window.app.convertFromBase(user.balance));
        
        // Get minimum withdrawal amount in display currency (use mobile money as default)
        const defaultMethod = this.withdrawalMethods['mobile-money'];
        const minWithdrawalBase = defaultMethod.minAmount;
        const minWithdrawalDisplay = window.app.convertFromBase(minWithdrawalBase);
        
        // Get daily withdrawal limit info
        const dailyLimitBase = 1060000; // 10,000 GHS per day
        const dailyLimitDisplay = window.app.convertFromBase(dailyLimitBase);
        const todayWithdrawals = this.getTodayWithdrawals();
        const remainingLimit = Math.max(0, dailyLimitBase - todayWithdrawals);
        const remainingLimitDisplay = window.app.convertFromBase(remainingLimit);
        
        return `<form id="withdrawal-form">
            <div class="form-group">
                <label>Withdrawal Method</label>
            <select id="withdrawal-method" required>
                <option value="">Select method</option>
                ${Object.entries(this.withdrawalMethods).map(([key, method]) => `
                    <option value="${key}">${method.name} (Fee: ${(method.fee * 100).toFixed(1)}%)</option>
                `).join('')}
            </select>
            </div>
            <div class="form-group">
                <label>Amount (${window.app.getCurrencySymbol()})</label>
                <input type="number" id="withdrawal-amount" min="${minWithdrawalDisplay}" max="${remainingLimitDisplay}" step="0.01" required>
                <small class="form-hint">Available: ${userBalanceDisplay} | Min: ${window.app.formatCurrency(minWithdrawalDisplay)} | Daily Limit: ${window.app.formatCurrency(remainingLimitDisplay)} remaining</small>
            </div>
            <div id="withdrawal-account-details" style="display:none;">
                <!-- Account details will be populated based on method -->
            </div>
            <button type="submit" class="btn-primary btn-full">Withdraw <span id="withdrawal-button-amount">${window.app.formatCurrency(minWithdrawalDisplay)}</span></button>
        </form>`;
    }

    // --- UI Update ---
    updateWalletUI() {
        const walletBalance = document.getElementById('wallet-balance');
        if (walletBalance && window.app.currentUser) {
            walletBalance.textContent = window.app.formatCurrency(window.app.currentUser.balance);
        }
        const transactionList = document.getElementById('transaction-list');
        if (transactionList && window.app.currentUser) {
            transactionList.innerHTML = this.getTransactionsHTML();
        }
    }

    resetModal() {
        const modal = document.getElementById('deposit-modal');
        const content = document.getElementById('deposit-content');
        const title = document.getElementById('deposit-modal-title');
        if (modal && content) {
            content.innerHTML = '';
            if (title) title.textContent = 'Wallet';
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }
    getTransactionsHTML() {
        const txs = window.app.currentUser.transactions || [];
        if (!txs.length) return '<div class="no-transactions">No transactions yet</div>';
        return txs.map(tx => `<div class="transaction-item ${tx.amount >= 0 ? 'credit' : 'debit'}">
            <span>${tx.type}</span> <span>${window.app.formatCurrency(tx.amount)}</span> <span>${tx.description}</span> <span>${new Date(tx.date).toLocaleString()}</span>
        </div>`).join('');
    }
    getMethodIcon(method) {
        const icons = {
            'mobile-money': 'fa-mobile-alt',
            'card': 'fa-credit-card',
            'crypto': 'fa-bitcoin',
            'bank': 'fa-university'
        };
        return icons[method] || 'fa-wallet';
    }
    loadPendingWithdrawals() {
        const withdrawals = localStorage.getItem('spinx_withdrawals');
        return withdrawals ? JSON.parse(withdrawals) : [];
    }
    
    getTodayWithdrawals() {
        const today = new Date().toDateString();
        const user = window.app.currentUser;
        if (!user || !user.transactions) return 0;
        
        // Get all withdrawal transactions from today
        const todayWithdrawals = user.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date).toDateString();
            return transactionDate === today && transaction.type === 'withdrawal' && transaction.amount < 0;
        });
        
        // Sum up the absolute amounts
        return todayWithdrawals.reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
    }

    // --- Validation Methods ---
    validateDepositForm(form, method) {
        if (method === 'mobile-money') {
            const phone = form.querySelector('#deposit-phone').value;
            const network = form.querySelector('#deposit-network').value;
            
            if (!window.app.validatePhone(phone)) {
                window.app.showToast('Please enter a valid phone number', 'error');
                return false;
            }
            
            if (!network) {
                window.app.showToast('Please select a network', 'error');
                return false;
            }
        } else if (method === 'card') {
            const cardNumber = form.querySelector('#deposit-card-number').value;
            const expiry = form.querySelector('#deposit-expiry').value;
            const cvv = form.querySelector('#deposit-cvv').value;
            const cardholder = form.querySelector('#deposit-cardholder').value;
            
            if (!window.app.validateCardNumber(cardNumber)) {
                window.app.showToast('Please enter a valid card number', 'error');
                return false;
            }
            
            if (!window.app.validateExpiryDate(expiry)) {
                window.app.showToast('Please enter a valid expiry date (MM/YY)', 'error');
                return false;
            }
            
            if (!window.app.validateCVV(cvv)) {
                window.app.showToast('Please enter a valid CVV', 'error');
                return false;
            }
            
            if (!cardholder.trim()) {
                window.app.showToast('Please enter cardholder name', 'error');
                return false;
            }
        } else if (method === 'crypto') {
            const crypto = form.querySelector('#deposit-crypto').value;
            const wallet = form.querySelector('#deposit-wallet').value;
            
            if (!crypto) {
                window.app.showToast('Please select a cryptocurrency', 'error');
                return false;
            }
            
            if (!wallet.trim()) {
                window.app.showToast('Please enter wallet address', 'error');
                return false;
            }
        }
        
        return true;
    }

    validateWithdrawalForm(form, method) {
        if (method === 'mobile-money') {
            const phone = form.querySelector('#withdrawal-phone').value;
            const network = form.querySelector('#withdrawal-network').value;
            
            if (!window.app.validatePhone(phone)) {
                window.app.showToast('Please enter a valid phone number', 'error');
                return false;
            }
            
            if (!network) {
                window.app.showToast('Please select a network', 'error');
                return false;
            }
        } else if (method === 'bank') {
            const bank = form.querySelector('#withdrawal-bank').value;
            const accountNumber = form.querySelector('#withdrawal-account').value;
            const accountName = form.querySelector('#withdrawal-account-name').value;
            
            if (!bank) {
                window.app.showToast('Please select a bank', 'error');
                return false;
            }
            
            if (!accountNumber || accountNumber.length < 10) {
                window.app.showToast('Please enter a valid account number', 'error');
                return false;
            }
            
            if (!accountName.trim()) {
                window.app.showToast('Please enter account name', 'error');
                return false;
            }
        }
        
        return true;
    }

    updateDepositSummary(method, amount) {
        const methodData = this.depositMethods[method];
        const fee = amount * methodData.fee;
        const total = amount + fee;
        
        return {
            amount: window.app.formatCurrency(amount),
            fee: window.app.formatCurrency(fee),
            total: window.app.formatCurrency(total)
        };
    }

    updateWithdrawalSummary(method, amount) {
        const methodData = this.withdrawalMethods[method];
        const fee = amount * methodData.fee;
        const total = amount + fee;
        
        return {
            amount: window.app.formatCurrency(amount),
            fee: window.app.formatCurrency(fee),
            total: window.app.formatCurrency(total),
            processingTime: methodData.processingTime
        };
    }

    updateWithdrawalAccountDetails(method) {
        const container = document.getElementById('withdrawal-account-details');
        if (!container) return;
        
        if (method === 'mobile-money') {
            container.innerHTML = `
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" id="withdrawal-phone" placeholder="08012345678" required>
                </div>
                <div class="form-group">
                    <label>Network</label>
                    <select id="withdrawal-network" required>
                        <option value="">Select Network</option>
                        <option value="MTN">MTN</option>
                        <option value="Airtel">Airtel</option>
                        <option value="Glo">Glo</option>
                        <option value="9mobile">9mobile</option>
                    </select>
                </div>
            `;
            container.style.display = 'block';
        } else if (method === 'bank') {
            container.innerHTML = `
                <div class="form-group">
                    <label>Bank</label>
                    <select id="withdrawal-bank" required>
                        <option value="">Select Bank</option>
                        <option value="Access Bank">Access Bank</option>
                        <option value="First Bank">First Bank</option>
                        <option value="GTBank">GTBank</option>
                        <option value="Zenith Bank">Zenith Bank</option>
                        <option value="UBA">UBA</option>
                        <option value="Fidelity Bank">Fidelity Bank</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Account Number</label>
                    <input type="text" id="withdrawal-account" placeholder="1234567890" required>
                </div>
                <div class="form-group">
                    <label>Account Name</label>
                    <input type="text" id="withdrawal-account-name" placeholder="John Doe" required>
                </div>
            `;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
}

window.walletManager = new WalletManager();

// Initialize wallet manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.walletManager) {
        window.walletManager.initUI();
    }
});
