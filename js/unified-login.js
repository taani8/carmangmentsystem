// Tabs behavior and minor wiring between separate admin/driver auth scripts and unified UI
document.addEventListener('DOMContentLoaded', function() {
    var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.tab-button'));
    var adminTab = document.getElementById('tab-admin');
    var driverTab = document.getElementById('tab-driver');

    function activate(tab) {
        tabButtons.forEach(function(btn){ btn.classList.toggle('active', btn.dataset.tab === tab); });
        adminTab.classList.toggle('active', tab === 'admin');
        driverTab.classList.toggle('active', tab === 'driver');
    }

    tabButtons.forEach(function(btn){
        btn.addEventListener('click', function(){ activate(btn.dataset.tab); });
    });

    // Default view for admins
    activate('admin');
});

