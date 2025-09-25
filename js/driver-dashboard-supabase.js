// Driver dashboard using Supabase session and data
document.addEventListener('DOMContentLoaded', function() {
    var supa = window.supabaseClient;
    if (!supa) return;

    (async function init() {
        try {
            var sessionRes = await supa.auth.getSession();
            var session = sessionRes && sessionRes.data && sessionRes.data.session;
            if (!session) { window.location.href = 'login.html'; return; }

            var user = session.user;
            var driverPhone = localStorage.getItem('driver_phone') || (user && user.phone) || '';
            var normalized = normalizePhone(driverPhone);
            if (!normalized) { window.location.href = 'login.html'; return; }

            var summaryRes = await supa.rpc('get_driver_summary', { p_phone: normalized });
            if (summaryRes.error) {
                console.error(summaryRes.error);
                alert('تعذر جلب البيانات');
                return;
            }
            var arr = summaryRes.data || [];
            if (arr.length === 0) { window.location.href = 'login.html'; return; }
            var row = arr[0];

            var driverNameHeader = document.getElementById('driverNameHeader');
            var driverBalanceEl = document.getElementById('driverBalance');
            var tripsCountEl = document.getElementById('driverTripsCount');

            if (driverNameHeader) driverNameHeader.textContent = ('مرحباً ' + (row.name || '')).trim();
            if (driverBalanceEl) driverBalanceEl.textContent = Number(row.balance || 0).toFixed(2) + ' دينار';
            if (tripsCountEl) tripsCountEl.textContent = String(row.trip_count || 0);
        } catch (e) {
            console.error('Driver dashboard error', e);
            alert('حدث خطأ');
        }
    })();

    function normalizePhone(phone) {
        var digits = (phone || '').replace(/\D+/g, '');
        if (digits.indexOf('0') === 0 && digits.length === 10) return digits;
        if (digits.indexOf('0') !== 0 && digits.length === 9) return '0' + digits;
        return null;
    }
});

