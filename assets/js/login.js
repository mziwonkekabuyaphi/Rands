/**
 * assets/js/login.js — Rands Vibe
 * 
 * Real Supabase auth · role-based redirect · no global variables
 */

import { supabase } from '../../config/supabase.js';

// Role → route map
const ROLE_ROUTES = {
  super_admin:  '/super-admin/dashboard.html',
  tenant_admin: '/tenant/dashboard.html',
  staff:        '/staff/pos.html',
  customer:     '/customer/home.html',
};

// DOM references
const emailInput    = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn      = document.getElementById('loginBtn');
const loginBtnLabel = document.getElementById('loginBtnLabel');
const authError     = document.getElementById('authError');
const togglePwBtn   = document.getElementById('togglePw');
const eyeIcon       = document.getElementById('eyeIcon');
const eyeOffIcon    = document.getElementById('eyeOffIcon');

// UI helpers
function showFieldError(fieldId, message) {
  const errEl   = document.getElementById(`err-${fieldId}`);
  const inputEl = document.getElementById(fieldId);
  if (errEl)   { if (message) errEl.textContent = message; errEl.classList.add('visible'); }
  if (inputEl) inputEl.classList.add('has-error');
}

function hideFieldError(fieldId) {
  document.getElementById(`err-${fieldId}`)?.classList.remove('visible');
  document.getElementById(fieldId)?.classList.remove('has-error');
}

function showAuthError(message) {
  authError.classList.remove('visible');
  authError.offsetHeight; // force reflow
  authError.textContent = message;
  authError.classList.add('visible');
}

function hideAuthError() {
  authError.classList.remove('visible');
}

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtn.classList.toggle('loading', isLoading);
  loginBtnLabel.textContent = isLoading ? 'SIGNING IN…' : 'SIGN IN';
}

// Show / hide password
function setupPasswordToggle() {
  togglePwBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type           = isPassword ? 'text' : 'password';
    eyeIcon.style.display        = isPassword ? 'none' : '';
    eyeOffIcon.style.display     = isPassword ? ''     : 'none';
    togglePwBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });
}

// Validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm() {
  let valid = true;

  if (!EMAIL_RE.test(emailInput.value.trim())) {
    showFieldError('email', 'Enter a valid email address');
    valid = false;
  }

  if (!passwordInput.value) {
    showFieldError('password', 'Password is required');
    valid = false;
  }

  return valid;
}

// Role fetch & redirect
async function redirectByRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data?.role) {
    console.warn('Role not found, defaulting to customer.', error?.message);
    window.location.href = ROLE_ROUTES.customer;
    return;
  }

  window.location.href = ROLE_ROUTES[data.role] ?? ROLE_ROUTES.customer;
}

// Session check on page load
async function checkExistingSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await redirectByRole(session.user.id);
  }
}

// Friendly error messages
function resolveFriendlyError(error) {
  const msg    = error.message?.toLowerCase() ?? '';
  const status = error.status;

  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (msg.includes('too many requests') || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Connection error. Please check your network and try again.';
  }
  return 'Something went wrong. Please try again.';
}

// Login handler
async function handleLogin() {
  hideAuthError();

  if (!validateForm()) return;

  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showAuthError(resolveFriendlyError(error));
      setLoading(false);
      return;
    }

    // Success — fetch role then navigate
    await redirectByRole(data.user.id);
  } catch {
    showAuthError('Connection error. Please check your network and try again.');
    setLoading(false);
  }
}

// Inline error clearing
function setupInlineErrorClearing() {
  emailInput.addEventListener('input',    () => { hideFieldError('email');    hideAuthError(); });
  passwordInput.addEventListener('input', () => { hideFieldError('password'); hideAuthError(); });
}

// Enter key submits form
function setupEnterKey() {
  document.getElementById('loginForm').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !loginBtn.disabled) {
      e.preventDefault();
      handleLogin();
    }
  });
}

// Boot
async function init() {
  await checkExistingSession();

  setupPasswordToggle();
  setupInlineErrorClearing();
  setupEnterKey();

  loginBtn.addEventListener('click', handleLogin);
}

init();