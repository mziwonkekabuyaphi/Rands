/**
 * assets/js/authService.js — Rands Vibe
 * 
 * Handles all Supabase authentication and user role operations
 */

import { supabase } from 'config/supabase.js';

// Role → route map
export const ROLE_ROUTES = {
  super_admin:  '/super-admin/dashboard.html',
  tenant_admin: '/tenant/dashboard.html',
  staff:        '/staff/dashboard.html',
  customer:     '/customer/home.html',
};

/**
 * Sign in user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{user: object, error: object}>}
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      return { user: null, error: resolveFriendlyError(error) };
    }
    
    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error: 'Connection error. Please check your network and try again.' };
  }
}

/**
 * Get user role from profiles table
 * @param {string} userId - User ID
 * @returns {Promise<{role: string, error: object}>}
 */
export async function getUserRole(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data?.role) {
      console.warn('Role not found, defaulting to customer.', error?.message);
      return { role: 'customer', error: null };
    }
    
    return { role: data.role, error: null };
  } catch (error) {
    console.warn('Error fetching role, defaulting to customer.', error);
    return { role: 'customer', error: null };
  }
}

/**
 * Get current session
 * @returns {Promise<{session: object, error: object}>}
 */
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  } catch (error) {
    return { session: null, error };
  }
}

/**
 * Redirect user based on their role
 * @param {string} role - User's role
 */
export function redirectByRole(role) {
  const route = ROLE_ROUTES[role] ?? ROLE_ROUTES.customer;
  window.location.href = route;
}

/**
 * Resolve friendly error messages
 * @param {object} error - Supabase error object
 * @returns {string}
 */
function resolveFriendlyError(error) {
  const msg = error.message?.toLowerCase() ?? '';
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
