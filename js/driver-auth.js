// Driver phone authentication using Firebase OTP
document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('driverPhone');
    const otpInput = document.getElementById('driverOtp');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const errorMessage = document.getElementById('errorMessage');
    const otpSection = document.getElementById('otpSection');

    let confirmationResult = null;

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function normalizeJordanPhone(input) {
        // Accept formats like 079xxxxxxx, 96279xxxxxxx, +96279xxxxxxx and normalize to E.164
        let digits = input.replace(/\D/g, '');
        if (digits.startsWith('00962')) digits = digits.replace(/^00962/, '962');
        if (digits.startsWith('962')) return `+${digits}`;
        if (digits.startsWith('0')) return `+962${digits.substring(1)}`;
        if (digits.startsWith('7')) return `+962${digits}`;
        if (digits.startsWith('9')) return `+${digits}`;
        return input; // fallback
    }

    // Initialize invisible reCAPTCHA
    const recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible'
    });

    sendOtpBtn.addEventListener('click', async function() {
        hideError();
        const rawPhone = phoneInput.value.trim();
        if (!rawPhone) {
            showError('يرجى إدخال رقم الهاتف');
            return;
        }

        const phoneNumber = normalizeJordanPhone(rawPhone);
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'جاري الإرسال...';

        try {
            // Ensure driver exists by phone (check original and normalized)
            const normalized = phoneNumber;
            const candidates = [rawPhone, normalized, normalized.replace('+', ''), rawPhone.replace(/^0/, '+962')];
            const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
            let snapshot = null;
            for (const cand of uniqueCandidates) {
                const s = await db.collection('drivers').where('phone', '==', cand).limit(1).get();
                if (!s.empty) { snapshot = s; break; }
            }
            if (snapshot.empty) {
                showError('لا يوجد سائق مسجل بهذا الرقم');
                return;
            }

            confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
            otpSection.style.display = 'block';
            verifyOtpBtn.style.display = 'inline-block';
            sendOtpBtn.style.display = 'none';
        } catch (error) {
            console.error('send OTP error', error);
            showError('فشل إرسال الرمز. حاول مرة أخرى');
            recaptchaVerifier.render().then(widgetId => grecaptcha.reset(widgetId));
        } finally {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'إرسال الرمز';
        }
    });

    verifyOtpBtn.addEventListener('click', async function() {
        hideError();
        const code = otpInput.value.trim();
        if (!code || !confirmationResult) {
            showError('يرجى إدخال رمز التحقق');
            return;
        }

        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = 'جاري التأكيد...';
        try {
            const result = await confirmationResult.confirm(code);
            const user = result.user;

            // Map auth user phone to driver record and store session
            const phoneRaw = phoneInput.value.trim();
            const normalized = normalizeJordanPhone(phoneRaw);
            let driverSnap = null;
            for (const cand of [phoneRaw, normalized, normalized.replace('+', ''), phoneRaw.replace(/^0/, '+962')]) {
                const s = await db.collection('drivers').where('phone', '==', cand).limit(1).get();
                if (!s.empty) { driverSnap = s; break; }
            }
            if (driverSnap.empty) {
                showError('لم يتم العثور على السائق');
                await auth.signOut();
                return;
            }
            const driverDoc = driverSnap.docs[0];
            const driverId = driverDoc.id;

            // Store a minimal session locally
            localStorage.setItem('driver_session', JSON.stringify({ driverId, phone: phoneRaw }));

            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('verify OTP error', error);
            showError('رمز غير صحيح أو منتهي. حاول مرة أخرى');
        } finally {
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.textContent = 'تأكيد الدخول';
        }
    });
});

