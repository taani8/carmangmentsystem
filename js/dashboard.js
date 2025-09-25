// Dashboard functionality
let dashboardData = {
    drivers: [],
    trips: [],
    todayTrips: []
};

function initializePage() {
    loadDashboardData();
}

async function loadDashboardData() {
    try {
        // Load drivers
        const driversSnapshot = await db.collection('drivers').get();
        dashboardData.drivers = driversSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load today's trips
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const todayTripsSnapshot = await db.collection('trips')
            .where('date', '>=', startOfDay)
            .where('date', '<', endOfDay)
            .orderBy('date', 'desc')
            .limit(10)
            .get();

        dashboardData.todayTrips = todayTripsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load all trips for statistics
        const allTripsSnapshot = await db.collection('trips').get();
        dashboardData.trips = allTripsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        updateDashboardUI();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardUI() {
    // Update statistics
    updateStatistics();
    
    // Update recent trips table
    updateRecentTripsTable();
}

function updateStatistics() {
    const { drivers, todayTrips } = dashboardData;
    
    // Total drivers
    document.getElementById('totalDrivers').textContent = drivers.length;
    
    // Today's trips
    document.getElementById('todayTrips').textContent = todayTrips.length;
    
    // Today's commission
    const todayCommission = todayTrips.reduce((sum, trip) => sum + (trip.commission || 0), 0);
    document.getElementById('todayCommission').textContent = `${todayCommission.toFixed(2)} دينار`;
    
    // Low balance drivers
    const lowBalanceDrivers = drivers.filter(driver => (driver.balance || 0) <= 0);
    document.getElementById('lowBalanceDrivers').textContent = lowBalanceDrivers.length;
    
    // Update low balance card style
    const lowBalanceCard = document.getElementById('lowBalanceDrivers').closest('.stat-card');
    if (lowBalanceDrivers.length > 0) {
        lowBalanceCard.classList.add('warning');
    } else {
        lowBalanceCard.classList.remove('warning');
    }
}

function updateRecentTripsTable() {
    const tbody = document.getElementById('recentTripsBody');
    
    if (dashboardData.todayTrips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No trips today</td></tr>';
        return;
    }
    
    tbody.innerHTML = dashboardData.todayTrips.map(trip => `
        <tr>
            <td>${trip.driverName || 'Unknown Driver'}</td>
            <td><span class="trip-type trip-type-${trip.tripType.toLowerCase()}">${getArabicTripType(trip.tripType)}</span></td>
            <td class="amount amount-positive">${(trip.fare || 0).toFixed(2)} دينار</td>
            <td class="amount amount-commission">${(trip.commission || 0).toFixed(2)} دينار</td>
            <td>${formatTime(trip.date)}</td>
        </tr>
    `).join('');
}

function getArabicTripType(type) {
    const types = {
        'Airport': 'المطار',
        'Families': 'العائلات',
        'Passengers': 'الركاب',
        'Drive': 'توصيل سريع'
    };
    return types[type] || type;
}

function formatTime(date) {
    if (!date) return 'Unknown';
    
    const tripDate = date.toDate ? date.toDate() : new Date(date);
    return tripDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}