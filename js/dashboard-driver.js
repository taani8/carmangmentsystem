// Driver minimal dashboard on admin dashboard page
window.initializeDriverDashboard = async function initializeDriverDashboard() {
    try {
        var session = (function() {
            try { return JSON.parse(localStorage.getItem('driver_session') || 'null'); } catch (_) { return null; }
        })();
        if (!session || !session.driverId) {
            window.location.href = 'login.html';
            return;
        }

        // Toggle views
        var driverView = document.getElementById('driverView');
        var adminView = document.getElementById('adminView');
        if (driverView) driverView.style.display = 'block';
        if (adminView) adminView.style.display = 'none';

        // Hide admin-only nav links
        try {
            document.querySelectorAll('.nav-menu a[href="drivers.html"], .nav-menu a[href="trips.html"], .nav-menu a[href="reports.html"]').forEach(function(a){ a.style.display = 'none'; });
        } catch (_) {}

        var driverId = session.driverId;
        // Load driver document
        var driverDoc = await db.collection('drivers').doc(driverId).get();
        if (!driverDoc.exists) {
            localStorage.removeItem('driver_session');
            window.location.href = 'login.html';
            return;
        }
        var driver = Object.assign({ id: driverDoc.id }, driverDoc.data());

        var nameHeader = document.getElementById('driverNameHeader');
        var balanceEl = document.getElementById('driverBalance');
        if (nameHeader) nameHeader.textContent = ('مرحباً ' + (driver.name || '')).trim();
        var balance = Number(driver.balance || 0);
        if (balanceEl) balanceEl.textContent = balance.toFixed(2) + ' دينار';

        // Count total trips for this driver
        var allTripsCountSnap = await db.collection('trips').where('driverId', '==', driverId).get();
        var tripsCount = allTripsCountSnap ? allTripsCountSnap.size : 0;
        var tripsCountEl = document.getElementById('driverTripsCount');
        if (tripsCountEl) tripsCountEl.textContent = String(tripsCount);
    } catch (error) {
        console.error('Driver minimal dashboard error', error);
        alert('تعذر تحميل بيانات السائق');
    }
};

