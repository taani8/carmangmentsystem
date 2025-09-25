// Supabase admin email/password login
document.addEventListener('DOMContentLoaded', function() {
    var supa = window.supabaseClient;
    if (!supa) {
        console.error('Supabase client missing');
        return;
    }

    var form = document.getElementById('adminLoginForm');
    var emailInput = document.getElementById('adminEmail');
    var passwordInput = document.getElementById('adminPassword');
    var loginBtn = document.getElementById('adminLoginBtn');
    var errorEl = document.getElementById('errorMessage');

    function showError(msg) {
        errorEl.textContent = msg || 'حدث خطأ. حاول مرة أخرى';
        errorEl.style.display = 'block';
    }
    function hideError() { errorEl.style.display = 'none'; }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError();
        var email = (emailInput.value || '').trim();
        var password = passwordInput.value || '';
        if (!email || !password) { return showError('يرجى إدخال البريد وكلمة المرور'); }

        loginBtn.disabled = true;
        var originalText = loginBtn.textContent;
        loginBtn.textContent = 'جاري تسجيل الدخول...';
        try {
            var { data, error } = await supa.auth.signInWithPassword({ email: email, password: password });
            if (error) {
                console.error('Login error:', error);
                return showError('بيانات الدخول غير صحيحة');
            }
            if (!data || !data.session) {
                return showError('تعذر إنشاء الجلسة');
            }
            window.location.href = 'dashboard.html';
        } catch (err) {
            console.error(err);
            showError('حدث خطأ غير متوقع');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
    });
});

