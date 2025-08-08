// SpinX Wallet Manager
class WalletManager {
    constructor() {
        this.pendingWithdrawals = this.loadPendingWithdrawals();
        this.depositMethods = {
            'mobile-money': {
                name: 'Mobile Money',
                providers: ['MTN', 'Airtel', 'Glo', '9mobile'],
                fee: 0.03,
                minAmount: 100,
                maxAmount: 500000
            },
            'card': {
                name: 'Debit/Credit Card',
                providers: ['Visa', 'Mastercard', 'Verve'],
                fee: 0.035,
                minAmount: 100,
                maxAmount: 1000000
            },
            'crypto': {
                name: 'Cryptocurrency',
                providers: ['Bitcoin', 'USDT', 'Ethereum'],
                fee: 0.025,
                minAmount: 1000,
                maxAmount: 10000000
            }
        };
        this.withdrawalMethods = {
            'mobile-money': {
                name: 'Mobile Money',
                fee: 0.03,
                minAmount: 1000,
                maxAmount: 500000,
                processingTime: '5-10 minutes'
            },
            'bank': {
                name: 'Bank Transfer',
                fee: 0.05,
                minAmount: 2000,
                maxAmount: 1000000,
                processingTime: '1-3 business days'
            }
        };
    }

    loadPendingWithdrawals() {
        const withdrawals = localStorage.getItem('spinx_withdrawals');
        return withdrawals ? JSON.parse(withdrawals) : [];
    }

    savePendingWithdrawals() {
        localStorage.setItem('spinx_withdrawals', JSON.stringify(this.pendingWithdrawals));
    }

    openDepositModal() {
        const modal = document.getElementById('deposit-modal');
        const content = document.getElementById('deposit-content');
        
        content.innerHTML = this.getDepositHTML();
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    openWithdrawModal() {
        const modal = document.getElementById('deposit-modal');
        const modalHeader = modal.querySelector('.modal-header h3');
        const content = document.getElementById('deposit-content');
        
        modalHeader.textContent = 'Withdraw Funds';
        content.innerHTML = this.getWithdrawHTML();
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    getDepositHTML() {
        return `
            <div class="deposit-container">
                <div class="deposit-methods">
                    <h4>Choose Deposit Method</h4>
                    <div class="payment-methods-grid">
                        ${Object.entries(this.depositMethods).map(([key, method]) => `
                            <div class="payment-method-card" onclick="walletManager.selectDepositMethod('${key}')">
                                <div class="method-icon">
                                    <i class="fas ${this.getMethodIcon(key)}"></i>
                                </div>
                                <h5>${method.name}</h5>
                                <p>Fee: ${(method.fee * 100).toFixed(1)}%</p>
                                <p class="method-range">₦${method.minAmount.toLocaleString()} - ₦${method.maxAmount.toLocaleString()}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div id="deposit-form-container" style="display: none;">
                    <!-- Deposit form will be loaded here -->
                </div>
            </div>
        `;
    }

    getWithdrawHTML() {
        const user = window.app.currentUser;
        const kycRequired = user.kycStatus !== 'verified';
        
        if (kycRequired) {
            return `
                <div class="kyc-required">
                    <div class="warning-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>KYC Verification Required</h4>
                        <p>You need to complete KYC verification before you can withdraw funds.</p>
                        <button class="btn-primary" onclick="window.app.openKYCModal(); window.app.closeModal('deposit-modal');">
                            Complete KYC
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="withdraw-container">
                <div class="current-balance">
                    <h4>Available Balance</h4>
                    <div class="balance-amount">${window.app.formatCurrency(user.balance)}</div>
                </div>

                <form id="withdrawal-form" onsubmit="walletManager.processWithdrawal(event)">
                    <div class="form-group">
                        <label>Withdrawal Method</label>
                        <select id="withdrawal-method" onchange="walletManager.updateWithdrawalLimits()" required>
                            <option value="">Select method</option>
                            ${Object.entries(this.withdrawalMethods).map(([key, method]) => `
                                <option value="${key}">${method.name} (Fee: ${(method.fee * 100).toFixed(1)}%)</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Amount</label>
                        <input type="number" id="withdrawal-amount" placeholder="Enter amount" min="1000" max="${user.balance}" required>
                        <small id="withdrawal-limits">Select a method to see limits</small>
                    </div>

                    <div class="form-group" id="account-details-group" style="display: none;">
                        <!-- Account details will be shown based on method -->
                    </div>

                    <div class="withdrawal-summary" id="withdrawal-summary" style="display: none;">
                        <!-- Summary will be shown here -->
                    </div>

                    <button type="submit" class="btn-primary btn-full">Request Withdrawal</button>
                </form>

                <div class="pending-withdrawals" id="pending-withdrawals">
                    ${this.getPendingWithdrawalsHTML()}
                </div>
            </div>
        `;
    }

    getPendingWithdrawalsHTML() {
        const userWithdrawals = this.pendingWithdrawals.filter(w => w.userId === window.app.currentUser.id);
        
        if (userWithdrawals.length === 0) {
            return '<div class="no-pending"><p>No pending withdrawals</p></div>';
        }

        return `
            <div class="pending-list">
                <h4>Pending Withdrawals</h4>
                ${userWithdrawals.map(withdrawal => `
                    <div class="pending-item">
                        <div class="pending-info">
                            <span class="amount">${window.app.formatCurrency(withdrawal.amount)}</span>
                            <span class="method">${withdrawal.method}</span>
                            <span class="date">${new Date(withdrawal.date).toLocaleDateString()}</span>
                        </div>
                        <span class="status ${withdrawal.status}">${withdrawal.status}</span>
                    </div>
                `).join('')}
            </div>
        `;
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

    selectDepositMethod(method) {
        const container = document.getElementById('deposit-form-container');
        container.innerHTML = this.getDepositFormHTML(method);
        container.style.display = 'block';
        
        // Scroll to form
        container.scrollIntoView({ behavior: 'smooth' });
    }

    getDepositFormHTML(method) {
        const methodData = this.depositMethods[method];
        
        return `
            <div class="deposit-form">
                <div class="method-header">
                    <button class="back-btn" onclick="walletManager.backToDepositMethods()">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <h4>Deposit via ${methodData.name}</h4>
                </div>

                <form id="deposit-form" onsubmit="walletManager.processDeposit(event, '${method}')">
                    <div class="form-group">
                        <label>Amount</label>
                        <input type="number" id="deposit-amount" placeholder="Enter amount" 
                               min="${methodData.minAmount}" max="${methodData.maxAmount}" required>
                        <small>Min: ₦${methodData.minAmount.toLocaleString()} - Max: ₦${methodData.maxAmount.toLocaleString()}</small>
                    </div>

                    ${this.getMethodSpecificFields(method)}

                    <div class="deposit-summary" id="deposit-summary">
                        <div class="summary-row">
                            <span>Amount:</span>
                            <span id="summary-amount">₦0</span>
                        </div>
                        <div class="summary-row">
                            <span>Fee (${(methodData.fee * 100).toFixed(1)}%):</span>
                            <span id="summary-fee">₦0</span>
                        </div>
                        <div class="summary-row total">
                            <span>Total to Pay:</span>
                            <span id="summary-total">₦0</span>
                        </div>
                        <div class="summary-row">
                            <span>You will receive:</span>
                            <span id="summary-receive">₦0</span>
                        </div>
                    </div>

                    <button type="submit" class="btn-primary btn-full">Proceed to Payment</button>
                </form>
            </div>
        `;
    }

    getMethodSpecificFields(method) {
        switch (method) {
            case 'mobile-money':
                return `
                    <div class="form-group">
                        <label>Mobile Network</label>
                        <select id="mobile-network" required>
                            <option value="">Select network</option>
                            <option value="mtn">MTN</option>
                            <option value="airtel">Airtel</option>
                            <option value="glo">Glo</option>
                            <option value="9mobile">9mobile</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="tel" id="mobile-phone" placeholder="08012345678" required>
                    </div>
                `;
            
            case 'card':
                return `
                    <div class="form-group">
                        <label>Card Number</label>
                        <input type="text" id="card-number" placeholder="1234 5678 9012 3456" 
                               pattern="[0-9\s]{13,19}" maxlength="19" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Expiry Date</label>
                            <input type="text" id="card-expiry" placeholder="MM/YY" 
                                   pattern="[0-9]{2}/[0-9]{2}" maxlength="5" required>
                        </div>
                        <div class="form-group">
                            <label>CVV</label>
                            <input type="text" id="card-cvv" placeholder="123" 
                                   pattern="[0-9]{3,4}" maxlength="4" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Card Holder Name</label>
                        <input type="text" id="card-name" placeholder="John Doe" required>
                    </div>
                `;
            
            case 'crypto':
                return `
                    <div class="form-group">
                        <label>Cryptocurrency</label>
                        <select id="crypto-type" required>
                            <option value="">Select cryptocurrency</option>
                            <option value="btc">Bitcoin (BTC)</option>
                            <option value="usdt">Tether (USDT)</option>
                            <option value="eth">Ethereum (ETH)</option>
                        </select>
                    </div>
                    <div class="crypto-info">
                        <p><i class="fas fa-info-circle"></i> You will be provided with a wallet address to send your cryptocurrency to.</p>
                    </div>
                `;
            
            default:
                return '';
        }
    }

    backToDepositMethods() {
        const container = document.getElementById('deposit-form-container');
        container.style.display = 'none';
    }

    updateWithdrawalLimits() {
        const methodSelect = document.getElementById('withdrawal-method');
        const amountInput = document.getElementById('withdrawal-amount');
        const limitsText = document.getElementById('withdrawal-limits');
        const accountGroup = document.getElementById('account-details-group');
        
        const method = methodSelect.value;
        
        if (!method) {
            limitsText.textContent = 'Select a method to see limits';
            accountGroup.style.display = 'none';
            return;
        }
        
        const methodData = this.withdrawalMethods[method];
        amountInput.min = methodData.minAmount;
        amountInput.max = window.app.currentUser.balance;
        
        limitsText.innerHTML = `
            Min: ₦${methodData.minAmount.toLocaleString()} - Max: ₦${window.app.currentUser.balance.toLocaleString()}<br>
            Processing time: ${methodData.processingTime}
        `;
        
        // Show account details form
        accountGroup.innerHTML = this.getWithdrawalAccountFields(method);
        accountGroup.style.display = 'block';
        
        // Update summary when amount changes
        amountInput.oninput = () => this.updateWithdrawalSummary();
    }

    getWithdrawalAccountFields(method) {
        switch (method) {
            case 'mobile-money':
                return `
                    <label>Mobile Money Details</label>
                    <select id="withdrawal-network" required>
                        <option value="">Select network</option>
                        <option value="mtn">MTN</option>
                        <option value="airtel">Airtel</option>
                        <option value="glo">Glo</option>
                        <option value="9mobile">9mobile</option>
                    </select>
                    <input type="tel" id="withdrawal-phone" placeholder="Phone number" required>
                `;
            
            case 'bank':
                return `
                    <label>Bank Account Details</label>
                    <input type="text" id="withdrawal-bank" placeholder="Bank name" required>
                    <input type="text" id="withdrawal-account-number" placeholder="Account number" required>
                    <input type="text" id="withdrawal-account-name" placeholder="Account name" required>
                `;
            
            default:
                return '';
        }
    }

    updateWithdrawalSummary() {
        const method = document.getElementById('withdrawal-method').value;
        const amount = parseFloat(document.getElementById('withdrawal-amount').value) || 0;
        
        if (!method || amount <= 0) {
            document.getElementById('withdrawal-summary').style.display = 'none';
            return;
        }
        
        const methodData = this.withdrawalMethods[method];
        const fee = amount * methodData.fee;
        const total = amount - fee;
        
        const summaryDiv = document.getElementById('withdrawal-summary');
        summaryDiv.innerHTML = `
            <div class="summary-row">
                <span>Withdrawal Amount:</span>
                <span>₦${amount.toLocaleString()}</span>
            </div>
            <div class="summary-row">
                <span>Fee (${(methodData.fee * 100).toFixed(1)}%):</span>
                <span>-₦${fee.toLocaleString()}</span>
            </div>
            <div class="summary-row total">
                <span>You will receive:</span>
                <span>₦${total.toLocaleString()}</span>
            </div>
        `;
        summaryDiv.style.display = 'block';
    }

    async processDeposit(event, method) {
        event.preventDefault();
        
        const amount = parseFloat(document.getElementById('deposit-amount').value);
        const methodData = this.depositMethods[method];
        
        if (amount < methodData.minAmount || amount > methodData.maxAmount) {
            window.app.showToast(`Amount must be between ₦${methodData.minAmount.toLocaleString()} and ₦${methodData.maxAmount.toLocaleString()}`, 'error');
            return;
        }
        
        const fee = amount * methodData.fee;
        const totalToPay = amount + fee;
        
        // Validate method-specific fields
        if (!this.validateDepositForm(method)) {
            return;
        }
        
        // Show loading
        window.app.showLoading();
        
        // Simulate payment processing
        setTimeout(() => {
            const success = Math.random() > 0.1; // 90% success rate for demo
            
            window.app.hideLoading();
            
            if (success) {
                // Process successful deposit
                window.authManager.updateUserBalance(
                    window.app.currentUser.id,
                    amount,
                    'deposit',
                    `${methodData.name} deposit`,
                    `DEP_${Date.now()}`
                );
                
                // Process referral if applicable
                if (window.app.currentUser.referredBy) {
                    window.authManager.processReferral(window.app.currentUser.id, amount);
                }
                
                window.app.showToast(`Deposit successful! ₦${amount.toLocaleString()} added to your account`, 'success');
                window.app.closeModal('deposit-modal');
                
                // Reset form
                document.getElementById('deposit-form').reset();
            } else {
                window.app.showToast('Deposit failed. Please try again or contact support.', 'error');
            }
        }, 2000);
    }

    validateDepositForm(method) {
        switch (method) {
            case 'mobile-money':
                const network = document.getElementById('mobile-network').value;
                const phone = document.getElementById('mobile-phone').value;
                
                if (!network) {
                    window.app.showToast('Please select a mobile network', 'error');
                    return false;
                }
                
                if (!phone || !/^[0-9]{11}$/.test(phone.replace(/\s/g, ''))) {
                    window.app.showToast('Please enter a valid phone number', 'error');
                    return false;
                }
                break;
                
            case 'card':
                const cardNumber = document.getElementById('card-number').value;
                const expiry = document.getElementById('card-expiry').value;
                const cvv = document.getElementById('card-cvv').value;
                const name = document.getElementById('card-name').value;
                
                if (!cardNumber || !/^[0-9\s]{13,19}$/.test(cardNumber)) {
                    window.app.showToast('Please enter a valid card number', 'error');
                    return false;
                }
                
                if (!expiry || !/^[0-9]{2}\/[0-9]{2}$/.test(expiry)) {
                    window.app.showToast('Please enter a valid expiry date (MM/YY)', 'error');
                    return false;
                }
                
                if (!cvv || !/^[0-9]{3,4}$/.test(cvv)) {
                    window.app.showToast('Please enter a valid CVV', 'error');
                    return false;
                }
                
                if (!name || name.trim().length < 2) {
                    window.app.showToast('Please enter the card holder name', 'error');
                    return false;
                }
                break;
                
            case 'crypto':
                const cryptoType = document.getElementById('crypto-type').value;
                
                if (!cryptoType) {
                    window.app.showToast('Please select a cryptocurrency', 'error');
                    return false;
                }
                break;
        }
        
        return true;
    }

    async processWithdrawal(event) {
        event.preventDefault();
        
        const method = document.getElementById('withdrawal-method').value;
        const amount = parseFloat(document.getElementById('withdrawal-amount').value);
        const user = window.app.currentUser;
        
        if (!method) {
            window.app.showToast('Please select a withdrawal method', 'error');
            return;
        }
        
        const methodData = this.withdrawalMethods[method];
        
        if (amount < methodData.minAmount) {
            window.app.showToast(`Minimum withdrawal amount is ₦${methodData.minAmount.toLocaleString()}`, 'error');
            return;
        }
        
        if (amount > user.balance) {
            window.app.showToast('Insufficient balance', 'error');
            return;
        }
        
        // Validate account details
        if (!this.validateWithdrawalForm(method)) {
            return;
        }
        
        const fee = amount * methodData.fee;
        const finalAmount = amount - fee;
        
        // Create withdrawal request
        const withdrawal = {
            id: `WD_${Date.now()}`,
            userId: user.id,
            username: user.username,
            method: methodData.name,
            amount: amount,
            fee: fee,
            finalAmount: finalAmount,
            accountDetails: this.getWithdrawalAccountDetails(method),
            status: 'pending',
            date: new Date().toISOString(),
            reference: `WD_${Date.now()}`
        };
        
        // Add to pending withdrawals
        this.pendingWithdrawals.push(withdrawal);
        this.savePendingWithdrawals();
        
        // Deduct amount from balance (will be returned if withdrawal is rejected)
        window.authManager.updateUserBalance(
            user.id,
            -amount,
            'withdrawal',
            `Withdrawal request (${methodData.name})`,
            withdrawal.reference
        );
        
        window.app.showToast('Withdrawal request submitted successfully. You will be notified when processed.', 'success');
        window.app.closeModal('deposit-modal');
        
        // Update pending withdrawals display
        this.updatePendingWithdrawalsDisplay();
    }

    validateWithdrawalForm(method) {
        switch (method) {
            case 'mobile-money':
                const network = document.getElementById('withdrawal-network').value;
                const phone = document.getElementById('withdrawal-phone').value;
                
                if (!network) {
                    window.app.showToast('Please select a mobile network', 'error');
                    return false;
                }
                
                if (!phone || !/^[0-9]{11}$/.test(phone.replace(/\s/g, ''))) {
                    window.app.showToast('Please enter a valid phone number', 'error');
                    return false;
                }
                break;
                
            case 'bank':
                const bank = document.getElementById('withdrawal-bank').value;
                const accountNumber = document.getElementById('withdrawal-account-number').value;
                const accountName = document.getElementById('withdrawal-account-name').value;
                
                if (!bank || bank.trim().length < 2) {
                    window.app.showToast('Please enter the bank name', 'error');
                    return false;
                }
                
                if (!accountNumber || !/^[0-9]{10}$/.test(accountNumber)) {
                    window.app.showToast('Please enter a valid 10-digit account number', 'error');
                    return false;
                }
                
                if (!accountName || accountName.trim().length < 2) {
                    window.app.showToast('Please enter the account name', 'error');
                    return false;
                }
                break;
        }
        
        return true;
    }

    getWithdrawalAccountDetails(method) {
        switch (method) {
            case 'mobile-money':
                return {
                    network: document.getElementById('withdrawal-network').value,
                    phone: document.getElementById('withdrawal-phone').value
                };
                
            case 'bank':
                return {
                    bank: document.getElementById('withdrawal-bank').value,
                    accountNumber: document.getElementById('withdrawal-account-number').value,
                    accountName: document.getElementById('withdrawal-account-name').value
                };
                
            default:
                return {};
        }
    }

    updatePendingWithdrawalsDisplay() {
        const container = document.getElementById('pending-withdrawals');
        if (container) {
            container.innerHTML = this.getPendingWithdrawalsHTML();
        }
    }

    // Admin functions for processing withdrawals
    approveWithdrawal(withdrawalId) {
        const withdrawal = this.pendingWithdrawals.find(w => w.id === withdrawalId);
        if (!withdrawal) return false;
        
        withdrawal.status = 'approved';
        withdrawal.processedAt = new Date().toISOString();
        
        this.savePendingWithdrawals();
        
        // In a real app, this would trigger the actual payment
        window.app.showToast(`Withdrawal ${withdrawalId} approved`, 'success');
        
        return true;
    }

    rejectWithdrawal(withdrawalId, reason) {
        const withdrawal = this.pendingWithdrawals.find(w => w.id === withdrawalId);
        if (!withdrawal) return false;
        
        withdrawal.status = 'rejected';
        withdrawal.rejectionReason = reason;
        withdrawal.processedAt = new Date().toISOString();
        
        // Refund the amount to user's balance
        window.authManager.updateUserBalance(
            withdrawal.userId,
            withdrawal.amount,
            'refund',
            `Withdrawal refund: ${reason}`,
            `REF_${withdrawalId}`
        );
        
        this.savePendingWithdrawals();
        
        window.app.showToast(`Withdrawal ${withdrawalId} rejected and refunded`, 'success');
        
        return true;
    }

    getAllWithdrawals() {
        return this.pendingWithdrawals;
    }
}

// Initialize wallet manager
document.addEventListener('DOMContentLoaded', () => {
    window.walletManager = new WalletManager();
    
    // Add event listeners for deposit amount changes
    document.addEventListener('input', (e) => {
        if (e.target.id === 'deposit-amount') {
            walletManager.updateDepositSummary();
        }
    });
});

// Additional global functions
function updateDepositSummary() {
    const amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
    const method = document.querySelector('form[onsubmit*="processDeposit"]')?.getAttribute('onsubmit')?.match(/'([^']+)'/)?.[1];
    
    if (!method || amount <= 0) return;
    
    const methodData = window.walletManager.depositMethods[method];
    const fee = amount * methodData.fee;
    const total = amount + fee;
    
    document.getElementById('summary-amount').textContent = `₦${amount.toLocaleString()}`;
    document.getElementById('summary-fee').textContent = `₦${fee.toLocaleString()}`;
    document.getElementById('summary-total').textContent = `₦${total.toLocaleString()}`;
    document.getElementById('summary-receive').textContent = `₦${amount.toLocaleString()}`;
}

// Format card number input
document.addEventListener('input', (e) => {
    if (e.target.id === 'card-number') {
        let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        let matches = value.match(/\d{4,16}/g);
        let match = matches && matches[0] || '';
        let parts = [];
        for (let i = 0; i < match.length; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            e.target.value = parts.join(' ');
        } else {
            e.target.value = value;
        }
    }
    
    if (e.target.id === 'card-expiry') {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletManager;
}
