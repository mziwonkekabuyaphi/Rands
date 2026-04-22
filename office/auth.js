/**

- auth.js — QLess Authentication Logic
- Handles login validation, mock user database, OTP stub,
- tenant detection, branding, and customer registration.
- Ready for Firebase/backend swap.
  */

// ─── Mock User Database ──────────────────────────────────────────────────────
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
const logoSub  = document.getElementById(“logo-sub”);
const tenantLabel = document.getElementById(“tenant-label”);

if (logoChar) logoChar.textContent = theme.logoText;
if (logoSub)  logoSub.textContent  = theme.logoSubtext;
if (tenantLabel && theme.name !== “QLess”) {
tenantLabel.textContent  = theme.name;
tenantLabel.style.display = “block”;
}

document.body.style.background =
`linear-gradient(135deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`;
}

// ─── Phone Normalisation ──────────────────────────────────────────────────────
function normalisePhone(raw) {
return raw.replace(/[\s-().+]/g, “”);
}

// ─── Registered Customers DB (localStorage-backed) ───────────────────────────
function getRegisteredCustomers() {
try { return JSON.parse(localStorage.getItem(“ql_customers”) || “[]”); }
catch { return []; }
}

function saveRegisteredCustomers(customers) {
localStorage.setItem(“ql_customers”, JSON.stringify(customers));
}

function isPhoneRegistered(phone) {
const n = normalisePhone(phone);
const inMock = MOCK_USERS.some(u => normalisePhone(u.phone) === n);
const inCustomers = getRegisteredCustomers().some(u => normalisePhone(u.phone) === n);
return inMock || inCustomers;
}

// ─── Credential Lookup (mock + registered customers) ─────────────────────────
function findUser(phone, password) {
const n = normalisePhone(phone);
return MOCK_USERS.find(u => normalisePhone(u.phone) === n && u.password === password) || null;
}

function findUserExtended(phone, password) {
const mockMatch = findUser(phone, password);
if (mockMatch) return mockMatch;

const n = normalisePhone(phone);
const customers = getRegisteredCustomers();
const match = customers.find(u => normalisePhone(u.phone) === n && u.password === password);
if (!match) return null;
return { phone: match.phone, role: “customer”, name: match.name, tenant: null, selfie: match.selfie || null };
}

// ─── OTP Stub ─────────────────────────────────────────────────────────────────
async function requestOTP(phone) {
console.log(”[OTP stub] Sending OTP to”, phone);
await delay(1200);
return { success: true, message: `OTP sent to ${phone}` };
}

async function verifyOTP(phone, otp) {
await delay(1000);
if (/^\d{6}$/.test(otp)) {
const user = findUserExtended(phone, “”);
// For OTP we just need the phone to exist
const anyUser = MOCK_USERS.find(u => normalisePhone(u.phone) === normalisePhone(phone))
|| getRegisteredCustomers().find(u => normalisePhone(u.phone) === normalisePhone(phone));
if (anyUser) {
const sessionUser = { phone: anyUser.phone, role: anyUser.role, name: anyUser.name, tenant: anyUser.tenant || null };
return { success: true, user: sessionUser };
}
}
return { success: false, user: null };
}

// ─── Remember Me ─────────────────────────────────────────────────────────────
function saveRememberedPhone(phone) { localStorage.setItem(“ql_remember_phone”, phone); }
function getRememberedPhone()       { return localStorage.getItem(“ql_remember_phone”) || “”; }
function clearRememberedPhone()     { localStorage.removeItem(“ql_remember_phone”); }

// ─── Core Login Handler ───────────────────────────────────────────────────────
async function attemptLogin(phone, password, remember) {
await delay(900);
const user = findUserExtended(phone, password);

if (!user) return { success: false, user: null, error: “Invalid phone number or password.” };

localStorage.setItem(“user”, JSON.stringify(user));
if (remember) saveRememberedPhone(phone);
else clearRememberedPhone();

return { success: true, user, error: null };
}

// ─── Register Customer ────────────────────────────────────────────────────────
async function registerCustomer(phone, password, name, selfieBase64) {
await delay(800);

if (isPhoneRegistered(phone)) {
return { success: false, user: null, error: “This phone number is already registered.” };
}

const newUser = {
phone: normalisePhone(phone),
password,
role: “customer”,
name: name.trim(),
tenant: null,
selfie: selfieBase64 || null,
registeredAt: new Date().toISOString(),
};

const customers = getRegisteredCustomers();
customers.push(newUser);
saveRegisteredCustomers(customers);

const sessionUser = { phone: newUser.phone, role: “customer”, name: newUser.name, tenant: null, selfie: newUser.selfie };
localStorage.setItem(“user”, JSON.stringify(sessionUser));

return { success: true, user: sessionUser, error: null };
}

// ─── Guest Access ─────────────────────────────────────────────────────────────
function continueAsGuest() {
const guest = { role: “customer”, name: “Guest”, phone: null, tenant: null };
localStorage.setItem(“user”, JSON.stringify(guest));
const base = window.location.href.substring(0, window.location.href.lastIndexOf(”/”) + 1);
window.location.href = base + “home.html”;
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Input Validation ─────────────────────────────────────────────────────────
function validateLoginInputs(phone, password) {
const errors = [];
if (!normalisePhone(phone) || normalisePhone(phone).length < 7)
errors.push(“Please enter a valid phone number.”);
if (!password || password.length < 1)
errors.push(“Please enter your password.”);
return errors;
}

function validateRegistrationStep1(phone) {
const errors = [];
if (!normalisePhone(phone) || normalisePhone(phone).length < 7)
errors.push(“Please enter a valid phone number.”);
return errors;
}

function validateRegistrationStep2(password, confirm) {
const errors = [];
if (!password || password.length < 6) errors.push(“Password must be at least 6 characters.”);
if (password !== confirm)             errors.push(“Passwords do not match.”);
return errors;
}

function validateRegistrationStep3(name) {
const errors = [];
if (!name || name.trim().length < 2) errors.push(“Please enter your full name (at least 2 characters).”);
return errors;
}
