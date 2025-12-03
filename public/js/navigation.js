// ==================== MANEJO DE VISTAS ====================

// Declarar contenedor principal de vistas
let currentView = null;

// Cambiar entre vistas de forma segura
function showView(viewName) {
    const views = document.querySelectorAll('.view');

    if (!views.length) {
        console.error("❌ No se encontraron vistas en el DOM.");
        return;
    }

    // Ocultar todas las vistas
    views.forEach(view => view.style.display = 'none');

    // 🔥 ID correcto: *viewName + "-view"*
    const viewToShow = document.getElementById(viewName + '-view');

    if (!viewToShow) {
        console.error(`❌ La vista "${viewName}-view" no existe en el DOM.`);
        return;
    }

    viewToShow.style.display = 'block';
    currentView = viewName;

    handleAutoViewActions(viewName);
}

// Reglas automáticas dependiendo del rol y la vista
function handleAutoViewActions(viewName) {
    if (!currentUser) return;

    switch (viewName) {

        case 'products':
            loadProducts();
            break;

        case 'cart':
            if (currentUser.role === 'comprador') {
                loadCart();
            } else {
                console.warn("⚠️ Un admin no puede ver el carrito.");
                showView('admin-dashboard'); // 🔥 DASHBOARD CORRECTO
            }
            break;

        case 'admin-dashboard':
            if (currentUser.role !== 'admin') {
                console.warn("⚠️ Un comprador no puede acceder al panel admin.");
                showView('products');
            }
            break;

        case 'admin':
            // Vista de gestión de productos
            if (currentUser.role !== 'admin') {
                console.warn("⚠️ Un comprador no puede acceder a productos admin.");
                showView('products');
            } else {
                loadAdminProducts();
            }
            break;
    }
}

// Muestra la vista adecuada según el rol del usuario autenticado
function showViewByRole() {
    if (!currentUser) {
        console.warn("⚠️ showViewByRole llamado sin usuario");
        showView('login');
        return;
    }

    updateNavbar();

    if (currentUser.role === 'admin') {
        showView('admin-dashboard');  // ✔ Vista correcta del panel
    } else {
        showView('products');
        loadProducts();
        loadCartCount();
    }
}

// ==================== LIMPIAR FORMULARIOS ====================

function clearForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => form.reset());
}

// ==================== UTILIDADES DE NAVEGACIÓN ====================

function goBackToHome() {
    if (!currentUser) {
        showView('login');
        return;
    }

    if (currentUser.role === 'admin') {
        showView('admin-dashboard'); // ✔ Vista correcta
    } else {
        showView('products');
        loadProducts();
    }
}

// Hacer funciones globales para uso desde HTML
window.showView = showView;
window.showViewByRole = showViewByRole;
window.goBackToHome = goBackToHome;
