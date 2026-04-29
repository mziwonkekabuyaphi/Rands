const supabase = window.supabaseClient;

/* =========================
   🏢 TENANTS
========================= */

async function getTenants() {
  const { data, error } = await supabase
    .from("tenants")
    .select("*");

  if (error) {
    console.error("getTenants error:", error);
    return [];
  }

  return data;
}

/* =========================
   👷 STAFF (BY TENANT)
========================= */

async function getStaffByTenant(tenantId) {
  const { data, error } = await supabase
    .from("user_role")
    .select("*")
    .eq("role", "staff")
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("getStaff error:", error);
    return [];
  }

  return data;
}

/* =========================
   👑 ALL STAFF (ADMIN VIEW)
========================= */

async function getAllStaff() {
  const { data, error } = await supabase
    .from("user_role")
    .select("*")
    .eq("role", "staff");

  if (error) {
    console.error("getAllStaff error:", error);
    return [];
  }

  return data;
}

/* =========================
   👤 CUSTOMERS
========================= */

async function getCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*");

  if (error) {
    console.error("getCustomers error:", error);
    return [];
  }

  return data;
}

/* =========================
   💳 SINGLE CUSTOMER
========================= */

async function getCustomerById(userId) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("getCustomerById error:", error);
    return null;
  }

  return data;
}

/* =========================
   🏢 CREATE TENANT (SUPER ADMIN)
========================= */

async function createTenant(name) {
  const { data, error } = await supabase
    .from("tenants")
    .insert([{ name }])
    .select()
    .single();

  if (error) {
    console.error("createTenant error:", error);
    return null;
  }

  return data;
}

/* =========================
   👷 ASSIGN ROLE
========================= */

async function assignRole(userId, role, tenantId = null) {
  const { data, error } = await supabase
    .from("user_role")
    .insert([
      {
        user_id: userId,
        role: role,
        tenant_id: tenantId
      }
    ]);

  if (error) {
    console.error("assignRole error:", error);
    return false;
  }

  return true;
}

/* =========================
   🔐 EXPORT GLOBAL
========================= */

window.QlessDB = {
  getTenants,
  getStaffByTenant,
  getAllStaff,
  getCustomers,
  getCustomerById,
  createTenant,
  assignRole
};
