// Supabase OTP auth for drivers + data fetching
document.addEventListener('DOMContentLoaded', function() {
    var supa = window.supabaseClient;
    if (!supa) {
        console.error('Supabase client missing');
        return;
    }

    var otpPhoneInput = document.getElementById('otpPhone');
    var otpCodeInput = document.getElementById('otpCode');
    var otpCodeGroup = document.getElementById('otpCodeGroup');
    var sendBtn = document.getElementById('otpSendBtn');
    var verifyBtn = document.getElementById('otpVerifyBtn');
    var errorMessage = document.getElementById('errorMessage');

    var resultSection = document.getElementById('driverResult');
    var driverNameRow = document.getElementById('driverNameRow');
    var tripCountEl = document.getElementById('tripCount');
    var balanceEl = document.getElementById('driverBalance');
    var tripsTable = document.getElementById('driverTrips');
    var tripsBody = document.getElementById('driverTripsBody');

    function normalizePhone(phone) {
        var digits = (phone || '').replace(/\D+/g, '');
        if (digits.startsWith('0') && digits.length === 10) return digits;
        if (!digits.startsWith('0') && digits.length === 9) return '0' + digits;
        return null;
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    }
    function hideError() {
        errorMessage.style.display = 'none';
    }
    function setLoading(btn, loading) {
        btn.disabled = loading;
        if (loading) { btn.classList.add('loading'); } else { btn.classList.remove('loading'); }
    }

    sendBtn.addEventListener('click', async function() {
        hideError();
        var normalized = normalizePhone(otpPhoneInput.value.trim());
        if (!normalized) return showError('رقم الهاتف غير صالح');

        setLoading(sendBtn, true);
        try {
            var { error } = await supa.auth.signInWithOtp({ phone: normalized });
            if (error) {
                console.error('OTP send error:', error);
                return showError('تعذر إرسال رمز التحقق');
            }
            otpCodeGroup.style.display = 'block';
            verifyBtn.style.display = 'inline-block';
            sendBtn.style.display = 'none';
        } catch (e) {
            console.error(e);
            showError('حدث خطأ غير متوقع');
        } finally {
            setLoading(sendBtn, false);
        }
    });

    verifyBtn.addEventListener('click', async function() {
        hideError();
        var normalized = normalizePhone(otpPhoneInput.value.trim());
        var code = (otpCodeInput.value || '').trim();
        if (!normalized) return showError('رقم الهاتف غير صالح');
        if (!code) return showError('أدخل رمز التحقق');

        setLoading(verifyBtn, true);
        try {
            var { data, error } = await supa.auth.verifyOtp({ phone: normalized, token: code, type: 'sms' });
            if (error) {
                console.error('OTP verify error:', error);
                return showError('رمز التحقق غير صحيح');
            }

            // Bind this user to driver by phone (idempotent)
            await supa.rpc('bind_current_user_to_driver', { p_phone: normalized });

            await loadDriverSummaryAndTrips();
        } catch (e) {
            console.error(e);
            showError('حدث خطأ أثناء تسجيل الدخول');
        } finally {
            setLoading(verifyBtn, false);
        }
    });

    async function loadDriverSummaryAndTrips() {
        try {
            var phone = normalizePhone(otpPhoneInput.value.trim());
            var { data: summary, error } = await supa.rpc('get_driver_summary', { p_phone: phone });
            if (error) {
                console.error('Summary RPC error:', error);
                return showError('تعذر جلب البيانات');
            }
            if (!summary || summary.length === 0) {
                return showError('لم يتم العثور على سائق مرتبط بهذا الرقم');
            }
            var row = summary[0];
            var driverId = row.driver_id;
            var balance = Number(row.balance || 0);
            var count = Number(row.trip_count || 0);

            driverNameRow.textContent = row.name ? ('السائق: ' + row.name) : '';
            balanceEl.textContent = balance.toFixed(2);
            tripCountEl.textContent = String(count);
            resultSection.style.display = 'block';

            // Fetch trips list (RLS ensures only own trips)
            var { data: trips, error: tripsErr } = await supa
                .from('trips')
                .select('date, trip_type, fare, commission, deduction')
                .eq('driver_id', driverId)
                .order('date', { ascending: false })
                .limit(20);
            if (tripsErr) {
                console.error('Trips fetch error:', tripsErr);
                tripsTable.style.display = 'none';
                return;
            }
            if (!trips || trips.length === 0) {
                tripsBody.innerHTML = '<tr><td colspan="5" class="no-data">لا توجد رحلات</td></tr>';
                tripsTable.style.display = 'block';
                return;
            }

            tripsBody.innerHTML = trips.map(function(t) {
                var d = t.date ? new Date(t.date) : null;
                var dateStr = d ? d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                    '<tr>' +
                    '<td>' + dateStr + '</td>' +
                    '<td>' + typeArabic(t.trip_type) + '</td>' +
                    '<td class="amount amount-positive">' + (Number(t.fare || 0).toFixed(2)) + '</td>' +
                    '<td class="amount amount-commission">' + (Number(t.commission || 0).toFixed(2)) + '</td>' +
                    '<td class="amount amount-deduction">' + (Number(t.deduction || 0).toFixed(2)) + '</td>' +
                    '</tr>'
                );
            }).join('');
            tripsTable.style.display = 'block';
        } catch (e) {
            console.error(e);
            showError('تعذر تحميل البيانات');
        }
    }

    function typeArabic(type) {
        var map = { Airport: 'المطار', Families: 'العائلات', Passengers: 'الركاب', Drive: 'توصيل سريع' };
        return map[type] || type || '';
    }
});

