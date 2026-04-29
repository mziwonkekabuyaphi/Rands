const supabase = window.supabaseClient;

// --------------------------------------------------------------
// GET CURRENT USER + ROLE
// --------------------------------------------------------------
async function getUserRole() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_role")
    .select("role, tenant_id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;

  return { user, ...data };
}

// --------------------------------------------------------------
// ROLE PROTECTION (USE THIS ON EVERY PAGE)
// --------------------------------------------------------------
async function requireRole(allowedRoles) {
  const session = await getUserRole();

  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  if (!allowedRoles.includes(session.role)) {
    redirectByRole(session.role);
  }
}

// --------------------------------------------------------------
// AUTO REDIRECT AFTER LOGIN
// --------------------------------------------------------------
async function autoRedirect() {
  const session = await getUserRole();

  if (!session) return;

  redirectByRole(session.role);
}

// --------------------------------------------------------------
// CENTRAL REDIRECT LOGIC
// --------------------------------------------------------------
function redirectByRole(role) {
  if (role === "super_admin") {
    window.location.href = "/super-admin/dashboard.html";
  } 
  else if (role === "tenant") {
    window.location.href = "/tenant/dashboard.html";
  } 
  else if (role === "staff") {
    window.location.href = "/staff/dashboard.html";
  } 
  else {
    window.location.href = "/wallet/home.html";
  }
}

// --------------------------------------------------------------
// LOGOUT (REAL SUPABASE LOGOUT)
// --------------------------------------------------------------
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/login.html";
}

// --------------------------------------------------------------
// EXPORT GLOBAL
// --------------------------------------------------------------
window.requireRole = requireRole;
window.autoRedirect = autoRedirect;
window.logout = logout;
