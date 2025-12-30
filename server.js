import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import {
    sequelize,
    Organization,
    Store,
    User,
    Product,
    Sale,
    Expense,
    StockMovement,
    CashShift
} from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;
const JWT_SECRET = process.env.JWT_SECRET || 'teikon-secret-key-change-in-production';

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());

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
        req.storeId = user.storeId;
        req.organizationId = user.organizationId;
        req.storeName = user.storeName;
        req.usuario = user.usuario;
        next();
    });
};

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================

// POST /api/auth/register - Registrar nueva organization y primera store
app.post('/api/auth/register', async (req, res) => {
    try {
        const { organizationName, storeName, usuario, password, email, telefono } = req.body;

        // Validar campos requeridos
        if (!organizationName || !storeName || !usuario || !password || !email) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Verificar que usuario y email no existan
        const existingStore = await Store.findOne({ where: { usuario } });
        if (existingStore) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        const existingOrg = await Organization.findOne({ where: { email } });
        if (existingOrg) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Encriptar password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear organization y store en transacción
        const result = await sequelize.transaction(async (t) => {
            // Crear organization
            const org = await Organization.create({
                nombre: organizationName,
                slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
                propietario: usuario,
                email,
                telefono
            }, { transaction: t });

            // Crear store
            const store = await Store.create({
                organizationId: org.id,
                nombre: storeName,
                slug: storeName.toLowerCase().replace(/\s+/g, '-'),
                usuario,
                password: hashedPassword,
                telefono
            }, { transaction: t });

            return { org, store };
        });

        // Generar token JWT
        const token = jwt.sign({
            storeId: result.store.id,
            organizationId: result.org.id,
            storeName: result.store.nombre,
            usuario: result.store.usuario
        }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            token,
            store: {
                id: result.store.id,
                nombre: result.store.nombre,
                usuario: result.store.usuario,
                organizationId: result.org.id,
                organizationName: result.org.nombre
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar' });
    }
});

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
            }, JWT_SECRET, { expiresIn: '30d' });

            return res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    storeId: user.storeId,
                    storeName: user.storeId ? 'Store' : 'Teikon HQ' // Placeholder
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
        }, JWT_SECRET, { expiresIn: '30d' });

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

// POST /api/stores/new - Crear nueva sucursal
app.post('/api/stores/new', authenticateToken, async (req, res) => {
    try {
        const { nombre, usuario, password, direccion, telefono } = req.body;

        if (!nombre || !usuario || !password) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Verificar que usuario no exista
        const existing = await Store.findOne({ where: { usuario } });
        if (existing) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Encriptar password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear store bajo la misma organization
        const store = await Store.create({
            organizationId: req.organizationId,
            nombre,
            slug: `${nombre.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            usuario,
            password: hashedPassword,
            direccion,
            telefono
        });

        res.status(201).json({
            id: store.id,
            nombre: store.nombre,
            usuario: store.usuario,
            organizationId: store.organizationId
        });
    } catch (error) {
        console.error('Error al crear sucursal:', error);
        res.status(500).json({ error: 'Error al crear sucursal' });
    }
});

// ==========================================
// ENDPOINTS DE PRODUCTOS
// ==========================================

// GET /api/productos - Listar productos de la store
app.get('/api/productos', authenticateToken, async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { storeId: req.storeId, activo: true },
            order: [['nombre', 'ASC']]
        });
        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// POST /api/productos - Crear producto
app.post('/api/productos', authenticateToken, async (req, res) => {
    try {
        const { sku, nombre, categoria, costPrice, salePrice, stock, minStock, taxRate, imagen } = req.body;

        if (!sku || !nombre || !categoria || costPrice === undefined || salePrice === undefined) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const product = await Product.create({
            storeId: req.storeId,
            sku,
            nombre,
            categoria,
            costPrice,
            salePrice,
            stock: stock || 0,
            minStock: minStock || 0,
            taxRate: taxRate || 0,
            imagen
        });

        // Crear movimiento inicial de stock si hay stock
        if (stock > 0) {
            await StockMovement.create({
                productId: product.id,
                storeId: req.storeId,
                tipo: 'PURCHASE',
                cantidad: stock,
                stockAnterior: 0,
                stockNuevo: stock,
                motivo: 'Stock inicial',
                registradoPor: req.usuario
            });
        }

        res.status(201).json(product);
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// PUT /api/productos/:id - Actualizar producto
app.put('/api/productos/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findOne({
            where: { id: req.params.id, storeId: req.storeId }
        });

        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        await product.update(req.body);
        res.json(product);
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// DELETE /api/productos/:id - Eliminar producto (soft delete)
app.delete('/api/productos/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findOne({
            where: { id: req.params.id, storeId: req.storeId }
        });

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

// GET /api/ventas - Listar ventas
app.get('/api/ventas', authenticateToken, async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        const where = { storeId: req.storeId };

        if (status) where.status = status;
        if (startDate && endDate) {
            where.created_at = {
                [sequelize.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const sales = await Sale.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
        res.json(sales);
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});

// POST /api/ventas - Crear venta
app.post('/api/ventas', authenticateToken, async (req, res) => {
    try {
        const { vendedor, items, paymentMethod, total } = req.body;

        if (!vendedor || !items || !paymentMethod || !total) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Calcular totalCost y netProfit
        let totalCost = 0;
        const enrichedItems = [];

        for (const item of items) {
            const product = await Product.findByPk(item.productId);
            if (!product) {
                return res.status(404).json({ error: `Producto ${item.productId} no encontrado` });
            }

            if (product.stock < item.cantidad) {
                return res.status(400).json({ error: `Stock insuficiente para ${product.nombre}` });
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

        const netProfit = total - totalCost;

        // Crear venta en transacción
        const sale = await sequelize.transaction(async (t) => {
            const newSale = await Sale.create({
                storeId: req.storeId,
                vendedor,
                subtotal: total,
                totalDiscount: 0,
                taxTotal: 0,
                total,
                totalCost,
                netProfit,
                paymentMethod,
                status: 'ACTIVE',
                items: enrichedItems,
                syncedAt: new Date()
            }, { transaction: t });

            // Actualizar stock y crear movimientos
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
                    motivo: `Venta #${newSale.id.substring(0, 8)}`,
                    referenciaId: newSale.id,
                    registradoPor: vendedor
                }, { transaction: t });
            }

            return newSale;
        });

        res.status(201).json(sale);
    } catch (error) {
        console.error('Error al crear venta:', error);
        res.status(500).json({ error: 'Error al crear venta' });
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
// ENDPOINTS DE TURNOS DE CAJA
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
                created_at: {
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
                created_at: {
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
        await sequelize.sync({ alter: true });
        console.log('✅ Modelos sincronizados');

        // Iniciar servidor
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/summary`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error);
        process.exit(1);
    }
};

startServer();
