// ═══════════════════════════════════════════════
// CLEAN SUPABASE LOGIN SYSTEM (ADMIN / SUPER ADMIN)
// Requires: window.supabase already initialized
// ═══════════════════════════════════════════════

const supabase = window.supabase;

// ─────────────────────────────
// ROLE ROUTES (EDIT THESE ONLY)
// ─────────────────────────────
const ROLE_ROUTES = {
  super_admin: "super-admin.html",
  admin: "admin.html",
};

// ─────────────────────────────
// UI HELPERS
// ─────────────────────────────
function setLoading(state) {
  const btn = document.getElementById("adminLoginBtn");
  const text = document.getElementById("adminBtnText");

  if (!btn || !text) return;

  btn.disabled = state;
  text.textContent = state ? "Signing in..." : "Login";
}

function showError(message) {
  let el = document.getElementById("adminAuthError");

  if (!el) {
    el = document.createElement("div");
    el.id = "adminAuthError";
    el.style.cssText = `
      margin-top:10px;
      padding:10px;
      background:#fff5f5;
      color:#e53e3e;
      border-left:3px solid #e53e3e;
      border-radius:8px;
      font-size:0.85rem;
      font-weight:600;
      text-align:center;
    `;

    document
      .getElementById("adminLoginBtn")
      .insertAdjacentElement("afterend", el);
  }

  el.textContent = message;
  el.style.display = "block";

  setTimeout(() => {
    el.style.display = "none";
  }, 4000);
}

// ─────────────────────────────
// LOGIN CORE
// ─────────────────────────────
async function login() {
  const email = document.getElementById("adminUsername")?.value?.trim();
  const password = document.getElementById("adminPassword")?.value?.trim();

  if (!email || !password) {
    showError("Enter email and password");
    return;
  }

  setLoading(true);

  try {
    // 1. AUTH LOGIN
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      showError("Invalid login credentials");
      return;
    }

    const user = data.user;

    // 2. GET PROFILE (ROLE)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      showError("Account not configured");
      return;
    }

    const role = profile.role;

    // 3. ROLE CHECK
    if (!ROLE_ROUTES[role]) {
      await supabase.auth.signOut();
      showError("Access denied for this role");
      return;
    }

    // 4. STORE SESSION
    sessionStorage.setItem("user", JSON.stringify({
      id: user.id,
      email,
      role,
      tenant_id: profile.tenant_id || null,
    }));

    // 5. REDIRECT
    window.location.href = ROLE_ROUTES[role];

  } catch (err) {
    console.error(err);
    showError("Unexpected error. Try again.");
  } finally {
    setLoading(false);
  }
}

// ─────────────────────────────
// BUTTON WIRING
// ─────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("adminLoginBtn");
  if (btn) btn.addEventListener("click", login);

  // Enter key support
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
});
