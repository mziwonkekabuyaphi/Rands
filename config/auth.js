/**
 * config/auth.js — Rands Vibe Auth System
 * Clean v3 — Google OAuth + Passkey + Role routing
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
   EMAIL LOGIN
========================= */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: formatAuthError(error) };
    }

    return { user: data.user, error: null };
  } catch (err) {
    console.error('❌ Sign in crash:', err);
    return {
      user: null,
      error: 'Network error. Please check connection and try again.',
    };
  }
}

/* =========================
   SIGN OUT
========================= */
export async function signOutUser() {
  try {
    await supabase.auth.signOut();
    window.location.href = '/login.html';
    return { error: null };
  } catch (err) {
    console.error('❌ Sign out crash:', err);
    return { error: err };
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

    if (error) {
      console.error('❌ Role fetch error:', error.message);
      return { role: null, error };
    }

    if (!data?.role) {
      console.warn('⚠️ Missing role for user:', userId);
      return { role: null, error: 'NO_ROLE' };
    }

    return { role: data.role, error: null };
  } catch (err) {
    console.error('❌ Role crash:', err);
    return { role: null, error: err };
  }
}

/* =========================
   SESSION
========================= */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

/* =========================
   USER
========================= */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user || null, error };
}

/* =========================
   ROLE ROUTING
========================= */
export function getRoleRedirectUrl(role) {
  return ROLE_ROUTES[role] || null;
}

export function redirectByRole(role) {
  const url = getRoleRedirectUrl(role);

  if (!url) {
    console.error('❌ Invalid role redirect:', role);
    return false;
  }

  window.location.href = url;
  return true;
}

/* =========================
   AUTH GUARD
========================= */
export async function requireAuth(allowedRoles = []) {
  try {
    const { session } = await getCurrentSession();

    if (!session) {
      window.location.href = '/login.html';
      return null;
    }

    const user = session.user;
    const { role } = await getUserRole(user.id);

    // ⚠️ IMPORTANT: only block if role truly missing
    if (!role) {
      console.warn('⚠️ No role found — defaulting to customer access');
      return { user, role: 'customer' };
    }

    if (allowedRoles.length && !allowedRoles.includes(role)) {
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
   GOOGLE LOGIN (ONLY ONE FLOW)
========================= */
export async function signInWithGoogle() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback.html`,
      },
    });

    if (error) {
      console.error('❌ Google OAuth error:', error.message);
      return { error: formatAuthError(error) };
    }

    return { error: null };
  } catch (err) {
    console.error('❌ Google crash:', err);
    return { error: 'Google sign-in failed.' };
  }
}

/* =========================
   PASSKEY LOGIN
========================= */
export async function isPasskeySupported() {
  return (
    window.PublicKeyCredential &&
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  );
}

export async function signInWithPasskey() {
  try {
    if (!(await isPasskeySupported())) {
      return { error: 'Passkeys not supported on this device.' };
    }

    if (!supabase.auth.signInWithPasskey) {
      return { error: 'Passkeys not enabled in Supabase.' };
    }

    const { data, error } = await supabase.auth.signInWithPasskey();

    if (error) {
      return { user: null, error: formatAuthError(error) };
    }

    return { user: data?.user || null, error: null };
  } catch (err) {
    return { user: null, error: 'Passkey login failed.' };
  }
}

/* =========================
   PASSKEY REGISTER
========================= */
export async function registerPasskey() {
  try {
    if (!supabase.auth.enrollPasskey) {
      return { error: 'Passkey setup not enabled in Supabase.' };
    }

    const { error } = await supabase.auth.enrollPasskey();

    if (error) {
      return { error: formatAuthError(error) };
    }

    return { error: null };
  } catch (err) {
    return { error: 'Passkey setup failed.' };
  }
}

/* =========================
   ERROR FORMATTER
========================= */
function formatAuthError(error) {
  const msg = error.message?.toLowerCase() || '';
  const status = error.status;

  if (msg.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (status === 429) {
    return 'Too many attempts. Please try again later.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network error. Check your connection.';
  }

  return error.message || 'Authentication failed.';
}
