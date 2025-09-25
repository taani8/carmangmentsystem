// Unified portal auth: admin (email/password) + driver (phone OTP) + driver summary display
document.addEventListener('DOMContentLoaded', function() {
    var supa = window.supabaseClient;
    if (!supa) { console.error('Supabase client missing'); return; }

    var tabAdmin = document.getElementById('tabAdmin');
    var tabDriver = document.getElementById('tabDriver');
    var adminSection = document.getElementById('adminSection');
    var driverSection = document.getElementById('driverSection');

    function switchTab(view) {
        if (view === 'admin') {
            tabAdmin.classList.add('active');
            tabDriver.classList.remove('active');
            adminSection.style.display = 'block';
            driverSection.style.display = 'none';
        } else {
            tabDriver.classList.add('active');
            tabAdmin.classList.remove('active');
            driverSection.style.display = 'block';
            adminSection.style.display = 'none';
        }
    }

    tabAdmin.addEventListener('click', function() { switchTab('admin'); });
    tabDriver.addEventListener('click', function() { switchTab('driver'); });

    // Admin login
    var adminEmail = document.getElementById('adminEmail');
    var adminPassword = document.getElementById('adminPassword');
    var adminLoginBtn = document.getElementById('adminLoginBtn');
    var adminError = document.getElementById('adminError');
    function showAdminError(msg) { adminError.textContent = msg; adminError.style.display = 'block'; }
    function hideAdminError() { adminError.style.display = 'none'; }
    adminLoginBtn.addEventListener('click', async function() {
        hideAdminError();
        var email = (adminEmail.value || '').trim();
        var password = adminPassword.value || '';
        if (!email || !password) { return showAdminError('يرجى إدخال البريد وكلمة المرور'); }
        adminLoginBtn.disabled = true; var original = adminLoginBtn.textContent; adminLoginBtn.textContent = 'جاري الدخول...';
        try {
            var { data, error } = await supa.auth.signInWithPassword({ email: email, password: password });
            if (error || !data || !data.session) { return showAdminError('بيانات الدخول غير صحيحة'); }
            window.location.href = 'dashboard.html';
        } catch (e) {
            console.error(e); showAdminError('حدث خطأ غير متوقع');
        } finally {
            adminLoginBtn.disabled = false; adminLoginBtn.textContent = original;
        }
    });

    // Driver OTP login + summary display
    var otpPhoneInput = document.getElementById('otpPhone');
    var otpCodeInput = document.getElementById('otpCode');
    var otpCodeGroup = document.getElementById('otpCodeGroup');
    var sendBtn = document.getElementById('otpSendBtn');
    var verifyBtn = document.getElementById('otpVerifyBtn');
    var driverError = document.getElementById('driverError');
    var resultSection = document.getElementById('driverResult');
    var driverNameRow = document.getElementById('driverNameRow');
    var tripCountEl = document.getElementById('tripCount');
    var balanceEl = document.getElementById('driverBalance');

    function showDriverError(msg) { driverError.textContent = msg; driverError.style.display = 'block'; }
    function hideDriverError() { driverError.style.display = 'none'; }
    function setLoading(btn, loading) { btn.disabled = loading; if (loading) { btn.classList.add('loading'); } else { btn.classList.remove('loading'); } }
    function normalizePhone(phone) {
        var digits = (phone || '').replace(/\D+/g, '');
        if (digits.startsWith('0') && digits.length === 10) return digits;
        if (!digits.startsWith('0') && digits.length === 9) return '0' + digits;
        return null;
    }

    sendBtn.addEventListener('click', async function() {
        hideDriverError();
        var normalized = normalizePhone(otpPhoneInput.value.trim());
        if (!normalized) return showDriverError('رقم الهاتف غير صالح');
        setLoading(sendBtn, true);
        try {
            var { error } = await supa.auth.signInWithOtp({ phone: normalized });
            if (error) { console.error('OTP send error:', error); return showDriverError('تعذر إرسال رمز التحقق'); }
            otpCodeGroup.style.display = 'block'; verifyBtn.style.display = 'inline-block'; sendBtn.style.display = 'none';
        } catch (e) { console.error(e); showDriverError('حدث خطأ غير متوقع'); }
        finally { setLoading(sendBtn, false); }
    });

    verifyBtn.addEventListener('click', async function() {
        hideDriverError();
        var normalized = normalizePhone(otpPhoneInput.value.trim());
        var code = (otpCodeInput.value || '').trim();
        if (!normalized) return showDriverError('رقم الهاتف غير صالح');
        if (!code) return showDriverError('أدخل رمز التحقق');
        setLoading(verifyBtn, true);
        try {
            var { data, error } = await supa.auth.verifyOtp({ phone: normalized, token: code, type: 'sms' });
            if (error) { console.error('OTP verify error:', error); return showDriverError('رمز التحقق غير صحيح'); }
            await supa.rpc('bind_current_user_to_driver', { p_phone: normalized });
            await loadDriverSummary(normalized);
        } catch (e) { console.error(e); showDriverError('حدث خطأ أثناء تسجيل الدخول'); }
        finally { setLoading(verifyBtn, false); }
    });

    async function loadDriverSummary(normalizedPhone) {
        try {
            var { data, error } = await supa.rpc('get_driver_summary', { p_phone: normalizedPhone });
            if (error) { console.error('Summary RPC error:', error); return showDriverError('تعذر جلب البيانات'); }
            if (!data || data.length === 0) { return showDriverError('لم يتم العثور على سائق مرتبط بهذا الرقم'); }
            var row = data[0];
            driverNameRow.textContent = row.name ? ('السائق: ' + row.name) : '';
            balanceEl.textContent = Number(row.balance || 0).toFixed(2);
            tripCountEl.textContent = String(Number(row.trip_count || 0));
            resultSection.style.display = 'block';
        } catch (e) { console.error(e); showDriverError('تعذر تحميل البيانات'); }
    }
});

