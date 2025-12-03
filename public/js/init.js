// ==================== INICIALIZACIÓN ====================

// Inicialización principal del sistema
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🌐 Inicializando aplicación...");

    try {
        // 1. Inicializar elementos del DOM
        initDOMElements();
        console.log("🔧 Elementos del DOM cargados");

        // 2. Configurar listeners
        setupEventListeners();
        console.log("🎧 Event listeners configurados");

        // 3. Verificar autenticación
        await checkAuth();
        console.log("🔐 Autenticación verificada");

        console.log("🚀 Aplicación iniciada correctamente");
    } catch (error) {
        console.error("❌ Error crítico en la inicialización:", error);
        showNotification("Error al iniciar la aplicación", "error");

        // Si algo falla, llevar al login por seguridad
        try {
            showView("login");
        } catch (_) {}
    }
});

// Hacer funciones globales (para HTML inline)
window.showView = showView;
window.loadProducts = loadProducts;
window.loadCart = loadCart;
window.loadCartCount = loadCartCount;
