// Authentication check for protected pages (Supabase)
document.addEventListener('DOMContentLoaded', function() {
    const supa = window.supabaseClient;
    const path = (location.pathname || '').split('/').pop() || '';

    (async function initAuth() {
        try {
            // Allow driver session on dashboard only
            const driverSession = (function() {
                try {
                    const raw = localStorage.getItem('driver_session');
                    return raw ? JSON.parse(raw) : null;
                } catch (_) { return null; }
            })();

            if (driverSession && path === 'dashboard.html') {
                if (typeof window.initializeDriverDashboard === 'function') {
                    window.initializeDriverDashboard();
                }
                return;
            }

            if (!supa) {
                console.warn('Supabase client not found; continuing without admin auth gate');
                return typeof initializePage === 'function' ? initializePage() : undefined;
            }
            const { data } = await supa.auth.getSession();
            // Enforce admin login on protected pages that include this script
            if (!data || !data.session) { window.location.href = 'login.html'; return; }
            if (typeof initializePage === 'function') initializePage();
        } catch (e) {
            console.error('Auth state error:', e);
            // Fallback to login if auth state cannot be determined
            window.location.href = 'login.html';
        }
    })();

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                if (supa) await supa.auth.signOut();
                try { localStorage.removeItem('driver_session'); } catch (_) {}
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('show');
        });
    }
});

// Initialize page-specific functionality
function initializePage() {
    console.log('Page initialized');
}