/**
 * config/auth.js — Rands Vibe Auth System
 * v2 — Added: Google OAuth, Passkey (WebAuthn), auth/callback handler
 */

import { supabase } from './supabase.js';

/* =========================
   ROLE ROUTES
========================= */
export const ROLE_ROUTES = {
  super_admin: '/super-admin/dashboard.html',
  admin: '/tenant/dashboard.html',
  staff: '/staff/dashboard.html',
  customer: '/passport/home.html',
};

/* =========================
   SIGN IN (email/password)
========================= */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: formatAuthError(error) };
    return { user: data.user, error: null };
  } catch (err) {
    console.error('❌ Sign in crash:', err);
    return { user: null, error: 'Network error. Please check connection and try again.' };
  }
}

/* =========================
   SIGN OUT
========================= */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) { console.error('❌ Sign out error:', error.message); return { error }; }
    window.location.href = '/login.html';
    return { error: null };
  } catch (err) {
    console.error('❌ Sign out crash:', err);
    return { error: { message: 'Failed to sign out.' } };
  }
}

/* =========================
   GET USER ROLE
========================= */
export async function getUserRole(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) { console.error('❌ Role fetch error:', error.message); return { role: null, error }; }
    if (!data || !data.role) { console.warn('⚠️ No role for user:', userId); return { role: null, error: 'NO_ROLE' }; }

    console.log('✅ Role loaded:', data.role);
    return { role: data.role, error: null };
  } catch (err) {
    console.error('❌ Role system crash:', err);
    return { role: null, error: err };
  }
}

/* =========================
   CURRENT SESSION / USER
========================= */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  } catch (err) {
    return { session: null, error: err };
  }
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user || null, error };
  } catch (err) {
    return { user: null, error: err };
  }
}

/* =========================
   ROLE REDIRECT
========================= */
export function getRoleRedirectUrl(role) {
  if (!role) return null;
  return ROLE_ROUTES[role] || null;
}

export function redirectByRole(role) {
  const url = getRoleRedirectUrl(role);
  if (!url) { console.error('❌ Cannot redirect: invalid role', role); return false; }
  console.log('➡️ Redirecting to:', url);
  window.location.href = url;
  return true;
}

/* =========================
   REQUIRE AUTH (guard)
========================= */
export async function requireAuth(allowedRoles = []) {
  try {
    const { session } = await getCurrentSession();
    if (!session) { window.location.href = '/login.html'; return null; }

    const user = session.user;
    const { role, error } = await getUserRole(user.id);

    if (error || !role) {
      await supabase.auth.signOut();
      window.location.href = '/login.html';
      return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      redirectByRole(role);
      return null;
    }

    return { user, role };
  } catch (err) {
    console.error('❌ Auth guard crash:', err);
    window.location.href = '/login.html';
    return null;
  }
}

/* =========================
   GOOGLE OAUTH (NEW)
   Kicks off provider sign-in.
   Supabase handles the redirect;
   auth/callback.html completes the flow.
========================= */
export async function signInWithGoogle() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback.html`,
      },
    });

    if (error) {
      console.error('❌ Google OAuth error:', error.message);
      return { error: formatAuthError(error) };
    }

    // Supabase redirects the browser automatically — no further action needed here.
    return { error: null };
  } catch (err) {
    console.error('❌ Google OAuth crash:', err);
    return { error: 'Could not start Google sign-in. Please try again.' };
  }
}

/* =========================
   GOOGLE OAUTH — REGISTER (NEW)
   Same flow; account_type is stored via
   the callback after OAuth success.
========================= */
export async function signUpWithGoogle(accountType = 'general') {
  try {
    // Store chosen pass type so callback.html can write it to the profile.
    sessionStorage.setItem('rv_oauth_account_type', accountType);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback.html`,
      },
    });

    if (error) return { error: formatAuthError(error) };
    return { error: null };
  } catch (err) {
    console.error('❌ Google signup crash:', err);
    return { error: 'Could not start Google sign-up. Please try again.' };
  }
}

/* =========================
   PASSKEY LOGIN (WebAuthn) (NEW)
   Uses Supabase's native passkey support
   (requires Supabase project to have
   "Passkeys" enabled in Auth settings).

   Falls back gracefully if the device or
   browser does not support WebAuthn.
========================= */
export async function isPasskeySupported() {
  return (
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
    (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  );
}

export async function signInWithPasskey() {
  try {
    if (!(await isPasskeySupported())) {
      return { user: null, error: 'Passkeys are not supported on this device.' };
    }

    // Supabase's signInWithPasskey is available in @supabase/auth-js ≥ 2.64
    // and requires the Passkeys feature to be enabled in your Supabase project.
    const { data, error } = await supabase.auth.signInWithPasskey();

    if (error) {
      console.error('❌ Passkey sign-in error:', error.message);
      return { user: null, error: formatAuthError(error) };
    }

    return { user: data?.user || null, error: null };
  } catch (err) {
    // Catch DOMException thrown when the user cancels the native prompt.
    if (err?.name === 'NotAllowedError') {
      return { user: null, error: 'Passkey prompt was cancelled.' };
    }
    console.error('❌ Passkey crash:', err);
    return { user: null, error: 'Passkey sign-in failed. Try email instead.' };
  }
}

/* =========================
   PASSKEY REGISTRATION (NEW)
   Call after the user has an account so
   they can add a passkey for future logins.
========================= */
export async function registerPasskey() {
  try {
    if (!(await isPasskeySupported())) {
      return { error: 'Passkeys are not supported on this device.' };
    }

    const { data, error } = await supabase.auth.enrollPasskey();

    if (error) {
      console.error('❌ Passkey enroll error:', error.message);
      return { error: formatAuthError(error) };
    }

    console.log('✅ Passkey enrolled:', data);
    return { error: null };
  } catch (err) {
    if (err?.name === 'NotAllowedError') {
      return { error: 'Passkey setup was cancelled.' };
    }
    console.error('❌ Passkey enroll crash:', err);
    return { error: 'Could not set up passkey. Try again later.' };
  }
}

/* =========================
   AUTH ERROR FORMATTER
========================= */
function formatAuthError(error) {
  const msg = error.message?.toLowerCase() || '';
  const status = error.status;

  if (msg.includes('invalid login credentials'))  return 'Incorrect email or password.';
  if (msg.includes('email not confirmed'))         return 'Please verify your email before signing in.';
  if (status === 429 || msg.includes('too many')) return 'Too many attempts. Please wait and try again.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Check your connection.';
  return error.message || 'Authentication failed.';
}
