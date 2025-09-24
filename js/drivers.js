// Driver management functionality
let drivers = [];
let filteredDrivers = [];
let editingDriverId = null;
let selectedPhotoFile = null;

function initializePage() {
    loadDrivers();
    setupEventListeners();
}

function setupEventListeners() {
    // Add driver button
    document.getElementById('addDriverBtn').addEventListener('click', openAddDriverModal);
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', filterDrivers);
    
    // Balance filter
    document.getElementById('balanceFilter').addEventListener('change', filterDrivers);
    
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Cancel buttons
    document.getElementById('cancelBtn').addEventListener('click', closeModals);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeModals);
    
    // Form submit
    document.getElementById('driverForm').addEventListener('submit', saveDriver);
    
    // Delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteDriver);
    
    // Photo upload handling
    document.getElementById('driverPhoto').addEventListener('change', handlePhotoSelect);
    document.getElementById('removePhoto').addEventListener('click', removePhoto);
    
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
        
        filteredDrivers = [...drivers];
        updateDriversTable();
    } catch (error) {
        console.error('Error loading drivers:', error);
        showErrorMessage('Failed to load drivers');
    }
}

function filterDrivers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const balanceFilter = document.getElementById('balanceFilter').value;
    
    filteredDrivers = drivers.filter(driver => {
        // Search filter
        const matchesSearch = driver.name.toLowerCase().includes(searchTerm) ||
                            driver.phone.toLowerCase().includes(searchTerm);
        
        // Balance filter
        let matchesBalance = true;
        if (balanceFilter !== 'all') {
            const balance = driver.balance || 0;
            switch (balanceFilter) {
                case 'positive':
                    matchesBalance = balance > 0;
                    break;
                case 'zero':
                    matchesBalance = balance === 0;
                    break;
                case 'negative':
                    matchesBalance = balance < 0;
                    break;
            }
        }
        
        return matchesSearch && matchesBalance;
    });
    
    updateDriversTable();
}

function updateDriversTable() {
    const tbody = document.getElementById('driversTableBody');
    
    if (filteredDrivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No drivers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredDrivers.map(driver => {
        const balance = driver.balance || 0;
        const balanceClass = balance > 0 ? 'status-positive' : balance === 0 ? 'status-warning' : 'status-danger';
        const statusText = balance > 0 ? 'Active' : balance === 0 ? 'Zero Balance' : 'Negative Balance';
        
        const photoHtml = driver.photoURL ? 
            `<img src="${driver.photoURL}" alt="${driver.name}" class="driver-photo">` :
            `<div class="driver-photo-placeholder">${driver.name.charAt(0).toUpperCase()}</div>`;
        
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        ${photoHtml}
                        <strong>${driver.name}</strong>
                    </div>
                </td>
                <td>${driver.phone}</td>
                <td class="amount ${balance > 0 ? 'amount-positive' : 'amount-deduction'}">${balance.toFixed(2)} JOD</td>
                <td><span class="status-badge ${balanceClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary action-btn" onclick="editDriver('${driver.id}')">Edit</button>
                        <button class="btn btn-danger action-btn" onclick="confirmDeleteDriver('${driver.id}', '${driver.name}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddDriverModal() {
    editingDriverId = null;
    selectedPhotoFile = null;
    document.getElementById('modalTitle').textContent = 'Add New Driver';
    document.getElementById('driverForm').reset();
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('driverModal').classList.add('show');
}

function editDriver(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    editingDriverId = driverId;
    document.getElementById('modalTitle').textContent = 'Edit Driver';
    document.getElementById('driverName').value = driver.name;
    document.getElementById('driverPhone').value = driver.phone;
    document.getElementById('driverBalance').value = driver.balance || 0;
    
    // Handle existing photo
    selectedPhotoFile = null;
    if (driver.photoURL) {
        document.getElementById('previewImage').src = driver.photoURL;
        document.getElementById('photoPreview').style.display = 'block';
    } else {
        document.getElementById('photoPreview').style.display = 'none';
    }
    
    document.getElementById('driverModal').classList.add('show');
}

async function saveDriver(e) {
    e.preventDefault();
    
    const name = document.getElementById('driverName').value.trim();
    const phone = document.getElementById('driverPhone').value.trim();
    const balance = parseFloat(document.getElementById('driverBalance').value) || 0;
    
    if (!name || !phone) {
        showErrorMessage('Please fill in all required fields');
        return;
    }
    
    const saveBtn = document.getElementById('saveDriverBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        const driverData = {
            name,
            phone,
            balance,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Handle photo upload
        if (selectedPhotoFile) {
            const photoRef = firebase.storage().ref().child(`driver-photos/${Date.now()}_${selectedPhotoFile.name}`);
            const uploadTask = await photoRef.put(selectedPhotoFile);
            const photoURL = await uploadTask.ref.getDownloadURL();
            driverData.photoURL = photoURL;
        }
        
        if (editingDriverId) {
            // Update existing driver
            const originalDriver = drivers.find(d => d.id === editingDriverId);
            
            // If updating photo, delete old photo from storage
            if (selectedPhotoFile && originalDriver.photoURL) {
                try {
                    const oldPhotoRef = firebase.storage().refFromURL(originalDriver.photoURL);
                    await oldPhotoRef.delete();
                } catch (error) {
                    console.log('Could not delete old photo:', error);
                }
            }
            
            await db.collection('drivers').doc(editingDriverId).update(driverData);
        } else {
            // Add new driver
            driverData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('drivers').add(driverData);
        }
        
        closeModals();
        loadDrivers();
        showSuccessMessage(editingDriverId ? 'Driver updated successfully' : 'Driver added successfully');
    } catch (error) {
        console.error('Error saving driver:', error);
        showErrorMessage('Failed to save driver');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

function confirmDeleteDriver(driverId, driverName) {
    editingDriverId = driverId;
    document.getElementById('deleteDriverName').textContent = driverName;
    document.getElementById('deleteModal').classList.add('show');
}

async function deleteDriver() {
    if (!editingDriverId) return;
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = 'Deleting...';
    deleteBtn.disabled = true;
    
    try {
        // Check if driver has trips
        const tripsSnapshot = await db.collection('trips')
            .where('driverId', '==', editingDriverId)
            .limit(1)
            .get();
        
        if (!tripsSnapshot.empty) {
            showErrorMessage('Cannot delete driver with existing trips');
            return;
        }
        
        await db.collection('drivers').doc(editingDriverId).delete();
        
        closeModals();
        loadDrivers();
        showSuccessMessage('Driver deleted successfully');
    } catch (error) {
        console.error('Error deleting driver:', error);
        showErrorMessage('Failed to delete driver');
    } finally {
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
    }
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    selectedPhotoFile = null;
    document.getElementById('photoPreview').style.display = 'none';
    editingDriverId = null;
}

function showErrorMessage(message) {
    // You can implement a toast notification system here
    alert(message);
}

function showSuccessMessage(message) {
    // You can implement a toast notification system here
    alert(message);
}

function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showErrorMessage('Please select a valid image file');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showErrorMessage('Image size must be less than 5MB');
        return;
    }
    
    selectedPhotoFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImage').src = e.target.result;
        document.getElementById('photoPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    selectedPhotoFile = null;
    document.getElementById('driverPhoto').value = '';
    document.getElementById('photoPreview').style.display = 'none';
    
    // If editing existing driver, mark photo for deletion
    if (editingDriverId) {
        const driver = drivers.find(d => d.id === editingDriverId);
        if (driver && driver.photoURL) {
            // We'll handle photo deletion when saving
            selectedPhotoFile = 'DELETE';
        }
    }
}