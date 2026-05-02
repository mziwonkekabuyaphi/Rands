/**

- login.js  –  Vibe Passport Login Logic
- Path: assets/js/login.js
- 
- Imports supabase client from: ../../config/supabase.js
- (Two levels up from assets/js/ → project root → config/)
  */

import { supabase } from ‘../../config/supabase.js’;

/* ══════════════════════════════════════════════════
CONSTANTS
══════════════════════════════════════════════════ */
const MAX_ATTEMPTS   = 5;
const LOCK_DURATION  = 300; // seconds (5 min)
const TAP_TARGET     = 6;   // logo taps to open admin modal
const LONG_PRESS_MS  = 1200; // ms for staff modal

/* ══════════════════════════════════════════════════
DOM REFS
══════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

// Customer
const customerPhone     = $(‘customerPhone’);
const customerPinHidden = $(‘customerPinHidden’);
const loginBtn          = $(‘loginBtn’);
const loginSpinner      = $(‘loginSpinner’);
const loginIcon         = $(‘loginIcon’);
const pinError          = $(‘pinError’);
const lockTimerEl       = $(‘lockTimer’);
const createAccountBtn  = $(‘createAccountBtn’);

// Logo tap
const logoRing          = $(‘logoRing’);
const tapBadge          = $(‘tapBadge’);

// Modal
const adminBackdrop     = $(‘adminBackdrop’);
const adminModal        = $(‘adminModal’);
const modalClose        = $(‘modalClose’);
const modalTabs         = adminBackdrop.querySelectorAll(’.modal-tab’);

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
const toastEl           = $(‘toast’);

/* ══════════════════════════════════════════════════
STATE
══════════════════════════════════════════════════ */
let customerPin  = ‘’;
let staffPin     = ‘’;
let activeRole   = ‘super’;   // ‘super’ | ‘tenant’ | ‘staff’
let lockInterval = null;
let tapCount     = 0;
let tapTimeout   = null;
let longPressTimer = null;

/* ══════════════════════════════════════════════════
TOAST
══════════════════════════════════════════════════ */
function showToast(msg, type = ‘default’, duration = 3000) {
toastEl.textContent = msg;
toastEl.className   = ’show ’ + type;
clearTimeout(toastEl._t);
toastEl._t = setTimeout(() => { toastEl.className = ‘’; }, duration);
}

/* ══════════════════════════════════════════════════
CUSTOMER PIN PAD
══════════════════════════════════════════════════ */
function updateCustomerDots() {
for (let i = 0; i < 4; i++) {
const dot = $(`cdot-${i}`);
dot.classList.toggle(‘filled’, i < customerPin.length);
dot.classList.remove(‘error’);
}
}

function shakeCustomerDots() {
for (let i = 0; i < 4; i++) {
const dot = $(`cdot-${i}`);
dot.classList.add(‘error’);
setTimeout(() => dot.classList.remove(‘error’), 600);
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
updateCustomerDots();
clearError(pinError, lockTimerEl);
});

/* ══════════════════════════════════════════════════
STAFF PIN PAD
══════════════════════════════════════════════════ */
function updateStaffDots() {
for (let i = 0; i < 8; i++) {
const dot = $(`sdot-${i}`);
dot.classList.toggle(‘filled’, i < staffPin.length);
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
updateStaffDots();
clearError(adminError);
});

/* ══════════════════════════════════════════════════
ERROR HELPERS
══════════════════════════════════════════════════ */
function showError(el, msg) {
el.textContent = msg;
el.style.display = ‘block’;
}

function clearError(…els) {
els.forEach(el => { if (el) { el.textContent = ‘’; el.style.display = ‘none’; } });
}

/* ══════════════════════════════════════════════════
ACCOUNT LOCK (customer)
══════════════════════════════════════════════════ */
function getAttempts()    { return parseInt(localStorage.getItem(‘vp_attempts’)  || ‘0’); }
function setAttempts(n)   { localStorage.setItem(‘vp_attempts’, n); }
function getLockExpiry()  { return parseInt(localStorage.getItem(‘vp_lock_until’) || ‘0’); }
function setLockExpiry(t) { localStorage.setItem(‘vp_lock_until’, t); }
function clearLock()      { localStorage.removeItem(‘vp_attempts’); localStorage.removeItem(‘vp_lock_until’); }

function isLocked() {
const expiry = getLockExpiry();
return expiry && Date.now() < expiry;
}

function startLockTimer() {
clearInterval(lockInterval);
lockTimerEl.style.display = ‘block’;

lockInterval = setInterval(() => {
const remaining = Math.ceil((getLockExpiry() - Date.now()) / 1000);
if (remaining <= 0) {
clearInterval(lockInterval);
lockTimerEl.style.display = ‘none’;
clearLock();
return;
}
const m = Math.floor(remaining / 60).toString().padStart(2, ‘0’);
const s = (remaining % 60).toString().padStart(2, ‘0’);
lockTimerEl.textContent = `🔒 Too many attempts. Try again in ${m}:${s}`;
}, 1000);
}

/* ══════════════════════════════════════════════════
LOGO TAP (6×) → Admin modal
LOGO LONG PRESS (1.2s) → Staff modal
══════════════════════════════════════════════════ */
logoRing.addEventListener(‘pointerdown’, () => {
longPressTimer = setTimeout(() => {
longPressTimer = null;
tapCount = 0;
tapBadge.classList.remove(‘visible’);
openModal(‘staff’);
}, LONG_PRESS_MS);
});

logoRing.addEventListener(‘pointerup’,    cancelLongPress);
logoRing.addEventListener(‘pointerleave’, cancelLongPress);

function cancelLongPress() {
if (longPressTimer) {
clearTimeout(longPressTimer);
longPressTimer = null;
handleTap();
}
}

function handleTap() {
tapCount++;

// Ripple animation
logoRing.classList.remove(‘tapped’);
void logoRing.offsetWidth;
logoRing.classList.add(‘tapped’);

// Show badge
tapBadge.textContent = tapCount;
tapBadge.classList.add(‘visible’);

clearTimeout(tapTimeout);

if (tapCount >= TAP_TARGET) {
tapCount = 0;
tapBadge.classList.remove(‘visible’);
openModal(‘super’);
return;
}

tapTimeout = setTimeout(() => {
tapCount = 0;
tapBadge.classList.remove(‘visible’);
}, 1800);
}

/* ══════════════════════════════════════════════════
MODAL OPEN / CLOSE
══════════════════════════════════════════════════ */
function openModal(role) {
// staff tab only visible when triggered by long press
const staffTab = $(‘tabStaff’);
if (role === ‘staff’) {
staffTab.classList.remove(‘hidden’);
} else {
staffTab.classList.add(‘hidden’);
}

setActiveTab(role);
adminBackdrop.classList.add(‘open’);
}

function closeModal() {
adminBackdrop.classList.remove(‘open’);
clearError(adminError);
adminEmail.value    = ‘’;
adminPassword.value = ‘’;
staffPin            = ‘’;
staffPinHidden.value = ‘’;
updateStaffDots();
}

modalClose.addEventListener(‘click’, closeModal);
adminBackdrop.addEventListener(‘click’, e => {
if (e.target === adminBackdrop) closeModal();
});

/* ══════════════════════════════════════════════════
TAB SWITCHING
══════════════════════════════════════════════════ */
modalTabs.forEach(tab => {
tab.addEventListener(‘click’, () => setActiveTab(tab.dataset.role));
});

function setActiveTab(role) {
activeRole = role;
modalTabs.forEach(t => t.classList.toggle(‘active’, t.dataset.role === role));

// Labels
const labels = {
super:  ‘Super Admin Login’,
tenant: ‘Tenant Admin Login’,
staff:  ‘Staff Login’,
};
adminFormLabel.textContent = labels[role] || ‘Login’;

// Show/hide sections
const isStaff  = role === ‘staff’;
const isTenant = role === ‘tenant’;

emailPasswordSec.classList.toggle(‘hidden’, isStaff);
staffSection.classList.toggle(‘hidden’, !isStaff);
venueGroup.classList.toggle(‘hidden’, !isTenant);

// Button text
adminBtnText.textContent = isStaff ? ‘Sign In’ : ‘Login’;

clearError(adminError);
staffPin = ‘’;
staffPinHidden.value = ‘’;
updateStaffDots();
}

/* ══════════════════════════════════════════════════
PASSWORD TOGGLE
══════════════════════════════════════════════════ */
pwToggle.addEventListener(‘click’, () => {
const isText = adminPassword.type === ‘text’;
adminPassword.type = isText ? ‘password’ : ‘text’;
pwToggle.innerHTML = isText
? ‘<i class="fas fa-eye"></i>’
: ‘<i class="fas fa-eye-slash"></i>’;
});

/* ══════════════════════════════════════════════════
LOAD TENANTS (for tenant dropdown)
══════════════════════════════════════════════════ */
async function loadTenants() {
try {
const { data, error } = await supabase
.from(‘tenants’)         // adjust table name if needed
.select(‘id, name’)
.eq(‘is_active’, true)
.order(‘name’);

```
if (error) throw error;

tenantDropdown.innerHTML = '<option value="">— Choose Venue —</option>';
(data || []).forEach(t => {
  const opt = document.createElement('option');
  opt.value       = t.id;
  opt.textContent = t.name;
  tenantDropdown.appendChild(opt);
});
```

} catch (err) {
console.warn(‘Could not load tenants:’, err.message);
}
}

loadTenants();

/* ══════════════════════════════════════════════════
CUSTOMER LOGIN
══════════════════════════════════════════════════ */
loginBtn.addEventListener(‘click’, handleCustomerLogin);

async function handleCustomerLogin() {
clearError(pinError, lockTimerEl);

if (isLocked()) { startLockTimer(); return; }

const phone = customerPhone.value.trim().replace(/\s/g, ‘’);
const pin   = customerPinHidden.value;

// Validate
if (!phone || phone.length < 9) {
showError(pinError, ‘Please enter a valid phone number.’);
return;
}
if (pin.length < 4) {
showError(pinError, ‘Please enter your 4-digit PIN.’);
shakeCustomerDots();
return;
}

// Loading state
setLoading(loginBtn, loginSpinner, loginIcon, true);

try {
// Look up customer by phone + pin in your customers table
const fullPhone = ‘+27’ + phone.replace(/^0/, ‘’);

```
const { data, error } = await supabase
  .from('customers')           // adjust table name if needed
  .select('id, name, phone, pin_hash, is_active')
  .eq('phone', fullPhone)
  .single();

if (error || !data) {
  handleFailedAttempt();
  return;
}

if (!data.is_active) {
  showError(pinError, 'Account is inactive. Contact support.');
  setLoading(loginBtn, loginSpinner, loginIcon, false);
  return;
}

// PIN comparison
// If you hash PINs, replace this with your hashing/verification logic
const pinMatch = data.pin_hash === pin; // or bcrypt compare, etc.

if (!pinMatch) {
  handleFailedAttempt();
  return;
}

// Success
clearLock();
showToast(`Welcome back! 🎉`, 'success');

// Store session info
sessionStorage.setItem('vp_customer', JSON.stringify({ id: data.id, name: data.name, phone: data.phone }));
sessionStorage.setItem('vp_role', 'customer');

// Redirect — adjust path as needed
setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
```

} catch (err) {
showError(pinError, ‘Something went wrong. Please try again.’);
console.error(err);
} finally {
setLoading(loginBtn, loginSpinner, loginIcon, false);
}
}

function handleFailedAttempt() {
const attempts = getAttempts() + 1;
setAttempts(attempts);

const remaining = MAX_ATTEMPTS - attempts;
shakeCustomerDots();

if (attempts >= MAX_ATTEMPTS) {
setLockExpiry(Date.now() + LOCK_DURATION * 1000);
startLockTimer();
showError(pinError, ‘Too many attempts. Account temporarily locked.’);
} else {
showError(pinError, `Incorrect phone or PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
}

customerPin = ‘’;
customerPinHidden.value = ‘’;
updateCustomerDots();
setLoading(loginBtn, loginSpinner, loginIcon, false);
}

/* ══════════════════════════════════════════════════
ADMIN / STAFF LOGIN
══════════════════════════════════════════════════ */
adminLoginBtn.addEventListener(‘click’, handleAdminLogin);

async function handleAdminLogin() {
clearError(adminError);

if (activeRole === ‘staff’) {
await handleStaffLogin();
} else {
await handleEmailPasswordLogin();
}
}

async function handleEmailPasswordLogin() {
const email    = adminEmail.value.trim();
const password = adminPassword.value;

if (!email) { showError(adminError, ‘Please enter your email.’); return; }
if (!password) { showError(adminError, ‘Please enter your password.’); return; }

if (activeRole === ‘tenant’ && !tenantDropdown.value) {
showError(adminError, ‘Please select a venue.’);
return;
}

setLoading(adminLoginBtn, adminSpinner, adminIcon, true, adminBtnText);

try {
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

```
if (error) throw error;

const user = data.user;

// Verify role from user metadata or profiles table
const { data: profile, error: profErr } = await supabase
  .from('profiles')            // adjust table name if needed
  .select('role, tenant_id, is_active')
  .eq('id', user.id)
  .single();

if (profErr || !profile) {
  await supabase.auth.signOut();
  throw new Error('Profile not found.');
}

if (!profile.is_active) {
  await supabase.auth.signOut();
  throw new Error('Account is inactive.');
}

const expectedRole = activeRole === 'super' ? 'super_administrator' : 'tenant_admin';

if (profile.role !== expectedRole) {
  await supabase.auth.signOut();
  throw new Error(`Access denied. You do not have ${activeRole === 'super' ? 'Super Admin' : 'Tenant Admin'} privileges.`);
}

if (activeRole === 'tenant' && profile.tenant_id !== tenantDropdown.value) {
  await supabase.auth.signOut();
  throw new Error('You are not assigned to this venue.');
}

showToast('Login successful! Redirecting…', 'success');

const redirect = activeRole === 'super' ? 'super-admin/dashboard.html' : 'tenant/dashboard.html';
setTimeout(() => { window.location.href = redirect; }, 900);
```

} catch (err) {
showError(adminError, err.message || ‘Login failed. Please try again.’);
setLoading(adminLoginBtn, adminSpinner, adminIcon, false, adminBtnText, ‘Login’);
}
}

async function handleStaffLogin() {
const pin = staffPinHidden.value;

if (pin.length < 8) {
showError(adminError, ‘Please enter your full 8-digit PIN.’);
return;
}

setLoading(adminLoginBtn, adminSpinner, adminIcon, true, adminBtnText);

try {
const { data, error } = await supabase
.from(‘staff’)               // adjust table name if needed
.select(‘id, name, is_active, pin_hash, tenant_id’)
.eq(‘pin_hash’, pin)         // replace with hashed comparison as needed
.single();

```
if (error || !data) throw new Error('Invalid staff PIN.');
if (!data.is_active) throw new Error('Staff account is inactive.');

showToast(`Welcome, ${data.name}! ✅`, 'success');
sessionStorage.setItem('vp_staff',  JSON.stringify({ id: data.id, name: data.name, tenantId: data.tenant_id }));
sessionStorage.setItem('vp_role', 'staff');

setTimeout(() => { window.location.href = 'staff/dashboard.html'; }, 900);
```

} catch (err) {
showError(adminError, err.message || ‘Login failed.’);
staffPin = ‘’;
staffPinHidden.value = ‘’;
updateStaffDots();
setLoading(adminLoginBtn, adminSpinner, adminIcon, false, adminBtnText, ‘Sign In’);
}
}

/* ══════════════════════════════════════════════════
CREATE ACCOUNT
══════════════════════════════════════════════════ */
createAccountBtn.addEventListener(‘click’, () => {
window.location.href = ‘register.html’; // adjust as needed
});

/* ══════════════════════════════════════════════════
LOADING STATE HELPER
══════════════════════════════════════════════════ */
function setLoading(btn, spinner, icon, isLoading, textEl, resetText = ‘’) {
btn.disabled    = isLoading;
spinner.classList.toggle(‘active’, isLoading);
icon.style.display = isLoading ? ‘none’ : ‘’;
if (textEl) textEl.textContent = isLoading ? ‘Please wait…’ : resetText || textEl.textContent;
}

/* ══════════════════════════════════════════════════
PHONE INPUT — digits only
══════════════════════════════════════════════════ */
customerPhone.addEventListener(‘input’, () => {
customerPhone.value = customerPhone.value.replace(/\D/g, ‘’);
});

/* ══════════════════════════════════════════════════
CHECK LOCK ON LOAD
══════════════════════════════════════════════════ */
if (isLocked()) startLockTimer();

/* ══════════════════════════════════════════════════
KEYBOARD SUPPORT (physical keyboard → customer PIN)
══════════════════════════════════════════════════ */
document.addEventListener(‘keydown’, e => {
if (adminBackdrop.classList.contains(‘open’)) return;
if (document.activeElement === customerPhone) return;

if (/^[0-9]$/.test(e.key) && customerPin.length < 4) {
customerPin += e.key;
customerPinHidden.value = customerPin;
updateCustomerDots();
}
if (e.key === ‘Backspace’) {
customerPin = customerPin.slice(0, -1);
customerPinHidden.value = customerPin;
updateCustomerDots();
}
if (e.key === ‘Enter’) loginBtn.click();
});
