import { supabase } from ‘../../config/supabase.js’;

// ========== STATE ==========
const state = {
passType: ‘general’,
firstName: ‘’,
lastName: ‘’,
email: ‘’,
phone: ‘’,
password: ‘’,
termsAccepted: false,
};

let currentStep = 1;

// ========== NAV ==========
function goToStep(n) {
const views = {
1: document.getElementById(‘step1’),
2: document.getElementById(‘step2’),
3: document.getElementById(‘step3’),
4: document.getElementById(‘stepSuccess’),
};

const from = views[currentStep];
const to   = views[n];
if (!from || !to) return;

const forward = n > currentStep;

from.classList.remove(‘active’);
from.classList.add(forward ? ‘exit-left’ : ‘enter-right’);

to.style.transition = ‘none’;
to.classList.remove(‘active’, ‘exit-left’, ‘enter-right’);
to.classList.add(forward ? ‘enter-right’ : ‘exit-left’);

to.offsetHeight; // force reflow
to.style.transition = ‘’;

requestAnimationFrame(() => {
to.classList.remove(‘enter-right’, ‘exit-left’);
to.classList.add(‘active’);
to.scrollTop = 0;
});

setTimeout(() => {
from.classList.remove(‘exit-left’, ‘enter-right’, ‘active’);
}, 420);

currentStep = n;
}

// ========== STEP 1 — PASS SELECTION ==========
const cardGeneral = document.getElementById(‘cardGeneral’);
const cardVip     = document.getElementById(‘cardVip’);
const s1Cta       = document.getElementById(‘s1Cta’);
const s1CtaText   = document.getElementById(‘s1CtaText’);
const s1CtaNote   = document.getElementById(‘s1CtaNote’);

function selectPass(type) {
state.passType = type;

cardGeneral.classList.toggle(‘selected’, type === ‘general’);
cardVip.classList.toggle(‘selected’, type === ‘vip’);

if (type === ‘general’) {
s1Cta.className    = ‘cta-btn free-cta’;
s1CtaText.textContent = ‘GET STARTED FREE’;
s1CtaNote.textContent = ‘No credit card needed · Takes 2 minutes’;
} else {
s1Cta.className    = ‘cta-btn vip-cta’;
s1CtaText.textContent = ‘UNLOCK VIP XPERIENCE’;
s1CtaNote.textContent = ‘One-time R50 · Yours forever’;
}
}

cardGeneral.addEventListener(‘click’, () => selectPass(‘general’));
cardVip.addEventListener(‘click’,     () => selectPass(‘vip’));

setTimeout(() => selectPass(‘general’), 300);

s1Cta.addEventListener(‘click’, () => goToStep(2));

// ========== BACK BUTTONS ==========
document.getElementById(‘s2Back’).addEventListener(‘click’, () => goToStep(1));
document.getElementById(‘s3Back’).addEventListener(‘click’, () => goToStep(2));

// ========== TERMS CHECKBOX ==========
const termsCheck = document.getElementById(‘termsCheck’);
termsCheck.addEventListener(‘click’, () => {
state.termsAccepted = !state.termsAccepted;
termsCheck.classList.toggle(‘checked’, state.termsAccepted);
termsCheck.setAttribute(‘aria-checked’, String(state.termsAccepted));
if (state.termsAccepted) hideError(‘terms’);
});
termsCheck.addEventListener(‘keydown’, (e) => {
if (e.key === ’ ’ || e.key === ‘Enter’) {
e.preventDefault();
termsCheck.click();
}
});

// ========== VALIDATION HELPERS ==========
function showError(id) {
document.getElementById(‘err-’ + id)?.classList.add(‘visible’);
document.getElementById(id)?.classList.add(‘has-error’);
}

function hideError(id) {
document.getElementById(‘err-’ + id)?.classList.remove(‘visible’);
document.getElementById(id)?.classList.remove(‘has-error’);
}

function clearErrors() {
document.querySelectorAll(’.field-error’).forEach(e => e.classList.remove(‘visible’));
document.querySelectorAll(’.field-input’).forEach(e => e.classList.remove(‘has-error’));
}

// ========== STEP 2 — VALIDATION ==========
function validateStep2() {
clearErrors();
let ok = true;

const firstName       = document.getElementById(‘firstName’).value.trim();
const lastName        = document.getElementById(‘lastName’).value.trim();
const email           = document.getElementById(‘email’).value.trim();
const phone           = document.getElementById(‘phone’).value.trim();
const password        = document.getElementById(‘password’).value;
const confirmPassword = document.getElementById(‘confirmPassword’).value;

if (!firstName) { showError(‘firstName’); ok = false; }
if (!lastName)  { showError(‘lastName’);  ok = false; }

if (!email || !/^[^\s@]+@[^\s@]+.[^\s@]+$/.test(email)) {
showError(‘email’); ok = false;
}

if (!phone || phone.length < 10) {
showError(‘phone’); ok = false;
}

if (!password || password.length < 6) {
showError(‘password’); ok = false;
}

if (password !== confirmPassword) {
showError(‘confirmPassword’); ok = false;
}

if (!state.termsAccepted) {
showError(‘terms’); ok = false;
}

if (ok) {
state.firstName = firstName;
state.lastName  = lastName;
state.email     = email;
state.phone     = phone;
state.password  = password;
}

return ok;
}

// ========== STEP 2 → STEP 3 ==========
document.getElementById(‘s2Cta’).addEventListener(‘click’, () => {
if (!validateStep2()) return;

// Populate confirmation card
const fullName = `${state.firstName} ${state.lastName}`.toUpperCase();
document.getElementById(‘dynamicCardHolder’).textContent = fullName;

const fakeNumber = Array.from({ length: 4 }, () =>
Math.floor(1000 + Math.random() * 9000)
).join(’ ’);
document.getElementById(‘dynamicCardNumber’).textContent = fakeNumber;

const exp = new Date();
exp.setFullYear(exp.getFullYear() + 4);
document.getElementById(‘dynamicExpiry’).textContent =
String(exp.getMonth() + 1).padStart(2, ‘0’) + ‘/’ + String(exp.getFullYear()).slice(-2);

const walletId = ‘RV-’ + Math.random().toString(36).substring(2, 8).toUpperCase();
document.getElementById(‘walletIdDisplay’).textContent      = walletId;
document.getElementById(‘accountNumberDisplay’).textContent = fakeNumber.replace(/\s/g, ‘’);

document.getElementById(‘amountPrice’).textContent =
state.passType === ‘vip’ ? ‘R50’ : ‘FREE’;

// Update CTA text for VIP
if (state.passType === ‘vip’) {
document.getElementById(‘s3CtaText’).textContent = ‘Pay R50 & Start Vibing’;
} else {
document.getElementById(‘s3CtaText’).textContent = ‘Start Vibing Now’;
}

goToStep(3);
});

// ========== STEP 3 — EDIT LINK ==========
document.getElementById(‘editLink’).addEventListener(‘click’, () => goToStep(2));

// ========== STEP 3 — CREATE ACCOUNT ==========
document.getElementById(‘s3Cta’).addEventListener(‘click’, async () => {
const btn     = document.getElementById(‘s3Cta’);
const btnText = document.getElementById(‘s3CtaText’);

btn.disabled       = true;
btnText.textContent = ‘CREATING…’;

try {
const { data, error } = await supabase.auth.signUp({
email:    state.email,
password: state.password,
options: {
data: {
full_name:    `${state.firstName} ${state.lastName}`,
phone:        state.phone,
account_type: state.passType,
},
},
});

```
if (error) throw error;

// DB triggers handle profiles + wallets row creation automatically.
// No manual inserts needed here.

// Personalise success screen
document.querySelector('#successSub strong').textContent = state.firstName;
if (state.passType === 'vip') {
  document.getElementById('successIcon').textContent = '🔥';
  document.getElementById('successSub').innerHTML =
    `Welcome aboard, <strong>${state.firstName}</strong>! Your VIP Xperience pass is ready.`;
}

goToStep(4);
```

} catch (err) {
console.error(‘Registration error:’, err);
alert(err.message || ‘Registration failed. Please try again.’);

```
btn.disabled       = false;
btnText.textContent = state.passType === 'vip' ? 'Pay R50 & Start Vibing' : 'Start Vibing Now';
```

}
});

// ========== STEP 4 — EXPLORE ==========
document.getElementById(‘exploreBtn’).addEventListener(‘click’, () => {
window.location.href = ‘home.html’;
});

// ========== COMPARE SHEET ==========
const backdrop   = document.getElementById(‘backdrop’);
const sheet      = document.getElementById(‘sheet’);
const compareBtn = document.getElementById(‘compareBtn’);

function openSheet()  { sheet.classList.add(‘open’); backdrop.classList.add(‘open’); }
function closeSheet() { sheet.classList.remove(‘open’); backdrop.classList.remove(‘open’); }

compareBtn?.addEventListener(‘click’, openSheet);
backdrop.addEventListener(‘click’, closeSheet);
