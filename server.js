// ==================== CONFIGURACIÓN INICIAL ====================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CORS ====================

app.use(cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type, Authorization"
}));

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ==================== VALIDAR VARIABLES ====================

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error("❌ ERROR: Variables de entorno de Supabase no configuradas");
    process.exit(1);
}

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ==================== MULTER ====================
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

// ==================== AUTH: REGISTRO ====================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullname, username, email, password } = req.body;

        if (!fullname || !username || !email || !password)
            return res.json({ success: false, message: "Faltan datos" });

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { fullname, username, role: "comprador" } }
        });

        if (error) return res.json({ success: false, message: error.message });

        res.json({ success: true, user: data.user });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ==================== AUTH: LOGIN ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        let email = username;

        if (!username.includes("@")) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("email")
                .eq("username", username)
                .single();

            if (!profile)
                return res.json({ success: false, message: "Usuario no encontrado" });

            email = profile.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (error)
            return res.json({ success: false, message: "Credenciales incorrectas" });

        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

        res.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                fullname: profile.fullname,
                username: profile.username,
                role: profile.role
            },
            session: data.session
        });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ==================== PRODUCTOS ====================
app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/products', upload.single("imagen"), async (req, res) => {
    try {
        const { titulo, detalle, cantidad, precio } = req.body;
        let imagen_url = null;

        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;

            await supabase.storage
                .from("product-images")
                .upload(`products/${fileName}`, req.file.buffer);

            const { data } = supabase.storage
                .from("product-images")
                .getPublicUrl(`products/${fileName}`);

            imagen_url = data.publicUrl;
        }

        const { data, error } = await supabase
            .from("products")
            .insert({
                titulo,
                detalle,
                cantidad: Number(cantidad),
                precio: Number(precio),
                imagen_url
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await supabase.from("products").delete().eq("id", id);

        res.json({ success: true });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ==================== CARRITO ====================
app.get('/api/cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabase
            .from("cart")
            .select(`id, quantity, products(id, titulo, detalle, cantidad, precio, imagen_url)`)
            .eq("user_id", userId);

        if (error) throw error;

        res.json({
            success: true,
            data: data.map(item => ({
                id: item.id,
                quantity: item.quantity,
                product: item.products
            }))
        });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/cart', async (req, res) => {
    try {
        const { user_id, product_id, quantity } = req.body;

        const { data, error } = await supabase
            .from("cart")
            .upsert({ user_id, product_id, quantity }, { onConflict: "user_id,product_id" })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.delete('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await supabase.from("cart").delete().eq("id", id);

        res.json({ success: true });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, "0.0.0.0", () => {
    console.log("=====================================");
    console.log("🚀 Servidor iniciado correctamente");
    console.log(`🌍 Escuchando en puerto: ${PORT}`);
    console.log("=====================================");
});
