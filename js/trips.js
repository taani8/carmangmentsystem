// Trip management functionality
let trips = [];
let filteredTrips = [];
let drivers = [];
let editingTripId = null;

function initializePage() {
    loadTrips();
    loadDrivers();
    setupEventListeners();
}

function setupEventListeners() {
    // Add trip button
    document.getElementById('addTripBtn').addEventListener('click', openAddTripModal);
    
    // Search and filters
    document.getElementById('searchInput').addEventListener('input', filterTrips);
    document.getElementById('driverFilter').addEventListener('change', filterTrips);
    document.getElementById('typeFilter').addEventListener('change', filterTrips);
    document.getElementById('dateFilter').addEventListener('change', filterTrips);
    
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Cancel buttons
    document.getElementById('cancelBtn').addEventListener('click', closeModals);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeModals);
    
    // Form submit
    document.getElementById('tripForm').addEventListener('submit', saveTrip);
    
    // Delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteTrip);
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModals();
            }
        });
    });
}

async function loadDrivers() {
    try {
        const supa = window.supabaseClient;
        const { data, error } = await supa
            .from('drivers')
            .select('id, name')
            .order('name', { ascending: true });
        if (error) throw error;
        drivers = (data || []).map(d => ({ id: d.id, name: d.name }));
        updateDriverDropdowns();
    } catch (error) {
        console.error('Error loading drivers:', error);
    }
}

function updateDriverDropdowns() {
    const tripDriverSelect = document.getElementById('tripDriver');
    const driverFilterSelect = document.getElementById('driverFilter');
    
    // Update trip form driver dropdown
    tripDriverSelect.innerHTML = '<option value="">اختر السائق</option>';
    drivers.forEach(driver => {
        tripDriverSelect.innerHTML += `<option value="${driver.id}">${driver.name}</option>`;
    });
    
    // Update driver filter dropdown
    driverFilterSelect.innerHTML = '<option value="all">جميع السائقين</option>';
    drivers.forEach(driver => {
        driverFilterSelect.innerHTML += `<option value="${driver.id}">${driver.name}</option>`;
    });
}

async function loadTrips() {
    try {
        const supa = window.supabaseClient;
        const { data, error } = await supa
            .from('trips')
            .select('id, driver_id, driver_name, trip_type, fare, commission, deduction, date')
            .order('date', { ascending: false });
        if (error) throw error;
        trips = (data || []).map(t => ({
            id: t.id,
            driverId: t.driver_id,
            driverName: t.driver_name,
            tripType: t.trip_type,
            fare: Number(t.fare || 0),
            commission: Number(t.commission || 0),
            deduction: Number(t.deduction || 0),
            date: t.date
        }));
        filteredTrips = [...trips];
        updateTripsTable();
    } catch (error) {
        console.error('Error loading trips:', error);
        showErrorMessage('Failed to load trips');
    }
}

function filterTrips() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const driverFilter = document.getElementById('driverFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    filteredTrips = trips.filter(trip => {
        // Search filter
        const matchesSearch = trip.driverName?.toLowerCase().includes(searchTerm) ||
                            trip.tripType?.toLowerCase().includes(searchTerm);
        
        // Driver filter
        const matchesDriver = driverFilter === 'all' || trip.driverId === driverFilter;
        
        // Type filter
        const matchesType = typeFilter === 'all' || trip.tripType === typeFilter;
        
        // Date filter
        let matchesDate = true;
        if (dateFilter) {
            const tripDate = trip.date.toDate ? trip.date.toDate() : new Date(trip.date);
            const filterDate = new Date(dateFilter);
            matchesDate = tripDate.toDateString() === filterDate.toDateString();
        }
        
        return matchesSearch && matchesDriver && matchesType && matchesDate;
    });
    
    updateTripsTable();
}

function updateTripsTable() {
    const tbody = document.getElementById('tripsTableBody');
    
    if (filteredTrips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">لا توجد رحلات</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredTrips.map(trip => {
        const tripDate = trip.date.toDate ? trip.date.toDate() : new Date(trip.date);
        
        return `
            <tr>
                <td>
                    <div>${formatDateTime(tripDate)}</div>
                </td>
                <td><strong>${trip.driverName || 'Unknown Driver'}</strong></td>
                <td><span class="trip-type trip-type-${trip.tripType.toLowerCase()}">${getArabicTripType(trip.tripType)}</span></td>
                <td class="amount amount-positive">${(trip.fare || 0).toFixed(2)} دينار</td>
                <td class="amount amount-commission">${(trip.commission || 0).toFixed(2)} دينار</td>
                <td class="amount amount-deduction">${(trip.deduction || 0).toFixed(2)} دينار</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary action-btn" onclick="editTrip('${trip.id}')">تعديل</button>
                        <button class="btn btn-danger action-btn" onclick="confirmDeleteTrip('${trip.id}')">حذف</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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

function formatDateTime(date) {
    if (!date) return 'Unknown';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) + '<br>' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function openAddTripModal() {
    editingTripId = null;
    document.getElementById('modalTitle').textContent = 'إضافة رحلة جديدة';
    document.getElementById('tripForm').reset();
    document.getElementById('tripModal').classList.add('show');
}

function editTrip(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    
    editingTripId = tripId;
    document.getElementById('modalTitle').textContent = 'تعديل الرحلة';
    document.getElementById('tripDriver').value = trip.driverId;
    document.getElementById('tripType').value = trip.tripType;
    document.getElementById('tripFare').value = trip.fare || 0;
    document.getElementById('tripCommission').value = trip.commission || 0;
    document.getElementById('tripDeduction').value = trip.deduction || 0;
    
    document.getElementById('tripModal').classList.add('show');
}

async function saveTrip(e) {
    e.preventDefault();
    
    const driverId = document.getElementById('tripDriver').value;
    const tripType = document.getElementById('tripType').value;
    const fare = parseFloat(document.getElementById('tripFare').value) || 0;
    const commission = parseFloat(document.getElementById('tripCommission').value) || 0;
    const deduction = parseFloat(document.getElementById('tripDeduction').value) || 0;
    
    if (!driverId || !tripType) {
        showErrorMessage('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) {
        showErrorMessage('السائق المحدد غير موجود');
        return;
    }
    
    const saveBtn = document.getElementById('saveTripBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'جاري الحفظ...';
    saveBtn.disabled = true;
    
    try {
        const supa = window.supabaseClient;
        if (editingTripId) {
            const originalTrip = trips.find(t => t.id === editingTripId) || { deduction: 0 };
            const { error: upErr } = await supa.from('trips').update({
                driver_id: driverId,
                driver_name: driver.name,
                trip_type: tripType,
                fare: fare,
                commission: commission,
                deduction: deduction
            }).eq('id', editingTripId);
            if (upErr) throw upErr;
            const balanceAdjustment = (originalTrip.deduction || 0) - deduction;
            if (balanceAdjustment !== 0) {
                await supa.rpc('adjust_driver_balance', { p_driver_id: driverId, p_amount: balanceAdjustment });
            }
        } else {
            const { error: addErr } = await supa.from('trips').insert({
                driver_id: driverId,
                driver_name: driver.name,
                trip_type: tripType,
                fare: fare,
                commission: commission,
                deduction: deduction
            });
            if (addErr) throw addErr;
            if (deduction) {
                await supa.rpc('adjust_driver_balance', { p_driver_id: driverId, p_amount: -deduction });
            }
        }
        
        closeModals();
        loadTrips();
        showSuccessMessage(editingTripId ? 'تم تحديث الرحلة بنجاح' : 'تم إضافة الرحلة بنجاح');
    } catch (error) {
        console.error('Error saving trip:', error);
        showErrorMessage('فشل في حفظ الرحلة');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

function confirmDeleteTrip(tripId) {
    editingTripId = tripId;
    document.getElementById('deleteModal').classList.add('show');
}

async function deleteTrip() {
    if (!editingTripId) return;
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = 'جاري الحذف...';
    deleteBtn.disabled = true;
    
    try {
        const supa = window.supabaseClient;
        const trip = trips.find(t => t.id === editingTripId);
        if (!trip) return;
        const { error } = await supa.from('trips').delete().eq('id', editingTripId);
        if (error) throw error;
        if (trip.deduction) {
            await supa.rpc('adjust_driver_balance', { p_driver_id: trip.driverId, p_amount: (trip.deduction || 0) });
        }
        
        closeModals();
        loadTrips();
        showSuccessMessage('تم حذف الرحلة بنجاح');
    } catch (error) {
        console.error('Error deleting trip:', error);
        showErrorMessage('فشل في حذف الرحلة');
    } finally {
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
    }
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    editingTripId = null;
}

function showErrorMessage(message) {
    // You can implement a toast notification system here
    alert(message);
}

function showSuccessMessage(message) {
    // You can implement a toast notification system here
    alert(message);
}