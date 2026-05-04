function showScrollableAlert(message, title = 'Notice') {
    const overlay = document.getElementById('alertModalOverlay');
    const msgEl = document.getElementById('alertModalMessage');
    const titleEl = document.querySelector('#alertModalOverlay .alert-modal-header h3');
    if (titleEl) titleEl.innerText = title;
    msgEl.innerText = message;
    overlay.classList.add('active');
}

// ====== VIRTUAL PASSPORT CARD — DATA BINDING ======
function safeGet(obj, key) {
    try { 
        return (obj && obj[key]) ? String(obj[key]) : null; 
    } catch(e) { 
        return null; 
    }
}

function bindCard() {
    var user = window.currentUser || null;
    var lsPrefix = 'rvp_';
    
    var domName = (function () {
        var el = document.querySelector('.user-name');
        return el ? el.textContent.replace(/[\u{1F44B}\s]/gu, '').trim() : null;
    })();
    
    var firstName = safeGet(user, 'firstName')
                 || localStorage.getItem(lsPrefix + 'firstName')
                 || domName
                 || 'CARDHOLDER';
    
    var lastName = safeGet(user, 'lastName')
                || localStorage.getItem(lsPrefix + 'lastName')
                || '';
    
    var fullName = (firstName + ' ' + lastName).trim().toUpperCase();
    
    var cardNumber = safeGet(user, 'cardNumber')
                  || localStorage.getItem(lsPrefix + 'cardNumber')
                  || (function () {
                       var seed = fullName.split('').reduce(function(a, c) { 
                           return a + c.charCodeAt(0); 
                       }, 0);
                       var rng = function(min, max) {
                           seed = (seed * 1664525 + 1013904223) & 0xffffffff;
                           return min + Math.abs(seed) % (max - min + 1);
                       };
                       return [rng(1000, 9999), rng(1000, 9999), rng(1000, 9999), rng(1000, 9999)].join(' ');
                   })();
    
    var expiry = safeGet(user, 'cardExpiry')
              || localStorage.getItem(lsPrefix + 'cardExpiry')
              || (function () {
                   var d = new Date();
                   var mm = String(d.getMonth() + 1).padStart(2, '0');
                   var yy = String(d.getFullYear() + 5).slice(-2);
                   return mm + '/' + yy;
                 })();
    
    var elHolder = document.getElementById('rvpCardHolder');
    var elNumber = document.getElementById('rvpCardNumber');
    var elExpiry = document.getElementById('rvpCardExpiry');
    
    if (elHolder) elHolder.textContent = fullName;
    if (elNumber) elNumber.textContent = cardNumber;
    if (elExpiry) elExpiry.textContent = expiry;
}
// ====== END VIRTUAL PASSPORT CARD JS ======

new Vue({
    el: '#walletApp',
    data: {
        balance: 0, checkins: 187, paymentModalVisible: false, refundModalVisible: false,
        depositModalVisible: false, withdrawModalVisible: false, boozeModalVisible: false,
        backOfficeModalVisible: false, depositAmount: '', withdrawAmount: '',
        refundRequest: { amount: '', transactionId: '', reason: '', details: '' },
        pendingPayment: { from: "Kiosk", amount: 0, reference: "" },
        securityPin: "", staffPin: "", toastVisible: false, toastMessage: "", toastTimer: null,
        currentKioskRequest: null, pollingInterval: null, walletAccountId: "", userName: "Guest", currentUser: null
    },
    computed: { vibeProgress() { return Math.min(100, (this.checkins / 500) * 100); } },
    mounted() {
        this.loadCurrentUser();
        this.listenForKioskPayments();
        this.startPolling();
        // Bind virtual passport card after user is loaded
        this.$nextTick(() => {
            if (this.currentUser) {
                window.currentUser = this.currentUser;
                bindCard();
            }
        });
    },
    beforeDestroy() { if (this.pollingInterval) clearInterval(this.pollingInterval); },
    methods: {
        formatPrice(p) { return p.toLocaleString('en-ZA', { minimumFractionDigits: 2 }); },
        showToast(msg, dur=2500) { if(this.toastTimer) clearTimeout(this.toastTimer); this.toastMessage=msg; this.toastVisible=true; this.toastTimer=setTimeout(()=>{this.toastVisible=false;},dur); },
        showAlert(msg, title='Notice') { showScrollableAlert(msg, title); },
        goToOrderNow() { window.location.href = 'cashless/order.html'; },
        getJwt() {
            return localStorage.getItem('token');
        },
        async callWalletMe() {
            const token = this.getJwt();
            if (!token) {
                this.showAlert("Missing JWT token in localStorage. Please login first.");
                return null;
            }
            const url = `${window.location.origin}/functions/v1/wallet-api/wallet/me`;
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                this.showAlert(data?.error || "Failed to load wallet");
                return null;
            }
            return data;
        },
        async callWalletTransaction({ type, amount, reference = null, description = null }) {
            const token = this.getJwt();
            if (!token) {
                this.showAlert("Missing JWT token in localStorage. Please login first.");
                return null;
            }
            const url = `${window.location.origin}/functions/v1/wallet-api/wallet/transaction`;
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ type, amount, reference, description })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                this.showAlert(data?.error || "Transaction failed");
                return null;
            }
            return data;
        },
        loadCurrentUser() {
            let currentUserId = localStorage.getItem('rands_current_user');
            let accounts = JSON.parse(localStorage.getItem('rands_accounts_v2') || '[]');
            if(!currentUserId && accounts.length) currentUserId = accounts[0].id;
            if(!accounts.length) accounts.push({ id: "0635713652", name: "Mziwonke KaBuyaphi", balance: 12580.50, status: "Active" });
            let user = accounts.find(acc => acc.id == currentUserId) || accounts[0];
            if(user) { 
                this.currentUser = user; 
                this.userName = user.name.split(' ')[0]; 
                this.balance = user.balance || 0; 
                this.walletAccountId = user.id;
                // Update window.currentUser for card binding
                window.currentUser = {
                    firstName: this.userName,
                    lastName: user.name.split(' ').slice(1).join(' ') || '',
                    cardNumber: localStorage.getItem('rvp_cardNumber') || null,
                    cardExpiry: localStorage.getItem('rvp_cardExpiry') || null
                };
            }
            localStorage.setItem('rands_accounts_v2', JSON.stringify(accounts));
            if(!localStorage.getItem('rands_current_user') && user) localStorage.setItem('rands_current_user', user.id);
            const nameEl = document.querySelector('.user-name'); 
            if(nameEl) nameEl.innerHTML = this.userName + ' 👋';
            // Bind card after user is loaded
            bindCard();
        },
        updateAccountBalance() {
            if(this.currentUser) {
                let accounts = JSON.parse(localStorage.getItem('rands_accounts_v2') || '[]');
                const idx = accounts.findIndex(acc => acc.id == this.currentUser.id);
                if(idx !== -1) { 
                    accounts[idx].balance = this.balance; 
                    localStorage.setItem('rands_accounts_v2', JSON.stringify(accounts)); 
                    this.currentUser.balance = this.balance;
                    // Update window.currentUser for card binding
                    if (window.currentUser) window.currentUser.balance = this.balance;
                }
            }
        },
        startPolling() {
            this.pollingInterval = setInterval(() => {
                const pending = localStorage.getItem('rands_payment_request');
                if(pending) {
                    const req = JSON.parse(pending);
                    if(req.accountId === this.walletAccountId && Date.now() - req.timestamp < 120000 && req.status === 'pending' && !this.paymentModalVisible)
                        this.showKioskPaymentModal(req);
                    else if(req.accountId !== this.walletAccountId || Date.now() - req.timestamp >= 120000) localStorage.removeItem('rands_payment_request');
                }
            }, 2000);
        },
        manualCheckForPayments() {
            const pending = localStorage.getItem('rands_payment_request');
            if(pending) {
                const req = JSON.parse(pending);
                if(req.accountId === this.walletAccountId && Date.now() - req.timestamp < 120000) this.showKioskPaymentModal(req);
                else this.showAlert("No valid pending payment found");
            } else this.showAlert("No pending payment requests");
        },
        listenForKioskPayments() {
            window.addEventListener('storage', (e) => {
                if(e.key === 'rands_payment_request' && e.newValue) {
                    const req = JSON.parse(e.newValue);
                    if(req.accountId === this.walletAccountId && req.status === 'pending') this.showKioskPaymentModal(req);
                }
            });
            const existing = localStorage.getItem('rands_payment_request');
            if(existing) { const req = JSON.parse(existing); if(req.accountId === this.walletAccountId && req.status === 'pending') this.showKioskPaymentModal(req); }
        },
        showKioskPaymentModal(req) {
            if(req.accountId !== this.walletAccountId) return;
            this.currentKioskRequest = req;
            this.pendingPayment = { from: req.from, amount: req.amount, reference: req.reference, requestId: req.id };
            this.securityPin = "";
            this.paymentModalVisible = true;
            setTimeout(() => { if(this.$refs.pinInput) this.$refs.pinInput.focus(); }, 400);
            this.showToast(`Payment request: R${req.amount.toFixed(2)}`, 5000);
        },
        async approvePayment() {
            if (!this.securityPin || this.securityPin.length < 4) { this.showAlert("Enter 4-digit PIN"); return; }
            
            if (this.securityPin === "1989" || this.securityPin.length === 4) {
                if (!this.currentKioskRequest) { this.showAlert("No payment request"); return; }
                
                if (this.balance < this.pendingPayment.amount) {
                    this.showAlert("Insufficient balance");
                    this.declinePayment();
                    return;
                }
                
                const req = this.currentKioskRequest;
                
                const result = await this.callWalletTransaction({
                    type: "debit",
                    amount: Number(this.pendingPayment.amount),
                    reference: req.reference ?? null,
                    description: `Kiosk payment (${req.from ?? 'Kiosk'})`
                });
                
                if (!result) return;
                
                localStorage.removeItem('rands_payment_request');
                localStorage.setItem('rands_payment_approved', JSON.stringify({
                    requestId: this.pendingPayment.requestId,
                    approved: true,
                    timestamp: Date.now()
                }));
                
                const me = await this.callWalletMe();
                if (me?.wallet) this.balance = me.wallet.balance ?? 0;
                
                this.showAlert(`Payment approved! New balance: R${this.balance.toFixed(2)}`);
                this.paymentModalVisible = false;
                this.securityPin = "";
                this.currentKioskRequest = null;
            } else {
                this.showAlert("Invalid PIN");
                this.securityPin = "";
            }
        },
        declinePayment() {
            if(this.currentKioskRequest) localStorage.setItem('rands_payment_approved', JSON.stringify({ requestId: this.pendingPayment.requestId, approved: false, timestamp: Date.now() }));
            localStorage.removeItem('rands_payment_request');
            this.paymentModalVisible = false; this.securityPin = ""; this.currentKioskRequest = null;
            this.showAlert("Payment declined");
        },
        openDepositModal() { this.depositAmount = ''; this.depositModalVisible = true; },
        closeDepositModal() { this.depositModalVisible = false; },
        async processDeposit() {
            const amt = parseFloat(this.depositAmount);
            if (isNaN(amt) || amt <= 0){ this.showAlert("Valid amount"); return; }
            
            const result = await this.callWalletTransaction({
                type: "credit",
                amount: amt,
                reference: null,
                description: "Deposit"
            });
            
            if (!result) return;
            
            const me = await this.callWalletMe();
            if (me?.wallet) this.balance = me.wallet.balance ?? 0;
            
            this.showAlert(`Deposited R${amt.toFixed(2)}`);
            this.closeDepositModal();
        },
        openWithdrawModal() { this.withdrawAmount = ''; this.withdrawModalVisible = true; },
        closeWithdrawModal() { this.withdrawModalVisible = false; },
        async processWithdraw() {
            const amt = parseFloat(this.withdrawAmount);
            if (isNaN(amt) || amt <= 0 || amt > this.balance){ this.showAlert("Invalid or insufficient funds"); return; }
            
            const result = await this.callWalletTransaction({
                type: "debit",
                amount: amt,
                reference: null,
                description: "Withdraw"
            });
            
            if (!result) return;
            
            const me = await this.callWalletMe();
            if (me?.wallet) this.balance = me.wallet.balance ?? 0;
            
            this.showAlert(`Withdrew R${amt.toFixed(2)}`);
            this.closeWithdrawModal();
        },
        openBackOfficeModal() { this.staffPin = ""; this.backOfficeModalVisible = true; setTimeout(()=>{if(this.$refs.staffPinInput)this.$refs.staffPinInput.focus();},300); },
        closeBackOfficeModal() { this.backOfficeModalVisible = false; },
        confirmBackOfficeAccess() { if(this.staffPin === "randscapetown") { this.showToast("Access granted"); this.closeBackOfficeModal(); setTimeout(()=>{ window.location.href = "event-manager.html"; },500); } else { this.showAlert("Access denied"); this.staffPin=""; } },
        openShishaModal() {
            document.getElementById('shishaModalOverlay').classList.add('active');
            const btn = document.getElementById('shishaPlaceOrderBtn');
            if(btn) btn.onclick = () => { if(this.balance>=260){ this.balance-=260; this.updateAccountBalance(); this.showAlert("Hookah ordered! R260 deducted"); document.getElementById('shishaWalletBalance').innerText=`R${this.balance.toFixed(2)}`; } else this.showAlert("Insufficient balance"); };
            document.getElementById('shishaWalletBalance').innerText=`R${this.balance.toFixed(2)}`;
        },
        openBoozeModal() { this.boozeModalVisible = true; },
        closeBoozeModal() { this.boozeModalVisible = false; },
        selectBoozeOption(opt) { this.closeBoozeModal(); this.showAlert(`${opt === 'keep' ? 'Keep Booze' : 'Collect Booze'} feature coming soon`); },
        openVVIPModal() { this.initVVIPBand(); document.getElementById('vvipModalOverlay').classList.add('active'); },
        initVVIPBand() {
            const acc = this.currentUser;
            if(acc) {
                let bands = JSON.parse(localStorage.getItem('vvip_bands') || '{}');
                if(!bands[acc.id]) bands[acc.id] = { bandId: `SVRGN-${acc.id.slice(-5)}-${Math.floor(Math.random()*9000+1000)}`, accountId: acc.id };
                localStorage.setItem('vvip_bands', JSON.stringify(bands));
                document.getElementById('vvipBandNumber').innerText = bands[acc.id].bandId;
                document.getElementById('printVVIPBandBtn').onclick = () => { this.showAlert(`Band ${bands[acc.id].bandId} forged!`); };
            }
        },
        openRefundModal() { this.refundRequest = { amount: '', transactionId: '', reason: '', details: '' }; this.refundModalVisible = true; },
        closeRefundModal() { this.refundModalVisible = false; },
        submitRefundRequest() {
            if(!this.refundRequest.amount || parseFloat(this.refundRequest.amount)<=0) { this.showAlert("Valid amount required"); return; }
            if(parseFloat(this.refundRequest.amount) > this.balance) { this.showAlert("Amount exceeds balance"); return; }
            if(!this.refundRequest.transactionId) { this.showAlert("Transaction ID required"); return; }
            const refundData = { id: Date.now(), userId: this.currentUser?.id, userPhone: this.currentUser?.phone || this.currentUser?.id, amount: parseFloat(this.refundRequest.amount), transactionId: this.refundRequest.transactionId, reason: this.refundRequest.reason, details: this.refundRequest.details, status: 'pending', dateSubmitted: new Date().toISOString() };
            let pending = JSON.parse(localStorage.getItem('rands_refund_requests') || '[]');
            pending.push(refundData);
            localStorage.setItem('rands_refund_requests', JSON.stringify(pending));
            this.showAlert(`Refund request of R${refundData.amount.toFixed(2)} submitted for admin review`);
            this.closeRefundModal();
        },
        checkInEvent() { let nc = this.checkins + 1; if(nc>500){this.showAlert("Max vibe reached!");return;} this.checkins=nc; this.showAlert(`Checked in! Vibe: ${this.checkins}/500`); },
        closeModal() { this.paymentModalVisible = false; this.securityPin = ""; }
    }
});

// Ensure card binding runs when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindCard);
} else {
    bindCard();
}