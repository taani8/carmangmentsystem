// Driver portal lookup by phone: shows trip count and balance
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('driverLookupForm');
    const phoneInput = document.getElementById('driverPhone');
    const errorMessage = document.getElementById('errorMessage');
    const lookupBtn = document.getElementById('lookupBtn');
    const resultSection = document.getElementById('driverResult');
    const driverNameRow = document.getElementById('driverNameRow');
    const tripCountEl = document.getElementById('tripCount');
    const balanceEl = document.getElementById('driverBalance');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const rawPhone = (phoneInput.value || '').trim();
        if (!rawPhone) {
            return showError('يرجى إدخال رقم الهاتف');
        }

        const normalizedPhone = normalizePhone(rawPhone);
        if (!normalizedPhone) {
            return showError('رقم الهاتف غير صالح');
        }

        setLoading(true);
        hideError();
        resultSection.style.display = 'none';

        try {
            // Find driver by phone
            const driverSnap = await db.collection('drivers')
                .where('phone', '==', normalizedPhone)
                .limit(1)
                .get();

            if (driverSnap.empty) {
                return showError('لم يتم العثور على سائق بهذا الرقم');
            }

            const driverDoc = driverSnap.docs[0];
            const driver = { id: driverDoc.id, ...driverDoc.data() };

            // Count trips for this driver
            const tripsSnap = await db.collection('trips')
                .where('driverId', '==', driver.id)
                .get();

            const tripCount = tripsSnap.size;
            const balance = driver.balance || 0;

            // Update UI
            tripCountEl.textContent = String(tripCount);
            balanceEl.textContent = Number(balance).toFixed(2);
            driverNameRow.textContent = driver.name ? `السائق: ${driver.name}` : '';
            resultSection.style.display = 'block';
        } catch (err) {
            console.error('Driver lookup error:', err);
            showError('حدث خطأ غير متوقع. حاول مرة أخرى.');
        } finally {
            setLoading(false);
        }
    });

    function normalizePhone(phone) {
        const digits = phone.replace(/\D+/g, '');
        // Accept formats like 07XXXXXXXX or 7XXXXXXXX
        if (digits.startsWith('0') && digits.length === 10) return digits;
        if (!digits.startsWith('0') && digits.length === 9) return '0' + digits;
        return null;
    }

    function setLoading(isLoading) {
        lookupBtn.disabled = isLoading;
        if (isLoading) {
            lookupBtn.classList.add('loading');
        } else {
            lookupBtn.classList.remove('loading');
        }
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }
});

