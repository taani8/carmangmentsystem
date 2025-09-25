// Driver session utilities and guards
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('driverLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                localStorage.removeItem('driver_session');
                try { await auth.signOut(); } catch (_) {}
            } finally {
                window.location.href = 'driver-login.html';
            }
        });
    }

    const session = getDriverSession();
    if (!session) {
        window.location.href = 'driver-login.html';
        return;
    }
});

function getDriverSession() {
    try {
        const raw = localStorage.getItem('driver_session');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed.driverId) return null;
        return parsed;
    } catch (_) {
        return null;
    }
}

window.getDriverSession = getDriverSession;

