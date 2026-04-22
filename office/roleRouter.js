/**

- roleRouter.js — QLess Role-Based Routing
- Handles post-login redirects and page protection.
- Designed to be easily swapped for a backend/Firebase auth layer.
- 
- Uses relative paths so this works on GitHub Pages, local file system,
- or any subdirectory — no absolute paths anywhere.
  */

const ROLE_ROUTES = {
super: “super-admin.html”,
tenant: “tenant-admin.html”,
staff: “staff.html”,
customer: “home.html”,
};

/**

- Resolve a filename relative to the current page’s directory.
- Works on GitHub Pages (e.g. /repo/login.html → /repo/super-admin.html)
- and locally (file:///…/login.html → file:///…/super-admin.html).
  */
  function resolvePath(filename) {
  const base = window.location.href.substring(
  0,
  window.location.href.lastIndexOf(”/”) + 1
  );
  return base + filename;
  }

/**

- Redirect user to their role-specific dashboard after login.
- @param {Object} user - The authenticated user object.
  */
  function redirectByRole(user) {
  const route = ROLE_ROUTES[user.role];
  if (route) {
  window.location.href = resolvePath(route);
  } else {
  console.error(“Unknown role:”, user.role);
  }
  }

/**

- Protect a page by verifying the logged-in user’s role.
- Call this at the top of each dashboard page.
- @param {string} requiredRole - The role required to access this page.
  */
  function requireRole(requiredRole) {
  try {
  const raw = localStorage.getItem(“user”);
  const user = raw ? JSON.parse(raw) : null;
  
  if (!user || user.role !== requiredRole) {
  localStorage.removeItem(“user”);
  window.location.href = resolvePath(“login.html”);
  return null;
  }
  
  return user;
  } catch (e) {
  localStorage.removeItem(“user”);
  window.location.href = resolvePath(“login.html”);
  return null;
  }
  }

/**

- Log out the current user and redirect to login.
  */
  function logout() {
  localStorage.removeItem(“user”);
  window.location.href = resolvePath(“login.html”);
  }

/**

- Get the currently logged-in user (or null).
  */
  function getCurrentUser() {
  try {
  const raw = localStorage.getItem(“user”);
  return raw ? JSON.parse(raw) : null;
  } catch {
  return null;
  }
  }
