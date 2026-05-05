import { supabase } from '../../config/supabase.js';

// ========== STATE ==========
const state = {
  passType: 'general',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
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

setTimeout(() => selectPass('general'), 300);

s1Cta.addEventListener('click', () => goToStep(2));

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

function validateStep2() {
  clearErrors();
  let ok = true;

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  if (!firstName) { showError('firstName'); ok = false; }
  if (!lastName) { showError('lastName'); ok = false; }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('email'); ok = false;
  }

  if (!phone || phone.length < 10) {
    showError('phone'); ok = false;
  }

  if (!password || password.length < 6) {
    showError('password'); ok = false;
  }

  if (password !== confirmPassword) {
    showError('confirmPassword'); ok = false;
  }

  if (!state.termsAccepted) {
    showError('terms'); ok = false;
  }

  if (ok) {
    state.firstName = firstName;
    state.lastName = lastName;
    state.email = email;
    state.phone = phone;
    state.password = password;
  }

  return ok;
}

document.getElementById('s2Cta').addEventListener('click', async () => {
  if (!validateStep2()) return;
  goToStep(3);
});

// ========== STEP 3 (AUTH ONLY - DB TRIGGERS HANDLE EVERYTHING) ==========
document.getElementById('s3Cta').addEventListener('click', async () => {
  const btn = document.getElementById('s3Cta');

  btn.disabled = true;
  btn.querySelector('span').textContent = 'CREATING...';

  try {
    const { data, error } = await supabase.auth.signUp({
      email: state.email,
      password: state.password,
      options: {
        data: {
          full_name: state.firstName + ' ' + state.lastName,
          phone: state.phone,
          account_type: state.passType
        }
      }
    });

    if (error) throw error;

    goToStep(4);

  } catch (err) {
    console.error(err);
    alert(err.message || 'Registration failed');

    btn.disabled = false;
    btn.querySelector('span').textContent = 'Start Vibing Now';
  }
});

// ========== FINAL ==========
document.getElementById('exploreBtn').addEventListener('click', () => {
  window.location.href = 'home.html';
});
