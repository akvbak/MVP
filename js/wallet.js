// SpinX Wallet Manager
class WalletManager {
    constructor() {
        this.pendingWithdrawals = this.loadPendingWithdrawals();
        this.depositMethods = {
            'mobile-money': {
                name: 'Mobile Money',
                providers: ['MTN', 'Airtel', 'Glo', '9mobile'],
                fee: 0,
                minAmount: 100,
                maxAmount: 500000
            },
            'card': {
                name: 'Debit/Credit Card',
                providers: ['Visa', 'Mastercard', 'Verve'],
                fee: 0,
                minAmount: 100,
                maxAmount: 1000000
            },
            'crypto': {
                name: 'Cryptocurrency',
                providers: ['Bitcoin', 'USDT', 'Ethereum'],
                fee: 0,
                minAmount: 1000,
                maxAmount: 10000000
            }
        };
        this.withdrawalMethods = {
            'mobile-money': {
                name: 'Mobile Money',
                fee: 0.01,
                minAmount: 1000,
                maxAmount: 500000,
                processingTime: '5-10 minutes'
            },
            'bank': {
                name: 'Bank Transfer',
                fee: 0.01,
                minAmount: 2000,
                maxAmount: 1000000,
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
        content.innerHTML = this.getDepositHTML();
        modal.classList.add('active');
        modal.style.display = 'flex';
        // Attach method selection
        content.querySelectorAll('.payment-method-card').forEach(card => {
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
    }
    processDeposit(form, method) {
        const amount = parseFloat(form.querySelector('#deposit-amount').value);
        const methodData = this.depositMethods[method];
        
        // Convert display amount to base currency for validation
        const amountBase = window.app.convertToBase(amount);
        const minAmountBase = window.app.convertToBase(methodData.minAmount);
        const maxAmountBase = window.app.convertToBase(methodData.maxAmount);
        
        if (isNaN(amount) || amountBase < minAmountBase || amountBase > maxAmountBase) {
            window.app.showToast(`Invalid deposit amount. Range: ${window.app.formatCurrency(methodData.minAmount)} - ${window.app.formatCurrency(methodData.maxAmount)}`, 'error');
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
            document.getElementById('deposit-modal').style.display = 'none';
        }, 1200);
    }
    getDepositHTML() {
        return `<div class="deposit-methods">
            <h4>Choose Deposit Method</h4>
            <div class="payment-methods-grid">
                ${Object.entries(this.depositMethods).map(([key, method]) => `
                    <div class="payment-method-card" data-method="${key}">
                        <div class="method-icon"><i class="fas ${this.getMethodIcon(key)}"></i></div>
                        <h5>${method.name}</h5>
                        <p>Fee: ${(method.fee * 100).toFixed(1)}%</p>
                        <p class="method-range">₦${method.minAmount.toLocaleString()} - ₦${method.maxAmount.toLocaleString()}</p>
                    </div>
                `).join('')}
            </div>
            <div id="deposit-form-container" style="display:none;"></div>
        </div>`;
    }
    getDepositFormHTML(method) {
        const methodData = this.depositMethods[method];
        const minAmount = window.app.formatCurrency(methodData.minAmount);
        const maxAmount = window.app.formatCurrency(methodData.maxAmount);
        
        let formFields = `
            <div class="form-group">
                <label>Amount (${window.app.getCurrencySymbol()})</label>
                <input type="number" id="deposit-amount" min="${methodData.minAmount}" max="${methodData.maxAmount}" step="0.01" required>
                <small class="form-hint">Range: ${minAmount} - ${maxAmount}</small>
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
            <button type="submit" class="btn-primary btn-full">Deposit ${window.app.formatCurrency(methodData.minAmount)}</button>
        </form>`;
    }

    // --- Withdraw Modal ---
    showWithdrawModal() {
        const modal = document.getElementById('deposit-modal');
        const content = document.getElementById('deposit-content');
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
    }
    processWithdrawal(form) {
        const method = form.querySelector('#withdrawal-method').value;
        const amount = parseFloat(form.querySelector('#withdrawal-amount').value);
        const methodData = this.withdrawalMethods[method];
        
        // Convert display amount to base currency for validation
        const amountBase = window.app.convertToBase(amount);
        const minAmountBase = window.app.convertToBase(methodData.minAmount);
        const userBalanceBase = window.app.currentUser.balance;
        
        if (!method || isNaN(amount) || amountBase < minAmountBase || amountBase > userBalanceBase) {
            window.app.showToast(`Invalid withdrawal amount. Range: ${window.app.formatCurrency(methodData.minAmount)} - ${window.app.formatCurrency(window.app.convertFromBase(userBalanceBase))}`, 'error');
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
            document.getElementById('deposit-modal').style.display = 'none';
        }, 1200);
    }
    getWithdrawHTML() {
        const user = window.app.currentUser;
        const userBalanceDisplay = window.app.formatCurrency(window.app.convertFromBase(user.balance));
        
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
                <input type="number" id="withdrawal-amount" min="1000" step="0.01" required>
                <small class="form-hint">Available: ${userBalanceDisplay}</small>
            </div>
            <div id="withdrawal-account-details" style="display:none;">
                <!-- Account details will be populated based on method -->
            </div>
            <button type="submit" class="btn-primary btn-full">Request Withdrawal</button>
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

    // --- Validation Methods ---
    validateDepositForm(form, method) {
        if (method === 'mobile-money') {
            const phone = form.querySelector('#deposit-phone').value;
            const network = form.querySelector('#deposit-network').value;
            
            if (!window.utils.validatePhone(phone)) {
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
            
            if (!window.utils.validateCardNumber(cardNumber)) {
                window.app.showToast('Please enter a valid card number', 'error');
                return false;
            }
            
            if (!window.utils.validateExpiryDate(expiry)) {
                window.app.showToast('Please enter a valid expiry date (MM/YY)', 'error');
                return false;
            }
            
            if (!window.utils.validateCVV(cvv)) {
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
            
            if (!window.utils.validatePhone(phone)) {
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
}

window.walletManager = new WalletManager();
