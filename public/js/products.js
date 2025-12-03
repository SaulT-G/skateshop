// ==================== GESTIÓN DE PRODUCTOS ====================

// Cargar productos (comprador) con caché
async function loadProducts() {
    try {
        if (productsCache) {
            displayProducts(productsCache, 'products-grid');
            hideNoResults();
            return;
        }

        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error("Error al obtener productos");

        const result = await response.json();
        const products = result.data || [];

        productsCache = products;
        displayProducts(products, 'products-grid');
        hideNoResults();

    } catch (error) {
        showNotification("Error al cargar productos", "error");
        console.error("❌ loadProducts error:", error);
    }
}

// Ocultar mensaje de "sin resultados"
function hideNoResults() {
    const el = document.getElementById("no-results");
    if (el) el.style.display = "none";
}

// ==================== BUSCAR PRODUCTOS ====================
async function searchProducts(searchTerm) {
    try {
        const response = await fetch(`${API_URL}/products?search=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) throw new Error();

        const result = await response.json();
        const products = result.data || [];
        const noResults = document.getElementById('no-results');

        if (products.length === 0) {
            noResults.style.display = "block";
        } else {
            noResults.style.display = "none";
        }

        displayProducts(products, 'products-grid');

    } catch (error) {
        showNotification("Error en la búsqueda", "error");
        console.error("❌ searchProducts error:", error);
    }
}

// ==================== ADMIN: CARGAR PRODUCTOS ====================
async function loadAdminProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error();

        const result = await response.json();
        displayAdminProducts(result.data || []);

    } catch (error) {
        showNotification("Error al cargar productos", "error");
        console.error("❌ loadAdminProducts:", error);
    }
}

// ==================== MOSTRAR PRODUCTOS ====================
function displayProducts(products, containerId) {
    const container = document.getElementById(containerId);

    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `<p class="no-products">No hay productos disponibles</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach(p => fragment.appendChild(createProductCard(p)));

    container.innerHTML = "";
    container.appendChild(fragment);
}

// ==================== TARJETA DE PRODUCTO (COMPRADOR) ====================
function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";

    const imageUrl = product.imagen_url || null;
    const isComprador = currentUser?.role === "comprador";

    card.innerHTML = `
        <div class="product-image">
            ${imageUrl ? `<img src="${imageUrl}" alt="${product.titulo}" onerror="this.parentElement.innerHTML='🛹'">` : "🛹"}
        </div>

        <div class="product-info">
            <h3 class="product-title">${product.titulo}</h3>
            <p class="product-detail">${product.detalle}</p>

            <div class="product-price-quantity">
                <span class="product-price">$${parseFloat(product.precio || 0).toFixed(2)}</span>
                <span class="product-quantity">Stock: ${product.cantidad}</span>
            </div>

            ${
        isComprador && product.cantidad > 0
            ? `<button class="btn-add-cart" data-product-id="${product.id}">Agregar al Carrito</button>`
            : ""
    }
        </div>
    `;

    // Click: modal solo si no se presiona el botón
    card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("btn-add-cart")) {
            showProductModal(product);
        }
    });

    // Botón agregar al carrito
    if (isComprador && product.cantidad > 0) {
        card.querySelector(".btn-add-cart").addEventListener("click", (e) => {
            e.stopPropagation();
            addToCart(product.id);
        });
    }

    return card;
}

// ==================== MOSTRAR PRODUCTOS ADMIN ====================
function displayAdminProducts(products) {
    const container = document.getElementById("admin-products-grid");
    container.innerHTML = "";

    if (products.length === 0) {
        container.innerHTML = `<p class="no-products">No hay productos. Agrega uno nuevo.</p>`;
        return;
    }

    products.forEach(p => container.appendChild(createAdminProductCard(p)));
}

// ==================== TARJETA ADMIN ====================
function createAdminProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";

    const imageUrl = product.imagen_url || null;

    card.innerHTML = `
        <div class="product-image">
            ${imageUrl ? `<img src="${imageUrl}" alt="${product.titulo}" onerror="this.parentElement.innerHTML='🛹'">` : "🛹"}
        </div>

        <div class="product-info">
            <h3>${product.titulo}</h3>
            <p>${product.detalle}</p>

            <div class="product-price-quantity">
                <span class="product-price">$${parseFloat(product.precio || 0).toFixed(2)}</span>
                <span class="product-quantity">Stock: ${product.cantidad}</span>
            </div>

            <div class="admin-actions">
                <button class="btn-edit" data-id="${product.id}">Editar</button>
                <button class="btn-delete" data-id="${product.id}">Eliminar</button>
            </div>
        </div>
    `;

    // Listeners
    card.querySelector(".btn-edit").addEventListener("click", e => {
        e.stopPropagation();
        editProduct(product.id);
    });

    card.querySelector(".btn-delete").addEventListener("click", e => {
        e.stopPropagation();
        deleteProduct(product.id);
    });

    return card;
}

// ==================== EDITAR PRODUCTO ====================
async function editProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/products`);
        const result = await response.json();

        const product = result.data?.find(p => p.id === productId);
        if (!product) return;

        editingProductId = productId;

        document.getElementById("product-id").value = product.id;
        document.getElementById("product-titulo").value = product.titulo;
        document.getElementById("product-detalle").value = product.detalle;
        document.getElementById("product-cantidad").value = product.cantidad;
        document.getElementById("product-precio").value = product.precio;

        // Ocultar preview
        document.getElementById("image-preview-container").style.display = "none";

        productFormContainer.style.display = "block";

    } catch (error) {
        showNotification("Error al cargar producto", "error");
        console.error("❌ editProduct:", error);
    }
}

// ==================== ELIMINAR PRODUCTO ====================
async function deleteProduct(productId) {
    const confirmDelete = await showConfirm({
        icon: "🗑️",
        title: "Eliminar Producto",
        message: "¿Deseas eliminar este producto?",
        confirmText: "Eliminar",
        cancelText: "Cancelar"
    });

    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_URL}/products/${productId}`, { method: "DELETE" });
        const data = await response.json();

        if (data.success) {
            showNotification("Producto eliminado", "success");
            productsCache = null;
            loadAdminProducts();
        } else {
            showNotification(data.message, "error");
        }

    } catch (error) {
        showNotification("Error eliminando producto", "error");
        console.error(error);
    }
}

// ==================== CREAR / EDITAR PRODUCTO ====================
async function handleProductSubmit(e) {
    e.preventDefault();

    const titulo = document.getElementById("product-titulo").value;
    const detalle = document.getElementById("product-detalle").value;
    const cantidad = parseInt(document.getElementById("product-cantidad").value);
    const precio = parseFloat(document.getElementById("product-precio").value);

    if (isNaN(cantidad) || isNaN(precio)) {
        showNotification("Datos inválidos", "error");
        return;
    }

    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("detalle", detalle);
    formData.append("cantidad", cantidad);
    formData.append("precio", precio);

    const imagenInput = document.getElementById("product-imagen");
    if (imagenInput.files[0]) formData.append("imagen", imagenInput.files[0]);

    const url = editingProductId
        ? `${API_URL}/products/${editingProductId}`
        : `${API_URL}/products`;

    const method = editingProductId ? "PUT" : "POST";

    try {
        const res = await fetch(url, { method, body: formData });
        const result = await res.json();

        if (result.success) {
            showNotification(editingProductId ? "Producto actualizado" : "Producto creado", "success");

            productForm.reset();
            document.getElementById("image-preview-container").style.display = "none";

            productFormContainer.style.display = "none";
            editingProductId = null;
            productsCache = null;

            loadAdminProducts();
        } else {
            showNotification(result.message || "Error al guardar", "error");
        }

    } catch (error) {
        showNotification("Error de conexión", "error");
        console.error(error);
    }
}

// ==================== MODAL DE PRODUCTO ====================
function showProductModal(product) {
    document.getElementById("modal-product-title").textContent = product.titulo;

    const modalImage = document.getElementById("modal-product-image");
    modalImage.innerHTML = product.imagen_url
        ? `<img src="${product.imagen_url}" alt="${product.titulo}" onerror="this.parentElement.innerHTML='🛹'">`
        : "🛹";

    document.getElementById("modal-product-detail").textContent = product.detalle;
    document.getElementById("modal-product-price").textContent = `$${product.precio}`;
    document.getElementById("modal-product-stock").textContent = `Stock disponible: ${product.cantidad}`;

    productModal.style.display = "flex";
}
