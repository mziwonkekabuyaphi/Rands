const supabase = window.supabaseClient;

// ─────────────────────────────
// CUSTOMER LOGIN (IF YOU STILL NEED IT)
// ─────────────────────────────
async function customerLogin(phone, pin) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .eq("pin", pin)
    .single();

  if (error || !data) {
    showToast("Invalid phone or PIN", "error");
    return;
  }

  const user = {
    id: data.id,
    name: data.name,
    phone: data.phone,
    role: "customer"
  };

  sessionStorage.setItem("user", JSON.stringify(user));
  window.location.href = "/wallet/home.html";
}

// ─────────────────────────────
// ADMIN LOGIN (SUPABASE AUTH)
// ─────────────────────────────
async function adminLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showToast(error.message, "error");
    return;
  }

  const userId = data.user.id;

  // get role
  const { data: roleData } = await supabase
    .from("user_role")
    .select("role, tenant_id")
    .eq("user_id", userId)
    .single();

  if (!roleData) {
    showToast("No role assigned", "error");
    return;
  }

  const role = roleData.role;

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

// ─────────────────────────────
// EXPORT
// ─────────────────────────────
window.customerLogin = customerLogin;
window.adminLogin = adminLogin;
