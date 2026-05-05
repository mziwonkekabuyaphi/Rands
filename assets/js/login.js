import { signIn, getUserRole, redirectByRole } from '../../config/auth.js';

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginBtnLabel = document.getElementById('loginBtnLabel');
const authError = document.getElementById('authError');

function showAuthError(message) {
  if (!authError) return;
  authError.textContent = message;
  authError.classList.add('visible');
}

function hideAuthError() {
  authError?.classList.remove('visible');
}

function setLoading(state) {
  if (!loginBtn || !loginBtnLabel) return;

  loginBtn.disabled = state;
  loginBtn.classList.toggle('loading', state);
  loginBtnLabel.textContent = state ? 'SIGNING IN...' : 'SIGN IN';
}

async function handleLogin() {
  hideAuthError();

  if (!emailInput || !passwordInput) {
    showAuthError('Login form not loaded');
    return;
  }

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

    const { role } = await getUserRole(user.id);

    console.log("USER ROLE =", role);

    if (!role) {
      throw new Error('No role found for user');
    }

    redirectByRole(role);

  } catch (err) {
    showAuthError(err.message);
  } finally {
    setLoading(false);
  }
}

loginBtn?.addEventListener('click', handleLogin);

document.getElementById('loginForm')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleLogin();
  }
});
