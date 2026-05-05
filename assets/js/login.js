import { signIn, getUserRole, redirectByRole } from './authService.js';

// DOM
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginBtnLabel = document.getElementById('loginBtnLabel');
const authError = document.getElementById('authError');

// UI HELPERS
function showAuthError(message) {
  if (!authError) return;
  authError.textContent = message;
  authError.classList.add('visible');
}

function hideAuthError() {
  if (authError) authError.classList.remove('visible');
}

function setLoading(state) {
  if (!loginBtn || !loginBtnLabel) return;

  loginBtn.disabled = state;
  loginBtn.classList.toggle('loading', state);
  loginBtnLabel.textContent = state ? 'SIGNING IN...' : 'SIGN IN';
}

// LOGIN FLOW (SAFE)
async function handleLogin() {
  hideAuthError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showAuthError('Enter email and password');
    return;
  }

  setLoading(true);

  try {
    const { user, error } = await signIn(email, password);

    if (error || !user) {
      throw new Error(error || 'Login failed');
    }

    // KEEP YOUR ROLE SYSTEM (IMPORTANT)
    const { role } = await getUserRole(user.id);

    redirectByRole(role);

  } catch (err) {
    showAuthError(err.message);
  } finally {
    setLoading(false);
  }
}

// EVENTS
loginBtn?.addEventListener('click', handleLogin);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});
