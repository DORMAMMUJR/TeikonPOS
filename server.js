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

// ==========================================
// 🔌 CONEXIÓN BASE DE DATOS (PostgreSQL)
// ==========================================
// 🔌 CONEXIÓN BASE DE DATOS (PostgreSQL)
// ==========================================
import pool from './db.js';

// Prueba de conexión al iniciar
pool.connect()
    .then(() => console.log('✅ Conectado a PostgreSQL exitosamente'))
    .catch(err => console.error('❌ Error de conexión a BD:', err));

// ==========================================


// Importar controladores
import { getDashboardSummary } from './controllers/dashboardController.js';
import { getCashCloseDetails, cancelSale, createSale, syncSales } from './controllers/salesController.js';
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
    Shift,
    Client,
    Ticket,
    StoreConfig,
    GoalHistory,
    TicketSettings
} from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080

// Middleware de Logging (Debug)
app.use((req, res, next) => {
    console.log(`➡️ ${req.method} ${req.path}`);
    next();
});

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
    'http://localhost:8080',
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
            console.log('Bloqueado por CORS:', origin);
            callback(new Error('No permitido por CORS'));
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

// GET /api/productos - Listar productos de la store (con agrupación por categoría)
app.get('/api/productos', authenticateToken, async (req, res) => {
    try {
        const where = { activo: true };

        // IMPROVED: Aislamiento Multi-Tenant con soporte para Super Admin
        const { storeId: queryStoreId } = req.query;

        // Caso 1: SUPER_ADMIN con storeId en query → Filtrar por esa tienda específica
        if (req.role === 'SUPER_ADMIN' && queryStoreId) {
            console.log(`🔍 SUPER_ADMIN viewing products for store: ${queryStoreId}`);
            where.storeId = queryStoreId;
        }
        // Caso 2: Usuario normal → SIEMPRE filtrar por su propia tienda (SEGURIDAD)
        else if (req.role !== 'SUPER_ADMIN') {
            // Validación adicional: Verificar que el usuario tenga un storeId asignado
            if (!req.storeId) {
                console.error('❌ Usuario sin storeId intentando acceder a inventario');
                return res.status(403).json({
                    error: 'Acceso denegado: Usuario sin tienda asignada',
                    grouped: {},
                    flat: []
                });
            }
            where.storeId = req.storeId;
        }
        // Caso 3: SUPER_ADMIN sin queryStoreId → Ver TODOS los productos (útil para vista global)
        else {
            console.log('🌐 SUPER_ADMIN viewing ALL products (no storeId filter)');
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50; // Default limit 50 to prevent OOM
        const offset = (page - 1) * limit;

        // CONSULTA OPTIMIZADA: Ordenar por categoría primero, luego por nombre
        const { count, rows } = await Product.findAndCountAll({
            where,
            order: [
                ['categoria', 'ASC'],  // Agrupar por categoría
                ['nombre', 'ASC']       // Ordenar alfabéticamente dentro de cada categoría
            ],
            limit,
            offset
        });

        // POST-PROCESAMIENTO: Agrupar productos por categoría
        const grouped = {};
        rows.forEach(product => {
            // Sanitizar categoría: Si es null, undefined o vacío, usar "General"
            const categoria = (product.categoria && product.categoria.trim() !== '')
                ? product.categoria.trim()
                : 'General';

            if (!grouped[categoria]) {
                grouped[categoria] = [];
            }
            grouped[categoria].push(product);
        });

        // Respuesta con estructura dual: agrupada y plana (compatibilidad)
        res.json({
            data: rows,              // Lista plana (compatibilidad con frontend existente)
            grouped: grouped,        // Estructura agrupada por categoría
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({
            error: 'Error al obtener productos',
            grouped: {},
            flat: []
        });
    }
});

// GET /api/products/search-sku/:sku - Búsqueda ultra-rápida por SKU para escáner de códigos de barras
// Optimizado con índice de base de datos para búsquedas O(log n)
app.get('/api/products/search-sku/:sku', authenticateToken, async (req, res) => {
    try {
        const { sku } = req.params;

        if (!sku || sku.trim() === '') {
            return res.status(400).json({ error: 'SKU es requerido' });
        }

        // Normalizar SKU (uppercase, trim)
        const normalizedSKU = sku.trim().toUpperCase();

        // CRITICAL: Multi-tenant filtering - ALWAYS filter by storeId
        const where = {
            sku: normalizedSKU,
            activo: true
        };

        // Si no es SUPER_ADMIN, filtrar por storeId (seguridad multi-tenant)
        if (req.role !== 'SUPER_ADMIN') {
            where.storeId = req.storeId;
        }

        console.log(`🔍 Searching product with SKU: ${normalizedSKU} for store: ${req.storeId || 'ALL'}`);

        // Búsqueda optimizada con índice (storeId, sku)
        // Tiempo esperado: < 10ms en tablas con 10,000+ productos
        const product = await Product.findOne({
            where,
            attributes: ['id', 'sku', 'nombre', 'categoria', 'costPrice', 'salePrice', 'stock', 'minStock', 'imagen', 'storeId']
        });

        if (!product) {
            console.log(`❌ Product not found: ${normalizedSKU}`);
            return res.status(404).json({
                error: 'Producto no encontrado',
                sku: normalizedSKU
            });
        }

        console.log(`✅ Product found: ${product.nombre} (Stock: ${product.stock})`);

        // Map backend fields to frontend format
        const mappedProduct = {
            id: product.id,
            sku: product.sku,
            name: product.nombre,
            category: product.categoria,
            costPrice: parseFloat(product.costPrice),
            salePrice: parseFloat(product.salePrice),
            stock: product.stock,
            minStock: product.minStock,
            image: product.imagen,
            storeId: product.storeId,
            isActive: true
        };

        res.json(mappedProduct);
    } catch (error) {
        console.error('Error en búsqueda por SKU:', error);
        res.status(500).json({ error: 'Error interno al buscar producto' });
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

        // 🔒 PATCH CRÍTICO 3: Whitelist de campos permitidos para prevenir inyección
        const allowedFields = {
            sku: req.body.sku,
            name: req.body.name,
            nombre: req.body.nombre,
            category: req.body.category,
            categoria: req.body.categoria,
            costPrice: req.body.costPrice,
            salePrice: req.body.salePrice,
            stock: req.body.stock,
            minStock: req.body.minStock,
            taxRate: req.body.taxRate,
            isActive: req.body.isActive,
            activo: req.body.activo,
            image: req.body.image,
            imagen: req.body.imagen
        };

        // Filtrar campos undefined
        const updateData = Object.fromEntries(
            Object.entries(allowedFields).filter(([_, v]) => v !== undefined)
        );

        await product.update(updateData);

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
        const { status, startDate, endDate, storeId: queryStoreId } = req.query;
        const where = {};

        // IMPROVED: Aislamiento Multi-Tenant con soporte para Super Admin
        // Caso 1: SUPER_ADMIN con storeId en query → Filtrar por esa tienda específica
        if (req.role === 'SUPER_ADMIN' && queryStoreId) {
            console.log(`🔍 SUPER_ADMIN viewing sales for store: ${queryStoreId}`);
            where.storeId = queryStoreId;
        }
        // Caso 2: Usuario normal → SIEMPRE filtrar por su propia tienda (SEGURIDAD)
        else if (req.role !== 'SUPER_ADMIN') {
            where.storeId = req.storeId;
        }
        // Caso 3: SUPER_ADMIN sin queryStoreId → Ver TODAS las ventas
        else {
            console.log('🌐 SUPER_ADMIN viewing ALL sales (no storeId filter)');
        }

        if (status) where.status = status;
        if (startDate && endDate) {
            where.createdAt = {
                [sequelize.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Filter by Shift (Support for specific ID or 'current' open shift)
        if (req.query.shiftId) {
            if (req.query.shiftId === 'current') {
                const targetStoreId = where.storeId || req.storeId;
                if (targetStoreId) {
                    const activeShift = await Shift.findOne({
                        where: { storeId: targetStoreId, status: 'OPEN' },
                        attributes: ['id']
                    });
                    where.shiftId = activeShift ? activeShift.id : -1; // -1 ensures no results if no shift
                }
            } else {
                where.shiftId = req.query.shiftId;
            }
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

// GET /api/ventas/:id - Get single sale by ID
app.get('/api/ventas/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const where = { id };

        // IMPROVED: Multi-tenant security - Filter by storeId for non-SUPER_ADMIN
        // Caso 1: SUPER_ADMIN → Can view any sale
        // Caso 2: Usuario normal → ONLY their store's sales (SECURITY)
        if (req.role !== 'SUPER_ADMIN') {
            where.storeId = req.storeId;
        }

        console.log(`🔍 Fetching sale ${id} for ${req.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : `store ${req.storeId}`}`);

        const sale = await Sale.findOne({
            where,
            include: req.role === 'SUPER_ADMIN' ? [{
                model: Store,
                as: 'store',
                attributes: ['nombre']
            }] : []
        });

        if (!sale) {
            console.log(`❌ Sale not found: ${id}`);
            return res.status(404).json({
                error: 'Venta no encontrada',
                saleId: id
            });
        }

        console.log(`✅ Sale found: ${id} - Total: $${sale.total}`);
        res.json(sale);
    } catch (error) {
        console.error('Error al obtener venta:', error);
        res.status(500).json({ error: 'Error al obtener venta' });
    }
});


// POST /api/ventas - Crear venta (ATOMIC TRANSACTION)
app.post('/api/ventas', authenticateToken, createSale);

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

// POST /api/sales/:id/cancel - Cancel Sale (English endpoint with role protection)
app.post('/api/sales/:id/cancel', authenticateToken, async (req, res) => {
    try {
        // Role-based access control: Only ADMIN and SUPER_ADMIN can cancel sales
        if (req.role !== 'ADMIN' && req.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden cancelar ventas.' });
        }

        // Build where clause with store isolation for non-SUPER_ADMIN users
        const where = { id: req.params.id };
        if (req.role !== 'SUPER_ADMIN') {
            where.storeId = req.storeId;
        }

        const sale = await Sale.findOne({ where });

        if (!sale) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        if (sale.status === 'CANCELLED') {
            return res.status(400).json({ error: 'La venta ya está cancelada' });
        }

        // Log the cancellation action
        console.log(`🔴 CANCELACIÓN DE VENTA: ID ${sale.id.substring(0, 8)} por ${req.usuario} (${req.role})`);

        // Transactional stock restoration
        await sequelize.transaction(async (t) => {
            // Update sale status
            await sale.update({ status: 'CANCELLED' }, { transaction: t });

            // Restore stock for each item
            for (const item of sale.items) {
                const product = await Product.findByPk(item.productId, {
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });

                if (product) {
                    const stockAnterior = product.stock;
                    const stockNuevo = stockAnterior + item.cantidad;

                    await product.update({ stock: stockNuevo }, { transaction: t });

                    // Create audit trail in stock movements
                    await StockMovement.create({
                        productId: item.productId,
                        storeId: sale.storeId,
                        tipo: 'RETURN',
                        cantidad: item.cantidad,
                        stockAnterior,
                        stockNuevo,
                        motivo: `Cancelación venta #${sale.id.substring(0, 8)} por ${req.usuario}`,
                        referenciaId: sale.id,
                        registradoPor: req.usuario
                    }, { transaction: t });

                    console.log(`  ✅ Stock restaurado: ${product.nombre} +${item.cantidad} (${stockAnterior} → ${stockNuevo})`);
                }
            }
        });

        res.json({
            message: 'Venta cancelada exitosamente',
            saleId: sale.id,
            itemsRestored: sale.items.length
        });
    } catch (error) {
        console.error('Error al cancelar venta:', error);
        res.status(500).json({ error: 'Error al cancelar venta' });
    }
});


// ==========================================
// ENDPOINTS DE DASHBOARD Y ANALÍTICAS
// ==========================================



// POST /api/ventas/sync - Sincronizar ventas offline
// POST /api/ventas/sync - Sincronizar ventas offline
app.post('/api/ventas/sync', authenticateToken, syncSales);

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

        const activeShift = await Shift.findOne({
            where: { storeId: req.storeId, status: 'OPEN' }
        });

        if (!activeShift) {
            return res.status(403).json({ error: 'Debes abrir caja para registrar gastos.' });
        }

        const expense = await Expense.create({
            storeId: req.storeId,
            shiftId: activeShift.id,
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


// ==========================================
// CONFIGURACIÓN DE TIENDA (Store Config)
// ==========================================


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

// GET /api/dashboard/summary - Utilidad Real y Punto de Equilibrio (basado en turno activo)
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        const { storeId } = req;

        // 1. Buscar el turno activo (OPEN)
        const currentShift = await Shift.findOne({
            where: {
                storeId: storeId,
                status: 'OPEN'
            }
        });

        // =========================================================
        // 🛡️ LÓGICA DEFENSIVA (ANTI-CRASH)
        // =========================================================
        // Si NO hay turno abierto, devolvemos todo en 0 inmediatamente.
        if (!currentShift) {
            return res.json({
                costoOperativo: 0,
                ventaTotal: 0,
                utilidadBruta: 0,
                utilidadNeta: 0,
                porcentajeEquilibrio: 0
            });
        }
        // =========================================================

        // 2. Si SÍ hay turno, procedemos con las consultas usando el ID seguro
        const shiftId = currentShift.id;

        // Obtener Costo Operativo Diario (breakEvenGoal es mensual / 30)
        const config = await StoreConfig.findOne({ where: { storeId } });
        const monthlyGoal = config ? Number(config.breakEvenGoal) : 0;
        const costoOperativo = monthlyGoal / 30;

        // Calcular total de ventas del turno actual (Dinero en caja)
        const ventaTotal = await Sale.sum('total', {
            where: {
                storeId: storeId,
                shiftId: shiftId,
                status: 'ACTIVE'
            }
        }) || 0;

        // =========================================================
        // CÁLCULO DE UTILIDAD REAL (Ganancia = Precio Venta - Costo)
        // =========================================================
        // Obtener todos los items vendidos en el turno actual
        const saleItems = await SaleItem.findAll({
            include: [{
                model: Sale,
                where: {
                    storeId: storeId,
                    shiftId: shiftId,
                    status: 'ACTIVE'
                },
                required: true,
                attributes: [] // No necesitamos campos de Sale aquí
            }, {
                model: Product,
                attributes: ['costPrice'], // Necesitamos el costo actual como fallback
                required: false // LEFT JOIN por si el producto fue eliminado
            }],
            attributes: ['cantidad', 'precio', 'costo', 'productId']
        });

        let utilidadBruta = 0;

        for (const item of saleItems) {
            const cantidad = Number(item.cantidad) || 0;
            const precioVenta = Number(item.precio) || 0;

            // Usar costo histórico del item, si no existe usar costo actual del producto
            let costo = Number(item.costo) || 0;

            // Fallback: Si el costo histórico es 0 o null, usar el costo actual del producto
            if (costo === 0 && item.Product) {
                costo = Number(item.Product.costPrice) || 0;
            }

            // Calcular ganancia por item: (Precio Venta - Costo) * Cantidad
            const gananciaItem = (precioVenta - costo) * cantidad;
            utilidadBruta += gananciaItem;
        }

        // Calcular Utilidad Neta (Ganancia - Gastos Operativos)
        const utilidadNeta = utilidadBruta - costoOperativo;

        // Calcular Porcentaje de Equilibrio (¿Cuánto % de los gastos estamos cubriendo?)
        let porcentajeEquilibrio = 0;
        if (costoOperativo > 0) {
            porcentajeEquilibrio = (utilidadBruta / costoOperativo) * 100;
        }

        // 3. Enviar respuesta exitosa
        res.json({
            costoOperativo: Number(costoOperativo.toFixed(2)),
            ventaTotal: Number(ventaTotal.toFixed(2)),
            utilidadBruta: Number(utilidadBruta.toFixed(2)),
            utilidadNeta: Number(utilidadNeta.toFixed(2)),
            porcentajeEquilibrio: Number(porcentajeEquilibrio.toFixed(2))
        });

    } catch (error) {
        console.error('Error en Dashboard Summary:', error);
        // Devolvemos estructura válida en ceros para que el frontend NO explote
        res.status(200).json({
            costoOperativo: 0,
            ventaTotal: 0,
            utilidadBruta: 0,
            utilidadNeta: 0,
            porcentajeEquilibrio: 0,
            error: "Error interno, mostrando datos en cero"
        });
    }
});

// ==========================================
// ENDPOINT DE CANCELACIÓN DE VENTAS
// ==========================================
// PUT /api/sales/:id/cancel - Cancelar venta y restaurar inventario
app.put('/api/sales/:id/cancel', authenticateToken, cancelSale);

// ==========================================
// FUNCIÓN DE LIMPIEZA: CERRAR SHIFTS HUÉRFANOS
// ==========================================
async function cleanupOrphanedShifts() {
    try {
        console.log('🧹 Verificando shifts huérfanos...');

        const orphanedShifts = await Shift.findAll({
            where: {
                status: 'OPEN',
                startTime: {
                    [sequelize.Sequelize.Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Más de 24 horas
                }
            }
        });

        if (orphanedShifts.length > 0) {
            console.warn(`⚠️ Encontrados ${orphanedShifts.length} shifts huérfanos (>24h abiertos). Cerrando...`);
            for (const shift of orphanedShifts) {
                await shift.update({
                    status: 'CLOSED',
                    endTime: new Date(),
                    notes: 'Cerrado automáticamente por limpieza del sistema'
                });
                console.log(`   ✅ Shift ${shift.id} cerrado (store: ${shift.storeId})`);
            }
            console.log(`✅ Limpieza completada: ${orphanedShifts.length} shifts cerrados`);
        } else {
            console.log('✅ No se encontraron shifts huérfanos');
        }
    } catch (err) {
        console.error('❌ Error en limpieza de shifts:', err);
        // No lanzar error para no bloquear el inicio del servidor
    }
}

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

        // 🧹 LIMPIEZA: Cerrar shifts huérfanos al iniciar servidor
        await cleanupOrphanedShifts();

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
        // ENDPOINTS DE CASH SHIFTS - REMOVED
        // ==========================================
        // NOTE: Old Sequelize-based endpoints removed due to schema mismatch
        // The CashShift model uses old column names (apertura, cajero, montoInicial)
        // that don't exist in the new PostgreSQL 'shifts' table schema.
        // 
        // New implementation should use pool.query with correct column names:
        // - start_time (not apertura)
        // - opened_by (not cajero)  
        // - initial_amount (not montoInicial)
        //
        // Add new endpoints here using pool.query if needed.

        // ==========================================
        // 🏦 GESTIÓN DE CAJA (VERSIÓN ESTABLE v2.9.3)
        // ==========================================

        // ==========================================
        // 🏦 GESTIÓN DE CAJA (VERSIÓN STRICT SEQUELIZE v3.0)
        // ==========================================

        // 1. OBTENER TURNO ACTUAL (CON CÁLCULO EN TIEMPO REAL)
        app.get('/api/shifts/current', authenticateToken, async (req, res) => {
            try {
                const { storeId } = req.query;
                const targetStoreId = req.role === 'SUPER_ADMIN' && storeId ? storeId : req.storeId;

                console.log(`🔵 [GET /api/shifts/current] storeId: ${targetStoreId}`);

                if (!targetStoreId) return res.status(400).json({ error: 'Store ID requerido' });

                // 🛡️ BLINDAJE: Detectar múltiples shifts abiertos
                const openShifts = await Shift.findAll({
                    where: { storeId: targetStoreId, status: 'OPEN' },
                    order: [['id', 'DESC']] // Ordenar por ID (más reciente primero)
                });

                if (openShifts.length > 1) {
                    console.warn(`⚠️ [GET /api/shifts/current] Múltiples shifts abiertos detectados (${openShifts.length}). Cerrando duplicados...`);
                    // Cerrar todos excepto el más reciente
                    for (let i = 1; i < openShifts.length; i++) {
                        await openShifts[i].update({ status: 'CLOSED', endTime: new Date() });
                        console.log(`   ✅ Shift duplicado cerrado: ID ${openShifts[i].id}`);
                    }
                }

                // Fetch OPEN shift with associated Sales and Expenses
                const shift = await Shift.findOne({
                    where: { storeId: targetStoreId, status: 'OPEN' },
                    include: [
                        { model: Sale, as: 'sales', attributes: ['total', 'paymentMethod', 'status'] },
                        { model: Expense, as: 'expenses', attributes: ['monto'] }
                    ]
                });

                if (!shift) {
                    console.log(`ℹ️ [GET /api/shifts/current] No hay turno abierto para store ${targetStoreId}`);
                    return res.json(null); // Return null instead of 204 for better frontend handling
                }

                // Calculate Totals on the Fly (Strict Accounting)
                let ventasEfectivo = 0;
                let ventasTarjeta = 0;
                let ventasTransferencia = 0;
                let ventasTotales = 0;

                shift.sales.forEach(sale => {
                    if (sale.status === 'ACTIVE') {
                        const amount = parseFloat(sale.total);
                        ventasTotales += amount;
                        if (sale.paymentMethod === 'CASH') ventasEfectivo += amount;
                        else if (sale.paymentMethod === 'CARD') ventasTarjeta += amount;
                        else if (sale.paymentMethod === 'TRANSFER') ventasTransferencia += amount;
                    }
                });

                const gastosTotal = shift.expenses.reduce((sum, exp) => sum + parseFloat(exp.monto), 0);
                const montoInicial = parseFloat(shift.initialAmount);

                // Expected Cash = Initial + Cash Sales - Expenses
                const montoEsperado = montoInicial + ventasEfectivo - gastosTotal;

                // Return formatted data matching frontend interface
                res.json({
                    id: shift.id,
                    montoInicial: montoInicial,
                    ventasEfectivo: ventasEfectivo,
                    ventasTarjeta: ventasTarjeta,
                    ventasTransferencia: ventasTransferencia,
                    ventasTotales: ventasTotales,
                    gastos: gastosTotal,
                    montoEsperado: montoEsperado, // Dynamic calculation
                    startTime: shift.startTime
                });

            } catch (err) {
                console.error(`❌ [GET /api/shifts/current] Error:`, err);
                console.error(`   StoreId: ${req.query.storeId || req.storeId}`);
                console.error(`   Sequelize Error:`, err.parent || err.original || err.message);
                res.status(500).json({ error: 'Error al obtener turno actual', details: err.message });
            }
        });

        // 2. APERTURA DE CAJA
        app.post('/api/shifts/start', authenticateToken, async (req, res) => {
            try {
                const { initialAmount, storeId: bodyStoreId } = req.body;
                const storeId = req.role === 'SUPER_ADMIN' && bodyStoreId ? bodyStoreId : req.storeId;
                const userId = req.user.userId || req.user.id;

                console.log(`🔵 [POST /api/shifts/start] storeId: ${storeId}, userId: ${userId}, initialAmount: ${initialAmount}`);

                if (!storeId) return res.status(400).json({ error: 'Falta ID de tienda' });

                // --- INICIO BLOQUE DE SEGURIDAD ---
                // Verificar si ya existe un turno abierto para esta tienda
                const existingShift = await Shift.findOne({
                    where: {
                        storeId: storeId, // Usando la variable storeId ya validada arriba
                        status: 'OPEN'
                    }
                });

                if (existingShift) {
                    console.log(`[Shift Protection] Se intentó abrir turno pero ya existía el ID ${existingShift.id}`);
                    // IMPORTANTE: Devolvemos 200 OK con el turno existente para que el Frontend crea que "abrió" exitosamente
                    return res.status(200).json(existingShift);
                }
                // --- FIN BLOQUE DE SEGURIDAD ---

                const newShift = await Shift.create({
                    storeId,
                    openedBy: userId,
                    initialAmount: initialAmount || 0,
                    startTime: new Date(),
                    status: 'OPEN'
                });

                res.status(201).json(newShift);

            } catch (err) {
                console.error(`❌ [POST /api/shifts/start] Error:`, err);
                console.error(`   StoreId: ${req.body.storeId || req.storeId}`);
                console.error(`   Sequelize Error:`, err.parent || err.original || err.message);
                res.status(500).json({ error: 'Error al abrir turno', details: err.message });
            }
        });

        // 3. CIERRE DE CAJA
        app.post('/api/shifts/end', authenticateToken, async (req, res) => {
            try {
                const { shiftId, montoReal, notes } = req.body;

                const shift = await Shift.findByPk(shiftId, {
                    include: [
                        { model: Sale, as: 'sales' },
                        { model: Expense, as: 'expenses' }
                    ]
                });

                if (!shift) return res.status(404).json({ error: 'Turno no encontrado' });
                if (shift.status === 'CLOSED') return res.status(400).json({ error: 'El turno ya está cerrado' });

                // Strict Recalculation
                let ventasEfectivo = 0;
                let ventasTarjeta = 0;
                let ventasTransferencia = 0;

                shift.sales.forEach(sale => {
                    if (sale.status === 'ACTIVE') {
                        const amount = parseFloat(sale.total);
                        if (sale.paymentMethod === 'CASH') ventasEfectivo += amount;
                        else if (sale.paymentMethod === 'CARD') ventasTarjeta += amount;
                        else if (sale.paymentMethod === 'TRANSFER') ventasTransferencia += amount;
                    }
                });

                const gastosTotal = shift.expenses.reduce((sum, exp) => sum + parseFloat(exp.monto), 0);
                const montoInicial = parseFloat(shift.initialAmount);
                const montoEsperado = montoInicial + ventasEfectivo - gastosTotal;

                const finalReal = parseFloat(montoReal);
                const diferencia = finalReal - montoEsperado;

                await shift.update({
                    finalAmount: finalReal,
                    expectedAmount: montoEsperado,
                    difference: diferencia,
                    cashSales: ventasEfectivo,
                    cardSales: ventasTarjeta,
                    transferSales: ventasTransferencia,
                    expensesTotal: gastosTotal,
                    endTime: new Date(),
                    status: 'CLOSED',
                    notes: notes
                });

                res.json(shift);

            } catch (err) {
                console.error(`❌ [POST /api/shifts/end] Error:`, err);
                console.error(`   ShiftId: ${req.body.shiftId}`);
                console.error(`   Sequelize Error:`, err.parent || err.original || err.message);
                res.status(500).json({ error: 'Error al cerrar turno', details: err.message });
            }
        });

        // ==========================================
        // ENDPOINTS DE CONFIGURACIÓN DE TICKETS
        // ==========================================

        // GET /api/ticket-settings/:storeId - Get ticket settings for a store
        app.get('/api/ticket-settings/:storeId', authenticateToken, async (req, res) => {
            try {
                const { storeId } = req.params;

                // Security: Only SUPER_ADMIN or store owner can view settings
                if (req.role !== 'SUPER_ADMIN' && req.storeId !== storeId) {
                    return res.status(403).json({ error: 'Acceso denegado' });
                }

                let settings = await TicketSettings.findOne({ where: { storeId } });

                // If no settings exist, return defaults
                if (!settings) {
                    console.log(`📄 No ticket settings found for store ${storeId}, returning defaults`);
                    return res.json({
                        storeId,
                        showLogo: false,
                        showAddress: true,
                        showPhone: true,
                        showTaxes: false,
                        footerMessage: '¡Gracias por su compra!'
                    });
                }

                console.log(`✅ Ticket settings found for store ${storeId}`);
                res.json(settings);
            } catch (error) {
                console.error('Error al obtener configuración de tickets:', error);
                res.status(500).json({ error: 'Error al obtener configuración' });
            }
        });

        // PUT /api/ticket-settings/:storeId - Update ticket settings
        app.put('/api/ticket-settings/:storeId', authenticateToken, async (req, res) => {
            try {
                const { storeId } = req.params;
                const { showLogo, showAddress, showPhone, showTaxes, footerMessage } = req.body;

                // Security: Only SUPER_ADMIN or ADMIN can update settings
                if (req.role !== 'SUPER_ADMIN' && req.role !== 'ADMIN') {
                    return res.status(403).json({ error: 'Solo administradores pueden modificar configuración' });
                }

                // Security: Non-SUPER_ADMIN can only update their own store
                if (req.role !== 'SUPER_ADMIN' && req.storeId !== storeId) {
                    return res.status(403).json({ error: 'Acceso denegado' });
                }

                // Find or create settings
                let [settings, created] = await TicketSettings.findOrCreate({
                    where: { storeId },
                    defaults: {
                        showLogo: showLogo ?? false,
                        showAddress: showAddress ?? true,
                        showPhone: showPhone ?? true,
                        showTaxes: showTaxes ?? false,
                        footerMessage: footerMessage || '¡Gracias por su compra!'
                    }
                });

                // If exists, update
                if (!created) {
                    await settings.update({
                        showLogo: showLogo ?? settings.showLogo,
                        showAddress: showAddress ?? settings.showAddress,
                        showPhone: showPhone ?? settings.showPhone,
                        showTaxes: showTaxes ?? settings.showTaxes,
                        footerMessage: footerMessage || settings.footerMessage
                    });
                }

                console.log(`✅ Ticket settings ${created ? 'created' : 'updated'} for store ${storeId}`);
                res.json(settings);
            } catch (error) {
                console.error('Error al actualizar configuración de tickets:', error);
                res.status(500).json({ error: 'Error al actualizar configuración' });
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
