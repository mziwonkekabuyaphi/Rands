// ========== ALL JAVASCRIPT REMAINS UNCHANGED except the populateStep3 function to update the new detail rows ==========
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

compareBtn.addEventListener('click', () => { sheet.classList.add('open'); backdrop.classList.add('open'); });
backdrop.addEventListener('click', () => { sheet.classList.remove('open'); backdrop.classList.remove('open'); });

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
termsCheck.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleTerms(); } });

function showError(id) { const el = document.getElementById('err-'+id); if(el) el.classList.add('visible'); const inp = document.getElementById(id); if(inp) inp.classList.add('has-error'); }
function hideError(id) { const el = document.getElementById('err-'+id); if(el) el.classList.remove('visible'); const inp = document.getElementById(id); if(inp) inp.classList.remove('has-error'); }
function clearAllErrors() { document.querySelectorAll('.field-error').forEach(e => e.classList.remove('visible')); document.querySelectorAll('.field-input, .field-select').forEach(e => e.classList.remove('has-error')); }

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
  if (!firstName)   { showError('firstName'); ok = false; }
  if (!lastName)    { showError('lastName');  ok = false; }
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

// CARD GENERATION & GRADIENT (unchanged)
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
  const fullCardDigits = BIN + last9;
  return fullCardDigits.match(/.{1,4}/g).join(' ');
}

function getCardColorIndex(phoneDigits) {
  let hash = 0;
  for (let i = 0; i < phoneDigits.length; i++) {
    hash = ((hash << 5) - hash) + phoneDigits.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % CARD_GRADIENTS.length;
}

// STEP 3 population (updated to show Wallet ID and Account number = phone)
const s3Cta = document.getElementById('s3Cta');
const s3Note = document.getElementById('s3CtaNote');
function populateStep3() {
  const isVip = state.passType === 'vip';
  const fullName = `${state.firstName} ${state.lastName}`.toUpperCase();
  const amountRow = document.getElementById('amountRow');
  amountRow.classList.toggle('is-vip', isVip);
  document.getElementById('amountPrice').textContent = isVip ? 'R50' : 'FREE';
  s3Cta.className = isVip ? 'cta-btn vip-cta' : 'cta-btn free-cta';
  document.getElementById('s3CtaText').textContent = 'Start Vibing Now';
  s3Note.textContent = isVip ? 'One-time R50 · Yours forever' : 'Free forever · No card needed';

  // Set Wallet ID and Account number (both = phone number)
  const phoneNumber = state.phone;
  document.getElementById('walletIdDisplay').innerText = phoneNumber;
  document.getElementById('accountNumberDisplay').innerText = phoneNumber;

  // Virtual card details
  const phoneDigits = state.phone.replace(/\D/g, '');
  const cardNumber = generateCardNumber(phoneDigits);
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 3);
  const expMonth = String(expiry.getMonth() + 1).padStart(2, '0');
  const expYear = String(expiry.getFullYear()).slice(-2);
  document.getElementById('dynamicCardNumber').innerText = cardNumber;
  document.getElementById('dynamicCardHolder').innerText = fullName;
  document.getElementById('dynamicExpiry').innerText = `${expMonth}/${expYear}`;
  const cardColorIndex = getCardColorIndex(phoneDigits);
  document.getElementById('dynamicCardFront').style.background = CARD_GRADIENTS[cardColorIndex];
}

document.getElementById('s3Back').addEventListener('click', () => goToStep(2));
document.getElementById('editLink').addEventListener('click', () => goToStep(2));

document.getElementById('s3Cta').addEventListener('click', async () => {
  const btn = document.getElementById('s3Cta')
  btn.style.transform = 'scale(0.96)'
  btn.disabled = true
  btn.querySelector('span').textContent = 'CREATING...'

  try {
    // 1. Create AUTH user
    const { data, error } = await supabase.auth.signUp({
      email: state.email,
      password: state.pin   // ⚠️ you're using PIN as password
    })

    if (error) throw error

    const user = data.user

    // ⚠️ TEMP: hardcode tenant_id for now
    const tenantId = 'c9dcdf76-19f8-44a0-ad5c-f85e10b309a0'

    // 2. Insert into profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        role: 'customer',
        tenant_id: tenantId
      })

    if (profileError) throw profileError

    // 3. SUCCESS UI (your existing logic)
    btn.style.transform = ''
    const isVip = state.passType === 'vip'

    document.getElementById('successIcon').innerHTML = isVip ? '🔥' : '🎟️'
    document.getElementById('successSub').innerHTML =
      `Welcome aboard, <strong>${state.firstName}</strong>! Your ${isVip ? 'VIP Xperience' : 'General Account'} is ready.`

    const successPills = document.getElementById('successPills');
    successPills.innerHTML = isVip
      ? `<div class="success-pill"><div class="success-pill-dot"></div>Skip the queue</div><div class="success-pill"><div class="success-pill-dot"></div>Exclusive events</div><div class="success-pill"><div class="success-pill-dot"></div>Red metal card</div>`
      : `<div class="success-pill"><div class="success-pill-dot"></div>Browse events</div><div class="success-pill"><div class="success-pill-dot"></div>Buy tickets</div><div class="success-pill"><div class="success-pill-dot"></div>Digital wallet</div>`;

    goToStep(4)

  } catch (err) {
    console.error(err)
    alert(err.message)

    btn.disabled = false
    btn.querySelector('span').textContent = 'Start Vibing Now'
    btn.style.transform = ''
  }
})

document.getElementById('exploreBtn').addEventListener('click', () => {
  window.location.href = 'onboarding.html';
});
