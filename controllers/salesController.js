import { sequelize, Sale, Shift, Product, StockMovement } from '../models.js';
import { Op } from 'sequelize';

// ==========================================
// HELPER: FETCH + VALIDATE + PRICE (Zero Trust, Single Query per Item)
// ==========================================
/**
 * Para cada item del carrito:
 *   1. Hace UN SOLO findByPk con LOCK.UPDATE (pesimista).
 *   2. Valida stock suficiente.
 *   3. Extrae precio (salePrice) y costo (costPrice) REALES de la BD.
 *      IGNORA cualquier precio que venga del body del request.
 *
 * Retorna:
 *   {
 *     errors: [],         // Productos con problema (venta se aborta si length > 0)
 *     verifiedItems: [],  // Items con precios reales y cantidades validadas
 *   }
 */
async function validateAndFetchProducts(items, transaction) {
    const errors = [];
    const verifiedItems = [];

    if (!items || !Array.isArray(items)) {
        return { errors: [{ reason: 'INVALID_ITEMS', message: 'La lista de items es inválida.' }], verifiedItems: [] };
    }

    for (const item of items) {
        const productId = item.id || item.productId;
        const qty = Number(item.quantity) || Number(item.cantidad) || 1;

        if (!productId) {
            errors.push({ reason: 'MISSING_PRODUCT_ID', message: 'Un item no tiene productId.' });
            continue;
        }

        // ─ UN SOLO QUERY POR PRODUCTO, con lock pesimista ─
        const product = await Product.findByPk(productId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!product) {
            errors.push({ productId, reason: 'PRODUCT_NOT_FOUND', productName: 'Desconocido' });
            continue;
        }

        if (product.stock < qty) {
            errors.push({
                productId: product.id,
                productName: product.nombre,
                sku:        product.sku,
                requested:  qty,
                available:  product.stock,
                reason:     'INSUFFICIENT_STOCK'
            });
            continue;
        }

        // ─ PRECIOS REALES DE LA BD — el frontend no tiene voz aquí ─
        const realSalePrice = Number(product.salePrice);
        const realCostPrice = Number(product.costPrice) || 0;

        verifiedItems.push({
            product,           // Instancia Sequelize (para decrement)
            productId:  product.id,
            productName: product.nombre,
            sku:        product.sku,
            quantity:   qty,
            unitPrice:  realSalePrice,
            unitCost:   realCostPrice,
            subtotal:   realSalePrice * qty,
            profit:     (realSalePrice - realCostPrice) * qty,
        });
    }

    return { errors, verifiedItems };
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
                const createdSale = await Sale.create({
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

                // 4. Descontar Stock y Registrar Movimiento (Ya validado y bloqueado arriba)
                if (sale.items && Array.isArray(sale.items)) {
                    for (const item of sale.items) {
                        const productId = item.id || item.productId;
                        if (productId) {
                            const product = await Product.findByPk(productId, { transaction: saleTransaction });
                            if (product) {
                                const qtyToSubtract = item.quantity || 1;
                                const stockAnterior = product.stock;
                                const stockNuevo = stockAnterior - qtyToSubtract;

                                await product.decrement('stock', { by: qtyToSubtract, transaction: saleTransaction });

                                await StockMovement.create({
                                    productId: product.id,
                                    storeId: storeId,
                                    type: 'OUT',
                                    reason: 'SALE',
                                    quantity: qtyToSubtract,
                                    previousStock: stockAnterior,
                                    newStock: stockNuevo,
                                    notes: `Venta Sincronizada #${createdSale.id.substring(0, 8)}`,
                                    referenceId: createdSale.id,
                                    createdBy: null // Offline sales usually don't have user ID in the sync payload easily mapped to UUID here
                                }, { transaction: saleTransaction });
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
// 2. Creación de Venta Online (Blindada)
// ==========================================
export const createSale = async (req, res) => {
    const {
        items, paymentMethod,
        storeId, vendedor,
        clientId, saleType, deliveryDate, shippingAddress, ecommerceOrderId, status,
        transactionId  // 🔑 Clave de idempotencia generada en el frontend
        // 🚫 IGNORADOS intencionalmente: total, subtotal, netProfit, totalCost
        //    y cualquier precio por item. Los precios reales vienen de la BD.
    } = req.body;

    const transaction = await sequelize.transaction();

    try {
        // ── REGLA 3: IDEMPOTENCIA ──────────────────────────────────────────────────
        // Si ya existe una venta con este transactionId, la devolvemos tal cual.
        // El frontend puede reintentar con seguridad: nunca habrá dos cobros.
        if (transactionId) {
            const existing = await Sale.findOne({ where: { transactionId } });
            if (existing) {
                await transaction.rollback();
                console.log(`♻️  Idempotent hit: transactionId=${transactionId}`);
                return res.status(200).json({
                    ...existing.toJSON(),
                    idempotent: true
                });
            }
        }

        // ── 1. Validar Turno ───────────────────────────────────────────────────────
        const activeShift = await Shift.findOne({
            where: { storeId, status: 'OPEN' },
            transaction
        });

        if (!activeShift) {
            await transaction.rollback();
            return res.status(403).json({ error: 'NO_OPEN_SHIFT', message: 'Caja cerrada.' });
        }

        // ── REGLA 1+2: FETCH REAL + ZERO TRUST ────────────────────────────────────
        // Una sola llamada por item. Valida stock Y extrae precios reales de la BD.
        // Los valores total/subtotal/netProfit del req.body son descartados.
        const { errors: stockErrors, verifiedItems } = await validateAndFetchProducts(items, transaction);

        if (stockErrors.length > 0) {
            await transaction.rollback();
            return res.status(409).json({
                error: 'INSUFFICIENT_STOCK',
                message: 'Stock insuficiente o producto no encontrado',
                details: stockErrors
            });
        }

        // ── RECALCULAR TOTALES 100% DESDE LA BD ───────────────────────────────────
        const computedSubtotal  = verifiedItems.reduce((s, i) => s + i.subtotal, 0);
        const computedTotalCost = verifiedItems.reduce((s, i) => s + (i.unitCost * i.quantity), 0);
        const computedNetProfit = verifiedItems.reduce((s, i) => s + i.profit, 0);
        // Aquí puedes agregar lógica de impuestos/descuentos cuando sea necesario
        const computedTotal     = computedSubtotal;

        // ── CONSTRUIR SNAPSHOT DE ITEMS (guardado en JSONB) ───────────────────────
        const saleItemsSnapshot = verifiedItems.map(i => ({
            productId:  i.productId,
            productName: i.productName,
            sku:        i.sku,
            quantity:   i.quantity,
            unitPrice:  i.unitPrice,   // Precio REAL de BD
            unitCost:   i.unitCost,    // Costo REAL de BD
            discount:   0,
            subtotal:   i.subtotal
        }));

        // ── 4. Crear Venta ─────────────────────────────────────────────────────────
        const newSale = await Sale.create({
            total:            computedTotal,
            subtotal:         computedSubtotal,
            items:            saleItemsSnapshot,
            paymentMethod,
            shiftId:          activeShift.id,
            storeId,
            netProfit:        computedNetProfit,
            totalCost:        computedTotalCost,
            vendedor:         vendedor || req.user?.username || 'Sistema',
            status:           status || 'ACTIVE',
            clientId:         clientId || null,
            saleType:         saleType || 'RETAIL',
            deliveryDate:     deliveryDate || null,
            shippingAddress:  shippingAddress || null,
            ecommerceOrderId: ecommerceOrderId || null,
            transactionId:    transactionId || null
        }, { transaction });

        // ── 5. Descontar Stock + Kardex (ya validado y bloqueado arriba) ───────────
        for (const item of verifiedItems) {
            const { product, quantity } = item;
            const stockAnterior = product.stock;
            const stockNuevo    = stockAnterior - quantity;

            await product.decrement('stock', { by: quantity, transaction });

            await StockMovement.create({
                productId:     product.id,
                storeId,
                type:          'OUT',
                reason:        'SALE',
                quantity,
                previousStock: stockAnterior,
                newStock:      stockNuevo,
                notes:         `Venta #${newSale.id.substring(0, 8)}`,
                referenceId:   newSale.id,
                createdBy:     req.user?.id || null
            }, { transaction });
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

        // Restaurar Stock y Registrar Movimiento
        const saleItems = sale.items || [];
        if (Array.isArray(saleItems)) {
            for (const item of saleItems) {
                if (item.id || item.productId) {
                    const prodId = item.id || item.productId;
                    const product = await Product.findByPk(prodId, { transaction });
                    if (product) {
                        const qty = Number(item.quantity) || Number(item.cantidad) || 0;
                        const stockAnterior = product.stock;
                        const stockNuevo = stockAnterior + qty;

                        await product.increment('stock', { by: qty, transaction });

                        await StockMovement.create({
                            productId: product.id,
                            storeId: storeId,
                            type: 'IN',
                            reason: 'RETURN',
                            quantity: qty,
                            previousStock: stockAnterior,
                            newStock: stockNuevo,
                            notes: `Cancelación Venta #${sale.id.substring(0, 8)}`,
                            referenceId: sale.id,
                            createdBy: req.user?.id || null
                        }, { transaction });
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

// ==========================================
// 5. Actualizar Estado de Venta
// ==========================================
export const updateSaleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { storeId, role } = req;

        const sale = await Sale.findByPk(id);

        if (!sale) {
            return res.status(404).json({ success: false, message: 'Venta no encontrada' });
        }

        if (role !== 'SUPER_ADMIN' && sale.storeId !== storeId) {
            return res.status(403).json({ success: false, message: 'No tienes permiso' });
        }

        const validStatuses = ['ACTIVE', 'CANCELLED', 'PENDING_SYNC', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado inválido' });
        }

        sale.status = status;
        await sale.save();

        res.json({ success: true, message: `Estado actualizado a ${status}`, sale });
    } catch (error) {
        console.error('❌ Error updating sale status:', error);
        res.status(500).json({ success: false, message: 'Error actualizando estado', error: error.message });
    }
};
