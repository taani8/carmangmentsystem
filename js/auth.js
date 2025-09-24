// Authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    });

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        setLoading(true);
        hideError();

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Check if user is admin (you can customize this logic)
            const adminDoc = await db.collection('admins').doc(user.uid).get();
            
            if (!adminDoc.exists) {
                // Create admin record if it doesn't exist (for first login)
                await db.collection('admins').doc(user.uid).set({
                    email: user.email,
                    role: 'admin',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error('Login error:', error);
            let errorMsg = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMsg = 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMsg = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Please enter a valid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMsg = 'Too many failed attempts. Please try again later.';
                    break;
            }
            
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(loading) {
        loginBtn.disabled = loading;
        if (loading) {
            loginBtn.classList.add('loading');
        } else {
            loginBtn.classList.remove('loading');
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }
});