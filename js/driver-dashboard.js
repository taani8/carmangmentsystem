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

        // Load last 20 trips for this driver
        const tripsSnap = await db.collection('trips')
            .where('driverId', '==', driverId)
            .orderBy('date', 'desc')
            .limit(20)
            .get();

        const trips = tripsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Count total trips for this driver
        const allTripsCountSnap = await db.collection('trips')
            .where('driverId', '==', driverId)
            .get();
        document.getElementById('driverTripsCount').textContent = allTripsCountSnap.size;

        // Populate recent trips table
        const tbody = document.getElementById('driverRecentTripsBody');
        if (trips.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">لا توجد رحلات</td></tr>';
        } else {
            tbody.innerHTML = trips.map(trip => {
                const tripDate = trip.date && trip.date.toDate ? trip.date.toDate() : (trip.date ? new Date(trip.date) : null);
                const dateText = tripDate ? tripDate.toLocaleString('ar-JO') : '';
                return `
                    <tr>
                        <td><span class="trip-type">${getArabicTripType(trip.tripType || '')}</span></td>
                        <td class="amount amount-positive">${(trip.fare || 0).toFixed(2)} دينار</td>
                        <td class="amount amount-commission">${(trip.commission || 0).toFixed(2)} دينار</td>
                        <td class="amount amount-deduction">${(trip.deduction || 0).toFixed(2)} دينار</td>
                        <td>${dateText}</td>
                    </tr>
                `;
            }).join('');
        }
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

