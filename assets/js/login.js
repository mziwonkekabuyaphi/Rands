// ─── Imports ───────────────────────────────────────────────────
import { supabase, getUserRole } from ‘./config/supabase.js’;

// ─── Storage keys ──────────────────────────────────────────────
const TENANTS_KEY   = ‘qless_tenants’;
const STAFF_KEY     = ‘qless_staff’;
const CUSTOMERS_KEY = ‘rands_customers’;

function loadTenants() {
const s = localStorage.getItem(TENANTS_KEY);
if (s) return JSON.parse(s);
const d = [
{ id:1, businessName:‘Skyline Lounge’,  ownerName:‘Thabo Nkosi’,    username:‘skyline_admin’, password:‘skyline123’, status:‘Active’ },
{ id:2, businessName:‘Cape Tavern’,      ownerName:‘Lerato Dlamini’, username:‘capetavern’,    password:‘tavern456’,  status:‘Active’ },
{ id:3, businessName:‘Gold Reef Venue’,  ownerName:‘Sipho Mbele’,    username:‘goldreef’,      password:‘reef789’,    status:‘Active’ }
];
localStorage.setItem(TENANTS_KEY, JSON.stringify(d));
return d;
}

function loadStaff() {
const s = localStorage.getItem(STAFF_KEY);
if (s) return JSON.parse(s);
const d = [
{ id:1, tenantId:1, name:‘John Doe’,     username:‘john_skyline’, password:‘staff123’, role:‘bartender’, status:‘Active’ },
{ id:2, tenantId:2, name:‘Jane Smith’,   username:‘jane_cape’,    password:‘staff456’, role:‘manager’,   status:‘Active’ },
{ id:3, tenantId:3, name:‘Mike Johnson’, username:‘mike_gold’,    password:‘staff789’, role:‘security’,  status:‘Active’ }
];
localStorage.setItem(STAFF_KEY, JSON.stringify(d));
return d;
}

function loadCustomers() {
const s = localStorage.getItem(CUSTOMERS_KEY);
return s ? JSON.parse(s) : [];
}

// ─── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = ‘info’) {
const t = document.getElementById(‘toast’);
t.textContent = msg;
t.className = `show ${type}`;
clearTimeout(t._t);
t._t = setTimeout(() => { t.className = ‘’; }, 2700);
}

// ─── Session check (redirect if already logged in) ─────────────
(function () {
const loggedIn = sessionStorage.getItem(‘qless_logged_in’);
const role     = sessionStorage.getItem(‘qless_user_role’);
if (loggedIn === ‘true’ && role) {
if (role === ‘super_administrator’) window.location.href = ‘super-admin.html’;
else if (role === ‘tenant_admin’)   window.location.href = ‘admin.html’;
}
})();

// ─── PIN state & UI ────────────────────────────────────────────
let customerPin = ‘’;

function updatePinDots() {
for (let i = 0; i < 4; i++) {
const dot = document.getElementById(`dot-${i}`);
if (dot) dot.classList.toggle(‘filled’, i < customerPin.length);
}
}

document.querySelectorAll(’.pin-key’).forEach(key => {
key.addEventListener(‘click’, () => {
const k = key.dataset.k;
if (k === ‘del’) {
customerPin = customerPin.slice(0, -1);
} else if (customerPin.length < 4) {
customerPin += k;
if (customerPin.length === 4) {
setTimeout(() => {
const btn = document.getElementById(‘loginBtn’);
if (btn) btn.click();
}, 320);
}
}
updatePinDots();
});
});

// ─── PIN lock logic ────────────────────────────────────────────
const MAX_PIN_ATTEMPTS = 3;
const LOCK_DURATION_MS = 30 * 60 * 1000;

function getAttemptsKey(phone)  { return `pin_attempts_${phone}`; }
function getLockUntilKey(phone) { return `lock_until_${phone}`; }

function getAttempts(phone)            { const v = localStorage.getItem(getAttemptsKey(phone)); return v ? parseInt(v, 10) : 0; }
function setAttempts(phone, attempts)  { localStorage.setItem(getAttemptsKey(phone), attempts.toString()); }
function getLockUntil(phone)           { const v = localStorage.getItem(getLockUntilKey(phone)); return v ? new Date(v) : null; }
function setLockUntil(phone, d)        { d ? localStorage.setItem(getLockUntilKey(phone), d.toISOString()) : localStorage.removeItem(getLockUntilKey(phone)); }
function resetLock(phone)              { setAttempts(phone, 0); setLockUntil(phone, null); }
function isAccountLocked(phone)        { const l = getLockUntil(phone); return l ? new Date() < l : false; }
function getRemainingLockSeconds(phone){ const l = getLockUntil(phone); return l ? Math.max(0, Math.floor((l - new Date()) / 1000)) : 0; }

const pinErrorEl  = document.getElementById(‘pinError’);
const lockTimerEl = document.getElementById(‘lockTimer’);
const pinKeys     = document.querySelectorAll(’.pin-key’);

let lockCheckInterval  = null;
let currentLockedPhone = null;

function updateUILockState(locked) {
pinKeys.forEach(btn => {
if (locked) { btn.setAttribute(‘disabled’, ‘disabled’); btn.style.opacity = ‘0.5’; btn.style.pointerEvents = ‘none’; }
else        { btn.removeAttribute(‘disabled’); btn.style.opacity = ‘’; btn.style.pointerEvents = ‘’; }
});
const lb = document.getElementById(‘loginBtn’);
if (lb) lb.disabled = locked;
}

function clearLockTimerDisplay() {
if (lockTimerEl) { lockTimerEl.style.display = ‘none’; lockTimerEl.textContent = ‘’; }
if (pinErrorEl)  pinErrorEl.style.display = ‘none’;
}

function showLockTimer(phone) {
const remaining = getRemainingLockSeconds(phone);
if (remaining <= 0) {
if (currentLockedPhone === phone) { stopLockTimer(); updateUILockState(false); clearLockTimerDisplay(); }
return;
}
const m = Math.floor(remaining / 60), s = remaining % 60;
if (lockTimerEl) {
lockTimerEl.style.display = ‘block’;
lockTimerEl.textContent   = `🔒 Locked. Try again in ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
}

function stopLockTimer() {
if (lockCheckInterval) { clearInterval(lockCheckInterval); lockCheckInterval = null; }
currentLockedPhone = null;
if (lockTimerEl) lockTimerEl.style.display = ‘none’;
}

function startLockTimer(phone) {
stopLockTimer();
currentLockedPhone = phone;
showLockTimer(phone);
lockCheckInterval = setInterval(() => {
if (!currentLockedPhone) { stopLockTimer(); return; }
const remaining = getRemainingLockSeconds(currentLockedPhone);
if (remaining <= 0) { stopLockTimer(); updateUILockState(false); clearLockTimerDisplay(); resetLock(currentLockedPhone); currentLockedPhone = null; }
else                { showLockTimer(currentLockedPhone); }
}, 1000);
}

function showPinError(msg) { if (pinErrorEl) { pinErrorEl.textContent = msg; pinErrorEl.style.display = ‘block’; } }
function clearPinError()   { if (pinErrorEl) { pinErrorEl.textContent = ‘’; pinErrorEl.style.display = ‘none’; } }

// ─── Customer Login ────────────────────────────────────────────
async function handleCustomerLogin() {
const phone = document.getElementById(‘customerPhone’).value.trim();
if (!phone) { showPinError(‘Please enter your phone number’); showToast(‘Enter your phone number’, ‘error’); return; }
if (customerPin.length < 4) { showPinError(‘Please enter your 4-digit PIN’); showToast(‘Enter your 4-digit PIN’, ‘error’); return; }

```
if (isAccountLocked(phone)) {
    showPinError('Too many failed attempts. Account locked.');
    updateUILockState(true);
    startLockTimer(phone);
    return;
}
updateUILockState(false);
stopLockTimer();
clearLockTimerDisplay();

const customers = loadCustomers();
const customer  = customers.find(c => c.phone === phone && c.pin === customerPin && c.status !== 'Inactive');

if (customer) {
    resetLock(phone);
    clearPinError();
    clearLockTimerDisplay();
    localStorage.setItem('user', JSON.stringify({ id: customer.id, name: customer.name, phone: customer.phone, role: 'customer' }));
    sessionStorage.setItem('qless_logged_in', 'true');
    sessionStorage.setItem('qless_user_role', 'customer');
    sessionStorage.setItem('qless_user_name', customer.name);
    showToast('Welcome back! 🎉', 'success');
    setTimeout(() => window.location.href = 'home.html', 900);
} else {
    const attempts         = getAttempts(phone) + 1;
    const remainingAttempts = MAX_PIN_ATTEMPTS - attempts;
    setAttempts(phone, attempts);
    if (attempts >= MAX_PIN_ATTEMPTS) {
        setLockUntil(phone, new Date(Date.now() + LOCK_DURATION_MS));
        showPinError('Too many failed attempts. Try again in 30 minutes.');
        updateUILockState(true);
        startLockTimer(phone);
    } else {
        showPinError(`Incorrect PIN. Attempts left: ${remainingAttempts}`);
    }
    customerPin = '';
    updatePinDots();
    showToast('Invalid phone or PIN', 'error');
}
```

}

// Safely attach customer login — guard against double-bind via cloneNode
const customerLoginBtn = document.getElementById(‘loginBtn’);
if (customerLoginBtn) {
const fresh = customerLoginBtn.cloneNode(true);
customerLoginBtn.parentNode.replaceChild(fresh, customerLoginBtn);
fresh.addEventListener(‘click’, handleCustomerLogin);
}

document.getElementById(‘createAccountBtn’).addEventListener(‘click’, () => {
window.location.href = ‘register.html’;
});

// ══════════════════════════════════════════════════════════════
// LOGO TRIGGER — FIXED
// Bug 1: pointerdown fires before click; long press cancelled itself
//         because pointermove fired on touch even without movement.
// Bug 2: click and pointerdown were both counting taps.
// Fix:   Use touchstart/touchend for mobile long press (no pointermove
//        false-triggers). Use click ONLY for tap counting. Separate
//        the two intents clearly with a flag.
// ══════════════════════════════════════════════════════════════

const logoWrap  = document.getElementById(‘logoWrap’);
const logoIcon  = document.getElementById(‘logoIcon’);
const tapDotsEl = document.getElementById(‘tapDots’);
const tapDotEls = [0,1,2,3,4].map(i => document.getElementById(`td${i}`));

let tapCount      = 0;
let tapResetTimer = null;
let longPressTimer = null;
let longPressTriggered = false;   // ← prevents click from also counting after long press

// Tap dot helpers
function markDot(n) {
tapDotsEl.style.opacity = ‘1’;
tapDotEls.forEach((d, i) => d.classList.toggle(‘lit’, i < n));
}

function clearDots() {
tapCount = 0;
tapDotEls.forEach(d => d.classList.remove(‘lit’));
setTimeout(() => { tapDotsEl.style.opacity = ‘0’; }, 500);
}

// Visual tap feedback
function animateTap() {
logoIcon.classList.add(‘tapped’);
const ring = document.createElement(‘div’);
ring.className = ‘tap-ring’;
logoIcon.appendChild(ring);
setTimeout(() => { logoIcon.classList.remove(‘tapped’); ring.remove(); }, 430);
}

// Open the hidden modal
function openAdminModal(mode) {
console.log(`[VibePassport] Opening admin modal — mode: ${mode}`);
clearDots();

```
const modalBackdrop = document.getElementById('adminBackdrop');
const tabSuper  = document.getElementById('tabSuper');
const tabTenant = document.getElementById('tabTenant');
const tabStaff  = document.getElementById('tabStaff');

if (mode === 'super') {
    // Show ONLY the Super tab
    tabSuper.classList.remove('hide-tab');
    tabTenant.classList.add('hide-tab');
    tabStaff.classList.add('hide-tab');
    setAdminRole('super_administrator');
} else {
    // Show Tenant + Staff tabs; default to tenant_admin
    tabSuper.classList.add('hide-tab');
    tabTenant.classList.remove('hide-tab');
    tabStaff.classList.remove('hide-tab');
    setAdminRole('tenant_admin');
}

modalBackdrop.classList.add('open');

// Optional: vibrate if supported (mobile haptic hint)
if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
```

}

// ── TAP COUNTER (click only) ───────────────────────────────────
// FIX: was also being incremented by pointerdown, causing double-counts.
logoWrap.addEventListener(‘click’, () => {
// Ignore the click that follows a long press
if (longPressTriggered) {
longPressTriggered = false;
return;
}

```
animateTap();
tapCount++;
console.log(`[VibePassport] Logo tap count: ${tapCount}/5`);
markDot(tapCount);

clearTimeout(tapResetTimer);

if (tapCount >= 5) {
    console.log('[VibePassport] 5-tap trigger → Super Admin modal');
    openAdminModal('super');
    tapCount = 0;
    return;
}

// Reset tap sequence after 2.4s of inactivity
tapResetTimer = setTimeout(() => {
    console.log('[VibePassport] Tap sequence reset (timeout)');
    clearDots();
}, 2400);
```

});

// ── LONG PRESS (touch + mouse, separate from click) ───────────
// FIX: replaced pointermove cancel (too aggressive on mobile) with
//      a movement-threshold check using touch coordinates.

let longPressStartX = 0;
let longPressStartY = 0;
const LONG_PRESS_MS  = 700;
const MOVE_THRESHOLD = 10; // px — ignore tiny finger micro-movements

function startLongPress(x, y) {
longPressStartX = x;
longPressStartY = y;
longPressTimer  = setTimeout(() => {
console.log(’[VibePassport] Long press trigger → Tenant/Staff modal’);
longPressTriggered = true;
openAdminModal(‘tenantStaff’);
}, LONG_PRESS_MS);
}

function cancelLongPress() {
clearTimeout(longPressTimer);
longPressTimer = null;
}

// Touch (mobile)
logoWrap.addEventListener(‘touchstart’, e => {
const t = e.touches[0];
startLongPress(t.clientX, t.clientY);
}, { passive: true });

logoWrap.addEventListener(‘touchmove’, e => {
const t = e.touches[0];
const dx = Math.abs(t.clientX - longPressStartX);
const dy = Math.abs(t.clientY - longPressStartY);
if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) cancelLongPress();
}, { passive: true });

logoWrap.addEventListener(‘touchend’,    cancelLongPress);
logoWrap.addEventListener(‘touchcancel’, cancelLongPress);

// Mouse (desktop fallback)
logoWrap.addEventListener(‘mousedown’, e => {
startLongPress(e.clientX, e.clientY);
});
logoWrap.addEventListener(‘mousemove’, e => {
const dx = Math.abs(e.clientX - longPressStartX);
const dy = Math.abs(e.clientY - longPressStartY);
if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) cancelLongPress();
});
logoWrap.addEventListener(‘mouseup’,   cancelLongPress);
logoWrap.addEventListener(‘mouseleave’, cancelLongPress);

// ── MODAL CLOSE ────────────────────────────────────────────────
const adminBackdrop = document.getElementById(‘adminBackdrop’);

document.getElementById(‘modalClose’).addEventListener(‘click’, () => {
adminBackdrop.classList.remove(‘open’);
});

adminBackdrop.addEventListener(‘click’, e => {
if (e.target === adminBackdrop) adminBackdrop.classList.remove(‘open’);
});

// Swipe down to close modal (mobile)
let swipeStartY = 0;
document.getElementById(‘adminModal’).addEventListener(‘touchstart’, e => {
swipeStartY = e.touches[0].clientY;
}, { passive: true });
document.getElementById(‘adminModal’).addEventListener(‘touchend’, e => {
if (e.changedTouches[0].clientY - swipeStartY > 60) adminBackdrop.classList.remove(‘open’);
}, { passive: true });

// ── ADMIN ROLE + FORM ──────────────────────────────────────────
let selectedAdminRole = ‘super_administrator’;

function populateVenueDropdown() {
const dd      = document.getElementById(‘tenantDropdown’);
const tenants = loadTenants();
dd.innerHTML  = ‘<option value="">— Choose Venue —</option>’;
tenants.filter(t => t.status === ‘Active’).forEach(t => {
const o = document.createElement(‘option’);
o.value       = t.id;
o.textContent = t.businessName;
dd.appendChild(o);
});
}

function setAdminRole(role) {
selectedAdminRole = role;
console.log(`[VibePassport] Active login view: ${role}`);

```
document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
const activeTab = document.querySelector(`.modal-tab[data-role="${role}"]`);
if (activeTab) activeTab.classList.add('active');

const venueGroup = document.getElementById('venueGroup');
const label      = document.getElementById('adminFormLabel');
const uInput     = document.getElementById('adminUsername');
const pInput     = document.getElementById('adminPassword');
const btnText    = document.getElementById('adminBtnText');

// Reset form
pInput.type = 'password';
document.getElementById('pwToggle').innerHTML = '<i class="fas fa-eye"></i>';
uInput.value = '';
pInput.value = '';

if (role === 'super_administrator') {
    venueGroup.classList.add('hidden');
    label.textContent   = 'Super Admin Login';
    uInput.placeholder  = 'Email address';
    btnText.textContent = 'Login as Super Admin';
} else if (role === 'tenant_admin') {
    venueGroup.classList.remove('hidden');
    label.textContent   = 'Tenant Admin Login';
    uInput.placeholder  = 'Email address';
    btnText.textContent = 'Login as Tenant Admin';
    populateVenueDropdown();
} else {
    // staff
    venueGroup.classList.remove('hidden');
    label.textContent   = 'Staff Login';
    uInput.placeholder  = 'Email address';
    btnText.textContent = 'Login as Staff';
    populateVenueDropdown();
}
```

}

document.querySelectorAll(’.modal-tab’).forEach(btn => {
btn.addEventListener(‘click’, () => {
if (btn.classList.contains(‘hide-tab’)) return;
setAdminRole(btn.dataset.role);
});
});

document.getElementById(‘pwToggle’).addEventListener(‘click’, function () {
const pw   = document.getElementById(‘adminPassword’);
const hide = pw.type === ‘password’;
pw.type    = hide ? ‘text’ : ‘password’;
this.innerHTML = hide ? ‘<i class="fas fa-eye-slash"></i>’ : ‘<i class="fas fa-eye"></i>’;
});

[‘adminUsername’, ‘adminPassword’].forEach(id => {
document.getElementById(id).addEventListener(‘keydown’, e => {
if (e.key === ‘Enter’) document.getElementById(‘adminLoginBtn’).click();
});
});

// ── ADMIN LOADING STATE ────────────────────────────────────────
function setAdminLoading(on) {
const spinner = document.getElementById(‘adminSpinner’);
const icon    = document.getElementById(‘adminIcon’);
const btn     = document.getElementById(‘adminLoginBtn’);
if (spinner) spinner.style.display = on ? ‘block’ : ‘none’;
if (icon)    icon.style.display    = on ? ‘none’  : ‘inline’;
if (btn)     btn.disabled          = on;
}

// ── SUPABASE ADMIN LOGIN ───────────────────────────────────────
document.getElementById(‘adminLoginBtn’).addEventListener(‘click’, async () => {
const email    = document.getElementById(‘adminUsername’).value.trim();
const password = document.getElementById(‘adminPassword’).value.trim();

```
if (!email || !password) {
    showToast('Enter email and password', 'error');
    return;
}

setAdminLoading(true);

try {
    // 1. Supabase email+password sign-in
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const user = data.user;

    // 2. Fetch role from your "roles" table via getUserRole()
    const roleInfo = await getUserRole(user.id);
    if (!roleInfo) throw new Error('No role assigned. Contact administrator.');

    // 3. Enforce role matches the selected tab
    if (roleInfo.role !== selectedAdminRole) {
        throw new Error(`You are not authorized as ${selectedAdminRole}. Please use the correct tab.`);
    }

    // 4. For tenant_admin, validate venue selection
    if (roleInfo.role === 'tenant_admin') {
        const chosenTenantId = parseInt(document.getElementById('tenantDropdown').value, 10);
        if (!chosenTenantId || chosenTenantId !== roleInfo.tenant_id) {
            throw new Error('You are not assigned to the selected venue.');
        }
    }

    // 5. Persist minimal session info
    sessionStorage.setItem('qless_logged_in', 'true');
    sessionStorage.setItem('qless_user_role', roleInfo.role);
    if (roleInfo.tenant_id) sessionStorage.setItem('qless_tenant_id', roleInfo.tenant_id);

    // 6. Redirect
    showToast(`Welcome! 🎉`, 'success');
    setTimeout(() => {
        if      (roleInfo.role === 'super_administrator') window.location.href = 'super-admin.html';
        else if (roleInfo.role === 'tenant_admin')        window.location.href = 'admin.html';
        else                                               window.location.href = 'staff.html';
    }, 900);

} catch (err) {
    console.error('[VibePassport] Admin login error:', err.message);
    showToast(err.message, 'error');
    document.getElementById('adminPassword').value = '';
} finally {
    setAdminLoading(false);
}
```

});
