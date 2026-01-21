import { Op } from 'sequelize';

import { Sale, SaleItem, Product, StoreConfig, Shift, StockMovement, sequelize } from '../models.js';

export const getCashCloseDetails = async (req, res) => {
    try {
        // SUPER_ADMIN override or fallback to user's store
        let storeId = req.storeId;
        if (req.user && req.user.role === 'SUPER_ADMIN' && req.query.storeId) {
            storeId = req.query.storeId;
        }

        if (!storeId) {
            return res.status(400).json({ success: false, message: 'Store ID required' });
        }

        // Find active shift
        const activeShift = await Shift.findOne({
            where: { storeId, status: 'OPEN' }
        });

        // If specific shift requested by URL (not implemented in query params of this controller yet, but good practice)
        // For now, rely on active shift or fallback to time-based if no shift (legacy) 

        const whereClause = {
            storeId,
            status: 'ACTIVE'
        };

        let shiftStart = new Date();
        shiftStart.setHours(0, 0, 0, 0);

        if (activeShift) {
            whereClause.shiftId = activeShift.id;
            shiftStart = activeShift.startTime;
        } else {
            // Fallback: Sales from today if no shift open? 
            // Or return 0? 
            // Better to show today's sales for "Daily Goal" context even if shift closed.
            const now = new Date();
            whereClause.createdAt = {
                [Op.gte]: shiftStart
            };
        }

        const now = new Date();

        // 1. Calculate Totals
        const salesTotal = await Sale.sum('total', { where: whereClause }) || 0;
        const profitTotal = await Sale.sum('netProfit', { where: whereClause }) || 0;
        const ordersCount = await Sale.count({ where: whereClause });

        // 2. Get Daily Goal (Strict Calculation from Monthly Expenses / 30)
        const config = await StoreConfig.findOne({ where: { storeId } });

        // Requirement: "strictly use the database-configured monthly_expenses value" (mapped to breakEvenGoal)
        // Requirement: "If monthly_expenses is 0 ... daily goal must also be 0"
        // Requirement: "Eliminate hardcoded default values"
        const monthlyExpenses = config ? parseFloat(config.breakEvenGoal || 0) : 0;
        const dailyGoal = monthlyExpenses > 0 ? (monthlyExpenses / 30) : 0;

        // 3. Calculate profit margin
        const profitMargin = salesTotal > 0 ? ((profitTotal / salesTotal) * 100) : 0;

        // 4. Respond with implicit session termination signal
        res.json({
            success: true,
            totalRevenue: parseFloat(salesTotal),
            totalProfit: parseFloat(profitTotal),
            totalSales: ordersCount,
            profitMargin: parseFloat(profitMargin.toFixed(2)),
            dailyGoal: parseFloat(dailyGoal),
            shiftDuration: Math.floor((now - shiftStart) / 1000 / 60), // minutes
            date: now,
            shouldLogout: true // Signal for frontend to invalidate session
        });

    } catch (error) {
        console.error("❌ Error en Corte de Caja:", error);
        res.status(500).json({
            success: false,
            message: "Error calculando corte",
            error: error.message
        });
    }
};

// ==========================================
// CANCELAR VENTA (VOID SALE)
// ==========================================
export const cancelSale = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { storeId, role } = req;

        console.log(`🔴 [Cancel Sale] Iniciando cancelación de venta ID: ${id}`);

        // 1. Buscar la venta
        const sale = await Sale.findOne({
            where: { id },
            include: [{
                model: SaleItem,
                as: 'SaleItems',
                attributes: ['id', 'productId', 'cantidad', 'precio', 'costo']
            }],
            transaction
        });

        if (!sale) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }

        // 2. Validar permisos (misma tienda o SUPER_ADMIN)
        if (role !== 'SUPER_ADMIN' && sale.storeId !== storeId) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para cancelar esta venta'
            });
        }

        // 3. Verificar que no esté ya cancelada
        if (sale.status === 'CANCELLED') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Esta venta ya fue cancelada previamente'
            });
        }

        // 4. Actualizar status de la venta
        sale.status = 'CANCELLED';
        await sale.save({ transaction });

        console.log(`✅ [Cancel Sale] Status actualizado a CANCELLED`);

        // 5. Restaurar stock y crear movimientos de kardex
        const saleItems = sale.SaleItems || [];

        for (const item of saleItems) {
            if (!item.productId) {
                console.warn(`⚠️ [Cancel Sale] Item sin productId, saltando: ${item.id}`);
                continue;
            }

            // Buscar el producto
            const product = await Product.findByPk(item.productId, { transaction });

            if (!product) {
                console.warn(`⚠️ [Cancel Sale] Producto no encontrado: ${item.productId}`);
                continue;
            }

            // Guardar stock anterior
            const stockAnterior = product.stock;
            const cantidad = parseInt(item.cantidad) || 0;

            // Restaurar stock
            product.stock = stockAnterior + cantidad;
            await product.save({ transaction });

            console.log(`📦 [Cancel Sale] Stock restaurado para ${product.nombre}: ${stockAnterior} → ${product.stock}`);

            // Crear movimiento de kardex
            await StockMovement.create({
                productId: product.id,
                storeId: sale.storeId,
                tipo: 'RETURN',
                cantidad: cantidad,
                stockAnterior: stockAnterior,
                stockNuevo: product.stock,
                motivo: `Cancelación de Venta #${sale.id}`,
                referenciaId: sale.id,
                registradoPor: req.usuario || req.user?.username || 'Sistema'
            }, { transaction });

            console.log(`📝 [Cancel Sale] Movimiento de kardex registrado para ${product.nombre}`);
        }

        await transaction.commit();

        console.log(`✅ [Cancel Sale] Venta ${id} cancelada exitosamente`);

        res.json({
            success: true,
            message: 'Venta cancelada exitosamente. El inventario ha sido restaurado.',
            sale: {
                id: sale.id,
                status: sale.status,
                total: sale.total,
                itemsRestored: saleItems.length
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ [Cancel Sale] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cancelar la venta',
            error: error.message
        });
    }
};

// 1. Sincronización Segura (Offline -> Online)
export const syncSales = async (req, res) => {
    const { sales, storeId } = req.body;

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'No hay datos de ventas.' });
    }

    const transaction = await sequelize.transaction();

    try {
        // A. Validar turno ABIERTO usando Sequelize (más seguro)
        const activeShift = await Shift.findOne({
            where: { storeId: storeId, status: 'OPEN' },
            transaction
        });

        if (!activeShift) {
            await transaction.rollback();
            return res.status(403).json({
                error: 'NO_OPEN_SHIFT',
                message: 'Caja cerrada. Abre un turno para sincronizar.'
            });
        }

        // B. Insertar ventas masivamente
        // Mapeamos los datos para asegurar que coincidan con el Modelo
        const salesToCreate = sales.map(sale => ({
            total: sale.total,
            subtotal: (sale.subtotal !== undefined && sale.subtotal !== null) ? sale.subtotal : sale.total, // <--- CORRECCIÓN DEFENSA: Asegura valor no nulo
            items: sale.items, // Sequelize lo convierte a JSON automáticamente
            paymentMethod: sale.paymentMethod,
            shiftId: activeShift.id,
            storeId: storeId,
            netProfit: sale.netProfit || 0,
            totalCost: sale.totalCost || 0,
            vendedor: sale.vendedor || 'Sistema',
            status: 'ACTIVE',
            createdAt: new Date(), // Sequelize mapea esto a la columna correcta ("createdAt")
            updatedAt: new Date()
        }));

        await Sale.bulkCreate(salesToCreate, { transaction });

        await transaction.commit();
        res.json({ success: true, message: 'Sincronización completada.' });

    } catch (error) {
        await transaction.rollback();
        console.error('Sync Error:', error);
        res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
    }
};

// 2. Creación de Venta Online (Normal)
export const createSale = async (req, res) => {
    const {
        total,
        subtotal, // <--- AGREGADO: Recibimos subtotal del frontend
        items,
        paymentMethod,
        storeId,
        netProfit,
        totalCost,
        vendedor
    } = req.body;

    try {
        // 1. Validar Turno (Usando Sequelize)
        const activeShift = await Shift.findOne({
            where: { storeId, status: 'OPEN' }
        });

        if (!activeShift) {
            return res.status(403).json({ error: 'NO_OPEN_SHIFT', message: 'Caja cerrada.' });
        }

        // 2. CREAR VENTA USANDO EL MODELO
        // ¡Aquí está la magia! No escribimos SQL.
        // Sequelize sabe automáticamente que 'createdAt' va a la columna "createdAt".
        const newSale = await Sale.create({
            total,
            subtotal: (subtotal !== undefined && subtotal !== null) ? subtotal : total, // <--- CORRECCIÓN DEFENSA: Asegura valor no nulo
            items, // Se guarda como JSON automáticamente
            paymentMethod,
            shiftId: activeShift.id,
            storeId,
            netProfit: netProfit || 0,
            totalCost: totalCost || 0,
            vendedor: vendedor || 'Sistema',
            status: 'ACTIVE'
            // createdAt y updatedAt se crean solos por defecto
        });

        // Devolvemos el objeto plano (JSON)
        res.json(newSale.toJSON());

    } catch (error) {
        console.error('Create Sale Error:', error);
        res.status(500).json({
            error: 'Error creating sale',
            details: error.message
        });
    }
};
