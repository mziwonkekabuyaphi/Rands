import { supabase } from '../../config/supabase.js';

// ========== HELPERS ==========
function normalizePhone(phone) {
  let digits = phone.replace(/\D/g, '');

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

// ========== NAV ==========
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
  document.getElementById('err-' + id)?.classList.add('visible');
  document.getElementById(id)?.classList.add('has-error');
}

function hideError(id) {
  document.getElementById('err-' + id)?.classList.remove('visible');
  document.getElementById(id)?.classList.remove('has-error');
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.field-input').forEach(e => e.classList.remove('has-error'));
}

async function checkPhoneExists(phone) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  return !!data;
}

async function validateStep2() {
  clearErrors();
  let ok = true;

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phoneRaw = document.getElementById('phone').value.trim();
  const pin = document.getElementById('pin').value.trim();
  const confirmPin = document.getElementById('confirmPin').value.trim();

  const phone = normalizePhone(phoneRaw);

  if (!firstName) { showError('firstName'); ok = false; }
  if (!lastName) { showError('lastName'); ok = false; }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('email'); ok = false;
  }

  if (!phoneRaw || !/^\d{10}$/.test(phoneRaw)) {
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

  // 🚨 NEW: prevent duplicate phone
  if (ok) {
    const exists = await checkPhoneExists(phone);
    if (exists) {
      showError('phone');
      alert('Phone already registered. Please login.');
      return false;
    }
  }

  if (ok) {
    state.firstName = firstName;
    state.lastName = lastName;
    state.email = email;
    state.phone = phone;
    state.pin = pin;
  }

  return ok;
}

document.getElementById('s2Cta').addEventListener('click', async () => {
  if (!(await validateStep2())) return;
  populateStep3();
  goToStep(3);
});

// ========== STEP 3 AUTH ==========
document.getElementById('s3Cta').addEventListener('click', async () => {
  const btn = document.getElementById('s3Cta');

  btn.disabled = true;
  btn.querySelector('span').textContent = 'CREATING...';

  try {
    const pinHash = await hashPin(state.pin);

    const internalEmail = state.phone.replace('+', '') + '@rands.app';

    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password: crypto.randomUUID()
    });

    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error('User creation failed');

    await supabase.from('profiles').insert({
      id: user.id,
      email: internalEmail,
      role: 'customer',
      account_type: state.passType,
      name: state.firstName,
      surname: state.lastName,
      phone: state.phone,
      pin_hash: pinHash
    });

    await supabase.from('wallets').insert({
      user_id: user.id,
      wallet_id: `WLT-${state.phone}`,
      balance: 0,
      currency: 'ZAR'
    });

    goToStep(4);

  } catch (err) {
    console.error(err);
    alert(err.message);
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Start Vibing Now';
  }
});

// ========== FINAL ==========
document.getElementById('exploreBtn').addEventListener('click', () => {
  window.location.href = 'onboarding.html';
});
