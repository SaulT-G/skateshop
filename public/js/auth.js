// ==================== AUTENTICACIÓN ====================

// Verificar autenticación con Supabase
async function checkAuth() {
    try {
        if (supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (session?.user) {
                const userId = session.user.id;

                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (profile) {
                    currentUser = {
                        id: session.user.id,
                        email: session.user.email,
                        fullname: profile.fullname || 'Usuario',
                        username: profile.username || 'user',
                        role: profile.role || 'comprador'
                    };

                    localStorage.setItem('user', JSON.stringify(currentUser));
                    showViewByRole();
                    return;
                }
            }
        }

        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            showViewByRole();
        } else {
            showView('login');
        }
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        showView('login');
    }
}

// Manejar login con el servidor backend
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success && data.user) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));

            if (data.session && supabaseClient) {
                await supabaseClient.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token
                });
            }

            showNotification(`¡Bienvenido ${currentUser.fullname}!`, 'success');
            showViewByRole();
            document.getElementById('login-form').reset();
        } else {
            showNotification(data.message || 'Usuario o contraseña incorrectos', 'error');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showNotification('Error de conexión con el servidor', 'error');
    }
}

// Manejar registro con backend
async function handleRegister(e) {
    e.preventDefault();

    const fullname = document.getElementById('register-fullname').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (!fullname || !username || !email || !password || !confirmPassword) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Por favor ingresa un email válido', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullname, username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('¡Registro exitoso! Por favor inicia sesión', 'success');
            showView('login');
            document.getElementById('register-form').reset();
        } else {
            showNotification(data.message || 'Error al registrarse', 'error');
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification('Error de conexión con el servidor', 'error');
    }
}

// Cerrar sesión
async function handleLogout() {
    const confirmed = await showConfirm({
        icon: '👋',
        title: 'Cerrar Sesión',
        message: '¿Estás seguro de que deseas cerrar sesión?',
        confirmText: 'Sí, cerrar sesión',
        cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
        if (supabaseClient) await supabaseClient.auth.signOut();

        currentUser = null;
        cartItems = [];
        productsCache = null;
        cartCount = 0;

        localStorage.removeItem('user');

        showNotification('Sesión cerrada exitosamente', 'success');
        showView('login');
        updateNavbar();
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        showNotification('Error al cerrar sesión', 'error');
    }
}

function updateNavbar() {
    if (currentUser) {
        userInfo.textContent = `${currentUser.fullname} (${currentUser.role})`;
        logoutBtn.style.display = 'block';

        if (currentUser.role === 'comprador') {
            cartIconContainer.style.display = 'flex';
            loadCartCount();
        } else {
            cartIconContainer.style.display = 'none';
        }
    } else {
        logoutBtn.style.display = 'none';
        cartIconContainer.style.display = 'none';
        userInfo.textContent = '';
    }
}
