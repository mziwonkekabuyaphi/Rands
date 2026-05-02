// ─── Imports ───────────────────────────────────────────────────
import { supabase, getUserRole } from '../../config/supabase.js';

// ─── Storage (localStorage only for tenants dropdown & customer data) ───
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
// Keep using sessionStorage for now (will be enhanced later)
(function() {
    const loggedIn = sessionStorage.getItem('qless_logged_in');
    const role     = sessionStorage.getItem('qless_user_role');
    if (loggedIn === 'true' && role) {
        // simple redirect – you can replace with your own logic
        if (role === 'super_administrator') window.location.href = 'super-admin.html';
        else if (role === 'tenant_admin') window.location.href = 'admin.html';
    }
})();

// ─── PIN state & UI (Customer login) ───────────────────────────
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

const pinErrorEl = document.getElementById('pinError');
const lockTimerEl = document.getElementById('lockTimer');
const loginBtn = document.getElementById('loginBtn');
const pinInputHidden = document.getElementById('pin');
const pinKeys = document.querySelectorAll('.pin-key');

let lockCheckInterval = null;
let currentLockedPhone = null;

function updateUILockState(locked) {
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
    if (loginBtn) loginBtn.disabled = locked;
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
    showLockTimer(phone);
    lockCheckInterval = setInterval(() => {
        if (!currentLockedPhone) {
            stopLockTimer();
            return;
        }
        const remaining = getRemainingLockSeconds(currentLockedPhone);
        if (remaining <= 0) {
            stopLockTimer();
            updateUILockState(false);
            clearLockTimerDisplay();
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

// ─── Customer Login (unchanged, uses localStorage) ─────────────────
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

    if (isAccountLocked(phone)) {
        showPinError(`Too many failed attempts. Account locked.`);
        updateUILockState(true);
        startLockTimer(phone);
        return;
    } else {
        updateUILockState(false);
        stopLockTimer();
        clearLockTimerDisplay();
    }

    const customers = loadCustomers();
    const customer = customers.find(c => c.phone === phone && c.pin === customerPin && c.status !== 'Inactive');

    if (customer) {
        resetLock(phone);
        updateUILockState(false);
        stopLockTimer();
        clearPinError();
        clearLockTimerDisplay();

        localStorage.setItem('user', JSON.stringify({ id: customer.id, name: customer.name, phone: customer.phone, role: 'customer' }));
        sessionStorage.setItem('qless_logged_in', 'true');
        sessionStorage.setItem('qless_user_role', 'customer');
        sessionStorage.setItem('qless_user_name', customer.name);
        showToast('Welcome back! 🎉', 'success');
        setTimeout(() => window.location.href = 'home.html', 900);
    } else {
        let attempts = getAttempts(phone) + 1;
        setAttempts(phone, attempts);
        const remainingAttempts = MAX_PIN_ATTEMPTS - attempts;

        if (attempts >= MAX_PIN_ATTEMPTS) {
            const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
            setLockUntil(phone, lockUntil);
            showPinError(`Too many failed attempts. Try again in 30 minutes.`);
            updateUILockState(true);
            startLockTimer(phone);
        } else {
            showPinError(`Incorrect PIN. Attempts left: ${remainingAttempts}`);
            updateUILockState(false);
        }
        customerPin = '';
        updatePinDots();
        showToast('Invalid phone or PIN', 'error');
    }
}

// Attach customer login listener
const customerLoginBtn = document.getElementById('loginBtn');
if (customerLoginBtn) {
    const newBtn = customerLoginBtn.cloneNode(true);
    customerLoginBtn.parentNode.replaceChild(newBtn, customerLoginBtn);
    newBtn.addEventListener('click', handleCustomerLogin);
} else {
    const oldBtn = document.getElementById('customerLoginBtn');
    if (oldBtn) oldBtn.addEventListener('click', handleCustomerLogin);
}

document.getElementById('createAccountBtn').addEventListener('click', () => {
    window.location.href = 'register.html';
});

// ========== ADMIN / STAFF MODAL LOGIC (Supabase Auth) ==========
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

function openAdminModal(mode) {
    clearDots();
    const modalBackdrop = document.getElementById('adminBackdrop');
    const tabSuper = document.getElementById('tabSuper');
    const tabTenant = document.getElementById('tabTenant');
    const tabStaff = document.getElementById('tabStaff');
    const venueGroup = document.getElementById('venueGroup');

    if (mode === 'super') {
        tabTenant.classList.add('hide-tab');
        tabStaff.classList.add('hide-tab');
        tabSuper.classList.remove('hide-tab');
        setAdminRole('super_administrator');
        venueGroup.classList.add('hidden');
    } else {
        tabSuper.classList.add('hide-tab');
        tabTenant.classList.remove('hide-tab');
        tabStaff.classList.remove('hide-tab');
        setAdminRole('tenant_admin');
    }
    modalBackdrop.classList.add('open');
}

logoWrap.addEventListener('click', () => {
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

logoWrap.addEventListener('pointerdown', () => {
    longPressTimer = setTimeout(() => {
        openAdminModal('tenantStaff');
    }, 600);
});
logoWrap.addEventListener('pointerup',    () => clearTimeout(longPressTimer));
logoWrap.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
logoWrap.addEventListener('pointermove',  () => clearTimeout(longPressTimer));

const adminBackdrop = document.getElementById('adminBackdrop');
document.getElementById('modalClose').addEventListener('click', () => {
    adminBackdrop.classList.remove('open');
});
adminBackdrop.addEventListener('click', e => {
    if (e.target === adminBackdrop) adminBackdrop.classList.remove('open');
});

let touchStartY = 0;
document.getElementById('adminModal').addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; });
document.getElementById('adminModal').addEventListener('touchend',   e => {
    if (e.changedTouches[0].clientY - touchStartY > 60) adminBackdrop.classList.remove('open');
});

let selectedAdminRole = 'super_administrator';

function populateVenueDropdown() {
    const dd = document.getElementById('tenantDropdown');
    const tenants = loadTenants(); // still uses localStorage for venue names
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
    document.querySelectorAll('.modal-tab:not(.hide-tab)').forEach(b => b.classList.remove('active'));
    const activeTab = document.querySelector(`.modal-tab[data-role="${role}"]`);
    if (activeTab) activeTab.classList.add('active');

    const venueGroup = document.getElementById('venueGroup');
    const label      = document.getElementById('adminFormLabel');
    const uInput     = document.getElementById('adminUsername');
    const pInput     = document.getElementById('adminPassword');
    const btnText    = document.getElementById('adminBtnText');

    pInput.type = 'password';
    document.getElementById('pwToggle').innerHTML = '<i class="fas fa-eye"></i>';
    uInput.value = '';
    pInput.value = '';

    if (role === 'super_administrator') {
        venueGroup.classList.add('hidden');
        label.textContent    = 'Super Admin Login';
        uInput.placeholder   = 'Email address';
        btnText.textContent  = 'Login as Super Admin';
    } else if (role === 'tenant_admin') {
        venueGroup.classList.remove('hidden');
        label.textContent    = 'Tenant Admin Login';
        uInput.placeholder   = 'Email address';
        btnText.textContent  = 'Login as Tenant Admin';
        populateVenueDropdown();
    } else {
        venueGroup.classList.remove('hidden');
        label.textContent    = 'Staff Login';
        uInput.placeholder   = 'Email address';
        btnText.textContent  = 'Login as Staff';
        populateVenueDropdown();
    }
}

document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('hide-tab')) return;
        setAdminRole(btn.dataset.role);
    });
});

document.getElementById('pwToggle').addEventListener('click', function() {
    const pw = document.getElementById('adminPassword');
    const hide = pw.type === 'password';
    pw.type = hide ? 'text' : 'password';
    this.innerHTML = hide ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
});

['adminUsername','adminPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('adminLoginBtn').click();
    });
});

function setAdminLoading(on) {
    const spinner = document.getElementById('adminSpinner');
    const icon = document.getElementById('adminIcon');
    const btn = document.getElementById('adminLoginBtn');
    if (spinner) spinner.style.display = on ? 'block' : 'none';
    if (icon) icon.style.display = on ? 'none' : 'inline';
    if (btn) btn.disabled = on;
}

// ─── NEW ADMIN LOGIN USING SUPABASE AUTH ───────────────────────
document.getElementById('adminLoginBtn').addEventListener('click', async () => {
    const email = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const selectedRole = selectedAdminRole;

    if (!email || !password) {
        showToast('Enter email and password', 'error');
        return;
    }

    setAdminLoading(true);

    try {
        // 1. Sign in with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);

        const user = data.user;

        // 2. Fetch role from "roles" table
        const roleInfo = await getUserRole(user.id);
        if (!roleInfo) throw new Error('No role assigned. Contact administrator.');

        // 3. Check role matches the selected tab
        if (roleInfo.role !== selectedRole) {
            throw new Error(`You are not authorized as ${selectedRole}. Please use the correct tab.`);
        }

        // 4. For tenant_admin, verify venue selection matches tenant_id
        if (roleInfo.role === 'tenant_admin') {
            const chosenTenantId = document.getElementById('tenantDropdown').value;
            if (!chosenTenantId || parseInt(chosenTenantId) !== roleInfo.tenant_id) {
                throw new Error(`You are not assigned to the selected venue.`);
            }
        }

        // 5. Store basic session in sessionStorage (for client‑side checks)
        sessionStorage.setItem('qless_logged_in', 'true');
        sessionStorage.setItem('qless_user_role', roleInfo.role);
        if (roleInfo.tenant_id) sessionStorage.setItem('qless_tenant_id', roleInfo.tenant_id);

        // 6. Redirect based on role
        showToast(`Welcome, ${user.email} 🎉`, 'success');
        setTimeout(() => {
            if (roleInfo.role === 'super_administrator') {
                window.location.href = 'super-admin.html';
            } else if (roleInfo.role === 'tenant_admin') {
                window.location.href = 'admin.html';
            }
        }, 900);

    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('adminPassword').value = ''; // clear password field
    } finally {
        setAdminLoading(false);
    }
});