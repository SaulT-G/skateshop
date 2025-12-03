// server.js
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10; // Número de rondas para bcrypt

// Validar variables de entorno
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ ERROR: Faltan variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY');
    process.exit(1);
}

console.log('🔧 Configurando Supabase...');
console.log('   URL:', process.env.SUPABASE_URL);
console.log('   ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Faltante');

// Cliente de Supabase con ANON_KEY
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Configuración de multer para guardar localmente como fallback
// Crear directorio uploads si no existe
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'));
        }
    }
});

// ==================== AUTH ENDPOINTS ====================

// Registro
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Intento de registro:', req.body.email);
        const { fullname, username, email, password } = req.body;

        if (!fullname || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Verificar username único
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .single();

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario ya está en uso'
            });
        }

        // Registrar usuario con autoconfirmación de email
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    fullname,
                    username,
                    role: 'comprador'
                },
                emailRedirectTo: undefined // Deshabilitar confirmación por email
            }
        });

        if (error) {
            console.error('❌ Error en signUp:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Esperar un momento para que se cree el perfil automáticamente
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verificar si el perfil se creó automáticamente
        let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        // Si no existe el perfil, crearlo manualmente
        if (!profile) {
            console.log('⚠️ Creando perfil manualmente para:', email);
            const { data: newProfile, error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    fullname,
                    username,
                    role: 'comprador'
                })
                .select()
                .single();

            if (profileError) {
                console.error('❌ Error creando perfil:', profileError);
            } else {
                profile = newProfile;
            }
        }

        console.log('✅ Usuario registrado:', email);
        res.json({
            success: true,
            message: 'Usuario registrado exitosamente. Ya puedes iniciar sesión.',
            user: {
                id: data.user.id,
                email: data.user.email,
                fullname,
                username,
                role: 'comprador'
            }
        });
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor: ' + error.message
        });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Intento de login:', req.body.username);
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // Autenticar (username puede ser email o username)
        let email = username;

        // Si no es email, buscar en profiles
        if (!username.includes('@')) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .single();

            if (!profile) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario o contraseña incorrectos'
                });
            }

            // Obtener email del usuario
            // Por ahora, pedir que usen email
            return res.status(400).json({
                success: false,
                message: 'Por favor, usa tu email para iniciar sesión'
            });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('❌ Error en login:', error.message);
            return res.status(401).json({
                success: false,
                message: 'Email o contraseña incorrectos'
            });
        }

        // Obtener perfil
        const { data: fullProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        console.log('✅ Login exitoso:', email);
        res.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                fullname: fullProfile?.fullname || data.user.user_metadata?.fullname || 'Usuario',
                username: fullProfile?.username || data.user.user_metadata?.username || 'user',
                role: fullProfile?.role || 'comprador'
            },
            session: data.session
        });
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor: ' + error.message
        });
    }
});

// ==================== PRODUCTS ENDPOINTS ====================

app.get('/api/products', async (req, res) => {
    try {
        console.log('📦 Obteniendo productos...');
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error obteniendo productos:', error);
            throw error;
        }

        console.log(`✅ ${data.length} productos obtenidos`);
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener productos: ' + error.message
        });
    }
});

app.post('/api/products', upload.single('imagen'), async (req, res) => {
    try {
        console.log('➕ Creando producto:', req.body.titulo);
        const { titulo, detalle, cantidad, precio } = req.body;
        let imagen_url = null;

        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;

            // Intentar subir a Supabase Storage primero
            try {
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(`products/${fileName}`, req.file.buffer, {
                        contentType: req.file.mimetype,
                        cacheControl: '3600'
                    });

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(`products/${fileName}`);
                    imagen_url = urlData.publicUrl;
                    console.log('✅ Imagen subida a Supabase Storage');
                } else {
                    throw new Error(uploadError.message);
                }
            } catch (storageError) {
                // Si falla Supabase Storage, guardar localmente
                console.log('⚠️ Supabase Storage no disponible, guardando localmente...');
                const localPath = path.join('uploads', fileName);
                fs.writeFileSync(localPath, req.file.buffer);
                imagen_url = `/uploads/${fileName}`;
                console.log('✅ Imagen guardada localmente:', fileName);
            }
        }

        const { data, error } = await supabase
            .from('products')
            .insert({
                titulo,
                detalle,
                cantidad: parseInt(cantidad) || 0,
                precio: parseFloat(precio) || 0,
                imagen_url
            })
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Producto creado:', titulo);
        res.json({
            success: true,
            message: 'Producto creado exitosamente',
            data
        });
    } catch (error) {
        console.error('❌ Error creando producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear producto: ' + error.message
        });
    }
});

app.put('/api/products/:id', upload.single('imagen'), async (req, res) => {
    try {
        const { id } = req.params;
        console.log('✏️ Actualizando producto:', id);
        const { titulo, detalle, cantidad, precio } = req.body;
        let imagen_url = req.body.imagen_url;

        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;

            // Intentar subir a Supabase Storage primero
            try {
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(`products/${fileName}`, req.file.buffer, {
                        contentType: req.file.mimetype,
                        cacheControl: '3600'
                    });

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(`products/${fileName}`);
                    imagen_url = urlData.publicUrl;
                    console.log('✅ Imagen subida a Supabase Storage');
                } else {
                    throw new Error(uploadError.message);
                }
            } catch (storageError) {
                // Si falla Supabase Storage, guardar localmente
                console.log('⚠️ Supabase Storage no disponible, guardando localmente...');
                const localPath = path.join('uploads', fileName);
                fs.writeFileSync(localPath, req.file.buffer);
                imagen_url = `/uploads/${fileName}`;
                console.log('✅ Imagen guardada localmente:', fileName);
            }
        }

        const { data, error } = await supabase
            .from('products')
            .update({
                titulo,
                detalle,
                cantidad: parseInt(cantidad) || 0,
                precio: parseFloat(precio) || 0,
                imagen_url
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Producto actualizado:', id);
        res.json({
            success: true,
            message: 'Producto actualizado exitosamente',
            data
        });
    } catch (error) {
        console.error('❌ Error actualizando producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar producto: ' + error.message
        });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ Eliminando producto:', id);

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;

        console.log('✅ Producto eliminado:', id);
        res.json({
            success: true,
            message: 'Producto eliminado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar producto: ' + error.message
        });
    }
});

// ==================== CART ENDPOINTS ====================

app.get('/api/cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('🛒 Obteniendo carrito de:', userId);

        const { data, error } = await supabase
            .from('cart')
            .select(`
                id,
                quantity,
                products (
                    id,
                    titulo,
                    precio,
                    imagen_url,
                    cantidad
                )
            `)
            .eq('user_id', userId);

        if (error) throw error;

        const formattedData = data.map(item => ({
            id: item.id,
            quantity: item.quantity,
            product: item.products
        }));

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('❌ Error obteniendo carrito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener carrito: ' + error.message
        });
    }
});

app.post('/api/cart', async (req, res) => {
    try {
        const { user_id, product_id, quantity } = req.body;
        console.log('➕ Agregando al carrito:', { user_id, product_id, quantity });

        const { data, error } = await supabase
            .from('cart')
            .upsert({
                user_id,
                product_id,
                quantity
            }, {
                onConflict: 'user_id,product_id'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Producto agregado al carrito',
            data
        });
    } catch (error) {
        console.error('❌ Error agregando al carrito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar al carrito: ' + error.message
        });
    }
});

app.put('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        const { data, error } = await supabase
            .from('cart')
            .update({ quantity })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Cantidad actualizada',
            data
        });
    } catch (error) {
        console.error('❌ Error actualizando carrito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar carrito: ' + error.message
        });
    }
});

app.delete('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('cart')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Producto eliminado del carrito'
        });
    } catch (error) {
        console.error('❌ Error eliminando del carrito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar del carrito: ' + error.message
        });
    }
});

app.delete('/api/cart/clear/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { error } = await supabase
            .from('cart')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Carrito vaciado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error vaciando carrito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al vaciar carrito: ' + error.message
        });
    }
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('❌ Error no capturado:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  🚀 SERVIDOR INICIADO CORRECTAMENTE   ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`\n   🌐 URL: http://localhost:${PORT}`);
    console.log(`   📦 Supabase: ${process.env.SUPABASE_URL}`);
    console.log(`   ✅ Estado: Activo y esperando conexiones\n`);
});

// Manejo de errores del servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ ERROR: El puerto ${PORT} ya está en uso`);
        console.error('   Solución: Ejecuta "netstat -ano | findstr :3000" y mata el proceso');
    } else {
        console.error('❌ Error del servidor:', error);
    }
    process.exit(1);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n⏹️  Deteniendo servidor...');
    server.close(() => {
        console.log('✅ Servidor detenido correctamente');
        process.exit(0);
    });
});
