// Authentication check for protected pages
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    auth.onAuthStateChanged(user => {
        if (!user) {
            // User is not logged in, redirect to login
            window.location.href = 'index.html';
            return;
        }
        
        // User is logged in, initialize page functionality
        initializePage();
    });

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                await auth.signOut();
                window.location.href = 'index.html';
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
    // This function will be overridden in each page's specific JS file
    console.log('Page initialized');
}