import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Importar controladores
import { getDashboardSummary } from './controllers/dashboardController.js';
import { getCashCloseDetails } from './controllers/salesController.js';
import { createStore, getStores, deleteStore } from './controllers/storeController.js';

import {
    sequelize,
    Op,
    Organization,
    Store,
    User,
    Product,
    Sale,
    Expense,
    StockMovement,
    CashShift,
    Client,
    Ticket,
    StoreConfig,
    GoalHistory
} from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;

// ==========================================
// CONFIGURACIÓN DE PROXY (SEENODE)
// ==========================================
// Confiar en el balanceador de carga de Seenode
// Esto es CRÍTICO para que HTTPS funcione correctamente detrás del proxy
if (process.env.TRUST_PROXIES === 'true') {
    app.set('trust proxy', 1);
    console.log('✅ Trust Proxy habilitado para balanceador de carga');
}

// Seguridad: JWT_SECRET debe estar en variables de entorno
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ ERROR CRÍTICO: JWT_SECRET no está configurado en las variables de entorno');
    console.error('Por favor, configura JWT_SECRET antes de iniciar el servidor');
    process.exit(1);
}

// JWT Expiration (default 30d, production 90d)
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '30d';
console.log(`🔐 JWT Expiration configurado a: ${JWT_EXPIRATION}`);

// ==========================================
// MIDDLEWARE
// ==========================================

// CORS Configuration - Permitir credenciales y headers de autorización
// Configuración mejorada para producción en Seenode
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.PRODUCTION_URL
].filter(Boolean); // Eliminar valores undefined

app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // En desarrollo, permitir cualquier origen
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        // En producción, verificar lista de orígenes permitidos
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // Permitir de todas formas (SaaS multi-tenant)
        }
    },
    credentials: true, // Permite cookies y credenciales
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Aumentar límite para subida de imágenes en Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user; // Backup de todo el usuario
        req.storeId = user.storeId;
        req.organizationId = user.organizationId;
        req.storeName = user.storeName;
        req.usuario = user.username || user.usuario; // Compensar diferencia entre user y store legacy
        req.role = user.role || 'SELLER'; // Default a SELLER si no hay rol
        next();
    });
};

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================

// POST /api/auth/register - Registrar nueva organization y primera store
// POST /api/auth/register - DESHABILITADO EN MODO SAAS CERRADO
// app.post('/api/auth/register', async (req, res) => {
//     return res.status(403).json({ error: 'Registro público deshabilitado. Contáctanos para adquirir una licencia.' });
// });

// POST /api/auth/login - Iniciar sesión
app.post('/api/auth/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;

        if (!usuario || !password) {
            return res.status(400).json({ error: 'Faltan credenciales' });
        }

        // 1. Buscar en Users (Administradores, Cajeros, Super Admin)
        const user = await User.findOne({ where: { username: usuario } });

        if (user) {
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const token = jwt.sign({
                userId: user.id,
                storeId: user.storeId, // Puede ser null si es SUPER_ADMIN
                role: user.role,
                username: user.username
            }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

            return res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    storeId: user.storeId,
                    store_id: user.storeId, // Explicit field requested
                    storeName: user.storeId ? 'Store' : 'Teikon HQ'
                }
            });
        }

        // 2. Fallback: Buscar en Stores (Legacy - La tienda es el usuario)
        const store = await Store.findOne({ where: { usuario }, include: ['organization'] });

        if (!store) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const validPassword = await bcrypt.compare(password, store.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token JWT
        const token = jwt.sign({
            storeId: store.id,
            organizationId: store.organizationId,
            storeName: store.nombre,
            usuario: store.usuario,
            role: 'ADMIN' // Asumimos rol admin para cuenta de tienda
        }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

        res.json({
            token,
            user: {
                id: store.id,
                username: store.usuario,
                role: 'ADMIN',
                storeId: store.id,
                storeName: store.nombre,
                organizationName: store.organization.nombre
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});



// ==========================================
// ENDPOINTS DE TIENDAS (STORE API)
// ==========================================

// POST /api/stores/new - Crear nueva tienda (SOLO SUPER_ADMIN o Registro Público)
app.post('/api/stores/new', createStore);

// GET /api/stores - Listar todas las tiendas (SOLO SUPER_ADMIN)
app.get('/api/stores', authenticateToken, getStores);

// DELETE /api/stores/:id - Eliminar tienda (RBAC: SUPER_ADMIN o admin propietario)
app.delete('/api/stores/:id', authenticateToken, deleteStore);

// POST /api/admin/update-store - Super Admin Update Store (Complete Edit)
app.post('/api/admin/update-store', authenticateToken, async (req, res) => {
    try {
        if (req.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const { targetStoreId, name, ownerName, email, newPassword } = req.body;

        if (!targetStoreId) {
            return res.status(400).json({ error: 'ID de tienda requerido' });
        }

        // Find store
        const store = await Store.findByPk(targetStoreId);
        if (!store) {
            return res.status(404).json({ error: 'Tienda no encontrada' });
        }

        // Find admin user linked to this store
        const adminUser = await User.findOne({ where: { storeId: targetStoreId, role: 'ADMIN' } });

        // 1. Update Store Name
        if (name && name !== store.nombre) {
            console.log(`📝 Updating store name: ${store.nombre} → ${name}`);
            store.nombre = name;
        }

        // 2. Update Owner Name (in User table)
        if (ownerName && adminUser) {
            console.log(`👤 Updating owner name: ${adminUser.fullName} → ${ownerName}`);
            adminUser.fullName = ownerName;
        }

        // 3. Update Email/Username
        if (email && email !== store.usuario) {
            // Validate email is not already in use by another store
            const existingStore = await Store.findOne({ where: { usuario: email } });
            if (existingStore && existingStore.id !== targetStoreId) {
                return res.status(400).json({ error: 'Este email ya está en uso por otra tienda' });
            }

            // Validate email is not already in use by another user
            const existingUser = await User.findOne({ where: { username: email } });
            if (existingUser && existingUser.storeId !== targetStoreId) {
                return res.status(400).json({ error: 'Este email ya está en uso por otro usuario' });
            }

            console.log(`📧 Updating email: ${store.usuario} → ${email}`);
            store.usuario = email;

            if (adminUser) {
                adminUser.username = email;
            }
        }

        // 4. Update Password (if provided)
        if (newPassword) {
            console.log(`🔐 Updating password for store ${store.nombre}`);
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            store.password = hashedPassword;

            if (adminUser) {
                adminUser.password = hashedPassword;
            }
        }

        // Save all changes
        await store.save();
        if (adminUser) {
            await adminUser.save();
        }

        console.log(`✅ Store updated successfully: ${store.nombre}`);
        res.json({
            message: 'Tienda actualizada exitosamente',
            store: {
                id: store.id,
                name: store.nombre,
                owner: adminUser?.fullName || 'N/A',
                email: store.usuario
            }
        });
    } catch (error) {
        console.error('Error al actualizar tienda:', error);
        res.status(500).json({ error: 'Error interno al actualizar tienda' });
    }
});

// GET /api/admin/fix-store-users - Repair endpoint: Create missing ADMIN users for stores
app.get('/api/admin/fix-store-users', authenticateToken, async (req, res) => {
    try {
        if (req.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        console.log('🔧 Starting store users repair process...');

        // 1. Get all stores
        const stores = await Store.findAll({
            attributes: ['id', 'nombre', 'usuario', 'password']
        });

        const report = {
            totalStores: stores.length,
            storesFixed: [],
            storesAlreadyOk: [],
            errors: []
        };

        // 2. Check each store for ADMIN user
        for (const store of stores) {
            try {
                // Check if ADMIN user exists for this store
                const adminUser = await User.findOne({
                    where: {
                        storeId: store.id,
                        role: 'ADMIN'
                    }
                });

                if (!adminUser) {
                    // No ADMIN user found - create one
                    console.log(`⚠️ Store "${store.nombre}" has no ADMIN user. Creating...`);

                    const newUser = await User.create({
                        username: store.usuario, // Use store's email
                        password: store.password, // Use store's hashed password
                        role: 'ADMIN',
                        storeId: store.id,
                        fullName: 'Usuario Recuperado' // Default name
                    });

                    report.storesFixed.push({
                        storeId: store.id,
                        storeName: store.nombre,
                        createdUser: {
                            id: newUser.id,
                            username: newUser.username,
                            fullName: newUser.fullName
                        }
                    });

                    console.log(`✅ Created ADMIN user for "${store.nombre}"`);
                } else {
                    // ADMIN user exists
                    report.storesAlreadyOk.push({
                        storeId: store.id,
                        storeName: store.nombre,
                        adminUser: {
                            id: adminUser.id,
                            username: adminUser.username,
                            fullName: adminUser.fullName || 'NULL'
                        }
                    });
                }
            } catch (error) {
                console.error(`❌ Error processing store "${store.nombre}":`, error);
                report.errors.push({
                    storeId: store.id,
                    storeName: store.nombre,
                    error: error.message
                });
            }
        }

        console.log(`🎉 Repair process completed. Fixed: ${report.storesFixed.length}, Already OK: ${report.storesAlreadyOk.length}, Errors: ${report.errors.length}`);

        res.json({
            message: 'Proceso de reparación completado',
            report
        });
    } catch (error) {
        console.error('Error en proceso de reparación:', error);
        res.status(500).json({ error: 'Error interno en proceso de reparación' });
    }
});

// PUT /api/stores/:id/goal - Update monthly sales goal with history tracking
app.put('/api/stores/:id/goal', authenticateToken, async (req, res) => {
    try {
        const { id: storeId } = req.params;
        const { amount } = req.body;

        // Validate input
        if (!amount || isNaN(amount) || amount < 0) {
            return res.status(400).json({ error: 'Monto de meta inválido' });
        }

        // Check permissions (SUPER_ADMIN or store owner)
        if (req.role !== 'SUPER_ADMIN' && req.storeId !== storeId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        // Get or create store config
        let config = await StoreConfig.findOne({ where: { storeId } });

        if (!config) {
            config = await StoreConfig.create({
                storeId,
                breakEvenGoal: amount,
                theme: 'light'
            });
        } else {
            // Update current goal
            config.breakEvenGoal = amount;
            await config.save();
        }

        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYear = now.getFullYear();

        // Upsert goal history
        const [goalRecord, created] = await GoalHistory.findOrCreate({
            where: {
                storeId,
                month: currentMonth,
                year: currentYear
            },
            defaults: {
                amount
            }
        });

        // If record exists, update it
        if (!created) {
            goalRecord.amount = amount;
            await goalRecord.save();
        }

        console.log(`📊 Goal ${created ? 'created' : 'updated'} for ${currentMonth}/${currentYear}: $${amount}`);

        res.json({
            message: 'Meta actualizada exitosamente',
            goal: {
                amount,
                month: currentMonth,
                year: currentYear,
                isNew: created
            }
        });
    } catch (error) {
        console.error('Error al actualizar meta:', error);
        res.status(500).json({ error: 'Error interno al actualizar meta' });
    }
});

// GET /api/stores/:id/goal-history - Get goal history for a store
app.get('/api/stores/:id/goal-history', authenticateToken, async (req, res) => {
    try {
        const { id: storeId } = req.params;
        const { year } = req.query;

        // Check permissions
        if (req.role !== 'SUPER_ADMIN' && req.storeId !== storeId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const where = { storeId };
        if (year) {
            where.year = parseInt(year);
        }

        const history = await GoalHistory.findAll({
            where,
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        res.json(history);
    } catch (error) {
        console.error('Error al obtener historial de metas:', error);
        res.status(500).json({ error: 'Error interno al obtener historial' });
    }
});

// GET /api/admin/migrate-goals - Migrate existing goals to history (one-time)
app.get('/api/admin/migrate-goals', authenticateToken, async (req, res) => {
    try {
        if (req.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        console.log('🔄 Starting goal migration...');

        const configs = await StoreConfig.findAll({
            where: {
                breakEvenGoal: {
                    [Op.gt]: 0
                }
            }
        });

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        let migrated = 0;
        let skipped = 0;

        for (const config of configs) {
            const [goalRecord, created] = await GoalHistory.findOrCreate({
                where: {
                    storeId: config.storeId,
                    month: currentMonth,
                    year: currentYear
                },
                defaults: {
                    amount: config.breakEvenGoal
                }
            });

            if (created) {
                migrated++;
                console.log(`✅ Migrated goal for store ${config.storeId}: $${config.breakEvenGoal}`);
            } else {
                skipped++;
            }
        }

        console.log(`🎉 Migration completed. Migrated: ${migrated}, Skipped: ${skipped}`);

        res.json({
            message: 'Migración completada',
            migrated,
            skipped,
            total: configs.length
        });
    } catch (error) {
        console.error('Error en migración de metas:', error);
        res.status(500).json({ error: 'Error interno en migración' });
    }
});

// GET /api/admin/global-sales - Global Sales Activity (SOLO SUPER_ADMIN)
app.get('/api/admin/global-sales', authenticateToken, async (req, res) => {
    try {
        if (req.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const { limit = 20 } = req.query;

        // Fetch recent sales with store information
        const sales = await Sale.findAll({
            where: { status: 'ACTIVE' },
            include: [{
                model: Store,
                as: 'store',
                attributes: ['nombre', 'id']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            attributes: ['id', 'total', 'vendedor', 'paymentMethod', 'createdAt', 'storeId']
        });

        // Map to frontend format
        const formattedSales = sales.map(sale => ({
            id: sale.id,
            storeName: sale.store?.nombre || 'Tienda Desconocida',
            storeId: sale.storeId,
            total: parseFloat(sale.total),
            seller: sale.vendedor,
            paymentMethod: sale.paymentMethod,
            timestamp: sale.createdAt
        }));

        res.json(formattedSales);
    } catch (error) {
        console.error('Error al obtener ventas globales:', error);
        res.status(500).json({ error: 'Error al obtener ventas globales' });
    }
});

// GET /api/admin/all-sales - Monitor de Ventas Globales (SOLO SUPER_ADMIN)
app.get('/api/admin/all-sales', authenticateToken, async (req, res) => {
    try {
        if (req.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const { limit = 100 } = req.query;

        // Fetch all sales from all stores with store information
        const sales = await Sale.findAll({
            include: [{
                model: Store,
                as: 'store',
                attributes: ['nombre', 'id']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            attributes: ['id', 'total', 'vendedor', 'paymentMethod', 'status', 'createdAt', 'storeId', 'netProfit']
        });

        // Map to frontend format
        const formattedSales = sales.map(sale => ({
            id: sale.id,
            storeName: sale.store?.nombre || 'Tienda Desconocida',
            storeId: sale.storeId,
            total: parseFloat(sale.total),
            netProfit: parseFloat(sale.netProfit || 0),
            seller: sale.vendedor,
            paymentMethod: sale.paymentMethod,
            status: sale.status,
            timestamp: sale.createdAt,
            date: new Date(sale.createdAt).toLocaleDateString('es-MX'),
            time: new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        }));

        res.json(formattedSales);
    } catch (error) {
        console.error('Error al obtener ventas globales:', error);
        res.status(500).json({ error: 'Error al obtener ventas globales' });
    }
});

// ==========================================
// ENDPOINTS DE PERFIL (CLIENTE)
// ==========================================

// PUT /api/me/profile - Update Own Profile (Name, Password)
app.put('/api/me/profile', authenticateToken, async (req, res) => {
    try {
        const { storeName, newPassword } = req.body;
        const storeId = req.storeId;
        const userId = req.user.userId; // Ensure we track the actual User ID if available

        const store = await Store.findByPk(storeId);
        if (!store) {
            return res.status(404).json({ error: 'Tienda no encontrada' });
        }

        let updatedName = store.nombre;

        // Update Store Name if provided
        if (storeName && storeName !== store.nombre) {
            store.nombre = storeName;
            await store.save();
            updatedName = storeName;
            console.log(`✅ Store Name Updated: ${updatedName}`);
        }

        // Update Password if provided
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // 1. Update Store Password
            store.password = hashedPassword;
            await store.save();

            // 2. Update Linked Admin User Password (if exists - usually current user)
            const adminUser = await User.findOne({ where: { storeId, role: 'ADMIN' } });
            if (adminUser) {
                adminUser.password = hashedPassword;
                await adminUser.save();
            }
        }

        // --- NEW: Contextual Data Consistency ---
        // Issue a NEW token with the updated store name to ensure subsequent 
        // requests use the correct context without needing cache refreshes.
        const newTokenPayload = {
            userId: req.user.userId,
            storeId: store.id,
            organizationId: store.organizationId,
            storeName: updatedName, // THE CRITICAL UPDATE
            usuario: store.usuario,
            role: req.user.role
        };

        const newToken = jwt.sign(newTokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

        res.json({
            message: 'Perfil actualizado correctamente',
            storeName: updatedName,
            token: newToken // Return new token for frontend to update storage
        });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// ==========================================
// ENDPOINTS DE RECUPERACIÓN (PÚBLICO)
// ==========================================

// POST /api/auth/request-password-reset - Solicitar recuperación (Crea Ticket)
app.post('/api/auth/request-password-reset', async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'El email es requerido' });
        }

        // Try to identify the store/user to link the ticket (optional, best effort)
        let storeId = null;
        let organizationId = null;

        // Search in Users
        const user = await User.findOne({ where: { username: email } });
        if (user) {
            storeId = user.storeId;
            // Get Organization from store if possible
            if (storeId) {
                const store = await Store.findByPk(storeId);
                if (store) organizationId = store.organizationId;
            }
        } else {
            // Search in Stores (Legacy)
            const store = await Store.findOne({ where: { usuario: email } });
            if (store) {
                storeId = store.id;
                organizationId = store.organizationId;
            }
        }

        // Ensure we have an Org ID for the Ticket (Required by model usually, or nullable)
        // If not found, use a fallback 'Support' organization or null if Allowed. 
        // Based on Seed, we have a default Org. We will use the first one found or null.
        if (!organizationId) {
            const anyOrg = await Organization.findOne();
            if (anyOrg) organizationId = anyOrg.id;
        }

        // Create SUPPORT TICKET
        await Ticket.create({
            storeId: storeId, // Can be null if unknown user
            organizationId: organizationId,
            titulo: `🆘 Solicitud Recuperación: ${email}`,
            descripcion: `El usuario solicita resetear su contraseña.\nEmail: ${email}\nTeléfono de contacto: ${phone || 'No proporcionado'}\n\nAcción requerida: Verificar identidad y resetear password manualmente.`,
            prioridad: 'URGENT',
            status: 'OPEN',
            categoria: 'ACCESS' // Assuming we might have categories, otherwise ignore
        });

        // Always return success even if user not found (Security best practice)
        res.json({ message: 'Solicitud recibida. El equipo de soporte te contactará en breve.' });

    } catch (error) {
        console.error('Error al solicitar recuperación:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});

// ==========================================
// ENDPOINTS DE PRODUCTOS
// ==========================================

// GET /api/productos - Listar productos de la store
app.get('/api/productos', authenticateToken, async (req, res) => {
    try {
        const where = { activo: true };

        // Si no es SUPER_ADMIN, filtrar por storeId
        if (req.role !== 'SUPER_ADMIN') {
            where.storeId = req.storeId;
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50; // Default limit 50 to prevent OOM
        const offset = (page - 1) * limit;

        const { count, rows } = await Product.findAndCountAll({
            where,
            order: [['nombre', 'ASC']],
            limit,
            offset
        });

        res.json({
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// POST /api/productos - Crear producto
app.post('/api/productos', authenticateToken, async (req, res) => {
    try {
        console.log('🔵 POST /api/productos - Request recibido');
        console.log('👤 Usuario:', req.usuario, 'Role:', req.role);
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));

        // DESESTRUCTURACIÓN CON SANITIZACIÓN ROBUSTA E INYECCIÓN DE DEFAULTS
        // Mapeo explicito FE (Ingles) -> BE (Español)
        const nombre = req.body.nombre || req.body.name;
        const categoria = req.body.categoria || req.body.category;
        const costPrice = req.body.costPrice || req.body.cost;
        const salePrice = req.body.salePrice || req.body.price;
        const imagen = req.body.imagen || req.body.image;
        const codigoBarras = req.body.sku || req.body.barcode; // SKU o Barcode

        let {
            sku,
            minStock,
            taxRate,
            isActive,
            activo,
            stock
        } = req.body;

        // Si sku no vino arriba, usar codigoBarras
        sku = sku || codigoBarras;

        // 1. INYECCIÓN DE DEFAULTS Y CONVERSIÓN DE TIPOS
        // isActive: Si no viene, forzar a true. (Mapear isActive o activo)
        const finalActivo = (isActive !== undefined) ? isActive : (activo !== undefined ? activo : true);

        // stock: Si viene vacío o null, forzar a 0.
        const finalStock = (stock === undefined || stock === null || stock === '') ? 0 : Number(stock);

        // minStock (alertLowStock): Si viene vacío, forzar a 5.
        const finalMinStock = (minStock === undefined || minStock === null || minStock === '') ? 5 : Number(minStock);

        // Conversión de Precios: Asegurar números (Float)
        const finalCostPrice = Number(costPrice);
        const finalSalePrice = Number(salePrice);
        const finalTaxRate = (taxRate === undefined || taxRate === null || taxRate === '') ? 0 : Number(taxRate);

        // Validar solo campos críticos (categoría es opcional)
        if (!sku || !nombre || costPrice === undefined || salePrice === undefined) {
            console.error('❌ Faltan campos requeridos:', { sku, nombre, costPrice, salePrice });
            return res.status(400).json({
                error: 'Faltan campos requeridos (sku, nombre, costPrice, salePrice)'
            });
        }

        // SANITIZACIÓN: Asignar categoría por defecto si viene vacía o null
        const finalCategoria = (categoria && categoria.trim() !== '') ? categoria.trim() : 'General';
        console.log('📋 Categoría sanitizada:', finalCategoria);

        // Determinar storeId
        let targetStoreId = req.storeId;
        if (req.role === 'SUPER_ADMIN' && req.body.storeId) {
            targetStoreId = req.body.storeId;
        }

        // FALLBACK: Si es SUPER_ADMIN y NO tiene storeId, buscar primera tienda activa
        if (req.role === 'SUPER_ADMIN' && !targetStoreId) {
            console.log('🔍 SUPER_ADMIN sin storeId - Buscando primera tienda activa...');
            const firstStore = await Store.findOne({
                where: { activo: true },
                order: [['createdAt', 'ASC']]
            });

            if (firstStore) {
                targetStoreId = firstStore.id;
                console.log(`✅ Asignando producto a tienda: ${firstStore.nombre} (${firstStore.id})`);
            } else {
                console.error('❌ No hay tiendas activas');
                return res.status(400).json({
                    error: 'No hay tiendas activas disponibles. Por favor, crea una tienda primero.'
                });
            }
        }

        if (!targetStoreId) {
            console.error('❌ Store ID requerido pero no encontrado');
            return res.status(400).json({ error: 'Store ID es requerido para crear productos' });
        }

        console.log('💾 Creando producto con storeId:', targetStoreId);

        // CREAR PRODUCTO CON MANEJO ROBUSTO DE ERRORES
        const product = await Product.create({
            storeId: targetStoreId,
            sku,
            nombre,
            categoria: finalCategoria,
            costPrice: finalCostPrice,
            salePrice: finalSalePrice,
            stock: finalStock,
            minStock: finalMinStock,
            taxRate: finalTaxRate,
            activo: finalActivo,
            imagen: imagen || null
        });

        console.log('✅ Producto creado exitosamente:', product.id);

        // Crear movimiento inicial de stock si hay stock
        if (finalStock > 0) {
            try {
                await StockMovement.create({
                    productId: product.id,
                    storeId: targetStoreId,
                    tipo: 'PURCHASE',
                    cantidad: finalStock,
                    stockAnterior: 0,
                    stockNuevo: finalStock,
                    motivo: 'Stock inicial',
                    registradoPor: req.usuario
                });
                console.log('✅ Movimiento de stock creado');
            } catch (stockError) {
                console.error('⚠️ Error al crear movimiento de stock:', stockError);
                // No fallar la creación del producto por esto
            }
        }

        // 🔧 FIX: Map activo -> isActive for frontend compatibility
        const productResponse = product.toJSON();
        productResponse.isActive = productResponse.activo;

        res.status(201).json(productResponse);
    } catch (error) {
        console.error('❌ Error al crear producto:', error);
        console.error('Stack trace:', error.stack);

        // Responder SIEMPRE al cliente para evitar carga infinita
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Error al crear producto',
                details: error.message,
                hint: 'Revisa los logs del servidor para más información'
            });
        }
    }
});

// PUT /api/productos/:id - Actualizar producto
app.put('/api/productos/:id', authenticateToken, async (req, res) => {
    try {
        const where = { id: req.params.id };

        // Aislamiento de tiendas: Solo filtrar por storeId si NO es SUPER_ADMIN
        if (req.role !== 'SUPER_ADMIN') {
            where.storeId = req.storeId;
        }

        const product = await Product.findOne({ where });

        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        await product.update(req.body);

        // 🔧 FIX: Map activo -> isActive for frontend compatibility
        const productResponse = product.toJSON();
        productResponse.isActive = productResponse.activo;

        res.json(productResponse);
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// DELETE /api/productos/:id - Eliminar producto (soft delete)
app.delete('/api/productos/:id', authenticateToken, async (req, res) => {
    try {
        const where = { id: req.params.id };

        // Aislamiento de tiendas: Solo filtrar por storeId si NO es SUPER_ADMIN
        if (req.role !== 'SUPER_ADMIN') {
            where.storeId = req.storeId;
        }

        const product = await Product.findOne({ where });

        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        await product.update({ activo: false });
        res.json({ message: 'Producto eliminado' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// ==========================================
// ENDPOINTS DE VENTAS
// ==========================================

// ==========================================
// ENDPOINTS DE DASHBOARD
// ==========================================

// GET /api/dashboard/summary - Resumen financiero
app.get('/api/dashboard/summary', authenticateToken, getDashboardSummary);

// GET /api/sales/cash-close - Detalles de Corte de Caja
app.get('/api/sales/cash-close', authenticateToken, getCashCloseDetails);

// GET /api/ventas - Listar ventas
app.get('/api/ventas', authenticateToken, async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        const where = {};

        // Aislamiento de tiendas: Solo filtrar por storeId si NO es SUPER_ADMIN
        if (req.role !== 'SUPER_ADMIN') {
            where.storeId = req.storeId;
        }

        if (status) where.status = status;
        if (startDate && endDate) {
            where.createdAt = {
                [sequelize.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const sales = await Sale.findAll({
            where,
            include: req.role === 'SUPER_ADMIN' ? [{
                model: Store,
                as: 'store',
                attributes: ['nombre']
            }] : [],
            order: [['createdAt', 'DESC']]
        });
        res.json(sales);
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});

// POST /api/ventas - Crear venta (ATOMIC TRANSACTION)
app.post('/api/ventas', authenticateToken, async (req, res) => {
    try {
        const { vendedor, items, paymentMethod, total } = req.body;

        // ==========================================
        // SANITIZACIÓN ROBUSTA - PREVENIR NaN
        // ==========================================

        // 1. Validar y Convertir Totales
        if (total !== undefined) {
            const totalVenta = Number(total);
            if (isNaN(totalVenta)) {
                return res.status(400).json({ error: "El total de la venta es inválido (NaN)" });
            }
        }

        // 2. Validar Store ID
        const storeId = req.storeId;
        if (!storeId || storeId === 'null' || storeId === 'undefined') {
            return res.status(400).json({ error: "Falta el ID de la tienda" });
        }

        // 3. Validar Items
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        // 4. Sanitizar Productos (Convertir strings a números y prevenir NaN)
        const sanitizedItems = items.map((p, index) => {
            const precio = Number(p.price || p.precio || p.unitPrice || p.sellingPrice || 0);
            const cantidad = Number(p.quantity || p.cantidad || 1);
            const costo = Number(p.cost || p.costo || p.unitCost || p.costPrice || 0);

            // Validar que no sean NaN
            if (isNaN(precio) || isNaN(cantidad) || isNaN(costo)) {
                throw new Error(`Producto en posición ${index + 1} tiene valores numéricos inválidos (NaN)`);
            }

            // Validar que sean positivos
            if (precio < 0 || cantidad <= 0 || costo < 0) {
                throw new Error(`Producto en posición ${index + 1} tiene valores negativos o cantidad cero`);
            }

            return {
                productId: p.productId || p.id,
                nombre: p.name || p.nombre,
                cantidad: cantidad,
                unitPrice: precio,
                unitCost: costo,
                sellingPrice: precio, // Alias
                costPrice: costo      // Alias
            };
        });

        // Usar items sanitizados en lugar de los originales
        const processItems = sanitizedItems;

        const result = await sequelize.transaction(async (t) => {
            let calculatedTotal = 0;
            let calculatedCost = 0;
            const enrichedItems = [];

            // 1. Verificación y Bloqueo (Iterar items para validar antes de escribir nada)
            for (const item of processItems) {
                // LOCK: Consultar producto con bloqueo "SELECT ... FOR UPDATE"
                // Esto impide que dos ventas simultáneas resten el mismo stock causando negativos.
                const product = await Product.findOne({
                    where: { id: item.productId, storeId: req.storeId },
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });

                // Seguridad: Validar propiedad de la tienda
                if (!product) {
                    throw new Error(`Producto no encontrado o acceso denegado (ID: ${item.productId})`);
                }

                // Seguridad: Validar Stock (No negativos)
                if (product.stock < item.cantidad) {
                    throw new Error(`Stock insuficiente para ${product.nombre} (Disponible: ${product.stock})`);
                }

                // Calcular financieros (Server-Side Trust)
                const unitPrice = parseFloat(item.unitPrice) || parseFloat(product.salePrice);
                const unitCost = parseFloat(product.costPrice);
                const subtotal = unitPrice * item.cantidad;
                const itemCost = unitCost * item.cantidad;

                calculatedTotal += subtotal;
                calculatedCost += itemCost;

                enrichedItems.push({
                    productId: product.id,
                    nombre: product.nombre,
                    cantidad: item.cantidad,
                    unitPrice,
                    unitCost,
                    subtotal,
                    originalProduct: product // Mantener ref para update
                });
            }

            const netProfit = calculatedTotal - calculatedCost;

            // 2. Registro de la Venta (Header)
            const newSale = await Sale.create({
                storeId: req.storeId,
                vendedor: vendedor || req.user.username,
                subtotal: calculatedTotal,
                totalDiscount: 0,
                taxTotal: 0,
                total: calculatedTotal,
                totalCost: calculatedCost,
                netProfit: netProfit,
                paymentMethod: paymentMethod || 'CASH',
                status: 'ACTIVE',
                items: enrichedItems.map(i => ({
                    productId: i.productId,
                    nombre: i.nombre,
                    cantidad: i.cantidad,
                    unitPrice: i.unitPrice,
                    subtotal: i.subtotal
                })),
                syncedAt: new Date()
            }, { transaction: t });

            // 3. Actualizar Inventario y Kardex
            for (const item of enrichedItems) {
                const product = item.originalProduct;
                const stockAnterior = product.stock;
                const stockNuevo = stockAnterior - item.cantidad;

                // Resta de Stock
                await product.update({ stock: stockNuevo }, { transaction: t });

                // Registro Histórico (Sales History / Movement)
                await StockMovement.create({
                    storeId: req.storeId,
                    productId: product.id,
                    tipo: 'SALE',
                    cantidad: -item.cantidad,
                    stockAnterior,
                    stockNuevo,
                    motivo: `Venta #${newSale.id.substring(0, 8)}`,
                    referenciaId: newSale.id,
                    registradoPor: vendedor || req.user.username
                }, { transaction: t });
            }

            return newSale;
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Transaction Error:', error.message);
        // Si hay error, Sequelize hace Rollback automático.
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/ventas/:id/cancelar - Cancelar venta
app.put('/api/ventas/:id/cancelar', authenticateToken, async (req, res) => {
    try {
        const sale = await Sale.findOne({
            where: { id: req.params.id, storeId: req.storeId }
        });

        if (!sale) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        if (sale.status === 'CANCELLED') {
            return res.status(400).json({ error: 'La venta ya está cancelada' });
        }

        // Revertir stock en transacción
        await sequelize.transaction(async (t) => {
            await sale.update({ status: 'CANCELLED' }, { transaction: t });

            for (const item of sale.items) {
                const product = await Product.findByPk(item.productId, { transaction: t });
                if (product) {
                    const stockAnterior = product.stock;
                    const stockNuevo = stockAnterior + item.cantidad;

                    await product.update({ stock: stockNuevo }, { transaction: t });

                    await StockMovement.create({
                        productId: item.productId,
                        storeId: req.storeId,
                        tipo: 'RETURN',
                        cantidad: item.cantidad,
                        stockAnterior,
                        stockNuevo,
                        motivo: `Cancelación venta #${sale.id.substring(0, 8)}`,
                        referenciaId: sale.id,
                        registradoPor: req.usuario
                    }, { transaction: t });
                }
            }
        });

        res.json({ message: 'Venta cancelada' });
    } catch (error) {
        console.error('Error al cancelar venta:', error);
        res.status(500).json({ error: 'Error al cancelar venta' });
    }
});

// ==========================================
// ENDPOINTS DE DASHBOARD Y ANALÍTICAS
// ==========================================

// GET /api/dashboard/summary - Resumen en tiempo real
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        const storeId = req.storeId;
        const { period } = req.query; // 'day', 'week', 'month' (Currently supporting 'day')

        // 1. Configurar rango de fechas para "Hoy"
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // 2. Fetch Sales Stats (Today)
        const salesStats = await Sale.findAll({
            where: {
                storeId: storeId,
                status: 'ACTIVE',
                createdAt: {
                    [Op.gte]: startOfDay,
                    [Op.lte]: endOfDay
                }
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'salesToday'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'ordersCount'],
                [sequelize.fn('SUM', sequelize.col('net_profit')), 'grossProfit'] // net_profit in DB is Gross Profit per item
            ],
            raw: true
        });

        // 3. Fetch Inventory Investment (Total Stock Value)
        // Sum of (costPrice * stock) for all active products
        const inventoryStats = await Product.findAll({
            where: {
                storeId: storeId,
                activo: true
            },
            attributes: [
                [sequelize.literal('SUM("cost_price" * "stock")'), 'investment']
            ],
            raw: true
        });

        // 4. Fetch Store Configuration (Goals)
        const config = await StoreConfig.findOne({
            where: { storeId: storeId }
        });

        const dailyOperationalCost = parseFloat(config?.breakEvenGoal || 0); // Assuming breakEvenGoal is monthly cost
        const dailyTarget = dailyOperationalCost / 30;

        // 5. Build Response
        const stats = salesStats[0] || {};
        const inv = inventoryStats[0] || {};

        const salesToday = parseFloat(stats.salesToday || 0);
        const ordersCount = parseInt(stats.ordersCount || 0, 10);
        const grossProfit = parseFloat(stats.grossProfit || 0);
        const investment = parseFloat(inv.investment || 0);

        // Calculate Net Profit: Gross Profit - Daily Fixed Cost
        const netProfit = grossProfit - dailyTarget;

        res.json({
            salesToday,
            ordersCount,
            investment,
            grossProfit,
            netProfit,
            dailyTarget,
            dailyOperationalCost,
            period: 'day'
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: 'Error interno al obtener resumen del dashboard' });
    }
});

// POST /api/ventas/sync - Sincronizar ventas offline
app.post('/api/ventas/sync', authenticateToken, async (req, res) => {
    try {
        const { ventas } = req.body;
        const results = [];

        for (const ventaData of ventas) {
            try {
                // Similar a POST /api/ventas pero con manejo de errores individual
                let totalCost = 0;
                const enrichedItems = [];

                for (const item of ventaData.items) {
                    const product = await Product.findByPk(item.productId);
                    if (!product) {
                        results.push({ tempId: ventaData.tempId, error: `Producto ${item.productId} no encontrado` });
                        continue;
                    }

                    if (product.stock < item.cantidad) {
                        results.push({ tempId: ventaData.tempId, error: `Stock insuficiente para ${product.nombre}` });
                        continue;
                    }

                    const itemCost = parseFloat(product.costPrice) * item.cantidad;
                    totalCost += itemCost;

                    enrichedItems.push({
                        productId: product.id,
                        nombre: product.nombre,
                        cantidad: item.cantidad,
                        unitPrice: item.unitPrice || product.salePrice,
                        unitCost: product.costPrice,
                        subtotal: item.unitPrice * item.cantidad
                    });
                }

                const netProfit = ventaData.total - totalCost;

                const sale = await sequelize.transaction(async (t) => {
                    const newSale = await Sale.create({
                        storeId: req.storeId,
                        vendedor: ventaData.vendedor,
                        subtotal: ventaData.total,
                        totalDiscount: 0,
                        taxTotal: 0,
                        total: ventaData.total,
                        totalCost,
                        netProfit,
                        paymentMethod: ventaData.paymentMethod,
                        status: 'ACTIVE',
                        items: enrichedItems,
                        syncedAt: new Date(),
                        created_at: ventaData.createdAt
                    }, { transaction: t });

                    for (const item of enrichedItems) {
                        const product = await Product.findByPk(item.productId, { transaction: t });
                        const stockAnterior = product.stock;
                        const stockNuevo = stockAnterior - item.cantidad;

                        await product.update({ stock: stockNuevo }, { transaction: t });

                        await StockMovement.create({
                            productId: item.productId,
                            storeId: req.storeId,
                            tipo: 'SALE',
                            cantidad: -item.cantidad,
                            stockAnterior,
                            stockNuevo,
                            motivo: `Venta offline #${newSale.id.substring(0, 8)}`,
                            referenciaId: newSale.id,
                            registradoPor: ventaData.vendedor
                        }, { transaction: t });
                    }

                    return newSale;
                });

                results.push({ tempId: ventaData.tempId, id: sale.id, success: true });
            } catch (error) {
                results.push({ tempId: ventaData.tempId, error: error.message });
            }
        }

        res.json({ results });
    } catch (error) {
        console.error('Error en sincronización:', error);
        res.status(500).json({ error: 'Error en sincronización' });
    }
});

// ==========================================
// ENDPOINTS DE GASTOS
// ==========================================

// GET /api/gastos - Listar gastos
app.get('/api/gastos', authenticateToken, async (req, res) => {
    try {
        const { categoria, startDate, endDate, recurrente } = req.query;
        const where = { storeId: req.storeId };

        if (categoria) where.categoria = categoria;
        if (recurrente !== undefined) where.recurrente = recurrente === 'true';
        if (startDate && endDate) {
            where.fecha = {
                [sequelize.Sequelize.Op.between]: [startDate, endDate]
            };
        }

        const expenses = await Expense.findAll({
            where,
            order: [['fecha', 'DESC']]
        });
        res.json(expenses);
    } catch (error) {
        console.error('Error al obtener gastos:', error);
        res.status(500).json({ error: 'Error al obtener gastos' });
    }
});

// POST /api/gastos - Crear gasto
app.post('/api/gastos', authenticateToken, async (req, res) => {
    try {
        const { categoria, descripcion, monto, fecha, recurrente, comprobante } = req.body;

        if (!categoria || !descripcion || !monto || !fecha) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const expense = await Expense.create({
            storeId: req.storeId,
            categoria,
            descripcion,
            monto,
            fecha,
            recurrente: recurrente || false,
            comprobante,
            registradoPor: req.usuario
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error('Error al crear gasto:', error);
        res.status(500).json({ error: 'Error al crear gasto' });
    }
});

// PUT /api/gastos/:id - Actualizar gasto
app.put('/api/gastos/:id', authenticateToken, async (req, res) => {
    try {
        const expense = await Expense.findOne({
            where: { id: req.params.id, storeId: req.storeId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        await expense.update(req.body);
        res.json(expense);
    } catch (error) {
        console.error('Error al actualizar gasto:', error);
        res.status(500).json({ error: 'Error al actualizar gasto' });
    }
});

// DELETE /api/gastos/:id - Eliminar gasto
app.delete('/api/gastos/:id', authenticateToken, async (req, res) => {
    try {
        const expense = await Expense.findOne({
            where: { id: req.params.id, storeId: req.storeId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        await expense.destroy();
        res.json({ message: 'Gasto eliminado' });
    } catch (error) {
        console.error('Error al eliminar gasto:', error);
        res.status(500).json({ error: 'Error al eliminar gasto' });
    }
});

// ==========================================
// ENDPOINTS DE MOVIMIENTOS DE STOCK
// ==========================================

// GET /api/productos/:productId/movimientos - Historial de movimientos
app.get('/api/productos/:productId/movimientos', authenticateToken, async (req, res) => {
    try {
        const { tipo, startDate, endDate } = req.query;
        const where = {
            productId: req.params.productId,
            storeId: req.storeId
        };

        if (tipo) where.tipo = tipo;
        if (startDate && endDate) {
            where.created_at = {
                [sequelize.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const movements = await StockMovement.findAll({
            where,
            include: [{ model: Product, as: 'product', attributes: ['nombre', 'sku'] }],
            order: [['created_at', 'DESC']]
        });
        res.json(movements);
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({ error: 'Error al obtener movimientos' });
    }
});

// POST /api/movimientos - Registrar movimiento manual
app.post('/api/movimientos', authenticateToken, async (req, res) => {
    try {
        const { productId, tipo, cantidad, motivo } = req.body;

        if (!productId || !tipo || !cantidad || !motivo) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Validar tipos permitidos
        const allowedTypes = ['PURCHASE', 'ADJUSTMENT', 'THEFT', 'RETURN'];
        if (!allowedTypes.includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de movimiento no permitido' });
        }

        const result = await sequelize.transaction(async (t) => {
            const product = await Product.findOne({
                where: { id: productId, storeId: req.storeId },
                transaction: t
            });

            if (!product) {
                throw new Error('Producto no encontrado');
            }

            const stockAnterior = product.stock;
            const stockNuevo = stockAnterior + cantidad;

            if (stockNuevo < 0) {
                throw new Error('El stock no puede ser negativo');
            }

            await product.update({ stock: stockNuevo }, { transaction: t });

            const movement = await StockMovement.create({
                productId,
                storeId: req.storeId,
                tipo,
                cantidad,
                stockAnterior,
                stockNuevo,
                motivo,
                registradoPor: req.usuario
            }, { transaction: t });

            return movement;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error al crear movimiento:', error);
        res.status(500).json({ error: error.message || 'Error al crear movimiento' });
    }
});

// ==========================================
// ==========================================
// ENDPOINTS DE TURNOS DE CAJA
// ==========================================

// POST /api/shifts/start - Iniciar Turno (Alias / Compatibility)
app.post('/api/shifts/start', authenticateToken, async (req, res) => {
    try {
        const { montoInicial } = req.body; // El frontend envía 'montoInicial'

        // Validar que no exista ya un turno abierto
        const existingShift = await CashShift.findOne({
            where: {
                storeId: req.storeId,
                status: 'OPEN'
            }
        });

        if (existingShift) {
            return res.status(400).json({ error: 'Ya existe un turno abierto para esta tienda.' });
        }

        // Crear el nuevo turno
        const newShift = await CashShift.create({
            storeId: req.storeId,
            cajero: req.usuario,
            apertura: new Date(),
            montoInicial: montoInicial || 0,
            status: 'OPEN'
        });

        res.status(201).json(newShift);
    } catch (error) {
        console.error('Error al iniciar turno:', error);
        res.status(500).json({ error: 'Error interno al iniciar turno' });
    }
});

// GET /api/shifts/current - Obtener turno activo actual
app.get('/api/shifts/current', authenticateToken, async (req, res) => {
    try {
        const currentShift = await CashShift.findOne({
            where: {
                storeId: req.storeId,
                status: 'OPEN'
            },
            order: [['apertura', 'DESC']]
        });

        if (!currentShift) {
            return res.status(404).json({
                success: false,
                message: 'No hay un turno activo en este momento'
            });
        }

        res.json(currentShift);
    } catch (error) {
        console.error('Error al obtener turno actual:', error);
        res.status(500).json({ error: 'Error interno al obtener turno actual' });
    }
});

// POST /api/shifts/end - Cerrar turno activo
app.post('/api/shifts/end', authenticateToken, async (req, res) => {
    try {
        const { shiftId, montoReal, notas } = req.body;

        if (!shiftId) {
            return res.status(400).json({ error: 'Se requiere el ID del turno' });
        }

        if (montoReal === undefined || montoReal === null) {
            return res.status(400).json({ error: 'Se requiere el monto real contado' });
        }

        // Buscar el turno
        const shift = await CashShift.findOne({
            where: {
                id: shiftId,
                storeId: req.storeId,
                status: 'OPEN'
            }
        });

        if (!shift) {
            return res.status(404).json({ error: 'No se encontró un turno activo con ese ID' });
        }

        // Calcular el monto esperado (fondo inicial + ventas en efectivo - gastos)
        const montoEsperado = parseFloat(shift.montoInicial || 0) +
            parseFloat(shift.ventasEfectivo || 0) -
            parseFloat(shift.gastos || 0);

        // Calcular la diferencia
        const diferencia = parseFloat(montoReal) - montoEsperado;

        // Actualizar el turno
        await shift.update({
            cierre: new Date(),
            montoEsperado: montoEsperado,
            montoReal: parseFloat(montoReal),
            diferencia: diferencia,
            notas: notas || null,
            status: 'CLOSED'
        });

        res.json({
            success: true,
            message: 'Turno cerrado exitosamente',
            shift: shift,
            diferencia: diferencia
        });
    } catch (error) {
        console.error('Error al cerrar turno:', error);
        res.status(500).json({ error: 'Error interno al cerrar turno' });
    }
});

// GET /api/turnos - Listar turnos
app.get('/api/turnos', authenticateToken, async (req, res) => {
    try {
        const { status, cajero, startDate, endDate } = req.query;
        const where = { storeId: req.storeId };

        if (status) where.status = status;
        if (cajero) where.cajero = cajero;
        if (startDate && endDate) {
            where.apertura = {
                [sequelize.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const shifts = await CashShift.findAll({
            where,
            order: [['apertura', 'DESC']]
        });
        res.json(shifts);
    } catch (error) {
        console.error('Error al obtener turnos:', error);
        res.status(500).json({ error: 'Error al obtener turnos' });
    }
});

// GET /api/turnos/actual - Obtener turno abierto actual
app.get('/api/turnos/actual', authenticateToken, async (req, res) => {
    try {
        const shift = await CashShift.findOne({
            where: { storeId: req.storeId, status: 'OPEN' }
        });
        res.json(shift);
    } catch (error) {
        console.error('Error al obtener turno actual:', error);
        res.status(500).json({ error: 'Error al obtener turno actual' });
    }
});

// POST /api/turnos/abrir - Abrir nuevo turno
app.post('/api/turnos/abrir', authenticateToken, async (req, res) => {
    try {
        const { cajero, montoInicial } = req.body;

        if (!cajero || montoInicial === undefined) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Verificar que no haya turno abierto
        const existingShift = await CashShift.findOne({
            where: { storeId: req.storeId, status: 'OPEN' }
        });

        if (existingShift) {
            return res.status(400).json({ error: 'Ya hay un turno abierto' });
        }

        const shift = await CashShift.create({
            storeId: req.storeId,
            cajero,
            apertura: new Date(),
            montoInicial,
            status: 'OPEN'
        });

        res.status(201).json(shift);
    } catch (error) {
        console.error('Error al abrir turno:', error);
        res.status(500).json({ error: 'Error al abrir turno' });
    }
});

// POST /api/turnos/:id/cerrar - Cerrar turno
app.post('/api/turnos/:id/cerrar', authenticateToken, async (req, res) => {
    try {
        const { montoReal, notas } = req.body;

        if (montoReal === undefined) {
            return res.status(400).json({ error: 'Monto real requerido' });
        }

        const shift = await CashShift.findOne({
            where: { id: req.params.id, storeId: req.storeId, status: 'OPEN' }
        });

        if (!shift) {
            return res.status(404).json({ error: 'Turno no encontrado o ya cerrado' });
        }

        // Calcular ventas por método de pago durante el turno
        const sales = await Sale.findAll({
            where: {
                storeId: req.storeId,
                status: 'ACTIVE',
                created_at: {
                    [sequelize.Sequelize.Op.gte]: shift.apertura
                }
            }
        });

        let ventasEfectivo = 0;
        let ventasTarjeta = 0;
        let ventasTransferencia = 0;

        sales.forEach(sale => {
            const total = parseFloat(sale.total);
            if (sale.paymentMethod === 'CASH') ventasEfectivo += total;
            else if (sale.paymentMethod === 'CARD') ventasTarjeta += total;
            else if (sale.paymentMethod === 'TRANSFER') ventasTransferencia += total;
        });

        // Calcular gastos durante el turno
        const expenses = await Expense.findAll({
            where: {
                storeId: req.storeId,
                created_at: {
                    [sequelize.Sequelize.Op.gte]: shift.apertura
                }
            }
        });

        const gastos = expenses.reduce((sum, exp) => sum + parseFloat(exp.monto), 0);

        // Calcular monto esperado y diferencia
        const montoEsperado = parseFloat(shift.montoInicial) + ventasEfectivo - gastos;
        const diferencia = montoReal - montoEsperado;

        await shift.update({
            cierre: new Date(),
            ventasEfectivo,
            ventasTarjeta,
            ventasTransferencia,
            gastos,
            montoEsperado,
            montoReal,
            diferencia,
            notas,
            status: 'CLOSED'
        });

        res.json(shift);
    } catch (error) {
        console.error('Error al cerrar turno:', error);
        res.status(500).json({ error: 'Error al cerrar turno' });
    }
});

// ==========================================
// ENDPOINT DE TESTING (SOLO PARA VALIDACIÓN)
// ==========================================

app.get('/api/test/run', async (req, res) => {
    const results = [];
    let testsPassed = 0;
    let testsFailed = 0;

    const addResult = (testName, passed, details = '') => {
        results.push({ testName, passed, details });
        if (passed) testsPassed++;
        else testsFailed++;
    };

    try {
        // LIMPIAR BASE DE DATOS - Usar sync con force para recrear todas las tablas
        await sequelize.sync({ force: true });
        addResult('Limpieza de base de datos', true, 'Base de datos reiniciada con sync force');

        // Variables para las pruebas
        let tokenCentro, tokenNorte, storeIdCentro, storeIdNorte, productId, orgId;

        // TEST 1: Registro de Organization y Stores
        try {
            const resCentro = await Organization.create({
                nombre: 'Empresa Alex',
                slug: 'empresa-alex',
                propietario: 'Alex',
                email: 'alex@empresa.com',
                telefono: '5551234567',
                activo: true
            });

            orgId = resCentro.id;

            const hashedPassword = await bcrypt.hash('test123', 10);

            const storeCentro = await Store.create({
                organizationId: orgId,
                nombre: 'Sucursal Centro',
                slug: 'sucursal-centro',
                usuario: 'centro_admin',
                password: hashedPassword,
                activo: true
            });

            storeIdCentro = storeCentro.id;
            tokenCentro = jwt.sign({
                storeId: storeIdCentro,
                organizationId: orgId,
                storeName: 'Sucursal Centro',
                usuario: 'centro_admin'
            }, JWT_SECRET, { expiresIn: '1h' });

            const storeNorte = await Store.create({
                organizationId: orgId,
                nombre: 'Sucursal Norte',
                slug: 'sucursal-norte',
                usuario: 'norte_admin',
                password: hashedPassword,
                activo: true
            });

            storeIdNorte = storeNorte.id;
            tokenNorte = jwt.sign({
                storeId: storeIdNorte,
                organizationId: orgId,
                storeName: 'Sucursal Norte',
                usuario: 'norte_admin'
            }, JWT_SECRET, { expiresIn: '1h' });

            addResult('Registro de Organization y 2 Stores', true, `Org: ${orgId.substring(0, 8)}..., Stores: 2`);
        } catch (error) {
            addResult('Registro de Organization', false, error.message);
        }

        // TEST 2: Crear Producto en Sucursal Centro
        try {
            const product = await Product.create({
                storeId: storeIdCentro,
                sku: 'LAP001',
                nombre: 'Laptop Dell',
                categoria: 'Electrónica',
                costPrice: 50,
                salePrice: 100,
                stock: 10,
                minStock: 2,
                taxRate: 0,
                activo: true
            });

            productId = product.id;

            await StockMovement.create({
                productId: productId,
                storeId: storeIdCentro,
                tipo: 'PURCHASE',
                cantidad: 10,
                stockAnterior: 0,
                stockNuevo: 10,
                motivo: 'Stock inicial',
                registradoPor: 'centro_admin'
            });

            addResult('Producto creado en Sucursal Centro', true, `Producto: ${productId.substring(0, 8)}..., Stock: 10`);
        } catch (error) {
            addResult('Crear Producto', false, error.message);
        }

        // TEST 3: Aislamiento de Datos
        try {
            const productosNorte = await Product.findAll({
                where: { storeId: storeIdNorte, activo: true }
            });

            const productosCentro = await Product.findAll({
                where: { storeId: storeIdCentro, activo: true }
            });

            const aislado = productosNorte.length === 0 && productosCentro.length === 1;

            addResult(
                'Aislamiento de datos entre tiendas',
                aislado,
                `Norte: ${productosNorte.length} productos, Centro: ${productosCentro.length} producto`
            );
        } catch (error) {
            addResult('Aislamiento de Datos', false, error.message);
        }

        // TEST 4: Ciclo Financiero - Venta 1
        try {
            const product = await Product.findByPk(productId);
            const totalCost1 = parseFloat(product.costPrice) * 1;
            const total1 = 100;
            const netProfit1 = total1 - totalCost1;

            const venta1 = await Sale.create({
                storeId: storeIdCentro,
                vendedor: 'centro_admin',
                subtotal: total1,
                totalDiscount: 0,
                taxTotal: 0,
                total: total1,
                totalCost: totalCost1,
                netProfit: netProfit1,
                paymentMethod: 'CASH',
                status: 'ACTIVE',
                items: [{
                    productId: productId,
                    nombre: 'Laptop Dell',
                    cantidad: 1,
                    unitPrice: 100,
                    unitCost: 50,
                    subtotal: 100
                }],
                syncedAt: new Date()
            });

            await product.update({ stock: product.stock - 1 });

            await StockMovement.create({
                productId: productId,
                storeId: storeIdCentro,
                tipo: 'SALE',
                cantidad: -1,
                stockAnterior: 10,
                stockNuevo: 9,
                motivo: `Venta #${venta1.id.substring(0, 8)}`,
                referenciaId: venta1.id,
                registradoPor: 'centro_admin'
            });

            addResult(
                'Venta #1 creada',
                venta1.total === 100 && venta1.totalCost === 50 && venta1.netProfit === 50,
                `Total: $100, Costo: $50, Utilidad: $50`
            );
        } catch (error) {
            addResult('Venta #1', false, error.message);
        }

        // TEST 5: Ciclo Financiero - Venta 2
        try {
            const product = await Product.findByPk(productId);
            const totalCost2 = parseFloat(product.costPrice) * 1;
            const total2 = 100;
            const netProfit2 = total2 - totalCost2;

            const venta2 = await Sale.create({
                storeId: storeIdCentro,
                vendedor: 'centro_admin',
                subtotal: total2,
                totalDiscount: 0,
                taxTotal: 0,
                total: total2,
                totalCost: totalCost2,
                netProfit: netProfit2,
                paymentMethod: 'CARD',
                status: 'ACTIVE',
                items: [{
                    productId: productId,
                    nombre: 'Laptop Dell',
                    cantidad: 1,
                    unitPrice: 100,
                    unitCost: 50,
                    subtotal: 100
                }],
                syncedAt: new Date()
            });

            await product.update({ stock: product.stock - 1 });

            await StockMovement.create({
                productId: productId,
                storeId: storeIdCentro,
                tipo: 'SALE',
                cantidad: -1,
                stockAnterior: 9,
                stockNuevo: 8,
                motivo: `Venta #${venta2.id.substring(0, 8)}`,
                referenciaId: venta2.id,
                registradoPor: 'centro_admin'
            });

            addResult(
                'Venta #2 creada',
                venta2.total === 100 && venta2.totalCost === 50 && venta2.netProfit === 50,
                `Total: $100, Costo: $50, Utilidad: $50`
            );
        } catch (error) {
            addResult('Venta #2', false, error.message);
        }

        // TEST 6: Registrar Gasto
        try {
            const gasto = await Expense.create({
                storeId: storeIdCentro,
                categoria: 'UTILITIES',
                descripcion: 'Recibo de luz',
                monto: 20,
                fecha: new Date().toISOString().split('T')[0],
                recurrente: false,
                registradoPor: 'centro_admin'
            });

            addResult('Gasto operativo registrado', true, `Categoría: UTILITIES, Monto: $20`);
        } catch (error) {
            addResult('Registrar Gasto', false, error.message);
        }

        // TEST 7: PRUEBA MAESTRA - Dashboard Summary
        try {
            const salesSummary = await Sale.findOne({
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('id')), 'totalSales'],
                    [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
                    [sequelize.fn('SUM', sequelize.col('total_cost')), 'totalCost'],
                    [sequelize.fn('SUM', sequelize.col('net_profit')), 'grossProfit']
                ],
                where: {
                    storeId: storeIdCentro,
                    status: 'ACTIVE'
                },
                raw: true
            });

            const expensesSummary = await Expense.findOne({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('monto')), 'totalExpenses']
                ],
                where: {
                    storeId: storeIdCentro
                },
                raw: true
            });

            const totalSales = parseInt(salesSummary.totalSales || 0);
            const totalRevenue = parseFloat(salesSummary.totalRevenue || 0);
            const totalCost = parseFloat(salesSummary.totalCost || 0);
            const grossProfit = parseFloat(salesSummary.grossProfit || 0);
            const totalExpenses = parseFloat(expensesSummary.totalExpenses || 0);
            const netProfit = grossProfit - totalExpenses;

            const expectedNetProfit = 80; // (2 × $100) - (2 × $50) - $20

            addResult('Dashboard - Número de ventas', totalSales === 2, `${totalSales} === 2`);
            addResult('Dashboard - Ingresos totales', totalRevenue === 200, `$${totalRevenue} === $200`);
            addResult('Dashboard - Costo total', totalCost === 100, `$${totalCost} === $100`);
            addResult('Dashboard - Utilidad bruta', grossProfit === 100, `$${grossProfit} === $100`);
            addResult('Dashboard - Gastos totales', totalExpenses === 20, `$${totalExpenses} === $20`);

            const netProfitCorrect = netProfit === expectedNetProfit;
            addResult(
                '🏆 PRUEBA MAESTRA - Utilidad Neta Real',
                netProfitCorrect,
                `$${netProfit} === $${expectedNetProfit} | Fórmula: (2×$100) - (2×$50) - $20 = $80`
            );

        } catch (error) {
            addResult('Dashboard Summary', false, error.message);
        }

        // TEST 8: Kardex (Historial de Movimientos)
        try {
            const movements = await StockMovement.findAll({
                where: { productId: productId },
                order: [['created_at', 'ASC']]
            });

            const hasInitial = movements[0]?.tipo === 'PURCHASE' && movements[0]?.cantidad === 10;
            const hasSale1 = movements[1]?.tipo === 'SALE' && movements[1]?.cantidad === -1;
            const hasSale2 = movements[2]?.tipo === 'SALE' && movements[2]?.cantidad === -1;

            addResult(
                'Kardex - Historial completo',
                movements.length === 3 && hasInitial && hasSale1 && hasSale2,
                `3 movimientos: PURCHASE(+10), SALE(-1), SALE(-1)`
            );
        } catch (error) {
            addResult('Kardex', false, error.message);
        }

        // Generar HTML
        const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
        const allPassed = testsFailed === 0;

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teikon POS - Test Results</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: ${allPassed ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'};
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .header .subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      padding: 30px;
      background: #f8f9fa;
      border-bottom: 2px solid #e9ecef;
    }
    .stat {
      text-align: center;
      padding: 15px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 12px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .stat.passed .stat-value { color: #28a745; }
    .stat.failed .stat-value { color: #dc3545; }
    .stat.rate .stat-value { color: #667eea; }
    .results {
      padding: 30px;
    }
    .test-item {
      display: flex;
      align-items: flex-start;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 8px;
      border-left: 4px solid;
      background: #f8f9fa;
      transition: transform 0.2s;
    }
    .test-item:hover {
      transform: translateX(5px);
    }
    .test-item.pass {
      border-left-color: #28a745;
      background: #d4edda;
    }
    .test-item.fail {
      border-left-color: #dc3545;
      background: #f8d7da;
    }
    .test-item.master {
      border-left-color: #ffc107;
      background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
      border: 2px solid #ffc107;
      box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
    }
    .test-icon {
      font-size: 24px;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .test-content {
      flex: 1;
    }
    .test-name {
      font-weight: 700;
      font-size: 16px;
      margin-bottom: 5px;
      color: #212529;
    }
    .test-details {
      font-size: 13px;
      color: #6c757d;
      font-family: 'Courier New', monospace;
    }
    .footer {
      padding: 20px 30px;
      background: #212529;
      color: white;
      text-align: center;
      font-size: 12px;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 14px;
      margin-top: 10px;
    }
    .badge.success {
      background: #28a745;
      color: white;
    }
    .badge.warning {
      background: #ffc107;
      color: #212529;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${allPassed ? '✅ TODAS LAS PRUEBAS APROBADAS' : '⚠️ ALGUNAS PRUEBAS FALLARON'}</h1>
      <div class="subtitle">Teikon POS - Integration Test Suite</div>
      ${allPassed ? '<div class="badge success">🚀 LISTO PARA FRONTEND</div>' : '<div class="badge warning">⚠️ REVISAR ERRORES</div>'}
    </div>
    
    <div class="stats">
      <div class="stat passed">
        <div class="stat-value">${testsPassed}</div>
        <div class="stat-label">Aprobados</div>
      </div>
      <div class="stat failed">
        <div class="stat-value">${testsFailed}</div>
        <div class="stat-label">Fallidos</div>
      </div>
      <div class="stat rate">
        <div class="stat-value">${successRate}%</div>
        <div class="stat-label">Tasa de Éxito</div>
      </div>
    </div>
    
    <div class="results">
      ${results.map(r => `
        <div class="test-item ${r.passed ? 'pass' : 'fail'} ${r.testName.includes('MAESTRA') ? 'master' : ''}">
          <div class="test-icon">${r.passed ? '✅' : '❌'}</div>
          <div class="test-content">
            <div class="test-name">${r.testName}</div>
            ${r.details ? `<div class="test-details">${r.details}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="footer">
      Teikon POS v2.0 | Ejecutado: ${new Date().toLocaleString()} | Backend: PostgreSQL + Sequelize
    </div>
  </div>
</body>
</html>
    `;

        res.send(html);

    } catch (error) {
        res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; background: #dc3545; color: white;">
          <h1>❌ Error Fatal en Tests</h1>
          <pre style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; overflow: auto;">${error.stack}</pre>
        </body>
      </html>
    `);
    }
});

// ==========================================
// ENDPOINT DE DASHBOARD OPTIMIZADO
// ==========================================

// GET /api/dashboard/summary - Resumen agregado optimizado
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        const { period = 'month' } = req.query; // 'day', 'week', 'month', 'year'

        // Calcular rango de fechas
        const now = new Date();
        let startDate;

        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - dayOfWeek);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Agregación de ventas con PostgreSQL
        const salesSummary = await Sale.findOne({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalSales'],
                [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
                [sequelize.fn('SUM', sequelize.col('total_cost')), 'totalCost'],
                [sequelize.fn('SUM', sequelize.col('net_profit')), 'grossProfit']
            ],
            where: {
                storeId: req.storeId,
                status: 'ACTIVE',
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            raw: true
        });

        // Agregación de gastos
        const expensesSummary = await Expense.findOne({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('monto')), 'totalExpenses']
            ],
            where: {
                storeId: req.storeId,
                fecha: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            raw: true
        });

        // Ventas por método de pago
        const salesByPayment = await Sale.findAll({
            attributes: [
                'paymentMethod',
                [sequelize.fn('SUM', sequelize.col('total')), 'total']
            ],
            where: {
                storeId: req.storeId,
                status: 'ACTIVE',
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            group: ['paymentMethod'],
            raw: true
        });

        // Calcular utilidad neta real
        const grossProfit = parseFloat(salesSummary.grossProfit || 0);
        const totalExpenses = parseFloat(expensesSummary.totalExpenses || 0);
        const netProfit = grossProfit - totalExpenses;

        // Productos con bajo stock
        const lowStockProducts = await Product.findAll({
            attributes: ['id', 'nombre', 'stock', 'minStock'],
            where: {
                storeId: req.storeId,
                activo: true,
                stock: {
                    [sequelize.Sequelize.Op.lte]: sequelize.col('min_stock')
                }
            },
            limit: 10
        });

        res.json({
            period,
            startDate,
            endDate: now,
            sales: {
                count: parseInt(salesSummary.totalSales || 0),
                totalRevenue: parseFloat(salesSummary.totalRevenue || 0),
                totalCost: parseFloat(salesSummary.totalCost || 0),
                grossProfit: grossProfit,
                averageTicket: salesSummary.totalSales > 0
                    ? parseFloat(salesSummary.totalRevenue) / parseInt(salesSummary.totalSales)
                    : 0
            },
            expenses: {
                total: totalExpenses
            },
            profitability: {
                grossProfit,
                totalExpenses,
                netProfit, // Utilidad Neta Real
                margin: salesSummary.totalRevenue > 0
                    ? (netProfit / parseFloat(salesSummary.totalRevenue)) * 100
                    : 0
            },
            paymentMethods: salesByPayment.reduce((acc, item) => {
                acc[item.paymentMethod] = parseFloat(item.total);
                return acc;
            }, {}),
            alerts: {
                lowStockProducts
            }
        });
    } catch (error) {
        console.error('Error en dashboard summary:', error);
        res.status(500).json({ error: 'Error al obtener resumen' });
    }
});

// ==========================================
// SERVIR ARCHIVOS ESTÁTICOS (FRONTEND)
// ==========================================
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
const startServer = async () => {
    try {
        // Conectar a base de datos
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL exitosa');

        // Sincronizar modelos (crear tablas)
        // Sincronizar Base de Datos (ALTER para actualizar schema sin borrar data)
        sequelize.sync({ alter: true }).then(() => {
            console.log('✅ Base de datos sincronizada (Schema Updated)');

            // Crear usuario SuperAdmin por defecto si no existe
            // await createSuperAdmin(); // COMMENTED: Function not defined, admin may already exist in production
        }).catch(err => {
            console.error("❌ ERROR CRÍTICO AL SINCRONIZAR BD:");
            console.error(err); // Imprime el objeto completo
            if (err.parent) console.error("🔍 Detalle SQL:", err.parent); // Si es Sequelize/Postgres
            if (err.original) console.error("🔍 Original:", err.original);
        });

        // Crear usuario SuperAdmin por defecto si no existe
        // await createSuperAdmin(); // COMMENTED: Function not defined, admin may already exist in production

        // ==========================================
        // ENDPOINTS DE TICKETS (SOPORTE)
        // ==========================================

        // GET /api/tickets - Listar tickets
        app.get('/api/tickets', authenticateToken, async (req, res) => {
            try {
                const where = {};

                // Si no es SUPER_ADMIN, solo ve los de su tienda
                if (req.role !== 'SUPER_ADMIN') {
                    where.storeId = req.storeId;
                }

                const tickets = await Ticket.findOne({ where }) // Check if any exist first to fail fast? No, findAll returns []
                    ? await Ticket.findAll({
                        where,
                        include: req.role === 'SUPER_ADMIN' ? [{
                            model: Store,
                            as: 'store',
                            attributes: ['nombre']
                        }] : [],
                        order: [
                            ['status', 'ASC'], // OPEN first
                            ['prioridad', 'DESC'], // URGENT first
                            ['createdAt', 'DESC']
                        ]
                    })
                    : []; // Optimization if needed, but standard findAll is fine.

                // Re-doing the query standard way
                const finalTickets = await Ticket.findAll({
                    where,
                    include: req.role === 'SUPER_ADMIN' ? [{
                        model: Store,
                        as: 'store',
                        attributes: ['nombre']
                    }] : [],
                    order: [['createdAt', 'DESC']]
                });

                res.json(finalTickets);
            } catch (error) {
                console.error('Error al obtener tickets:', error);
                res.status(500).json({ error: 'Error al obtener tickets' });
            }
        });

        // POST /api/tickets - Crear ticket
        app.post('/api/tickets', authenticateToken, async (req, res) => {
            try {
                const { titulo, descripcion, prioridad } = req.body;

                if (!titulo || !descripcion) {
                    return res.status(400).json({ error: 'Título y descripción requeridos' });
                }

                const ticket = await Ticket.create({
                    storeId: req.storeId,
                    titulo,
                    descripcion,
                    prioridad: prioridad || 'MEDIUM',
                    status: 'OPEN',
                    creadoPor: req.usuario
                });

                res.status(201).json(ticket);
            } catch (error) {
                console.error('Error al crear ticket:', error);
                res.status(500).json({ error: 'Error al crear ticket' });
            }
        });

        // PUT /api/tickets/:id - Actualizar ticket (Status/Prioridad)
        app.put('/api/tickets/:id', authenticateToken, async (req, res) => {
            try {
                const { status, prioridad } = req.body;
                const where = { id: req.params.id };

                // Isolar: Si no es SA, solo puede editar sus propios tickets (opcionalmente) 
                // Normalmente SA es quien edita el status a RESOLVED, pero dejaremos ambos por ahora.
                if (req.role !== 'SUPER_ADMIN') {
                    where.storeId = req.storeId;
                }

                const ticket = await Ticket.findOne({ where });

                if (!ticket) {
                    return res.status(404).json({ error: 'Ticket no encontrado' });
                }

                await ticket.update({
                    status: status || ticket.status,
                    prioridad: prioridad || ticket.prioridad
                });

                res.json(ticket);
            } catch (error) {
                console.error('Error al actualizar ticket:', error);
                res.status(500).json({ error: 'Error al actualizar ticket' });
            }
        });

        // ==========================================
        // SERVIR FRONTEND EN PRODUCCIÓN
        // ==========================================

        // 1. Servir archivos estáticos generados por Vite (dist/)
        app.use(express.static(path.join(__dirname, 'dist')));

        // 2. Catch-All: Cualquier ruta que NO sea API, redirige al index.html
        // Esto permite que React Router maneje las rutas del frontend (SPA)
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });

        // ==========================================
        // INICIAR SERVIDOR
        // ==========================================
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Servidor corriendo en puerto ${PORT}`);
            console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/summary`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error);
        process.exit(1);
    }
};

startServer();
