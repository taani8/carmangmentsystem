// Reports functionality
let reportsData = {
    trips: [],
    drivers: [],
    filteredTrips: [],
    dateRange: {
        start: null,
        end: null
    }
};

function initializePage() {
    loadReportsData();
    setupEventListeners();
    setTodayFilter(); // Default to today
}

function setupEventListeners() {
    // Date filters
    document.getElementById('applyFiltersBtn').addEventListener('click', applyDateFilters);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    
    // Quick filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const period = this.getAttribute('data-period');
            setQuickFilter(period);
        });
    });
}

async function loadReportsData() {
    try {
        // Load trips
        const tripsSnapshot = await db.collection('trips').orderBy('date', 'desc').get();
        reportsData.trips = tripsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Load drivers
        const driversSnapshot = await db.collection('drivers').get();
        reportsData.drivers = driversSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        applyFilters();
    } catch (error) {
        console.error('Error loading reports data:', error);
    }
}

function setQuickFilter(period) {
    const now = new Date();
    let start, end;
    
    switch (period) {
        case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'week':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            start = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
            end = new Date();
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date();
            break;
    }
    
    reportsData.dateRange = { start, end };
    
    // Update date inputs
    document.getElementById('startDate').value = start.toISOString().split('T')[0];
    document.getElementById('endDate').value = end.toISOString().split('T')[0];
    
    applyFilters();
}

function setTodayFilter() {
    setQuickFilter('today');
}

function applyDateFilters() {
    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;
    
    if (startDateInput) {
        reportsData.dateRange.start = new Date(startDateInput);
    }
    
    if (endDateInput) {
        const endDate = new Date(endDateInput);
        endDate.setHours(23, 59, 59, 999); // End of day
        reportsData.dateRange.end = endDate;
    }
    
    applyFilters();
}

function applyFilters() {
    const { trips, dateRange } = reportsData;
    
    reportsData.filteredTrips = trips.filter(trip => {
        const tripDate = trip.date.toDate ? trip.date.toDate() : new Date(trip.date);
        
        if (dateRange.start && tripDate < dateRange.start) return false;
        if (dateRange.end && tripDate > dateRange.end) return false;
        
        return true;
    });
    
    updateReportsUI();
}

function updateReportsUI() {
    updateSummaryCards();
    updateTripTypeChart();
    updateTopDriversTable();
    updateLowBalanceAlerts();
}

function updateSummaryCards() {
    const { filteredTrips } = reportsData;
    
    // Total commission
    const totalCommission = filteredTrips.reduce((sum, trip) => sum + (trip.commission || 0), 0);
    document.getElementById('totalCommission').textContent = `${totalCommission.toFixed(2)} دينار`;
    
    // Total trips
    document.getElementById('totalTrips').textContent = filteredTrips.length;
    
    // Average commission
    const avgCommission = filteredTrips.length > 0 ? totalCommission / filteredTrips.length : 0;
    document.getElementById('avgCommission').textContent = `${avgCommission.toFixed(2)} دينار`;
    
    // Active drivers (drivers with trips in the period)
    const activeDriverIds = [...new Set(filteredTrips.map(trip => trip.driverId))];
    document.getElementById('activeDrivers').textContent = activeDriverIds.length;
}

function updateTripTypeChart() {
    const { filteredTrips } = reportsData;
    
    // Count trips by type
    const typeCounts = {
        Airport: 0,
        Families: 0,
        Passengers: 0,
        Drive: 0
    };
    
    filteredTrips.forEach(trip => {
        if (typeCounts.hasOwnProperty(trip.tripType)) {
            typeCounts[trip.tripType]++;
        }
    });
    
    const maxCount = Math.max(...Object.values(typeCounts), 1);
    
    // Update chart
    Object.entries(typeCounts).forEach(([type, count]) => {
        const fillElement = document.querySelector(`[data-type="${type}"]`);
        const valueElement = document.getElementById(`${type.toLowerCase()}Count`);
        
        if (fillElement && valueElement) {
            const percentage = (count / maxCount) * 100;
            fillElement.style.width = `${percentage}%`;
            valueElement.textContent = count;
        }
    });
}

function updateTopDriversTable() {
    const { filteredTrips, drivers } = reportsData;
    
    // Calculate driver statistics
    const driverStats = {};
    
    filteredTrips.forEach(trip => {
        if (!driverStats[trip.driverId]) {
            driverStats[trip.driverId] = {
                driverName: trip.driverName,
                tripCount: 0,
                totalCommission: 0,
                balance: 0
            };
        }
        
        driverStats[trip.driverId].tripCount++;
        driverStats[trip.driverId].totalCommission += trip.commission || 0;
    });
    
    // Add current balance from drivers data
    Object.keys(driverStats).forEach(driverId => {
        const driver = drivers.find(d => d.id === driverId);
        if (driver) {
            driverStats[driverId].balance = driver.balance || 0;
        }
    });
    
    // Sort by trip count
    const sortedDrivers = Object.entries(driverStats)
        .sort((a, b) => b[1].tripCount - a[1].tripCount)
        .slice(0, 10);
    
    const tbody = document.getElementById('topDriversBody');
    
    if (sortedDrivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">لا توجد بيانات سائقين للفترة المحددة</td></tr>';
        return;
    }
    
    tbody.innerHTML = sortedDrivers.map(([driverId, stats], index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
        const balanceClass = stats.balance > 0 ? 'amount-positive' : 'amount-deduction';
        
        return `
            <tr>
                <td><span class="rank-badge ${rankClass}">${rank}</span></td>
                <td><strong>${stats.driverName}</strong></td>
                <td>${stats.tripCount}</td>
                <td class="amount amount-commission">${stats.totalCommission.toFixed(2)} دينار</td>
                <td class="amount ${balanceClass}">${stats.balance.toFixed(2)} دينار</td>
            </tr>
        `;
    }).join('');
}

function updateLowBalanceAlerts() {
    const { drivers } = reportsData;
    const alertContainer = document.getElementById('lowBalanceAlert');
    
    const lowBalanceDrivers = drivers.filter(driver => (driver.balance || 0) <= 0);
    
    if (lowBalanceDrivers.length === 0) {
        alertContainer.innerHTML = '<div class="no-alerts">لا يوجد سائقين برصيد منخفض</div>';
        return;
    }
    
    alertContainer.innerHTML = lowBalanceDrivers.map(driver => {
        const balance = driver.balance || 0;
        return `
            <div class="alert-item">
                <div class="alert-info">
                    <div class="driver-name">${driver.name}</div>
                    <div class="balance-info">Phone: ${driver.phone}</div>
                    <div class="balance-info">الهاتف: ${driver.phone}</div>
                </div>
                <div class="alert-balance">${balance.toFixed(2)} دينار</div>
            </div>
        `;
    }).join('');
}

function exportToCSV() {
    const { filteredTrips } = reportsData;
    
    if (filteredTrips.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    // Prepare CSV data
    const csvData = [];
    csvData.push(['التاريخ', 'الوقت', 'السائق', 'نوع الرحلة', 'الأجرة (دينار)', 'العمولة (دينار)', 'الخصم (دينار)']);
    
    filteredTrips.forEach(trip => {
        const tripDate = trip.date.toDate ? trip.date.toDate() : new Date(trip.date);
        csvData.push([
            tripDate.toLocaleDateString(),
            tripDate.toLocaleTimeString(),
            trip.driverName || 'Unknown',
            trip.tripType || '',
            (trip.fare || 0).toFixed(2),
            (trip.commission || 0).toFixed(2),
            (trip.deduction || 0).toFixed(2)
        ]);
    });
    
    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n');
    
    // Create and download file
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
}