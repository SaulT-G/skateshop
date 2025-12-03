// ==================== UTILIDADES ====================

// ---------- Debounce ----------
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// ---------- Notificaciones ----------
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');

    if (!notification) {
        console.error("❌ No se encontró #notification en el DOM");
        return;
    }

    // Reiniciar animaciones si se llama varias veces
    notification.style.display = 'block';
    notification.classList.remove('hiding');

    // Establecer contenido
    notification.textContent = message;
    notification.className = `notification ${type}`;

    // Auto-ocultar después de 3s
    setTimeout(() => {
        notification.classList.add('hiding');

        setTimeout(() => {
            notification.style.display = 'none';
            notification.classList.remove('hiding');
        }, 300); // Tiempo de la animación
    }, 3000);
}

// ---------- Modal de confirmación ----------
function showConfirm(options = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const icon = document.getElementById('confirm-icon');
        const title = document.getElementById('confirm-title');
        const message = document.getElementById('confirm-message');
        const btnYes = document.getElementById('confirm-btn-yes');
        const btnNo = document.getElementById('confirm-btn-no');

        if (!modal || !btnYes || !btnNo) {
            console.error("❌ Modal de confirmación no encontrado en el DOM");
            resolve(false);
            return;
        }

        // Configurar contenido
        icon.textContent = options.icon || '⚠️';
        title.textContent = options.title || '¿Estás seguro?';
        message.textContent = options.message || 'Esta acción no se puede deshacer.';
        btnYes.textContent = options.confirmText || 'Sí, continuar';
        btnNo.textContent = options.cancelText || 'Cancelar';

        modal.classList.add('active');

        // Función de cierre
        const close = (result) => {
            modal.classList.remove('active');
            resolve(result);

            // Remover listeners para evitar duplicaciones
            btnYes.onclick = null;
            btnNo.onclick = null;
            modal.onclick = null;
        };

        // Botones
        btnYes.onclick = () => close(true);
        btnNo.onclick = () => close(false);

        // Cerrar si se hace clic fuera del contenido del modal
        modal.onclick = (e) => {
            if (e.target === modal) close(false);
        };
    });
}
