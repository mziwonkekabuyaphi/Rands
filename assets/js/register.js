import { supabase } from '../../config/supabase.js';

// ========== ALL JAVASCRIPT REMAINS UNCHANGED except Step 3 auth flow ==========
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

function goToStep(n) {
  const views = { 1: document.getElementById('step1'), 2: document.getElementById('step2'), 3: document.getElementById('step3'), 4: document.getElementById('stepSuccess') };
  const from = views[currentStep];
  const to   = views[n];
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

  setTimeout(() => from.classList.remove('exit-left', 'enter-right', 'active'), 420);
  currentStep = n;
}

// STEP 1
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
setTimeout(() => selectPass('general'), 500);

s1Cta.addEventListener('click', () => {
  s1Cta.style.transform = 'scale(0.96)';
  setTimeout(() => { s1Cta.style.transform = ''; }, 160);
  setTimeout(() => goToStep(2), 180);
});

compareBtn.addEventListener('click', () => {
  sheet.classList.add('open');
  backdrop.classList.add('open');
});

backdrop.addEventListener('click', () => {
  sheet.classList.remove('open');
  backdrop.classList.remove('open');
});

// STEP 2
document.getElementById('s2Back').addEventListener('click', () => goToStep(1));

const termsCheck = document.getElementById('termsCheck');

function toggleTerms() {
  state.termsAccepted = !state.termsAccepted;
  termsCheck.classList.toggle('checked', state.termsAccepted);
  termsCheck.setAttribute('aria-checked', state.termsAccepted);
  if (state.termsAccepted) hideError('terms');
}

termsCheck.addEventListener('click', toggleTerms);
termsCheck.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    toggleTerms();
  }
});

function showError(id) {
  const el = document.getElementById('err-'+id);
  if(el) el.classList.add('visible');
  const inp = document.getElementById(id);
  if(inp) inp.classList.add('has-error');
}

function hideError(id) {
  const el = document.getElementById('err-'+id);
  if(el) el.classList.remove('visible');
  const inp = document.getElementById(id);
  if(inp) inp.classList.remove('has-error');
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.field-input, .field-select').forEach(e => e.classList.remove('has-error'));
}

['firstName','lastName','email','phone','pin','confirmPin'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('input', () => hideError(id));
  if(el) el.addEventListener('change', () => hideError(id));
});

function validateStep2() {
  clearAllErrors();
  let ok = true;

  const firstName = document.getElementById('firstName').value.trim();
  const lastName  = document.getElementById('lastName').value.trim();
  const email     = document.getElementById('email').value.trim();
  const phone     = document.getElementById('phone').value.trim();
  const pin       = document.getElementById('pin').value.trim();
  const confirmPin = document.getElementById('confirmPin').value.trim();

  if (!firstName) { showError('firstName'); ok = false; }
  if (!lastName) { showError('lastName'); ok = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('email'); ok = false; }
  if (!phone || !/^\d{10}$/.test(phone)) { showError('phone'); ok = false; }
  if (!pin || !/^\d{4}$/.test(pin)) { showError('pin'); ok = false; }
  if (pin !== confirmPin) { showError('confirmPin'); ok = false; }
  if (!state.termsAccepted) { showError('terms'); ok = false; }

  if (ok) {
    state.firstName = firstName;
    state.lastName  = lastName;
    state.email     = email;
    state.phone     = phone;
    state.pin       = pin;
  }

  return ok;
}

document.getElementById('s2Cta').addEventListener('click', () => {
  if (!validateStep2()) return;
  populateStep3();
  goToStep(3);
});

// CARD SYSTEM (UNCHANGED)
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #1a0038, #2d0050)',
  'linear-gradient(135deg, #0a0a0a, #1a1a1a, #2a2a2a)',
  'linear-gradient(135deg, #3b1e1e, #5e2a2a, #8b3c3c)',
  'linear-gradient(135deg, #0b3b2f, #1b5e4a, #2b8e6e)',
  'linear-gradient(135deg, #1e2a5e, #2a3f7e, #3c5a9e)',
  'linear-gradient(135deg, #4a0e4e, #6b2e7a, #8e4ea6)',
  'linear-gradient(135deg, #2c2c2c, #4a4a4a, #6e6e6e)'
];

function generateCardNumber(phoneDigits) {
  let digits = phoneDigits.replace(/\D/g, '');
  if (digits.length !== 10) digits = digits.padEnd(10, '0').slice(0,10);
  const last9 = digits.slice(1);
  const BIN = "5399213";
  return (BIN + last9).match(/.{1,4}/g).join(' ');
}

function getCardColorIndex(phoneDigits) {
  let hash = 0;
  for (let i = 0; i < phoneDigits.length; i++) {
    hash = ((hash << 5) - hash) + phoneDigits.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % CARD_GRADIENTS.length;
}

// STEP 3 UI
function populateStep3() {
  const isVip = state.passType === 'vip';
  const fullName = `${state.firstName} ${state.lastName}`.toUpperCase();

  document.getElementById('amountPrice').textContent = isVip ? 'R50' : 'FREE';

  const phoneNumber = state.phone;
  document.getElementById('walletIdDisplay').innerText = phoneNumber;
  document.getElementById('accountNumberDisplay').innerText = phoneNumber;

  const phoneDigits = phoneNumber.replace(/\D/g, '');
  const cardNumber = generateCardNumber(phoneDigits);

  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 3);

  document.getElementById('dynamicCardNumber').innerText = cardNumber;
  document.getElementById('dynamicCardHolder').innerText = fullName;
  document.getElementById('dynamicExpiry').innerText =
    `${String(expiry.getMonth()+1).padStart(2,'0')}/${String(expiry.getFullYear()).slice(-2)}`;

  document.getElementById('dynamicCardFront').style.background =
    CARD_GRADIENTS[getCardColorIndex(phoneDigits)];
}

// STEP 3 ACTION (UPDATED CORE LOGIC)
document.getElementById('s3Cta').addEventListener('click', async () => {
  const btn = document.getElementById('s3Cta');
  btn.style.transform = 'scale(0.96)';
  btn.disabled = true;
  btn.querySelector('span').textContent = 'CREATING...';

  try {
    // HYBRID AUTH
    const safeEmail = state.phone + "@rands.local";
    const safePassword = state.pin + "RANDS";

    const { data, error } = await supabase.auth.signUp({
      email: safeEmail,
      password: safePassword
    });

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        throw new Error("User already exists. Please login instead.");
      }
      throw error;
    }

    const user = data.user;
    if (!user) throw new Error("User creation failed");

    // PROFILE
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      email: state.email,
      role: 'customer',
      tenant_id: null,
      name: state.firstName,
      surname: state.lastName,
      phone: state.phone,
      pin: state.pin
    });

    if (profileError) throw profileError;

    // WALLET
    const { error: walletError } = await supabase.from('wallets').insert({
      user_id: user.id,
      balance: 0
    });

    if (walletError) throw walletError;

    // SUCCESS UI
    btn.style.transform = '';
    const isVip = state.passType === 'vip';

    document.getElementById('successIcon').innerHTML = isVip ? '🔥' : '🎟️';
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

document.getElementById('exploreBtn').addEventListener('click', () => {
  window.location.href = 'onboarding.html';
});
