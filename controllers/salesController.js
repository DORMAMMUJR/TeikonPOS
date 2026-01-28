import { sequelize, Sale, Shift, Product } from '../models.js';
import { Op } from 'sequelize';

// ==========================================
// HELPER: VALIDACIÓN DE STOCK (Pessimistic Locking)
// ==========================================
async function validateStockAvailability(items, transaction) {
    const insufficientStock = [];

    if (!items || !Array.isArray(items)) return [];

    for (const item of items) {
        const productId = item.id || item.productId;
        const requestedQty = Number(item.quantity) || Number(item.cantidad) || 1;

        if (!productId) continue;

        // Buscamos el producto y BLOQUEAMOS la fila para que nadie más la modifique
        // mientras dura esta transacción.
        const product = await Product.findByPk(productId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!product) {
            insufficientStock.push({
                productId,
                productName: 'Producto no encontrado',
                reason: 'PRODUCT_NOT_FOUND'
            });
            continue;
        }

        if (product.stock < requestedQty) {
            insufficientStock.push({
                productId: product.id,
                productName: product.nombre,
                sku: product.sku,
                requested: requestedQty,
                available: product.stock,
                reason: 'INSUFFICIENT_STOCK'
            });
        }
    }

    return insufficientStock;
}

// ==========================================
// 1. Sincronización Segura (Offline -> Online)
// ==========================================
export const syncSales = async (req, res) => {
    const { sales, storeId } = req.body;

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'No hay datos de ventas.' });
    }

    // Nota: No usamos una transacción global para todo el lote,
    // sino una por venta para permitir "Éxito Parcial".

    const results = {
        success: true,
        synced: 0,
        failed: 0,
        failedSales: []
    };

    try {
        // Verificar turno activo una sola vez
        const activeShift = await Shift.findOne({
            where: { storeId: storeId, status: 'OPEN' }
        });

        if (!activeShift) {
            return res.status(403).json({
                error: 'NO_OPEN_SHIFT',
                message: 'Caja cerrada. Abre un turno para sincronizar.'
            });
        }

        // Procesar venta por venta
        for (const sale of sales) {
            const saleTransaction = await sequelize.transaction();

            try {
                // 1. Validar Stock
                const stockErrors = await validateStockAvailability(sale.items, saleTransaction);

                if (stockErrors.length > 0) {
                    throw { status: 'INSUFFICIENT_STOCK', details: stockErrors };
                }

                // 2. Preparar Datos
                let finalTotal = Number(sale.total) || 0;
                let finalSubtotal = Number(sale.subtotal) || finalTotal;

                if (finalTotal === 0 && Array.isArray(sale.items)) {
                    finalTotal = sale.items.reduce((sum, item) => sum + (Number(item.subtotal) || Number(item.total) || 0), 0);
                    finalSubtotal = finalTotal;
                }

                // 3. Crear Venta
                await Sale.create({
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
                    createdAt: new Date(), // Usar fecha actual de sync o la original si se prefiere
                    updatedAt: new Date()
                }, { transaction: saleTransaction });

                // 4. Descontar Stock (Ya validado y bloqueado arriba)
                if (sale.items && Array.isArray(sale.items)) {
                    for (const item of sale.items) {
                        const productId = item.id || item.productId;
                        if (productId) {
                            const product = await Product.findByPk(productId, { transaction: saleTransaction });
                            if (product) {
                                await product.decrement('stock', { by: item.quantity || 1, transaction: saleTransaction });
                            }
                        }
                    }
                }

                await saleTransaction.commit();
                results.synced++;

            } catch (error) {
                await saleTransaction.rollback();
                results.failed++;

                // Loguear error específico
                results.failedSales.push({
                    saleId: sale.tempId || 'unknown',
                    reason: error.status || 'SYNC_ERROR',
                    details: error.details || error.message
                });
            }
        }

        res.json({
            success: true,
            synced: results.synced,
            failed: results.failed,
            message: `Sincronización completada: ${results.synced} exitosas, ${results.failed} fallidas.`,
            failedSales: results.failedSales
        });

    } catch (error) {
        console.error('Sync Error Global:', error);
        res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
    }
};

// ==========================================
// 2. Creación de Venta Online (Normal)
// ==========================================
export const createSale = async (req, res) => {
    const {
        total, subtotal, items, paymentMethod,
        storeId, netProfit, totalCost, vendedor
    } = req.body;

    const transaction = await sequelize.transaction();

    try {
        // 1. Validar Turno
        const activeShift = await Shift.findOne({
            where: { storeId, status: 'OPEN' },
            transaction
        });

        if (!activeShift) {
            await transaction.rollback();
            return res.status(403).json({ error: 'NO_OPEN_SHIFT', message: 'Caja cerrada.' });
        }

        // 2. VALIDACIÓN DE STOCK (NUEVO)
        // Esto bloqueará las filas de los productos hasta que termine la transacción
        const stockErrors = await validateStockAvailability(items, transaction);

        if (stockErrors.length > 0) {
            await transaction.rollback();
            return res.status(409).json({ // 409 Conflict
                error: 'INSUFFICIENT_STOCK',
                message: 'Stock insuficiente para completar la venta',
                details: stockErrors
            });
        }

        // 3. Preparar Totales
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

        // 4. Crear Venta
        const newSale = await Sale.create({
            total: finalTotal || 0,
            subtotal: finalSubtotal || 0,
            items,
            paymentMethod,
            shiftId: activeShift.id,
            storeId,
            netProfit: netProfit || 0,
            totalCost: totalCost || 0,
            vendedor: vendedor || 'Sistema',
            status: 'ACTIVE'
        }, { transaction });

        // 5. Descontar Stock
        // Como ya tenemos el lock desde validateStockAvailability, es seguro descontar aquí
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const productId = item.id || item.productId;
                if (productId) {
                    const product = await Product.findByPk(productId, { transaction });
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

// ==========================================
// 3. Obtener Detalles de Corte de Caja
// ==========================================
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
            whereClause.createdAt = { [Op.gte]: shiftStart };
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

// ==========================================
// 4. Cancelar Venta
// ==========================================
export const cancelSale = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { storeId, role } = req;

        const sale = await Sale.findOne({
            where: { id },
            include: [{ model: Sale.associations.items?.target || Sale, as: 'items' }],
            transaction
        });

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

        // Restaurar Stock
        const saleItems = sale.items || [];
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
