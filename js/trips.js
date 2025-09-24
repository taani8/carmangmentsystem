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
        const snapshot = await db.collection('drivers').orderBy('name').get();
        drivers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        updateDriverDropdowns();
    } catch (error) {
        console.error('Error loading drivers:', error);
    }
}

function updateDriverDropdowns() {
    const tripDriverSelect = document.getElementById('tripDriver');
    const driverFilterSelect = document.getElementById('driverFilter');
    
    // Update trip form driver dropdown
    tripDriverSelect.innerHTML = '<option value="">Select Driver</option>';
    drivers.forEach(driver => {
        tripDriverSelect.innerHTML += `<option value="${driver.id}">${driver.name}</option>`;
    });
    
    // Update driver filter dropdown
    driverFilterSelect.innerHTML = '<option value="all">All Drivers</option>';
    drivers.forEach(driver => {
        driverFilterSelect.innerHTML += `<option value="${driver.id}">${driver.name}</option>`;
    });
}

async function loadTrips() {
    try {
        const snapshot = await db.collection('trips').orderBy('date', 'desc').get();
        trips = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
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
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No trips found</td></tr>';
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
                <td><span class="trip-type trip-type-${trip.tripType.toLowerCase()}">${trip.tripType}</span></td>
                <td class="amount amount-positive">${(trip.fare || 0).toFixed(2)} JOD</td>
                <td class="amount amount-commission">${(trip.commission || 0).toFixed(2)} JOD</td>
                <td class="amount amount-deduction">${(trip.deduction || 0).toFixed(2)} JOD</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary action-btn" onclick="editTrip('${trip.id}')">Edit</button>
                        <button class="btn btn-danger action-btn" onclick="confirmDeleteTrip('${trip.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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
    document.getElementById('modalTitle').textContent = 'Add New Trip';
    document.getElementById('tripForm').reset();
    document.getElementById('tripModal').classList.add('show');
}

function editTrip(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    
    editingTripId = tripId;
    document.getElementById('modalTitle').textContent = 'Edit Trip';
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
        showErrorMessage('Please fill in all required fields');
        return;
    }
    
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) {
        showErrorMessage('Selected driver not found');
        return;
    }
    
    const saveBtn = document.getElementById('saveTripBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        const tripData = {
            driverId,
            driverName: driver.name,
            tripType,
            fare,
            commission,
            deduction,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (editingTripId) {
            // Update existing trip
            const originalTrip = trips.find(t => t.id === editingTripId);
            
            // Update trip
            await db.collection('trips').doc(editingTripId).update(tripData);
            
            // Adjust driver balance (reverse original deduction, apply new deduction)
            const balanceAdjustment = (originalTrip.deduction || 0) - deduction;
            await db.collection('drivers').doc(driverId).update({
                balance: firebase.firestore.FieldValue.increment(balanceAdjustment)
            });
        } else {
            // Add new trip
            tripData.date = firebase.firestore.FieldValue.serverTimestamp();
            tripData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            await db.collection('trips').add(tripData);
            
            // Deduct from driver's balance
            await db.collection('drivers').doc(driverId).update({
                balance: firebase.firestore.FieldValue.increment(-deduction)
            });
        }
        
        closeModals();
        loadTrips();
        showSuccessMessage(editingTripId ? 'Trip updated successfully' : 'Trip added successfully');
    } catch (error) {
        console.error('Error saving trip:', error);
        showErrorMessage('Failed to save trip');
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
    deleteBtn.textContent = 'Deleting...';
    deleteBtn.disabled = true;
    
    try {
        const trip = trips.find(t => t.id === editingTripId);
        if (!trip) return;
        
        // Delete trip
        await db.collection('trips').doc(editingTripId).delete();
        
        // Return deduction to driver's balance
        await db.collection('drivers').doc(trip.driverId).update({
            balance: firebase.firestore.FieldValue.increment(trip.deduction || 0)
        });
        
        closeModals();
        loadTrips();
        showSuccessMessage('Trip deleted successfully');
    } catch (error) {
        console.error('Error deleting trip:', error);
        showErrorMessage('Failed to delete trip');
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