// route.js - Session Management & Authentication for Vibe Passport

const STORAGE_KEYS = {
    SESSION: 'rands_session',
    TENANTS: 'qless_tenants',
    STAFF: 'qless_staff',
    CUSTOMERS: 'rands_customers'
};

// ============================================
// SESSION MANAGEMENT
// ============================================

// Get current session data
function getCurrentSession() {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
}

// Check if user is logged in
function isLoggedIn() {
    return getCurrentSession() !== null;
}

// Check auth and redirect if not logged in
function checkAuth() {
    const session = getCurrentSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return session;
}

// Check auth for specific roles
function requireRole(allowedRoles) {
    const session = getCurrentSession();
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }
    
    if (allowedRoles && !allowedRoles.includes(session.role)) {
        window.location.href = 'login.html';
        return false;
    }
    
    return session;
}

// Logout user
function logout() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// ============================================
// ROLE-SPECIFIC GUARDS (for each HTML page)
// ============================================

// For super-admin.html
function requireSuperAdmin() {
    const session = requireRole(['super_administrator']);
    if (session) {
        console.log('✅ Super Admin authenticated:', session.name);
    }
    return session;
}

// For admin.html (Tenant Admin)
function requireTenantAdmin() {
    const session = requireRole(['tenant_admin']);
    if (session) {
        console.log('✅ Tenant Admin authenticated:', session.name, '| Venue:', session.businessName);
    }
    return session;
}

// For staff.html
function requireStaff() {
    const session = requireRole(['staff']);
    if (session) {
        console.log('✅ Staff authenticated:', session.name, '| Role:', session.staffRole);
    }
    return session;
}

// For home.html (Customer)
function requireCustomer() {
    const session = requireRole(['customer']);
    if (session) {
        console.log('✅ Customer authenticated:', session.name);
    }
    return session;
}

// For register.html (Customer registration/dashboard)
function requireRegisterAccess() {
    const session = getCurrentSession();
    if (!session) {
        // Not logged in, allow access to registration page
        return null;
    }
    // If logged in as customer, allow access
    if (session.role === 'customer') {
        return session;
    }
    // If logged in as admin/staff, redirect to their respective dashboards
    if (session.role === 'super_administrator') {
        window.location.href = 'super-admin.html';
        return false;
    }
    if (session.role === 'tenant_admin') {
        window.location.href = 'admin.html';
        return false;
    }
    if (session.role === 'staff') {
        window.location.href = 'staff.html';
        return false;
    }
    return session;
}

// ============================================
// REDIRECT HELPER
// ============================================

// Redirect user based on their role
function redirectByRole(role) {
    switch(role) {
        case 'super_administrator':
            window.location.href = 'super-admin.html';
            break;
        case 'tenant_admin':
            window.location.href = 'admin.html';
            break;
        case 'staff':
            window.location.href = 'staff.html';
            break;
        case 'customer':
            window.location.href = 'home.html';
            break;
        default:
            window.location.href = 'login.html';
    }
}

// ============================================
// SUPER ADMIN FUNCTIONS
// ============================================

// Create a new Tenant Admin (Super Admin only)
function createTenantAdmin(businessName, ownerName, username, password, phone = '') {
    const session = requireSuperAdmin();
    if (!session) return { success: false, error: 'Unauthorized: Super Admin only' };
    
    const tenants = JSON.parse(localStorage.getItem(STORAGE_KEYS.TENANTS) || '[]');
    
    // Check if username already exists
    if (tenants.find(t => t.username === username)) {
        return { success: false, error: 'Username already exists' };
    }
    
    // Create new tenant
    const newTenant = {
        id: Date.now(),
        businessName: businessName,
        ownerName: ownerName,
        username: username,
        password: password,
        phone: phone,
        status: 'Active',
        createdAt: new Date().toISOString(),
        revenue: 0
    };
    
    tenants.push(newTenant);
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    
    return { success: true, tenant: newTenant };
}

// Get all tenants (Super Admin only)
function getAllTenants() {
    const session = requireSuperAdmin();
    if (!session) return [];
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TENANTS) || '[]');
}

// Update tenant status (Super Admin only)
function updateTenantStatus(tenantId, status) {
    const session = requireSuperAdmin();
    if (!session) return { success: false, error: 'Unauthorized' };
    
    const tenants = getAllTenants();
    const tenant = tenants.find(t => t.id == tenantId);
    if (!tenant) return { success: false, error: 'Tenant not found' };
    
    tenant.status = status;
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    return { success: true, tenant: tenant };
}

// Delete tenant (Super Admin only)
function deleteTenant(tenantId) {
    const session = requireSuperAdmin();
    if (!session) return { success: false, error: 'Unauthorized' };
    
    let tenants = getAllTenants();
    const tenant = tenants.find(t => t.id == tenantId);
    if (!tenant) return { success: false, error: 'Tenant not found' };
    
    tenants = tenants.filter(t => t.id != tenantId);
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    
    // Also delete associated staff
    const staff = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]');
    const filteredStaff = staff.filter(s => s.tenantId != tenantId);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(filteredStaff));
    
    return { success: true, message: `Tenant "${tenant.businessName}" deleted` };
}

// ============================================
// TENANT ADMIN FUNCTIONS
// ============================================

// Create a new Staff member (Tenant Admin only)
function createStaff(tenantId, name, username, password, role) {
    const session = requireTenantAdmin();
    if (!session) return { success: false, error: 'Unauthorized: Tenant Admin only' };
    
    // Verify tenant admin owns this tenant
    if (session.tenantId != tenantId) {
        return { success: false, error: 'Cannot create staff for another venue' };
    }
    
    const staff = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]');
    
    // Check if username already exists for this tenant
    if (staff.find(s => s.username === username && s.tenantId === tenantId)) {
        return { success: false, error: 'Staff username already exists for this venue' };
    }
    
    // Create new staff member
    const newStaff = {
        id: Date.now(),
        tenantId: tenantId,
        name: name,
        username: username,
        password: password,
        role: role,
        status: 'Active',
        createdAt: new Date().toISOString()
    };
    
    staff.push(newStaff);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    
    return { success: true, staff: newStaff };
}

// Get staff for a specific tenant (Tenant Admin only)
function getStaffForTenant(tenantId) {
    const session = requireTenantAdmin();
    if (!session || session.tenantId != tenantId) return [];
    
    const staff = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]');
    return staff.filter(s => s.tenantId === tenantId);
}

// Update staff status (Tenant Admin only)
function updateStaffStatus(staffId, tenantId, status) {
    const session = requireTenantAdmin();
    if (!session || session.tenantId != tenantId) return { success: false, error: 'Unauthorized' };
    
    const staff = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]');
    const staffMember = staff.find(s => s.id == staffId);
    if (!staffMember) return { success: false, error: 'Staff not found' };
    
    staffMember.status = status;
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    return { success: true, staff: staffMember };
}

// Delete staff (Tenant Admin only)
function deleteStaff(staffId, tenantId) {
    const session = requireTenantAdmin();
    if (!session || session.tenantId != tenantId) return { success: false, error: 'Unauthorized' };
    
    let staff = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]');
    const staffMember = staff.find(s => s.id == staffId);
    if (!staffMember) return { success: false, error: 'Staff not found' };
    
    staff = staff.filter(s => s.id != staffId);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    return { success: true, message: `Staff "${staffMember.name}" deleted` };
}

// ============================================
// CUSTOMER FUNCTIONS
// ============================================

// Get all customers (Admin only - for management)
function getAllCustomers() {
    const session = getCurrentSession();
    if (!session || (session.role !== 'super_administrator' && session.role !== 'tenant_admin')) {
        return [];
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
}

// Get current user info
function getCurrentUser() {
    return getCurrentSession();
}

// Check if current user has permission
function hasPermission(requiredRole) {
    const session = getCurrentSession();
    if (!session) return false;
    
    if (typeof requiredRole === 'string') {
        return session.role === requiredRole;
    }
    if (Array.isArray(requiredRole)) {
        return requiredRole.includes(session.role);
    }
    return false;
}

// ============================================
// EXPOSE GLOBALLY
// ============================================

window.Auth = {
    // Session
    getCurrentSession,
    isLoggedIn,
    checkAuth,
    requireRole,
    logout,
    redirectByRole,
    getCurrentUser,
    hasPermission,
    
    // Page guards
    requireSuperAdmin,
    requireTenantAdmin,
    requireStaff,
    requireCustomer,
    requireRegisterAccess,
    
    // Super Admin functions
    createTenantAdmin,
    getAllTenants,
    updateTenantStatus,
    deleteTenant,
    
    // Tenant Admin functions
    createStaff,
    getStaffForTenant,
    updateStaffStatus,
    deleteStaff,
    
    // Customer functions
    getAllCustomers
};

// Legacy support for existing sessionStorage checks
// This helps transition from old sessionStorage to new localStorage
(function migrateSession() {
    const oldSession = sessionStorage.getItem('qless_logged_in');
    const newSession = localStorage.getItem(STORAGE_KEYS.SESSION);
    
    if (oldSession === 'true' && !newSession) {
        const role = sessionStorage.getItem('qless_user_role');
        const name = sessionStorage.getItem('qless_user_name');
        const tenantId = sessionStorage.getItem('qless_tenant_id');
        
        if (role) {
            const sessionData = {
                userId: sessionStorage.getItem('qless_user_id') || 'migrated_' + Date.now(),
                name: name || 'User',
                role: role,
                loggedInAt: Date.now()
            };
            
            if (tenantId) sessionData.tenantId = parseInt(tenantId);
            if (role === 'tenant_admin') sessionData.businessName = sessionStorage.getItem('qless_tenant_name') || '';
            if (role === 'staff') sessionData.staffRole = sessionStorage.getItem('qless_staff_role') || '';
            
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
            console.log('✅ Session migrated from sessionStorage to localStorage');
        }
    }
})();

console.log('✅ route.js loaded - Auth API ready');