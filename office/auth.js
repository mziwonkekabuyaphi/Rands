/**

- auth.js — QLess Authentication Logic
- Handles login validation, mock user database, OTP stub,
- tenant detection, and branding. Ready for Firebase/backend swap.
  */

// ─── Mock User Database ──────────────────────────────────────────────────────
// Replace this array with an API call to your backend or Firebase Auth.
const MOCK_USERS = [
{ phone: “0695814877”, password: “1234”, role: “super”,    name: “Super Admin”,   tenant: null },
{ phone: “0810000000”, password: “1234”, role: “tenant”,   name: “Tenant Admin”,  tenant: “rands” },
{ phone: “0820000000”, password: “1234”, role: “staff”,    name: “Ops Staff”,     tenant: “rands” },
{ phone: “0635713652”, password: “1234”, role: “customer”, name: “Customer User”, tenant: null },
];

// ─── Tenant Branding Config ──────────────────────────────────────────────────
const TENANT_THEMES = {
rands: {
name: “Rands Bank”,
primaryColor: “#D0021B”,
accentColor: “#FF4D4D”,
bgFrom: “#1a0000”,
bgTo: “#2d0000”,
logoText: “R”,
logoSubtext: “RANDS”,
},
acme: {
name: “Acme Corp”,
primaryColor: “#0057FF”,
accentColor: “#4D87FF”,
bgFrom: “#000d1a”,
bgTo: “#001a33”,
logoText: “A”,
logoSubtext: “ACME”,
},
// Default (no tenant)
default: {
name: “QLess”,
primaryColor: “#00C6A2”,
accentColor: “#00F5CA”,
bgFrom: “#030d16”,
bgTo: “#051824”,
logoText: “Q”,
logoSubtext: “QLESS”,
},
};

// ─── Tenant Detection ─────────────────────────────────────────────────────────
function detectTenant() {
const params = new URLSearchParams(window.location.search);
const tenantKey = params.get(“tenant”) || “default”;
return TENANT_THEMES[tenantKey] || TENANT_THEMES.default;
}

// ─── Apply Tenant Branding ────────────────────────────────────────────────────
function applyTenantBranding(theme) {
const root = document.documentElement;
root.style.setProperty(”–color-primary”, theme.primaryColor);
root.style.setProperty(”–color-accent”, theme.accentColor);
root.style.setProperty(”–bg-from”, theme.bgFrom);
root.style.setProperty(”–bg-to”, theme.bgTo);

const logoChar = document.getElementById(“logo-char”);
const logoSub = document.getElementById(“logo-sub”);
const tenantLabel = document.getElementById(“tenant-label”);

if (logoChar) logoChar.textContent = theme.logoText;
if (logoSub) logoSub.textContent = theme.logoSubtext;
if (tenantLabel && theme.name !== “QLess”) {
tenantLabel.textContent = theme.name;
tenantLabel.style.display = “block”;
}

// Update gradient background
document.body.style.background =
`linear-gradient(135deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`;
}

// ─── Phone Normalisation ──────────────────────────────────────────────────────
function normalisePhone(raw) {
// Strip spaces, dashes, parentheses
return raw.replace(/[\s-().+]/g, “”);
}

// ─── Credential Lookup ────────────────────────────────────────────────────────
/**

- Validate credentials against the mock DB.
- @param {string} phone - Raw phone input.
- @param {string} password - Raw password input.
- @returns {Object|null} Matched user or null.
  */
  function findUser(phone, password) {
  const normalised = normalisePhone(phone);
  return (
  MOCK_USERS.find(
  (u) => normalisePhone(u.phone) === normalised && u.password === password
  ) || null
  );
  }

// ─── OTP Stub ─────────────────────────────────────────────────────────────────
/**

- Stub for OTP request. Replace body with API call when ready.
- @param {string} phone
- @returns {Promise<{success: boolean, message: string}>}
  */
  async function requestOTP(phone) {
  // TODO: Replace with: await fetch(’/api/otp/send’, { method:‘POST’, body: JSON.stringify({phone}) })
  console.log(”[OTP stub] Sending OTP to”, phone);
  await delay(1200);
  return { success: true, message: `OTP sent to ${phone}` };
  }

/**

- Stub for OTP verification.
- @param {string} phone
- @param {string} otp
- @returns {Promise<{success: boolean, user: Object|null}>}
  */
  async function verifyOTP(phone, otp) {
  // TODO: Replace with real API call
  await delay(1000);
  // Mock: any 6-digit OTP works for demo
  if (/^\d{6}$/.test(otp)) {
  const user = MOCK_USERS.find(
  (u) => normalisePhone(u.phone) === normalisePhone(phone)
  );
  return { success: !!user, user: user || null };
  }
  return { success: false, user: null };
  }

// ─── Remember Me ─────────────────────────────────────────────────────────────
function saveRememberedPhone(phone) {
localStorage.setItem(“ql_remember_phone”, phone);
}

function getRememberedPhone() {
return localStorage.getItem(“ql_remember_phone”) || “”;
}

function clearRememberedPhone() {
localStorage.removeItem(“ql_remember_phone”);
}

// ─── Core Login Handler ───────────────────────────────────────────────────────
/**

- Main login entry point. Call from the login form submit handler.
- @param {string} phone
- @param {string} password
- @param {boolean} remember
- @returns {Promise<{success: boolean, user: Object|null, error: string|null}>}
  */
  async function attemptLogin(phone, password, remember) {
  // Simulate async network latency (remove when using real API)
  await delay(900);

const user = findUser(phone, password);

if (!user) {
return { success: false, user: null, error: “Invalid phone number or password.” };
}

// Persist session
localStorage.setItem(“user”, JSON.stringify(user));

// Handle remember me
if (remember) {
saveRememberedPhone(phone);
} else {
clearRememberedPhone();
}

return { success: true, user, error: null };
}

// ─── Guest Access ─────────────────────────────────────────────────────────────
function continueAsGuest() {
const guest = { role: “customer”, name: “Guest”, phone: null, tenant: null };
localStorage.setItem(“user”, JSON.stringify(guest));
window.location.href = “/home.html”;
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function delay(ms) {
return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Input Validation ─────────────────────────────────────────────────────────
function validateLoginInputs(phone, password) {
const errors = [];
const stripped = normalisePhone(phone);

if (!stripped || stripped.length < 7) {
errors.push(“Please enter a valid phone number.”);
}
if (!password || password.length < 1) {
errors.push(“Please enter your password.”);
}
return errors;
}
