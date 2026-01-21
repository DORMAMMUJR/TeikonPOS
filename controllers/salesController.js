import { sequelize, Sale, Shift, Product } from '../models.js';

// 1. Sincronización Segura (Offline -> Online)
export const syncSales = async (req, res) => {
    const { sales, storeId } = req.body;

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'No hay datos de ventas.' });
    }

    const transaction = await sequelize.transaction();

    try {
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

        const salesToCreate = sales.map(sale => {
            let finalTotal = Number(sale.total) || 0;
            let finalSubtotal = Number(sale.subtotal) || finalTotal;

            if (finalTotal === 0 && Array.isArray(sale.items)) {
                finalTotal = sale.items.reduce((sum, item) => sum + (Number(item.subtotal) || Number(item.total) || 0), 0);
                finalSubtotal = finalTotal;
            }

            return {
                total: finalTotal,
                subtotal: finalSubtotal,
                items: sale.items,
                paymentMethod: sale.paymentMethod,
                shiftId: activeShift.id,
                storeId: storeId,
                netProfit: sale.netProfit || 0,
                totalCost: sale.totalCost || 0,
                vendedor: sale.vendedor || 'Sistema',
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date()
            };
        });

        await Sale.bulkCreate(salesToCreate, { transaction });

        // LOGICA DE DESCUENTO DE INVENTARIO (SYNC)
        for (const sale of sales) {
            if (sale.items && Array.isArray(sale.items)) {
                for (const item of sale.items) {
                    if (item.id) {
                        const product = await Product.findByPk(item.id, { transaction });
                        if (product) {
                            await product.decrement('stock', { by: item.quantity || 1, transaction });
                        }
                    }
                }
            }
        }

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
        total, subtotal, items, paymentMethod,
        storeId, netProfit, totalCost, vendedor
    } = req.body;

    const transaction = await sequelize.transaction();

    try {
        const activeShift = await Shift.findOne({
            where: { storeId, status: 'OPEN' },
            transaction
        });

        if (!activeShift) {
            await transaction.rollback();
            return res.status(403).json({ error: 'NO_OPEN_SHIFT', message: 'Caja cerrada.' });
        }

        let finalTotal = Number(total);
        let finalSubtotal = Number(subtotal);

        if (!finalTotal || finalTotal === 0) {
            if (items && Array.isArray(items)) {
                finalTotal = items.reduce((sum, item) => {
                    const itemAmount = Number(item.subtotal) || Number(item.total) || (Number(item.price || item.precio) * Number(item.quantity || item.cantidad)) || 0;
                    return sum + itemAmount;
                }, 0);
                finalSubtotal = finalTotal;
            }
        }
        if (!finalSubtotal) finalSubtotal = finalTotal;
        finalTotal = finalTotal || 0;
        finalSubtotal = finalSubtotal || 0;

        const newSale = await Sale.create({
            total: finalTotal,
            subtotal: finalSubtotal,
            items,
            paymentMethod,
            shiftId: activeShift.id,
            storeId,
            netProfit: netProfit || 0,
            totalCost: totalCost || 0,
            vendedor: vendedor || 'Sistema',
            status: 'ACTIVE'
        }, { transaction });

        // LOGICA DE DESCUENTO DE INVENTARIO (ONLINE)
        if (items && Array.isArray(items)) {
            for (const item of items) {
                if (item.id) {
                    const product = await Product.findByPk(item.id, { transaction });
                    if (product) {
                        const qtyToSubtract = Number(item.quantity) || Number(item.cantidad) || 1;
                        await product.decrement('stock', { by: qtyToSubtract, transaction });
                    }
                }
            }
        }

        await transaction.commit();
        res.json(newSale.toJSON());

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error creating sale:', error);
        res.status(500).json({ error: 'Error creating sale', details: error.message });
    }
};

// 3. Obtener Detalles de Corte de Caja
export const getCashCloseDetails = async (req, res) => {
    try {
        let storeId = req.storeId;
        if (req.user && req.user.role === 'SUPER_ADMIN' && req.query.storeId) {
            storeId = req.query.storeId;
        }

        if (!storeId) {
            return res.status(400).json({ success: false, message: 'Store ID required' });
        }

        const activeShift = await Shift.findOne({
            where: { storeId, status: 'OPEN' }
        });

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
            const now = new Date();
            // Default to today if no shift
            whereClause.createdAt = { [sequelize.Op.gte]: shiftStart };
        }

        const now = new Date();

        const salesTotal = await Sale.sum('total', { where: whereClause }) || 0;
        const profitTotal = await Sale.sum('netProfit', { where: whereClause }) || 0;
        const ordersCount = await Sale.count({ where: whereClause });

        // Calculate profit margin
        const profitMargin = salesTotal > 0 ? ((profitTotal / salesTotal) * 100) : 0;

        res.json({
            success: true,
            totalRevenue: parseFloat(salesTotal),
            totalProfit: parseFloat(profitTotal),
            totalSales: ordersCount,
            profitMargin: parseFloat(profitMargin.toFixed(2)),
            shiftDuration: Math.floor((now - shiftStart) / 1000 / 60),
            date: now,
            shouldLogout: true
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

// 4. Cancelar Venta
export const cancelSale = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { storeId, role } = req;

        const sale = await Sale.findOne({
            where: { id },
            include: [{ model: Sale.associations.items?.target || Sale, as: 'items' }], // Fallback if association name varies
            transaction
        });

        // Note: Use raw query or parsed JSON items if strict association doesn't exist yet
        // For now, assuming items are stored in JSONB column 'items' as per previous context

        if (!sale) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Venta no encontrada' });
        }

        if (role !== 'SUPER_ADMIN' && sale.storeId !== storeId) {
            await transaction.rollback();
            return res.status(403).json({ success: false, message: 'No tienes permiso' });
        }

        if (sale.status === 'CANCELLED') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Venta ya cancelada' });
        }

        sale.status = 'CANCELLED';
        await sale.save({ transaction });

        // Restore Stock
        const saleItems = sale.items || []; // JSON field
        if (Array.isArray(saleItems)) {
            for (const item of saleItems) {
                if (item.id || item.productId) {
                    const prodId = item.id || item.productId;
                    const product = await Product.findByPk(prodId, { transaction });
                    if (product) {
                        const qty = Number(item.quantity) || Number(item.cantidad) || 0;
                        await product.increment('stock', { by: qty, transaction });
                    }
                }
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Venta cancelada y stock restaurado.' });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Cancel Sale Error:', error);
        res.status(500).json({ success: false, message: 'Error cancelando venta', error: error.message });
    }
};
