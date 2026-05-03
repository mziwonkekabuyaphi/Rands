import { supabase } from '../../config/supabase.js';

// ========== HELPERS (NEW - PRODUCTION SAFE) ==========
function normalizePhone(phone) {
  let digits = phone.replace(/\D/g, '');

  // SA format: 082... → +2782...
  if (digits.startsWith('0')) {
    digits = '27' + digits.slice(1);
  }

  return '+' + digits;
}

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== STATE ==========
const state = {
  passType: 'general',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  pin: '',
  termsAccepted: false,
};

let currentStep = 1;

// ========== NAVIGATION ==========
function goToStep(n) {
  const views = {
    1: document.getElementById('step1'),
    2: document.getElementById('step2'),
    3: document.getElementById('step3'),
    4: document.getElementById('stepSuccess')
  };

  const from = views[currentStep];
  const to = views[n];
  if (!from || !to) return;

  const forward = n > currentStep;

  from.classList.remove('active');
  from.classList.add(forward ? 'exit-left' : 'enter-right');

  to.style.transition = 'none';
  to.classList.remove('active', 'exit-left', 'enter-right');
  to.classList.add(forward ? 'enter-right' : 'exit-left');

  to.offsetHeight;
  to.style.transition = '';

  requestAnimationFrame(() => {
    to.classList.remove('enter-right', 'exit-left');
    to.classList.add('active');
    to.scrollTop = 0;
  });

  setTimeout(() => {
    from.classList.remove('exit-left', 'enter-right', 'active');
  }, 420);

  currentStep = n;
}

// ========== STEP 1 ==========
const cardGeneral = document.getElementById('cardGeneral');
const cardVip = document.getElementById('cardVip');
const s1Cta = document.getElementById('s1Cta');
const s1CtaText = document.getElementById('s1CtaText');
const s1CtaNote = document.getElementById('s1CtaNote');
const compareBtn = document.getElementById('compareBtn');
const sheet = document.getElementById('sheet');
const backdrop = document.getElementById('backdrop');

function selectPass(type) {
  state.passType = type;

  cardGeneral.classList.toggle('selected', type === 'general');
  cardVip.classList.toggle('selected', type === 'vip');

  if (type === 'general') {
    s1Cta.className = 'cta-btn free-cta';
    s1CtaText.textContent = 'GET STARTED FREE';
    s1CtaNote.textContent = 'No credit card needed · Takes 2 minutes';
  } else {
    s1Cta.className = 'cta-btn vip-cta';
    s1CtaText.textContent = 'UNLOCK VIP XPERIENCE';
    s1CtaNote.textContent = 'One-time R50 · Yours forever';
  }
}

cardGeneral.addEventListener('click', () => selectPass('general'));
cardVip.addEventListener('click', () => selectPass('vip'));

setTimeout(() => selectPass('general'), 400);

s1Cta.addEventListener('click', () => goToStep(2));

compareBtn.addEventListener('click', () => {
  sheet.classList.add('open');
  backdrop.classList.add('open');
});

backdrop.addEventListener('click', () => {
  sheet.classList.remove('open');
  backdrop.classList.remove('open');
});

// ========== STEP 2 ==========
document.getElementById('s2Back').addEventListener('click', () => goToStep(1));

const termsCheck = document.getElementById('termsCheck');

function toggleTerms() {
  state.termsAccepted = !state.termsAccepted;
  termsCheck.classList.toggle('checked', state.termsAccepted);
  termsCheck.setAttribute('aria-checked', state.termsAccepted);
  if (state.termsAccepted) hideError('terms');
}

termsCheck.addEventListener('click', toggleTerms);

// ========== VALIDATION ==========
function showError(id) {
  const el = document.getElementById('err-' + id);
  if (el) el.classList.add('visible');

  const input = document.getElementById(id);
  if (input) input.classList.add('has-error');
}

function hideError(id) {
  const el = document.getElementById('err-' + id);
  if (el) el.classList.remove('visible');

  const input = document.getElementById(id);
  if (input) input.classList.remove('has-error');
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.field-input').forEach(e => e.classList.remove('has-error'));
}

function validateStep2() {
  clearErrors();
  let ok = true;

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const pin = document.getElementById('pin').value.trim();
  const confirmPin = document.getElementById('confirmPin').value.trim();

  if (!firstName) { showError('firstName'); ok = false; }
  if (!lastName) { showError('lastName'); ok = false; }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('email'); ok = false;
  }

  if (!phone || !/^\d{10}$/.test(phone)) {
    showError('phone'); ok = false;
  }

  if (!pin || !/^\d{4}$/.test(pin)) {
    showError('pin'); ok = false;
  }

  if (pin !== confirmPin) {
    showError('confirmPin'); ok = false;
  }

  if (!state.termsAccepted) {
    showError('terms'); ok = false;
  }

  if (ok) {
    state.firstName = firstName;
    state.lastName = lastName;
    state.email = email;
    state.phone = normalizePhone(phone); // ✅ FIXED
    state.pin = pin;
  }

  return ok;
}

document.getElementById('s2Cta').addEventListener('click', () => {
  if (!validateStep2()) return;
  populateStep3();
  goToStep(3);
});

// ========== CARD SYSTEM ==========
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #1a0038, #2d0050)',
  'linear-gradient(135deg, #0a0a0a, #1a1a1a, #2a2a2a)',
  'linear-gradient(135deg, #3b1e1e, #5e2a2a, #8b3c3c)',
  'linear-gradient(135deg, #0b3b2f, #1b5e4a, #2b8e6e)',
  'linear-gradient(135deg, #1e2a5e, #2a3f7e, #3c5a9e)'
];

function generateCardNumber(phone) {
  let digits = phone.replace(/\D/g, '');
  digits = digits.padEnd(10, '0').slice(0, 10);

  const BIN = state.passType === 'vip' ? "5399VIP" : "5399GEN";
  const body = digits.slice(1);

  return (BIN + body).match(/.{1,4}/g).join(' ');
}

function getGradient(phone) {
  let hash = 0;
  for (let c of phone) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(hash) % CARD_GRADIENTS.length;
}

// ========== STEP 3 UI ==========
function populateStep3() {
  const fullName = `${state.firstName} ${state.lastName}`.toUpperCase();
  const isVip = state.passType === 'vip';

  const phoneDigits = state.phone.replace(/\D/g, '');

  const walletId = `WLT-${phoneDigits}`;
  const accountNumber = state.phone;

  document.getElementById('walletIdDisplay').textContent = walletId;
  document.getElementById('accountNumberDisplay').textContent = accountNumber;

  document.getElementById('amountPrice').textContent = isVip ? 'R50' : 'FREE';

  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 3);

  document.getElementById('dynamicCardNumber').textContent =
    generateCardNumber(state.phone);

  document.getElementById('dynamicCardHolder').textContent = fullName;

  document.getElementById('dynamicExpiry').textContent =
    `${String(expiry.getMonth() + 1).padStart(2, '0')}/${String(expiry.getFullYear()).slice(-2)}`;

  document.getElementById('dynamicCardFront').style.background =
    CARD_GRADIENTS[getGradient(state.phone)];
}

// ========== STEP 3 AUTH ==========
document.getElementById('s3Cta').addEventListener('click', async () => {
  const btn = document.getElementById('s3Cta');

  btn.disabled = true;
  btn.style.transform = 'scale(0.96)';
  btn.querySelector('span').textContent = 'CREATING...';

  try {
    const pinHash = await hashPin(state.pin);

    const internalEmail = state.phone.replace('+', '') + '@rands.app';

    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password: crypto.randomUUID(),
      options: {
        data: {
          role: 'customer',
          phone: state.phone
        }
      }
    });

    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error('User creation failed');

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      email: internalEmail,
      role: 'customer',
      account_type: state.passType,
      name: state.firstName,
      surname: state.lastName,
      phone: state.phone,
      pin_hash: pinHash,
      created_at: new Date().toISOString()
    });

    if (profileError) throw profileError;

    const { error: walletError } = await supabase.from('wallets').insert({
      user_id: user.id,
      wallet_id: `WLT-${state.phone}`,
      balance: 0,
      currency: 'ZAR',
      created_at: new Date().toISOString()
    });

    if (walletError) throw walletError;

    const isVip = state.passType === 'vip';

    document.getElementById('successIcon').textContent = isVip ? '🔥' : '🎟️';
    document.getElementById('successSub').innerHTML =
      `Welcome aboard, <strong>${state.firstName}</strong>!`;

    goToStep(4);

  } catch (err) {
    console.error(err);

    alert(err.message);

    btn.disabled = false;
    btn.querySelector('span').textContent = 'Start Vibing Now';
    btn.style.transform = '';
  }
});

// ========== FINAL ==========
document.getElementById('exploreBtn').addEventListener('click', () => {
  window.location.href = 'onboarding.html';
});
