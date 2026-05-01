// ═══════════════════════════════════════════════════════════════════
//  SUPABASE AUTH MODULE — Super Admin & Admin Login (Part 1)
//  Paste this into: assets/js/login.js
//  REPLACES the adminLoginBtn click handler block only (see instructions)
//  Requires: window.supabase already initialized via config/supabase.js
// ═══════════════════════════════════════════════════════════════════

// ── 1. Supabase client ──────────────────────────────────────────────
//    If config/supabase.js already calls createClient and assigns it to
//    window.supabase, remove the two lines below.
//    If config/supabase.js only loads the CDN library (but doesn’t
//    create the client), keep these lines exactly as-is.
const SUPABASE_URL     = ‘https://fqbcidcezfprranfxhyj.supabase.co’;
const SUPABASE_ANON_KEY = ‘eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmNpZGNlemZwcnJhbmZ4aHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MjY0ODgsImV4cCI6MjA5MzIwMjQ4OH0.eGCEE-lA8yLGjU1nFXv_A1RjbWvRbb5Mfm8FMzVRgHI’;

// Use existing window.supabase if already a client, otherwise create one.
const _supabase = (window.supabase && typeof window.supabase.from === ‘function’)
? window.supabase
: window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── 2. Allowed roles & their redirect targets ───────────────────────
const ROLE_REDIRECTS = {
super_admin : ‘super-admin.html’,
admin       : ‘admin.html’,
};

// Roles this module handles. Any other role is denied.
const ALLOWED_ROLES = Object.keys(ROLE_REDIRECTS);

// ── 3. Loading state helper ─────────────────────────────────────────
function _setAdminLoading(on) {
const spinner = document.getElementById(‘adminSpinner’);
const icon    = document.getElementById(‘adminIcon’);
const btn     = document.getElementById(‘adminLoginBtn’);
const text    = document.getElementById(‘adminBtnText’);

```
if (spinner) spinner.style.display = on ? 'block' : 'none';
if (icon)    icon.style.display    = on ? 'none'  : 'inline';
if (btn)     btn.disabled          = on;
if (text)    text.textContent      = on ? 'Signing in…' : 'Login';
```

}

// ── 4. Error display helper ─────────────────────────────────────────
function _showAdminError(msg) {
// Re-uses your existing showToast if available, and also
// injects a visible error below the login button in the modal.
if (typeof showToast === ‘function’) showToast(msg, ‘error’);

```
// Inject / reuse an error node inside the modal body
let errEl = document.getElementById('adminAuthError');
if (!errEl) {
    errEl = document.createElement('p');
    errEl.id = 'adminAuthError';
    errEl.style.cssText = [
        'color:#e53e3e',
        'font-size:0.82rem',
        'font-weight:600',
        'text-align:center',
        'margin:8px 0 0 0',
        'padding:8px 12px',
        'background:#fff5f5',
        'border-radius:8px',
        'border-left:3px solid #e53e3e',
        'display:none'
    ].join(';');
    const loginBtn = document.getElementById('adminLoginBtn');
    if (loginBtn && loginBtn.parentNode) {
        loginBtn.parentNode.insertBefore(errEl, loginBtn.nextSibling);
    }
}
errEl.textContent = msg;
errEl.style.display = 'block';

// Auto-hide after 5 s
clearTimeout(errEl._hide);
errEl._hide = setTimeout(() => { errEl.style.display = 'none'; }, 5000);
```

}

function _clearAdminError() {
const errEl = document.getElementById(‘adminAuthError’);
if (errEl) errEl.style.display = ‘none’;
}

// ── 5. Core login function ──────────────────────────────────────────
async function handleSupabaseAdminLogin() {
const emailInput = document.getElementById(‘adminUsername’);   // field re-used for email
const passInput  = document.getElementById(‘adminPassword’);

```
const email    = (emailInput?.value || '').trim();
const password = (passInput?.value  || '').trim();

// ── Validation ────────────────────────────────────────────────
if (!email || !password) {
    _showAdminError('Please enter your email and password.');
    return;
}

_clearAdminError();
_setAdminLoading(true);

try {
    // ── Step 1: Supabase Auth sign-in ─────────────────────────
    const { data: authData, error: authError } =
        await _supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData?.user) {
        _showAdminError('Invalid email or password. Please try again.');
        return; // finally() handles loading reset
    }

    const userId = authData.user.id;

    // ── Step 2: Fetch role from profiles table ─────────────────
    const { data: profile, error: profileError } =
        await _supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', userId)
            .single();

    // No profile row found
    if (profileError || !profile) {
        await _supabase.auth.signOut();
        _showAdminError('Account not configured. Contact your administrator.');
        return;
    }

    const role     = profile.role;
    const tenantId = profile.tenant_id;

    // ── Step 3: Role guard ─────────────────────────────────────
    if (!role || !ALLOWED_ROLES.includes(role)) {
        await _supabase.auth.signOut();
        _showAdminError(
            role
                ? `Role "${role}" is not permitted here.`
                : 'No role assigned to this account. Contact your administrator.'
        );
        return;
    }

    // ── Step 4: Persist session metadata (non-sensitive only) ──
    sessionStorage.setItem('qless_logged_in', 'true');
    sessionStorage.setItem('qless_user_role',  role);
    sessionStorage.setItem('qless_user_email', email);
    sessionStorage.setItem('qless_user_id',    userId);
    if (tenantId) sessionStorage.setItem('qless_tenant_id', tenantId);

    // Legacy key used elsewhere in your app
    localStorage.setItem('user', JSON.stringify({
        id       : userId,
        email    : email,
        role     : role,
        tenantId : tenantId ?? null,
    }));

    // ── Step 5: Redirect ───────────────────────────────────────
    const destination = ROLE_REDIRECTS[role];
    if (typeof showToast === 'function') {
        showToast(
            role === 'super_admin'
                ? 'Welcome, Super Admin 👑'
                : 'Welcome, Admin 🏢',
            'success'
        );
    }
    setTimeout(() => { window.location.href = destination; }, 800);

} catch (err) {
    console.error('[Supabase Auth] Unexpected error:', err);
    _showAdminError('An unexpected error occurred. Please try again.');
} finally {
    // Always restore loading state (unless we already redirected)
    _setAdminLoading(false);
}
```

}

// ── 6. Session restore on page load ────────────────────────────────
//    If a valid Supabase session already exists for a super_admin or
//    admin, skip the login page entirely.
(async function checkExistingSession() {
try {
const { data: { session } } = await _supabase.auth.getSession();
if (!session?.user) return; // No active session → stay on login page

```
    const userId = session.user.id;
    const { data: profile } = await _supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', userId)
        .single();

    if (profile?.role && ALLOWED_ROLES.includes(profile.role)) {
        window.location.href = ROLE_REDIRECTS[profile.role];
    }
    // If role missing or not allowed, fall through to login page
} catch (_) {
    // Silently ignore — network offline, etc.
}
```

})();

// ── 7. Wire up the admin login button ──────────────────────────────
//    This REPLACES the old setTimeout-based handler in your login.js.
//    Make sure you REMOVE or comment out the old
//    document.getElementById(‘adminLoginBtn’).addEventListener(…) block.
(function wireAdminLoginButton() {
const btn = document.getElementById(‘adminLoginBtn’);
if (!btn) return;

```
// Remove any previously attached listeners by cloning the node
const fresh = btn.cloneNode(true);
btn.parentNode.replaceChild(fresh, btn);

fresh.addEventListener('click', () => {
    // Only handle super_admin and admin tabs
    if (
        typeof selectedAdminRole !== 'undefined' &&
        selectedAdminRole === 'staff'
    ) {
        // Staff is handled separately — do nothing here
        return;
    }
    handleSupabaseAdminLogin();
});

// Also allow Enter key inside the modal fields to trigger login
['adminUsername', 'adminPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', e => {
        if (e.key === 'Enter') fresh.click();
    });
});
```

})();

// ── 8. Update modal label & placeholder for email ──────────────────
//    Your HTML uses “Username” as label; we silently update it to
//    “Email” for the super_admin and admin tabs only.
(function patchAdminModalLabels() {
const uInput = document.getElementById(‘adminUsername’);
if (uInput) {
uInput.type        = ‘email’;
uInput.placeholder = ‘admin@example.com’;
uInput.value       = ‘’;           // clear any pre-filled value
}

```
// Patch the setAdminRole function so our changes persist on tab switch
const _originalSetAdminRole = (typeof setAdminRole === 'function')
    ? setAdminRole
    : null;

if (_originalSetAdminRole) {
    window.setAdminRole = function(role) {
        _originalSetAdminRole(role);

        if (role === 'super_administrator' || role === 'tenant_admin') {
            const u = document.getElementById('adminUsername');
            if (u) {
                u.type        = 'email';
                u.placeholder = 'admin@example.com';
                u.value       = '';   // don't pre-fill — force real credentials
            }
        }
    };
}
```

})();
