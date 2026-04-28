// ─── Storage ───────────────────────────────────────────────────
const TENANTS_KEY   = 'qless_tenants';
const STAFF_KEY     = 'qless_staff';
const CUSTOMERS_KEY = 'rands_customers';

function loadTenants() {
    const s = localStorage.getItem(TENANTS_KEY);
    if (s) return JSON.parse(s);
    const d = [
        { id:1, businessName:'Skyline Lounge',  ownerName:'Thabo Nkosi',    username:'skyline_admin', password:'skyline123', status:'Active' },
        { id:2, businessName:'Cape Tavern',     ownerName:'Lerato Dlamini', username:'capetavern',    password:'tavern456',  status:'Active' },
        { id:3, businessName:'Gold Reef Venue', ownerName:'Sipho Mbele',    username:'goldreef',      password:'reef789',    status:'Active' }
    ];
    localStorage.setItem(TENANTS_KEY, JSON.stringify(d));
    return d;
}

function loadStaff() {
    const s = localStorage.getItem(STAFF_KEY);
    if (s) return JSON.parse(s);
    const d = [
        { id:1, tenantId:1, name:'John Doe',     username:'john_skyline', password:'staff123', role:'bartender', status:'Active' },
        { id:2, tenantId:2, name:'Jane Smith',   username:'jane_cape',    password:'staff456', role:'manager',   status:'Active' },
        { id:3, tenantId:3, name:'Mike Johnson', username:'mike_gold',    password:'staff789', role:'security',  status:'Active' }
    ];
    localStorage.setItem(STAFF_KEY, JSON.stringify(d));
    return d;
}

function loadCustomers() {
    const s = localStorage.getItem(CUSTOMERS_KEY);
    return s ? JSON.parse(s) : [];
}

// ─── Toast ─────────────────────────────────────────────────────
function showToast(msg, type='info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `show ${type}`;
    clearTimeout(t._t);
    t._t = setTimeout(() => t.className = '', 2700);
}

// ─── Session check (redirect if already logged in) ─────────────
(function() {
    const loggedIn = sessionStorage.getItem('qless_logged_in');
    const role     = sessionStorage.getItem('qless_user_role');
    if (loggedIn === 'true' && role && typeof RouteGuard !== 'undefined') {
        RouteGuard.redirectByRole(role);
    }
})();

// ─── PIN state ─────────────────────────────────────────────────
let customerPin = '';

function updatePinDots() {
    for (let i = 0; i < 4; i++) {
        document.getElementById(`dot-${i}`).classList.toggle('filled', i < customerPin.length);
    }
}

document.querySelectorAll('.pin-key').forEach(key => {
    key.addEventListener('click', () => {
        const k = key.dataset.k;
        if (k === 'del') {
            customerPin = customerPin.slice(0, -1);
        } else if (customerPin.length < 4) {
            customerPin += k;
            if (customerPin.length === 4) {
                setTimeout(() => document.getElementById('loginBtn').click(), 320);
            }
        }
        updatePinDots();
    });
});

// ========== PIN ATTEMPT & LOCK LOGIC (localStorage) ==========
const MAX_PIN_ATTEMPTS = 3;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Storage keys suffixes
function getAttemptsKey(phone) { return `pin_attempts_${phone}`; }
function getLockUntilKey(phone) { return `lock_until_${phone}`; }

function getAttempts(phone) {
    const val = localStorage.getItem(getAttemptsKey(phone));
    return val ? parseInt(val, 10) : 0;
}

function setAttempts(phone, attempts) {
    localStorage.setItem(getAttemptsKey(phone), attempts.toString());
}

function getLockUntil(phone) {
    const val = localStorage.getItem(getLockUntilKey(phone));
    return val ? new Date(val) : null;
}

function setLockUntil(phone, lockUntilDate) {
    if (lockUntilDate) {
        localStorage.setItem(getLockUntilKey(phone), lockUntilDate.toISOString());
    } else {
        localStorage.removeItem(getLockUntilKey(phone));
    }
}

function resetLock(phone) {
    setAttempts(phone, 0);
    setLockUntil(phone, null);
}

function isAccountLocked(phone) {
    const lockUntil = getLockUntil(phone);
    if (!lockUntil) return false;
    const now = new Date();
    return now < lockUntil;
}

function getRemainingLockSeconds(phone) {
    const lockUntil = getLockUntil(phone);
    if (!lockUntil) return 0;
    const diffMs = lockUntil - new Date();
    return Math.max(0, Math.floor(diffMs / 1000));
}

// UI elements
const pinErrorEl = document.getElementById('pinError');
const lockTimerEl = document.getElementById('lockTimer');
const loginBtn = document.getElementById('loginBtn');
const pinInputHidden = document.getElementById('pin'); // hidden, but used for spec
const pinKeys = document.querySelectorAll('.pin-key');

let lockCheckInterval = null;
let currentLockedPhone = null;

function updateUILockState(locked) {
    // Disable/enable pin pad keys
    pinKeys.forEach(btn => {
        if (locked) {
            btn.setAttribute('disabled', 'disabled');
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        } else {
            btn.removeAttribute('disabled');
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
        }
    });
    // Disable/enable login button
    if (loginBtn) loginBtn.disabled = locked;
    // The hidden PIN input doesn't need interaction
}

function clearLockTimerDisplay() {
    if (lockTimerEl) {
        lockTimerEl.style.display = 'none';
        lockTimerEl.textContent = '';
    }
    if (pinErrorEl) pinErrorEl.style.display = 'none';
}

function showLockTimer(phone) {
    const remaining = getRemainingLockSeconds(phone);
    if (remaining <= 0) {
        // Lock expired
        if (currentLockedPhone === phone) {
            stopLockTimer();
            updateUILockState(false);
            clearLockTimerDisplay();
            if (pinErrorEl) pinErrorEl.style.display = 'none';
        }
        return;
    }
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (lockTimerEl) {
        lockTimerEl.style.display = 'block';
        lockTimerEl.textContent = `🔒 Locked. Try again in ${timeStr}`;
    }
}

function stopLockTimer() {
    if (lockCheckInterval) {
        clearInterval(lockCheckInterval);
        lockCheckInterval = null;
    }
    currentLockedPhone = null;
    if (lockTimerEl) lockTimerEl.style.display = 'none';
}

function startLockTimer(phone) {
    stopLockTimer();
    currentLockedPhone = phone;
    // Immediately show timer
    showLockTimer(phone);
    lockCheckInterval = setInterval(() => {
        if (!currentLockedPhone) {
            stopLockTimer();
            return;
        }
        const remaining = getRemainingLockSeconds(currentLockedPhone);
        if (remaining <= 0) {
            // Lock expired, unlock UI
            stopLockTimer();
            updateUILockState(false);
            clearLockTimerDisplay();
            if (pinErrorEl) pinErrorEl.style.display = 'none';
            // Also reset attempts for this phone (optional, but safe)
            resetLock(currentLockedPhone);
            currentLockedPhone = null;
        } else {
            showLockTimer(currentLockedPhone);
        }
    }, 1000);
}

function showPinError(message) {
    if (pinErrorEl) {
        pinErrorEl.textContent = message;
        pinErrorEl.style.display = 'block';
    }
}

function clearPinError() {
    if (pinErrorEl) {
        pinErrorEl.textContent = '';
        pinErrorEl.style.display = 'none';
    }
}

// ─── Customer Login (Enhanced with lock logic) ─────────────────
async function handleCustomerLogin() {
    const phone = document.getElementById('customerPhone').value.trim();
    if (!phone) {
        showPinError('Please enter your phone number');
        showToast('Enter your phone number', 'error');
        return;
    }
    if (customerPin.length < 4) {
        showPinError('Please enter your 4-digit PIN');
        showToast('Enter your 4-digit PIN', 'error');
        return;
    }

    // Check lock state for this phone
    if (isAccountLocked(phone)) {
        showPinError(`Too many failed attempts. Account locked.`);
        updateUILockState(true);
        startLockTimer(phone);
        return;
    } else {
        // Ensure UI is unlocked if lock expired
        updateUILockState(false);
        stopLockTimer();
        clearLockTimerDisplay();
    }

    // Load customers from localStorage
    const customers = loadCustomers();
    const customer = customers.find(c => c.phone === phone && c.pin === customerPin && c.status !== 'Inactive');

    if (customer) {
        // Successful login – reset attempts and lock
        resetLock(phone);
        updateUILockState(false);
        stopLockTimer();
        clearPinError();
        clearLockTimerDisplay();

        // Store user data and redirect
        localStorage.setItem('user', JSON.stringify({ id: customer.id, name: customer.name, phone: customer.phone, role: 'customer' }));
        sessionStorage.setItem('qless_logged_in', 'true');
        sessionStorage.setItem('qless_user_role', 'customer');
        sessionStorage.setItem('qless_user_name', customer.name);
        showToast('Welcome back! 🎉', 'success');
        setTimeout(() => window.location.href = 'home.html', 900);
    } else {
        // Failed attempt
        let attempts = getAttempts(phone) + 1;
        setAttempts(phone, attempts);
        const remainingAttempts = MAX_PIN_ATTEMPTS - attempts;

        if (attempts >= MAX_PIN_ATTEMPTS) {
            // Lock the account
            const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
            setLockUntil(phone, lockUntil);
            showPinError(`Too many failed attempts. Try again in 30 minutes.`);
            updateUILockState(true);
            startLockTimer(phone);
        } else {
            showPinError(`Incorrect PIN. Attempts left: ${remainingAttempts}`);
            updateUILockState(false); // still unlocked, but allow retry
        }
        // Clear entered PIN
        customerPin = '';
        updatePinDots();
        showToast('Invalid phone or PIN', 'error');
    }
}

// Attach event listener to the login button (ID changed from customerLoginBtn to loginBtn)
const loginButton = document.getElementById('loginBtn');
if (loginButton) {
    // Remove any existing listener to avoid duplicates (but we replace)
    const newBtn = loginButton.cloneNode(true);
    loginButton.parentNode.replaceChild(newBtn, loginButton);
    newBtn.addEventListener('click', handleCustomerLogin);
} else {
    // Fallback in case ID not changed (legacy)
    const oldBtn = document.getElementById('customerLoginBtn');
    if (oldBtn) {
        oldBtn.addEventListener('click', handleCustomerLogin);
    }
}

// Keep original create account button
document.getElementById('createAccountBtn').addEventListener('click', () => {
    window.location.href = 'register.html';
});

// ========== NEW LOGIC: 5-TAPS → SUPER ONLY, LONG-PRESS → TENANT+STAFF ==========
const logoWrap  = document.getElementById('logoWrap');
const logoIcon  = document.getElementById('logoIcon');
const tapDotsEl = document.getElementById('tapDots');
const tapDots   = [0,1,2,3,4].map(i => document.getElementById(`td${i}`));

let tapCount = 0;
let tapResetTimer = null;
let longPressTimer = null;

function markDot(n) {
    tapDotsEl.style.opacity = '1';
    tapDots.forEach((d, i) => d.classList.toggle('lit', i < n));
}

function clearDots() {
    tapCount = 0;
    tapDots.forEach(d => d.classList.remove('lit'));
    setTimeout(() => { tapDotsEl.style.opacity = '0'; }, 500);
}

// Opens admin modal with specific mode: 'super' OR 'tenantStaff'
function openAdminModal(mode) {
    clearDots();

    const modalBackdrop = document.getElementById('adminBackdrop');
    const tabSuper = document.getElementById('tabSuper');
    const tabTenant = document.getElementById('tabTenant');
    const tabStaff = document.getElementById('tabStaff');
    const tabsContainer = document.getElementById('modalTabsContainer');
    const venueGroup = document.getElementById('venueGroup');

    if (mode === 'super') {
        // Hide tenant & staff tabs, show only Super
        tabTenant.classList.add('hide-tab');
        tabStaff.classList.add('hide-tab');
        tabSuper.classList.remove('hide-tab');
        // Ensure the active tab is Super
        setAdminRole('super_administrator');
        // Also force venue group hidden (already handled in setAdminRole but double-check)
        venueGroup.classList.add('hidden');
    } else { // mode === 'tenantStaff'
        // Hide Super tab, show Tenant + Staff
        tabSuper.classList.add('hide-tab');
        tabTenant.classList.remove('hide-tab');
        tabStaff.classList.remove('hide-tab');
        // Default to Tenant Admin
        setAdminRole('tenant_admin');
    }

    modalBackdrop.classList.add('open');
}

// 5‑tap trigger → Super Admin only
logoWrap.addEventListener('click', () => {
    // Visual pulse
    logoIcon.classList.add('tapped');
    const ring = document.createElement('div');
    ring.className = 'tap-ring';
    logoIcon.appendChild(ring);
    setTimeout(() => { logoIcon.classList.remove('tapped'); ring.remove(); }, 430);

    tapCount++;
    markDot(tapCount);
    clearTimeout(tapResetTimer);

    if (tapCount >= 5) {
        openAdminModal('super');
        return;
    }

    tapResetTimer = setTimeout(clearDots, 2400);
});

// Long-press trigger → Tenant + Staff only
logoWrap.addEventListener('pointerdown', () => {
    longPressTimer = setTimeout(() => {
        openAdminModal('tenantStaff');
    }, 600);
});
logoWrap.addEventListener('pointerup',    () => clearTimeout(longPressTimer));
logoWrap.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
logoWrap.addEventListener('pointermove',  () => clearTimeout(longPressTimer));

// ─── Admin modal controls ──────────────────────────────────────
const adminBackdrop = document.getElementById('adminBackdrop');

document.getElementById('modalClose').addEventListener('click', () => {
    adminBackdrop.classList.remove('open');
    // Reset tab visibility for next open (no need to force, next open will set correct mode)
});

adminBackdrop.addEventListener('click', e => {
    if (e.target === adminBackdrop) adminBackdrop.classList.remove('open');
});

// Swipe down to close
let touchStartY = 0;
document.getElementById('adminModal').addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; });
document.getElementById('adminModal').addEventListener('touchend',   e => {
    if (e.changedTouches[0].clientY - touchStartY > 60) adminBackdrop.classList.remove('open');
});

let selectedAdminRole = 'super_administrator';

function populateVenueDropdown() {
    const dd = document.getElementById('tenantDropdown');
    const tenants = loadTenants();
    dd.innerHTML = '<option value="">— Choose Venue —</option>';
    tenants.filter(t => t.status === 'Active').forEach(t => {
        const o = document.createElement('option');
        o.value = t.id;
        o.textContent = t.businessName;
        dd.appendChild(o);
    });
}

function setAdminRole(role) {
    selectedAdminRole = role;
    // Update tab active state (only visible tabs)
    document.querySelectorAll('.modal-tab:not(.hide-tab)').forEach(b => b.classList.remove('active'));
    const activeTab = document.querySelector(`.modal-tab[data-role="${role}"]`);
    if (activeTab) activeTab.classList.add('active');

    const venueGroup = document.getElementById('venueGroup');
    const label      = document.getElementById('adminFormLabel');
    const uInput     = document.getElementById('adminUsername');
    const pInput     = document.getElementById('adminPassword');
    const btnText    = document.getElementById('adminBtnText');

    // Reset pw visibility
    pInput.type = 'password';
    document.getElementById('pwToggle').innerHTML = '<i class="fas fa-eye"></i>';

    if (role === 'super_administrator') {
        venueGroup.classList.add('hidden');
        label.textContent    = 'Super Admin Login';
        uInput.value         = 'Super';
        pInput.value         = '1989';
        uInput.placeholder   = 'Username';
        btnText.textContent  = 'Login as Super Admin';
    } else if (role === 'tenant_admin') {
        venueGroup.classList.remove('hidden');
        label.textContent    = 'Tenant Admin Login';
        uInput.value         = '';
        pInput.value         = '';
        uInput.placeholder   = 'Tenant username';
        btnText.textContent  = 'Login as Tenant Admin';
        populateVenueDropdown();
    } else {
        venueGroup.classList.remove('hidden');
        label.textContent    = 'Staff Login';
        uInput.value         = '';
        pInput.value         = '';
        uInput.placeholder   = 'Staff username';
        btnText.textContent  = 'Login as Staff';
        populateVenueDropdown();
    }
}

// Tab click handler – only works on visible tabs
document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('hide-tab')) return;
        setAdminRole(btn.dataset.role);
    });
});

// Password toggle
document.getElementById('pwToggle').addEventListener('click', function() {
    const pw = document.getElementById('adminPassword');
    const hide = pw.type === 'password';
    pw.type = hide ? 'text' : 'password';
    this.innerHTML = hide ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
});

// Enter key inside modal
['adminUsername','adminPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('adminLoginBtn').click();
    });
});

// ─── Admin Login ───────────────────────────────────────────────
function setAdminLoading(on) {
    document.getElementById('adminSpinner').style.display = on ? 'block' : 'none';
    document.getElementById('adminIcon').style.display   = on ? 'none'  : 'inline';
    document.getElementById('adminLoginBtn').disabled    = on;
}

document.getElementById('adminLoginBtn').addEventListener('click', () => {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    if (!username || !password) { showToast('Fill in all fields', 'error'); return; }

    setAdminLoading(true);

    setTimeout(() => {
        setAdminLoading(false);

        if (selectedAdminRole === 'super_administrator') {
            if (username === 'Super' && password === '1989') {
                localStorage.setItem('user', JSON.stringify({
                    id:'super_admin_001', name:'Super Administrator',
                    username:'Super', role:'super_administrator', permissions:'all'
                }));
                sessionStorage.setItem('qless_logged_in', 'true');
                sessionStorage.setItem('qless_user_role', 'super_administrator');
                sessionStorage.setItem('qless_user_name', 'Super Admin');
                showToast('Welcome, Super Admin 👑', 'success');
                setTimeout(() => window.location.href = 'super-admin.html', 900);
            } else {
                showToast('Invalid credentials', 'error');
            }

        } else if (selectedAdminRole === 'tenant_admin') {
            const tenantId = document.getElementById('tenantDropdown').value;
            if (!tenantId) { showToast('Select a venue first', 'error'); return; }
            const tenants = loadTenants();
            const tenant  = tenants.find(t => t.username === username && t.password === password && t.status === 'Active' && t.id == tenantId);
            if (tenant) {
                localStorage.setItem('user', JSON.stringify({
                    id:tenant.id, name:tenant.ownerName, username:tenant.username,
                    businessName:tenant.businessName, role:'tenant_admin', tenantId:tenant.id
                }));
                localStorage.setItem('currentTenantId', tenant.id);
                localStorage.setItem('currentTenant', JSON.stringify(tenant));
                sessionStorage.setItem('qless_logged_in', 'true');
                sessionStorage.setItem('qless_user_role', 'tenant_admin');
                sessionStorage.setItem('qless_user_name', tenant.ownerName);
                sessionStorage.setItem('qless_tenant_id', tenant.id);
                showToast(`Welcome, ${tenant.businessName} 🏢`, 'success');
                setTimeout(() => window.location.href = 'admin.html', 900);
            } else {
                showToast('Invalid tenant credentials', 'error');
            }

        } else if (selectedAdminRole === 'staff') {
            const tenantId = document.getElementById('tenantDropdown').value;
            if (!tenantId) { showToast('Select a venue first', 'error'); return; }
            const staffList = loadStaff();
            const member = staffList.find(s => s.username === username && s.password === password && s.status === 'Active' && s.tenantId == tenantId);
            if (member) {
                const tenants = loadTenants();
                const tenant  = tenants.find(t => t.id == member.tenantId && t.status === 'Active');
                if (!tenant) { showToast('Venue not found', 'error'); return; }
                localStorage.setItem('user', JSON.stringify({
                    id:member.id, name:member.name, username:member.username,
                    role:'staff', tenantId:tenant.id, businessName:tenant.businessName, staffRole:member.role
                }));
                localStorage.setItem('currentTenantId', tenant.id);
                localStorage.setItem('currentTenant', JSON.stringify(tenant));
                sessionStorage.setItem('qless_logged_in', 'true');
                sessionStorage.setItem('qless_user_role', 'staff');
                sessionStorage.setItem('qless_user_name', member.name);
                sessionStorage.setItem('qless_tenant_id', tenant.id);
                showToast(`Welcome, ${member.name} 👥`, 'success');
                setTimeout(() => window.location.href = 'staff.html', 900);
            } else {
                showToast('Invalid staff credentials', 'error');
            }
        }
    }, 650);
});

// ═════════════════════════════════════════════════════════════════
// TEMPORARY SUPABASE TEST SNIPPETS (can be deleted later)
// ═════════════════════════════════════════════════════════════════

// Initialize Supabase client (using your existing credentials)
const SUPABASE_URL = "https://qrjlgfajglvkbifhlebc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamxnZmFqZ2x2a2JpZmhsZWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjAzOTAsImV4cCI6MjA5MjY5NjM5MH0.dBj6kPPyBE7LwrZZudyNkUsFcq_8NJBIXCJcNH41ajY";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Snippet 1: INSERT test
(async () => {
    const { data: insertData, error: insertError } = await supabase
        .from('customers')
        .insert([
            { phone: '0830000000', pin: '1234' }
        ]);
    console.log('INSERT:', insertData, insertError);
})();

// Snippet 2: SELECT test
(async () => {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', '0831234567')
        .single();
    console.log('SELECT:', data, error);
})();