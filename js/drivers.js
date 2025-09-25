// Driver management functionality
let drivers = [];
let filteredDrivers = [];
let editingDriverId = null;
let selectedPhotoFile = null;
let currentView = 'cards';

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
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentView = this.getAttribute('data-view');
            updateDriversDisplay();
        });
    });
    
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
        const supa = window.supabaseClient;
        const { data, error } = await supa
            .from('drivers')
            .select('id, name, phone, balance, photo_url')
            .order('name', { ascending: true });
        if (error) throw error;
        drivers = (data || []).map(d => ({
            id: d.id,
            name: d.name,
            phone: d.phone,
            balance: Number(d.balance || 0),
            photoURL: d.photo_url || null
        }));
        filteredDrivers = [...drivers];
        updateDriversDisplay();
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
    
    updateDriversDisplay();
}

function updateDriversDisplay() {
    if (currentView === 'cards') {
        updateDriversCards();
        document.getElementById('driversCards').style.display = 'grid';
        document.getElementById('driversTable').style.display = 'none';
    } else {
        updateDriversTable();
        document.getElementById('driversCards').style.display = 'none';
        document.getElementById('driversTable').style.display = 'table';
    }
}

function updateDriversCards() {
    const container = document.getElementById('driversCards');
    
    if (filteredDrivers.length === 0) {
        container.innerHTML = '<div class="no-data">لا يوجد سائقين</div>';
        return;
    }
    
    container.innerHTML = filteredDrivers.map(driver => {
        const balance = driver.balance || 0;
        const balanceClass = balance > 0 ? 'balance-positive' : balance === 0 ? 'balance-warning' : 'balance-danger';
        const statusText = balance > 0 ? 'نشط' : balance === 0 ? 'رصيد صفر' : 'رصيد سالب';
        const cardClass = balance <= 0 ? 'driver-card low-balance' : 'driver-card';
        
        const avatarHtml = driver.photoURL ? 
            `<img src="${driver.photoURL}" alt="${driver.name}" class="driver-avatar">` :
            `<div class="driver-avatar-placeholder">${driver.name.charAt(0).toUpperCase()}</div>`;
        
        return `
            <div class="${cardClass}">
                <div class="driver-header">
                    ${avatarHtml}
                    <div class="driver-info">
                        <h3>${driver.name}</h3>
                        <p>${driver.phone}</p>
                    </div>
                </div>
                
                <div class="driver-stats">
                    <div class="stat-item">
                        <div class="stat-value ${balanceClass}">${balance.toFixed(2)}</div>
                        <div class="stat-label">الرصيد (دينار)</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${statusText}</div>
                        <div class="stat-label">الحالة</div>
                    </div>
                </div>
                
                <div class="driver-actions">
                    <button class="btn btn-secondary" onclick="editDriver('${driver.id}')">تعديل</button>
                    <button class="btn btn-danger" onclick="confirmDeleteDriver('${driver.id}', '${driver.name}')">حذف</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateDriversTable() {
    const tbody = document.getElementById('driversTableBody');
    
    if (filteredDrivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">لا يوجد سائقين</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredDrivers.map(driver => {
        const balance = driver.balance || 0;
        const balanceClass = balance > 0 ? 'status-positive' : balance === 0 ? 'status-warning' : 'status-danger';
        const statusText = balance > 0 ? 'نشط' : balance === 0 ? 'رصيد صفر' : 'رصيد سالب';
        
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
                <td class="amount ${balance > 0 ? 'amount-positive' : 'amount-deduction'}">${balance.toFixed(2)} دينار</td>
                <td><span class="status-badge ${balanceClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary action-btn" onclick="editDriver('${driver.id}')">تعديل</button>
                        <button class="btn btn-danger action-btn" onclick="confirmDeleteDriver('${driver.id}', '${driver.name}')">حذف</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddDriverModal() {
    editingDriverId = null;
    selectedPhotoFile = null;
    document.getElementById('modalTitle').textContent = 'إضافة سائق جديد';
    document.getElementById('driverForm').reset();
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('driverModal').classList.add('show');
}

function editDriver(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    editingDriverId = driverId;
    document.getElementById('modalTitle').textContent = 'تعديل السائق';
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
        showErrorMessage('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    const saveBtn = document.getElementById('saveDriverBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'جاري الحفظ...';
    saveBtn.disabled = true;
    
    try {
        const supa = window.supabaseClient;
        const driverData = {
            name: name,
            phone: phone,
            balance: balance
        };
        // Note: photo upload to Supabase Storage can be added later
        if (selectedPhotoFile && selectedPhotoFile !== 'DELETE') {
            console.warn('Photo upload not implemented with Supabase Storage in this build.');
        }
        if (editingDriverId) {
            const updates = { ...driverData };
            if (selectedPhotoFile === 'DELETE') updates.photo_url = null;
            const { error } = await supa.from('drivers').update(updates).eq('id', editingDriverId);
            if (error) throw error;
        } else {
            const inserts = { ...driverData };
            const { error } = await supa.from('drivers').insert(inserts);
            if (error) throw error;
        }
        
        closeModals();
        loadDrivers();
        updateDriversDisplay();
        showSuccessMessage(editingDriverId ? 'تم تحديث السائق بنجاح' : 'تم إضافة السائق بنجاح');
    } catch (error) {
        console.error('Error saving driver:', error);
        showErrorMessage('فشل في حفظ السائق');
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
    deleteBtn.textContent = 'جاري الحذف...';
    deleteBtn.disabled = true;
    
    try {
        const supa = window.supabaseClient;
        const { data: trips, error: tripsErr } = await supa
            .from('trips')
            .select('id')
            .eq('driver_id', editingDriverId)
            .limit(1);
        if (tripsErr) throw tripsErr;
        if (trips && trips.length > 0) {
            showErrorMessage('لا يمكن حذف سائق لديه رحلات موجودة');
            return;
        }
        const { error } = await supa.from('drivers').delete().eq('id', editingDriverId);
        if (error) throw error;
        
        closeModals();
        loadDrivers();
        updateDriversDisplay();
        showSuccessMessage('تم حذف السائق بنجاح');
    } catch (error) {
        console.error('Error deleting driver:', error);
        showErrorMessage('فشل في حذف السائق');
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
        showErrorMessage('يرجى اختيار ملف صورة صالح');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showErrorMessage('يجب أن يكون حجم الصورة أقل من 5 ميجابايت');
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