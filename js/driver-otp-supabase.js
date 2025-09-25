// Driver phone OTP via Supabase on unified login page
document.addEventListener('DOMContentLoaded', function() {
    var supa = window.supabaseClient;
    if (!supa) return;

    var phoneInput = document.getElementById('driverPhone');
    var codeInput = document.getElementById('driverOtp');
    var sendBtn = document.getElementById('sendOtpBtn');
    var verifyBtn = document.getElementById('verifyOtpBtn');
    var otpSection = document.getElementById('otpSection');
    var errorEl = document.getElementById('driverError');

    function showError(msg) { if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; } }
    function hideError() { if (errorEl) errorEl.style.display = 'none'; }

    function normalizePhone(phone) {
        var digits = (phone || '').replace(/\D+/g, '');
        if (digits.indexOf('0') === 0 && digits.length === 10) return digits; // 07XXXXXXXX
        if (digits.indexOf('0') !== 0 && digits.length === 9) return '0' + digits; // 7XXXXXXXXX
        return null;
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', async function() {
            hideError();
            var normalized = normalizePhone((phoneInput && phoneInput.value || '').trim());
            if (!normalized) { showError('رقم الهاتف غير صالح'); return; }

            sendBtn.disabled = true; var original = sendBtn.textContent; sendBtn.textContent = 'جاري الإرسال...';
            try {
                var { error } = await supa.auth.signInWithOtp({ phone: normalized });
                if (error) { console.error(error); showError('تعذر إرسال رمز التحقق'); return; }
                if (otpSection) otpSection.style.display = 'block';
                if (verifyBtn) verifyBtn.style.display = 'inline-block';
                sendBtn.style.display = 'none';
            } catch (e) {
                console.error(e); showError('حدث خطأ غير متوقع');
            } finally {
                sendBtn.disabled = false; sendBtn.textContent = original;
            }
        });
    }

    if (verifyBtn) {
        verifyBtn.addEventListener('click', async function() {
            hideError();
            var normalized = normalizePhone((phoneInput && phoneInput.value || '').trim());
            var code = (codeInput && codeInput.value || '').trim();
            if (!normalized) { showError('رقم الهاتف غير صالح'); return; }
            if (!code) { showError('أدخل رمز التحقق'); return; }

            verifyBtn.disabled = true; var original = verifyBtn.textContent; verifyBtn.textContent = 'جاري التأكيد...';
            try {
                var { data, error } = await supa.auth.verifyOtp({ phone: normalized, token: code, type: 'sms' });
                if (error) { console.error(error); showError('رمز التحقق غير صحيح'); return; }

                // Optional: bind or ensure driver record exists by phone
                try { await supa.rpc('bind_current_user_to_driver', { p_phone: normalized }); } catch(_) {}

                // Store phone in localStorage for quick reference on driver dashboard
                localStorage.setItem('driver_phone', normalized);
                window.location.href = 'driver-dashboard.html';
            } catch (e) {
                console.error(e); showError('حدث خطأ أثناء التسجيل');
            } finally {
                verifyBtn.disabled = false; verifyBtn.textContent = original;
            }
        });
    }
});

