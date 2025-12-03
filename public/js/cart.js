// ==================== GESTIÓN DEL CARRITO ====================

// Cargar carrito
async function loadCart() {
    if (!currentUser || currentUser.role !== 'comprador') return;

    document.getElementById('cart-loading').style.display = 'block';
    cartItemsList.innerHTML = '';
    cartEmpty.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/api/cart/${currentUser.id}`);

        if (response.ok) {
            const result = await response.json();
            const cartData = result.data || result;

            cartItems = cartData.map(item => ({
                id: item.id,
                quantity: item.quantity,
                product_id: item.product?.id,
                titulo: item.product?.titulo,
                detalle: item.product?.detalle,
                precio: item.product?.precio,
                imagen_url: item.product?.imagen_url,
                stock: item.product?.cantidad
            }));

            document.getElementById('cart-loading').style.display = 'none';

            if (cartItems.length === 0) {
                cartEmpty.style.display = 'block';
                clearCartBtn.style.display = 'none';
            } else {
                displayCartItems();
                clearCartBtn.style.display = 'block';
            }

            updateCartCount();
        } else {
            showNotification('Error al cargar carrito', 'error');
            document.getElementById('cart-loading').style.display = 'none';
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        document.getElementById('cart-loading').style.display = 'none';
        console.error('Error:', error);
    }
}

// Mostrar items del carrito
function displayCartItems() {
    const fragment = document.createDocumentFragment();

    cartItems.forEach(item => {
        const cartItem = createCartItemElement(item);
        fragment.appendChild(cartItem);
    });

    cartItemsList.innerHTML = '';
    cartItemsList.appendChild(fragment);
}

// Crear elemento de item del carrito
function createCartItemElement(item) {
    const div = document.createElement('div');
    div.className = 'cart-item';

    const imageUrl = item.imagen_url || null;
    const precioUnitario = parseFloat(item.precio || 0);
    const precioTotal = precioUnitario * item.quantity;

    div.innerHTML = `
        <div class="cart-item-image">
            ${imageUrl
        ? `<img src="${imageUrl}" alt="${item.titulo}" loading="lazy" onerror="this.parentElement.innerHTML='🛹'">`
        : '🛹'}
        </div>
        <div class="cart-item-info">
            <h3 class="cart-item-title">${item.titulo}</h3>
            <p class="cart-item-detail">${item.detalle}</p>
            <div class="cart-item-price-info">
                <span class="cart-item-price-unit">Precio unitario: $${precioUnitario.toFixed(2)}</span>
                <span class="cart-item-stock">Stock disponible: ${item.stock}</span>
            </div>
        </div>
        <div class="cart-item-actions">
            <div class="cart-item-quantity">
                <button class="quantity-btn quantity-decrease">-</button>
                <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${item.stock}" readonly>
                <button class="quantity-btn quantity-increase">+</button>
            </div>
            <div class="cart-item-total">
                <span class="cart-item-total-label">Total:</span>
                <span class="cart-item-total-price">$${precioTotal.toFixed(2)}</span>
            </div>
            <button class="cart-item-remove">Eliminar</button>
        </div>
    `;

    const decreaseBtn = div.querySelector('.quantity-decrease');
    const increaseBtn = div.querySelector('.quantity-increase');
    const removeBtn = div.querySelector('.cart-item-remove');

    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateCartQuantity(item.id, item.quantity - 1);
        });
    }

    if (increaseBtn) {
        increaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item.quantity < item.stock) {
                updateCartQuantity(item.id, item.quantity + 1);
            } else {
                showNotification('Stock máximo alcanzado', 'error');
            }
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromCart(item.id);
        });
    }

    return div;
}

// Agregar al carrito
function addToCart(productId) {
    if (!currentUser || currentUser.role !== 'comprador') {
        showNotification('Debes iniciar sesión como comprador', 'error');
        return;
    }

    fetch(`${API_URL}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: currentUser.id,
            product_id: productId,
            quantity: 1
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Producto agregado al carrito', 'success');
                loadCartCount();
                productsCache = null;
            } else {
                showNotification(data.message || 'Error al agregar al carrito', 'error');
            }
        })
        .catch(error => {
            showNotification('Error de conexión', 'error');
            console.error('Error:', error);
        });
}

// Actualizar cantidad en carrito
function updateCartQuantity(cartId, quantity) {
    if (quantity < 1) {
        removeFromCart(cartId);
        return;
    }

    const item = cartItems.find(i => i.id === cartId);
    if (item && quantity > item.stock) {
        showNotification('Stock insuficiente', 'error');
        return;
    }

    fetch(`${API_URL}/api/cart/${cartId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadCart();
            } else {
                showNotification(data.message || 'Error al actualizar cantidad', 'error');
            }
        })
        .catch(error => {
            showNotification('Error de conexión', 'error');
            console.error('Error:', error);
        });
}

// Eliminar del carrito
async function removeFromCart(cartId) {
    try {
        const response = await fetch(`${API_URL}/api/cart/${cartId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Producto eliminado del carrito', 'success');
            await loadCart();
            await loadCartCount();
        } else {
            showNotification(data.message || 'Error al eliminar del carrito', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        console.error('Error:', error);
    }
}

// Vaciar carrito
async function handleClearCart() {
    const confirmed = await showConfirm({
        icon: '🛒',
        title: 'Vaciar Carrito',
        message: '¿Estás seguro de que deseas vaciar todo el carrito?',
        confirmText: 'Sí, vaciar',
        cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/api/cart/clear/${currentUser.id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Carrito vaciado exitosamente', 'success');
            await loadCart();
            await loadCartCount();
        } else {
            showNotification(data.message || 'Error al vaciar carrito', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        console.error('Error:', error);
    }
}

// Cargar contador de carrito
async function loadCartCount() {
    if (!currentUser || currentUser.role !== 'comprador') {
        cartCount = 0;
        updateCartCount();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/cart/${currentUser.id}`);

        if (response.ok) {
            const result = await response.json();
            const cartData = result.data || result;
            cartCount = cartData.reduce((sum, item) => sum + item.quantity, 0);
            updateCartCount();
        }
    } catch (error) {
        console.error('Error cargando contador del carrito:', error);
    }
}

// Actualizar contador visual
function updateCartCount() {
    if (cartCountElement) {
        cartCountElement.textContent = cartCount;
        cartCountElement.style.display = cartCount > 0 ? 'flex' : 'none';
    }
}
