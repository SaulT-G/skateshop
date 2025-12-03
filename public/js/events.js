// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // ==================== LOGIN ====================
    loginForm?.addEventListener('submit', handleLogin);
    document.getElementById('switch-to-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        showView('register');
    });

    // ==================== REGISTER ====================
    registerForm?.addEventListener('submit', handleRegister);
    document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        showView('login');
    });

    // ==================== LOGOUT ====================
    logoutBtn?.addEventListener('click', handleLogout);

    // ==================== CART ====================
    cartIconBtn?.addEventListener('click', () => {
        if (!currentUser) {
            showNotification('Debes iniciar sesión', 'error');
            return;
        }
        if (currentUser.role === 'comprador') {
            showView('cart');
            loadCart();
        } else {
            showNotification('Solo los compradores tienen carrito', 'error');
        }
    });

    clearCartBtn?.addEventListener('click', handleClearCart);

    // ==================== IMAGE PREVIEW ====================
    const productImagenInput = document.getElementById('product-imagen');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    productImagenInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    removeImageBtn?.addEventListener('click', () => {
        productImagenInput.value = '';
        imagePreview.src = '';
        imagePreviewContainer.style.display = 'none';
    });

    // ==================== VALIDACIÓN STOCK Y PRECIO ====================
    const productCantidadInput = document.getElementById('product-cantidad');
    const productPrecioInput = document.getElementById('product-precio');

    productCantidadInput?.addEventListener('input', (e) => {
        let v = parseInt(e.target.value, 10);
        if (isNaN(v)) return;

        if (v < 0) v = 0;
        if (v > MAX_STOCK) {
            v = MAX_STOCK;
            showNotification(`Cantidad máxima: ${MAX_STOCK}`, 'error');
        }

        e.target.value = v;
    });

    productPrecioInput?.addEventListener('input', (e) => {
        let v = parseFloat(e.target.value);
        if (isNaN(v)) return;

        if (v < 0) v = 0;
        if (v > MAX_PRICE) {
            v = MAX_PRICE;
            showNotification(`Precio máximo: $${MAX_PRICE.toFixed(2)}`, 'error');
        }

        e.target.value = v;
    });

    // ==================== SEARCH ====================
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    searchInput?.addEventListener(
        'input',
        debounce((e) => {
            const searchTerm = e.target.value.trim();

            if (searchTerm) {
                clearSearchBtn.style.display = 'flex';
                searchProducts(searchTerm);
            } else {
                clearSearchBtn.style.display = 'none';
                loadProducts();
            }
        }, 300)
    );

    clearSearchBtn?.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        loadProducts();
    });

    // ==================== ADMIN — IR A GESTIONAR PRODUCTOS ====================
    document.getElementById('manage-products-card')?.addEventListener('click', () => {
        if (currentUser?.role === 'admin') {
            showView('admin'); // <-- Vista correcta de gestión de productos
            loadAdminProducts();
        }
    });

    // ==================== ADMIN — AGREGAR PRODUCTO ====================
    addProductBtn?.addEventListener('click', () => {
        editingProductId = null;
        productForm.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('form-title').textContent = 'Agregar Producto';

        productFormContainer.style.display = 'block';
        productFormContainer.scrollIntoView({ behavior: 'smooth' });
        backToMainBtn.style.display = 'block';

        if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    });

    // ==================== ADMIN — CANCELAR FORMULARIO ====================
    cancelFormBtn?.addEventListener('click', () => {
        productFormContainer.style.display = 'none';
        productForm.reset();
        editingProductId = null;

        if (imagePreviewContainer && productImagenInput) {
            imagePreviewContainer.style.display = 'none';
            productImagenInput.value = '';
        }

        if (currentUser?.role === 'admin') {
            backToMainBtn.style.display = 'none';
        }
    });

    productForm?.addEventListener('submit', handleProductSubmit);

    // ==================== MODAL ====================
    closeModal?.addEventListener('click', () => {
        productModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            productModal.style.display = 'none';
        }
    });

    // ==================== REGRESAR ====================
    backToMainBtn?.addEventListener('click', (e) => {
        e.preventDefault();

        if (currentUser?.role === 'admin') {
            showView('admin-dashboard');
        } else {
            showView('products');
            loadProducts();
        }
    });
}
