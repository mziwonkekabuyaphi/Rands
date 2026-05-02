/**

- login.js  —  Vibe Passport Login Logic
- Place at:  assets/js/login.js
- Imports:   ../../config/supabase.js
  */

import { supabase } from ‘../../config/supabase.js’;

/* ══════════════════════════════════════════════
CONSTANTS
══════════════════════════════════════════════ */
const MAX_ATTEMPTS  = 5;
const LOCK_SECS     = 300;   // 5 minutes
const TAP_TARGET    = 6;     // taps to open admin modal
const LONG_PRESS_MS = 1200;  // ms hold to open staff modal
const TAP_RESET_MS  = 1800;  // ms of inactivity resets tap count

/* ══════════════════════════════════════════════
DOM HELPERS
══════════════════════════════════════════════ */
const $  = id => document.getElementById(id);
const el = (sel, ctx = document) => ctx.querySelector(sel);

/* ══════════════════════════════════════════════
DOM REFS
══════════════════════════════════════════════ */
// Customer
const customerPhone     = $(‘customerPhone’);
const customerPinHidden = $(‘customerPinHidden’);
const loginBtn          = $(‘loginBtn’);
const loginSpinner      = $(‘loginSpinner’);
const loginIcon         = $(‘loginIcon’);
const pinError          = $(‘pinError’);
const lockTimerEl       = $(‘lockTimer’);
const createAccountBtn  = $(‘createAccountBtn’);

// Logo
const logoWrap   = $(‘logoWrap’);
const logoRing   = $(‘logoRing’);
const tapBadge   = $(‘tapBadge’);

// Modal
const adminBackdrop  = $(‘adminBackdrop’);
const modalClose     = $(‘modalClose’);
const allTabs        = adminBackdrop.querySelectorAll(’.modal-tab’);

// Admin form
const adminFormLabel    = $(‘adminFormLabel’);
const venueGroup        = $(‘venueGroup’);
const tenantDropdown    = $(‘tenantDropdown’);
const emailPasswordSec  = $(‘emailPasswordSection’);
const staffSection      = $(‘staffSection’);
const adminEmail        = $(‘adminEmail’);
const adminPassword     = $(‘adminPassword’);
const pwToggle          = $(‘pwToggle’);
const adminError        = $(‘adminError’);
const adminLoginBtn     = $(‘adminLoginBtn’);
const adminSpinner      = $(‘adminSpinner’);
const adminIcon         = $(‘adminIcon’);
const adminBtnText      = $(‘adminBtnText’);
const staffPinHidden    = $(‘staffPinHidden’);

// Toast
const toastEl = $(‘toast’);

/* ══════════════════════════════════════════════
STATE
══════════════════════════════════════════════ */
let customerPin  = ‘’;
let staffPin     = ‘’;
let activeRole   = ‘super’;
let lockInterval = null;

// Logo tap/longpress state
let tapCount       = 0;
let tapResetTimer  = null;
let longPressTimer = null;
let touchMoved     = false;

/* ══════════════════════════════════════════════
TOAST
══════════════════════════════════════════════ */
function showToast(msg, type = ‘’, duration = 3000) {
toastEl.textContent = msg;
toastEl.className   = `show ${type}`.trim();
clearTimeout(toastEl._hide);
toastEl._hide = setTimeout(() => { toastEl.className = ‘’; }, duration);
}

/* ══════════════════════════════════════════════
ERROR HELPERS
══════════════════════════════════════════════ */
function showErr(el, msg) {
el.textContent  = msg;
el.style.display = ‘block’;
}
function clearErr(…els) {
els.forEach(e => { if (e) { e.textContent = ‘’; e.style.display = ‘none’; } });
}

/* ══════════════════════════════════════════════
CUSTOMER PIN PAD
══════════════════════════════════════════════ */
function refreshCustomerDots() {
for (let i = 0; i < 4; i++) {
const d = $(`cdot-${i}`);
d.classList.toggle(‘filled’, i < customerPin.length);
d.classList.remove(‘error’);
}
}

function shakeCustomerDots() {
for (let i = 0; i < 4; i++) {
const d = $(`cdot-${i}`);
d.classList.add(‘error’);
setTimeout(() => d.classList.remove(‘error’), 600);
}
}

$(‘customerPinPad’).addEventListener(‘click’, e => {
const key = e.target.closest(’[data-k]’)?.dataset.k;
if (!key) return;
if (key === ‘del’) {
customerPin = customerPin.slice(0, -1);
} else if (customerPin.length < 4) {
customerPin += key;
}
customerPinHidden.value = customerPin;
refreshCustomerDots();
clearErr(pinError, lockTimerEl);
});

/* ══════════════════════════════════════════════
STAFF PIN PAD
══════════════════════════════════════════════ */
function refreshStaffDots() {
for (let i = 0; i < 8; i++) {
$(`sdot-${i}`)?.classList.toggle(‘filled’, i < staffPin.length);
}
}

$(‘staffPinPad’).addEventListener(‘click’, e => {
const key = e.target.closest(’[data-k]’)?.dataset.k;
if (!key) return;
if (key === ‘del’) {
staffPin = staffPin.slice(0, -1);
} else if (staffPin.length < 8) {
staffPin += key;
}
staffPinHidden.value = staffPin;
refreshStaffDots();
clearErr(adminError);
});

/* ══════════════════════════════════════════════
ACCOUNT LOCK (brute-force protection)
══════════════════════════════════════════════ */
const getAttempts   = ()  => parseInt(localStorage.getItem(‘vp_att’)  || ‘0’);
const setAttempts   = n   => localStorage.setItem(‘vp_att’, n);
const getLockExpiry = ()  => parseInt(localStorage.getItem(‘vp_lock’) || ‘0’);
const setLockExpiry = t   => localStorage.setItem(‘vp_lock’, t);
const clearLock     = ()  => { localStorage.removeItem(‘vp_att’); localStorage.removeItem(‘vp_lock’); };
const isLocked      = ()  => { const e = getLockExpiry(); return e && Date.now() < e; };

function startLockCountdown() {
clearInterval(lockInterval);
lockTimerEl.style.display = ‘block’;
lockInterval = setInterval(() => {
const rem = Math.ceil((getLockExpiry() - Date.now()) / 1000);
if (rem <= 0) {
clearInterval(lockInterval);
lockTimerEl.style.display = ‘none’;
clearLock();
return;
}
const m = String(Math.floor(rem / 60)).padStart(2, ‘0’);
const s = String(rem % 60).padStart(2, ‘0’);
lockTimerEl.textContent = `🔒 Too many attempts. Try again in ${m}:${s}`;
}, 1000);
}

/* ══════════════════════════════════════════════
LOGO — TAP (6×) opens admin modal
LONG PRESS (1.2s) opens staff modal
FIX: use touchstart / touchend, NOT pointerdown/pointerup/pointerleave.
pointerleave fires on mobile when finger moves even 1px, breaking everything.
══════════════════════════════════════════════ */
logoWrap.addEventListener(‘touchstart’, e => {
e.preventDefault();           // stops ghost mouse events
touchMoved = false;

longPressTimer = setTimeout(() => {
longPressTimer = null;
// Reset tap state and open staff modal
tapCount = 0;
tapBadge.classList.remove(‘visible’);
clearTimeout(tapResetTimer);
openModal(‘staff’);
}, LONG_PRESS_MS);
}, { passive: false });

logoWrap.addEventListener(‘touchmove’, () => {
// If finger moves it’s a scroll, cancel long press
touchMoved = true;
if (longPressTimer) {
clearTimeout(longPressTimer);
longPressTimer = null;
}
}, { passive: true });

logoWrap.addEventListener(‘touchend’, e => {
e.preventDefault();
if (touchMoved) return;

if (longPressTimer) {
// Long press didn’t fire yet → it’s a normal tap
clearTimeout(longPressTimer);
longPressTimer = null;
handleLogoTap();
}
// else: long press already opened the modal, do nothing
}, { passive: false });

// Fallback for desktop (mouse clicks)
logoWrap.addEventListener(‘click’, () => {
// On desktop there are no touch events so this fires normally
handleLogoTap();
});

function handleLogoTap() {
// Ripple animation
logoRing.classList.remove(‘tapped’);
void logoRing.offsetWidth;   // reflow to restart animation
logoRing.classList.add(‘tapped’);

tapCount++;
tapBadge.textContent = tapCount;
tapBadge.classList.add(‘visible’);

clearTimeout(tapResetTimer);

if (tapCount >= TAP_TARGET) {
tapCount = 0;
tapBadge.classList.remove(‘visible’);
openModal(‘super’);
return;
}

tapResetTimer = setTimeout(() => {
tapCount = 0;
tapBadge.classList.remove(‘visible’);
}, TAP_RESET_MS);
}

/* ══════════════════════════════════════════════
MODAL OPEN / CLOSE
══════════════════════════════════════════════ */
function openModal(role) {
// Staff tab is only visible when opened via long press
const staffTab = $(‘tabStaff’);
staffTab.classList.toggle(‘hidden’, role !== ‘staff’);

setActiveTab(role);
adminBackdrop.classList.add(‘open’);
}

function closeModal() {
adminBackdrop.classList.remove(‘open’);
clearErr(adminError);
adminEmail.value     = ‘’;
adminPassword.value  = ‘’;
staffPin             = ‘’;
staffPinHidden.value = ‘’;
refreshStaffDots();
}

modalClose.addEventListener(‘click’, closeModal);

adminBackdrop.addEventListener(‘click’, e => {
if (e.target === adminBackdrop) closeModal();
});

/* ══════════════════════════════════════════════
TAB SWITCHING
══════════════════════════════════════════════ */
allTabs.forEach(tab => tab.addEventListener(‘click’, () => setActiveTab(tab.dataset.role)));

function setActiveTab(role) {
activeRole = role;
allTabs.forEach(t => t.classList.toggle(‘active’, t.dataset.role === role));

const labels = { super: ‘Super Admin Login’, tenant: ‘Tenant Admin Login’, staff: ‘Staff Login’ };
adminFormLabel.textContent = labels[role] || ‘Login’;

const isStaff  = role === ‘staff’;
const isTenant = role === ‘tenant’;

emailPasswordSec.classList.toggle(‘hidden’, isStaff);
staffSection.classList.toggle(‘hidden’, !isStaff);
venueGroup.classList.toggle(‘hidden’, !isTenant);

adminBtnText.textContent = isStaff ? ‘Sign In’ : ‘Login’;

clearErr(adminError);
staffPin = ‘’;
staffPinHidden.value = ‘’;
refreshStaffDots();
}

/* ══════════════════════════════════════════════
PASSWORD VISIBILITY TOGGLE
══════════════════════════════════════════════ */
pwToggle.addEventListener(‘click’, () => {
const show = adminPassword.type === ‘password’;
adminPassword.type   = show ? ‘text’ : ‘password’;
pwToggle.innerHTML   = show ? ‘<i class="fas fa-eye-slash"></i>’ : ‘<i class="fas fa-eye"></i>’;
});

/* ══════════════════════════════════════════════
LOAD TENANTS INTO DROPDOWN
══════════════════════════════════════════════ */
async function loadTenants() {
try {
const { data, error } = await supabase
.from(‘tenants’)       // ← adjust table name if needed
.select(‘id, name’)
.eq(‘is_active’, true)
.order(‘name’);

```
if (error || !data?.length) return;

tenantDropdown.innerHTML = '<option value="">— Choose Venue —</option>';
data.forEach(t => {
  const o = document.createElement('option');
  o.value       = t.id;
  o.textContent = t.name;
  tenantDropdown.appendChild(o);
});
```

} catch (err) {
console.warn(‘loadTenants failed:’, err.message);
}
}

loadTenants();

/* ══════════════════════════════════════════════
LOADING STATE HELPER
══════════════════════════════════════════════ */
function setLoading(btn, spinner, icon, on, textEl = null, offText = ‘’) {
btn.disabled = on;
spinner.classList.toggle(‘active’, on);
icon.style.display = on ? ‘none’ : ‘’;
if (textEl) textEl.textContent = on ? ‘Please wait…’ : (offText || textEl.textContent);
}

/* ══════════════════════════════════════════════
CUSTOMER LOGIN
══════════════════════════════════════════════ */
loginBtn.addEventListener(‘click’, handleCustomerLogin);

async function handleCustomerLogin() {
clearErr(pinError, lockTimerEl);

if (isLocked()) { startLockCountdown(); return; }

const raw = customerPhone.value.trim().replace(/\s/g, ‘’);
const pin = customerPinHidden.value;

if (!raw || raw.length < 9) {
showErr(pinError, ‘Please enter a valid phone number.’);
return;
}
if (pin.length < 4) {
showErr(pinError, ‘Please enter your 4-digit PIN.’);
shakeCustomerDots();
return;
}

setLoading(loginBtn, loginSpinner, loginIcon, true);

try {
// Normalise: strip leading 0 and prepend +27
const phone = ‘+27’ + raw.replace(/^0/, ‘’);

```
const { data, error } = await supabase
  .from('customers')       // ← adjust table name if needed
  .select('id, name, phone, pin_hash, is_active')
  .eq('phone', phone)
  .maybeSingle();          // maybeSingle() returns null instead of error when no row found

if (!data) {
  recordFailedAttempt();
  return;
}

if (!data.is_active) {
  showErr(pinError, 'Account is inactive. Please contact support.');
  setLoading(loginBtn, loginSpinner, loginIcon, false);
  return;
}

// ── PIN CHECK
// If you store plain PINs: data.pin_hash === pin
// If you hash them (recommended), call your verify function here
const pinOk = data.pin_hash === pin;

if (!pinOk) {
  recordFailedAttempt();
  return;
}

clearLock();
showToast('Welcome back! 🎉', 'success');
sessionStorage.setItem('vp_customer', JSON.stringify({ id: data.id, name: data.name }));
sessionStorage.setItem('vp_role', 'customer');
setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
```

} catch (err) {
console.error(‘Customer login error:’, err);
showErr(pinError, ‘Something went wrong. Please try again.’);
} finally {
setLoading(loginBtn, loginSpinner, loginIcon, false);
}
}

function recordFailedAttempt() {
const n = getAttempts() + 1;
setAttempts(n);
const left = MAX_ATTEMPTS - n;
shakeCustomerDots();

if (n >= MAX_ATTEMPTS) {
setLockExpiry(Date.now() + LOCK_SECS * 1000);
startLockCountdown();
showErr(pinError, ‘Too many failed attempts. Account temporarily locked.’);
} else {
showErr(pinError, `Incorrect phone or PIN. ${left} attempt${left !== 1 ? 's' : ''} remaining.`);
}

customerPin = ‘’;
customerPinHidden.value = ‘’;
refreshCustomerDots();
setLoading(loginBtn, loginSpinner, loginIcon, false);
}

/* ══════════════════════════════════════════════
ADMIN / STAFF LOGIN DISPATCHER
══════════════════════════════════════════════ */
adminLoginBtn.addEventListener(‘click’, () => {
if (activeRole === ‘staff’) {
handleStaffLogin();
} else {
handleAdminEmailLogin();
}
});

/* ── SUPER ADMIN + TENANT ADMIN (Supabase email/password auth) */
async function handleAdminEmailLogin() {
const email    = adminEmail.value.trim();
const password = adminPassword.value;

if (!email)    { showErr(adminError, ‘Please enter your email address.’); return; }
if (!password) { showErr(adminError, ‘Please enter your password.’); return; }
if (activeRole === ‘tenant’ && !tenantDropdown.value) {
showErr(adminError, ‘Please select a venue first.’);
return;
}

setLoading(adminLoginBtn, adminSpinner, adminIcon, true, adminBtnText);

try {
const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) throw authErr;

```
const uid = authData.user.id;

// Verify role in your profiles / users table
const { data: profile, error: profErr } = await supabase
  .from('profiles')        // ← adjust table name if needed
  .select('role, tenant_id, is_active')
  .eq('id', uid)
  .maybeSingle();

if (profErr || !profile) {
  await supabase.auth.signOut();
  throw new Error('Profile not found. Contact your administrator.');
}

if (!profile.is_active) {
  await supabase.auth.signOut();
  throw new Error('This account has been deactivated.');
}

const requiredRole = activeRole === 'super' ? 'super_administrator' : 'tenant_admin';

if (profile.role !== requiredRole) {
  await supabase.auth.signOut();
  const label = activeRole === 'super' ? 'Super Admin' : 'Tenant Admin';
  throw new Error(`Access denied — you do not have ${label} privileges.`);
}

if (activeRole === 'tenant') {
  // Tenant admin must match the selected venue
  if (String(profile.tenant_id) !== String(tenantDropdown.value)) {
    await supabase.auth.signOut();
    throw new Error('You are not assigned to the selected venue.');
  }
}

showToast('Login successful! Redirecting…', 'success');
const dest = activeRole === 'super' ? 'super-admin/dashboard.html' : 'tenant/dashboard.html';
setTimeout(() => { window.location.href = dest; }, 900);
```

} catch (err) {
console.error(‘Admin login error:’, err);
showErr(adminError, err.message || ‘Login failed. Please try again.’);
setLoading(adminLoginBtn, adminSpinner, adminIcon, false, adminBtnText, ‘Login’);
}
}

/* ── STAFF (8-digit PIN against your staff table) */
async function handleStaffLogin() {
const pin = staffPinHidden.value;

if (pin.length < 8) {
showErr(adminError, ‘Please enter your complete 8-digit PIN.’);
return;
}

setLoading(adminLoginBtn, adminSpinner, adminIcon, true, adminBtnText);

try {
const { data, error } = await supabase
.from(‘staff’)           // ← adjust table name if needed
.select(‘id, name, is_active, tenant_id’)
.eq(‘pin_hash’, pin)     // ← adjust column name; use hashing in production
.maybeSingle();

```
if (!data) throw new Error('Invalid staff PIN. Please try again.');
if (!data.is_active) throw new Error('This staff account is inactive.');

showToast(`Welcome, ${data.name}! ✅`, 'success');
sessionStorage.setItem('vp_staff', JSON.stringify({ id: data.id, name: data.name, tenantId: data.tenant_id }));
sessionStorage.setItem('vp_role', 'staff');
setTimeout(() => { window.location.href = 'staff/dashboard.html'; }, 900);
```

} catch (err) {
console.error(‘Staff login error:’, err);
showErr(adminError, err.message || ‘Login failed.’);
staffPin = ‘’;
staffPinHidden.value = ‘’;
refreshStaffDots();
setLoading(adminLoginBtn, adminSpinner, adminIcon, false, adminBtnText, ‘Sign In’);
}
}

/* ══════════════════════════════════════════════
CREATE ACCOUNT
══════════════════════════════════════════════ */
createAccountBtn.addEventListener(‘click’, () => {
window.location.href = ‘register.html’; // ← adjust path
});

/* ══════════════════════════════════════════════
PHONE INPUT — digits only
══════════════════════════════════════════════ */
customerPhone.addEventListener(‘input’, () => {
customerPhone.value = customerPhone.value.replace(/\D/g, ‘’);
});

/* ══════════════════════════════════════════════
PHYSICAL KEYBOARD SUPPORT (desktop / attached keyboard)
══════════════════════════════════════════════ */
document.addEventListener(‘keydown’, e => {
// Don’t intercept if modal is open or phone field is focused
if (adminBackdrop.classList.contains(‘open’)) return;
if (document.activeElement === customerPhone) return;

if (/^[0-9]$/.test(e.key) && customerPin.length < 4) {
customerPin += e.key;
customerPinHidden.value = customerPin;
refreshCustomerDots();
} else if (e.key === ‘Backspace’) {
customerPin = customerPin.slice(0, -1);
customerPinHidden.value = customerPin;
refreshCustomerDots();
} else if (e.key === ‘Enter’) {
loginBtn.click();
}
});

/* ══════════════════════════════════════════════
CHECK LOCK ON PAGE LOAD
══════════════════════════════════════════════ */
if (isLocked()) startLockCountdown();
