// Authentication check for protected pages (Supabase)
document.addEventListener('DOMContentLoaded', function() {
    const supa = window.supabaseClient;
    
    (async function initAuth() {
        try {
            if (!supa) {
                console.warn('Supabase client not found; continuing without auth gate');
                return initializePage();
            }
            const { data } = await supa.auth.getSession();
            // If you want to force login for admins, uncomment the redirect
            // if (!data.session) { window.location.href = 'driver.html'; return; }
            initializePage();
        } catch (e) {
            console.error('Auth state error:', e);
            initializePage();
        }
    })();

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                if (supa) await supa.auth.signOut();
                window.location.href = 'driver.html';
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