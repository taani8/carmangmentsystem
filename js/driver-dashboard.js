// Driver dashboard logic: show trips count and current balance
document.addEventListener('DOMContentLoaded', async function() {
    const session = window.getDriverSession && window.getDriverSession();
    if (!session) return; // redirected by session guard

    const { driverId } = session;

    try {
        // Load driver document
        const driverDoc = await db.collection('drivers').doc(driverId).get();
        if (!driverDoc.exists) {
            window.location.href = 'driver-login.html';
            return;
        }
        const driver = { id: driverDoc.id, ...driverDoc.data() };

        // Set header and balance
        const driverNameHeader = document.getElementById('driverNameHeader');
        const driverBalanceEl = document.getElementById('driverBalance');
        driverNameHeader.textContent = `مرحباً ${driver.name || ''}`.trim();
        const balance = driver.balance || 0;
        driverBalanceEl.textContent = `${balance.toFixed(2)} دينار`;

        // Count total trips for this driver
        const allTripsCountSnap = await db.collection('trips')
            .where('driverId', '==', driverId)
            .get();
        document.getElementById('driverTripsCount').textContent = allTripsCountSnap.size;
        // UI limited to trips count and balance only; no table rendering
    } catch (error) {
        console.error('Driver dashboard error', error);
        alert('تعذر تحميل البيانات');
    }
});

function getArabicTripType(type) {
    const types = {
        'Airport': 'المطار',
        'Families': 'العائلات',
        'Passengers': 'الركاب',
        'Drive': 'توصيل سريع'
    };
    return types[type] || type;
}

