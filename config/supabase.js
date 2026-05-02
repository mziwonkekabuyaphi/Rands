// ─── Supabase Client (ES Module) ───────────────────────────────
// This file is loaded as <script type="module"> from login.html.
// It exposes the supabase client both as an ES export AND on
// window.supabaseClient so non-module scripts (e.g. config/auth/route.js)
// can use the same instance.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── TODO: Replace these with YOUR Supabase project credentials ─
// Find them in: Supabase Dashboard → Project Settings → API
const SUPABASE_URL      = 'YOUR_SUPABASE_URL';      // e.g. https://abcd1234.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // public anon key (safe for client)

if (SUPABASE_URL.startsWith('YOUR_') || SUPABASE_ANON_KEY.startsWith('YOUR_')) {
    console.warn(
        '[v0] Supabase credentials are not set. ' +
        'Open config/supabase.js and replace SUPABASE_URL and SUPABASE_ANON_KEY.'
    );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: false,
    },
});

// Expose globally for legacy / non-module scripts
if (typeof window !== 'undefined') {
    window.supabaseClient = supabase;
}

// ─── getUserRole(userId?) ──────────────────────────────────────
// Returns { role, tenant_id } from the `user_role` table for the given
// user id. If no id is passed, uses the currently signed-in user.
// Returns null if no row is found or the user is not signed in.
export async function getUserRole(userId) {
    let uid = userId;

    if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        uid = user.id;
    }

    const { data, error } = await supabase
        .from('user_role')
        .select('role, tenant_id')
        .eq('user_id', uid)
        .single();

    if (error || !data) {
        console.warn('[v0] getUserRole error:', error?.message || 'no row found');
        return null;
    }

    return data; // { role: 'super_admin' | 'tenant' | 'staff' | 'customer', tenant_id: number | null }
}
