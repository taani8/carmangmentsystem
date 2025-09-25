// Driver phone authentication adapted for unified login page
document.addEventListener('DOMContentLoaded', function() {
    var phoneInput = document.getElementById('driverPhone');
    var otpInput = document.getElementById('driverOtp');
    var sendOtpBtn = document.getElementById('sendOtpBtn');
    var verifyOtpBtn = document.getElementById('verifyOtpBtn');
    var errorMessage = document.getElementById('driverError');
    var otpSection = document.getElementById('otpSection');

    if (!phoneInput || !sendOtpBtn) return;

    var confirmationResult = null;

    function showError(message) {
        if (!errorMessage) return;
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        if (!errorMessage) return;
        errorMessage.style.display = 'none';
    }

    function normalizeJordanPhone(input) {
        var digits = (input || '').replace(/\D/g, '');
        if (digits.indexOf('00962') === 0) digits = digits.replace(/^00962/, '962');
        if (digits.indexOf('962') === 0) return '+' + digits;
        if (digits.indexOf('0') === 0) return '+962' + digits.substring(1);
        if (digits.indexOf('7') === 0) return '+962' + digits;
        if (digits.indexOf('9') === 0) return '+' + digits;
        return input;
    }

    // Initialize invisible reCAPTCHA
    var recaptchaVerifier = null;
    try {
        if (window.firebase && window.firebase.auth) {
            recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { size: 'invisible' });
        }
    } catch (_) {}

    sendOtpBtn.addEventListener('click', function() {
        hideError();
        var rawPhone = (phoneInput.value || '').trim();
        if (!rawPhone) { showError('يرجى إدخال رقم الهاتف'); return; }

        if (!window.db || !window.auth || !recaptchaVerifier) {
            showError('خدمة الدخول غير متاحة حالياً');
            return;
        }

        var phoneNumber = normalizeJordanPhone(rawPhone);
        sendOtpBtn.disabled = true;
        var originalText = sendOtpBtn.textContent;
        sendOtpBtn.textContent = 'جاري الإرسال...';

        (async function(){
            try {
                var normalized = phoneNumber;
                var candidates = [rawPhone, normalized, normalized.replace('+', ''), rawPhone.replace(/^0/, '+962')];
                var uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
                var snapshot = null;
                for (var i = 0; i < uniqueCandidates.length; i++) {
                    var cand = uniqueCandidates[i];
                    var s = await db.collection('drivers').where('phone', '==', cand).limit(1).get();
                    if (!s.empty) { snapshot = s; break; }
                }
                if (!snapshot || snapshot.empty) { showError('لا يوجد سائق مسجل بهذا الرقم'); return; }

                confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
                if (otpSection) otpSection.style.display = 'block';
                if (verifyOtpBtn) verifyOtpBtn.style.display = 'inline-block';
                sendOtpBtn.style.display = 'none';
            } catch (error) {
                console.error('send OTP error', error);
                showError('فشل إرسال الرمز. حاول مرة أخرى');
                try { recaptchaVerifier.render().then(function(widgetId){ grecaptcha.reset(widgetId); }); } catch(_) {}
            } finally {
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = originalText;
            }
        })();
    });

    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', function() {
            hideError();
            var code = (otpInput && otpInput.value || '').trim();
            if (!code || !confirmationResult) { showError('يرجى إدخال رمز التحقق'); return; }
            verifyOtpBtn.disabled = true;
            var originalText = verifyOtpBtn.textContent;
            verifyOtpBtn.textContent = 'جاري التأكيد...';

            (async function(){
                try {
                    var result = await confirmationResult.confirm(code);
                    var user = result && result.user;
                    var phoneRaw = (phoneInput.value || '').trim();
                    var normalized = normalizeJordanPhone(phoneRaw);
                    var driverSnap = null;
                    var arr = [phoneRaw, normalized, normalized.replace('+', ''), phoneRaw.replace(/^0/, '+962')];
                    for (var i = 0; i < arr.length; i++) {
                        var s = await db.collection('drivers').where('phone', '==', arr[i]).limit(1).get();
                        if (!s.empty) { driverSnap = s; break; }
                    }
                    if (!driverSnap || driverSnap.empty) {
                        showError('لم يتم العثور على السائق');
                        try { await auth.signOut(); } catch(_) {}
                        return;
                    }
                    var driverDoc = driverSnap.docs[0];
                    var driverId = driverDoc.id;
                    localStorage.setItem('driver_session', JSON.stringify({ driverId: driverId, phone: phoneRaw }));
                    window.location.href = 'driver-dashboard.html';
                } catch (error) {
                    console.error('verify OTP error', error);
                    showError('رمز غير صحيح أو منتهي. حاول مرة أخرى');
                } finally {
                    verifyOtpBtn.disabled = false;
                    verifyOtpBtn.textContent = originalText;
                }
            })();
        });
    }
});

