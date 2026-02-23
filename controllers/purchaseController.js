import { PurchaseOrder, PurchaseOrderItem, InventoryItem, AccountPayable, StockMovement, Supplier, sequelize } from '../models.js';

// GET /api/purchases
export const getPurchases = async (req, res) => {
    try {
        const storeId = req.storeId;
        const purchases = await PurchaseOrder.findAll({
            where: { storeId },
            include: [
                { model: Supplier, as: 'supplier', attributes: ['nombre', 'rfc'] },
                { model: PurchaseOrderItem, as: 'items' }
            ],
            order: [['fechaEmision', 'DESC']]
        });
        res.json(purchases);
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: 'Error al obtener órdenes de compra' });
    }
};

// GET /api/purchases/:id
export const getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const purchase = await PurchaseOrder.findOne({
            where: { id, storeId },
            include: [
                { model: Supplier, as: 'supplier', attributes: ['nombre', 'rfc', 'diasCredito', 'email', 'telefono'] },
                { model: PurchaseOrderItem, as: 'items' }
            ]
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }
        res.json(purchase);
    } catch (error) {
        console.error('Error fetching purchase:', error);
        res.status(500).json({ error: 'Error al obtener orden de compra' });
    }
};

// POST /api/purchases
export const createPurchase = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const storeId = req.storeId;
        const { supplierId, fechaEsperada, items } = req.body;
        // items: [{ inventoryItemId, nombre, cantidad, precioUnitario, subtotal }]

        if (!supplierId || !items || !items.length) {
            return res.status(400).json({ error: 'Provee el supplierId y al menos un item.' });
        }

        let total = 0;
        const orderItemsData = items.map(item => {
            const itemSubtotal = parseFloat(item.cantidad) * parseFloat(item.precioUnitario);
            total += itemSubtotal;
            return {
                inventoryItemId: item.inventoryItemId, // Can be null if it's external expense but usually mapped to catalog
                nombre: item.nombre,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                subtotal: itemSubtotal
            };
        });

        const newPO = await PurchaseOrder.create({
            storeId,
            supplierId,
            fechaEsperada: fechaEsperada || null,
            subtotal: total,
            totalImpuestos: 0, // Simplified for now
            total: total,
            estado: 'PENDING',
            estadoPago: 'UNPAID'
        }, { transaction: t });

        // Create items
        for (const itemData of orderItemsData) {
            await PurchaseOrderItem.create({
                ...itemData,
                purchaseOrderId: newPO.id
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json(newPO);
    } catch (error) {
        await t.rollback();
        console.error('Error creating purchase order:', error);
        res.status(500).json({ error: 'Error al crear orden de compra' });
    }
};

// PUT /api/purchases/:id/receive
export const receivePurchase = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { createPayable, dueDate } = req.body; // If true, creates AccountPayable for credit

        const purchase = await PurchaseOrder.findOne({
            where: { id, storeId },
            include: [{ model: PurchaseOrderItem, as: 'items' }]
        });

        if (!purchase) {
            await t.rollback();
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }
        if (purchase.estado === 'COMPLETED') {
            await t.rollback();
            return res.status(400).json({ error: 'La orden ya fue recibida completamente' });
        }

        // 1. Afectar Inventario y Registar Kardex
        for (const item of purchase.items) {
            if (item.inventoryItemId) {
                const inventoryItem = await InventoryItem.findOne({
                    where: { id: item.inventoryItemId, storeId },
                    transaction: t
                });

                if (inventoryItem) {
                    const stockAnterior = inventoryItem.stock;
                    const nuevoStock = stockAnterior + item.cantidad;

                    // Update Stock
                    await inventoryItem.update({
                        stock: nuevoStock,
                        costPrice: item.precioUnitario // Update active cost price
                    }, { transaction: t });

                    // Register Stock Movement
                    await StockMovement.create({
                        storeId,
                        productId: inventoryItem.catalogProductId, // LEGACY/COMPATIBILITY: Since there's no `inventoryItemId` in StockMovement yet, we use product_id mapped to catalog
                        tipo: 'PURCHASE',
                        cantidad: item.cantidad,
                        stockAnterior,
                        stockNuevo: nuevoStock,
                        motivo: `Recepcion OC #${purchase.id.substring(0, 8)}`,
                        referenciaId: purchase.id,
                        registradoPor: req.username || 'System'
                    }, { transaction: t });
                }
            }
            // Update received qty
            await item.update({ cantidadRecibida: item.cantidad }, { transaction: t });
        }

        // 2. Mark Purchase as COMPLETED
        await purchase.update({ estado: 'COMPLETED' }, { transaction: t });

        // 3. Crear Cuenta por Pagar (CxP) si se solicitó crédito
        if (createPayable) {
            await AccountPayable.create({
                storeId,
                supplierId: purchase.supplierId,
                referenciaId: purchase.id,
                tipoReferencia: 'PURCHASE',
                montoTotal: purchase.total,
                saldoPendiente: purchase.total,
                fechaVencimiento: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                estado: 'PENDING'
            }, { transaction: t });
            // Payment state remains UNPAID, AccountPayable handles the debt tracking
        }

        await t.commit();
        res.json({ message: 'Mercancía recibida e inventario actualizado', purchase });
    } catch (error) {
        await t.rollback();
        console.error('Error receiving purchase:', error);
        res.status(500).json({ error: 'Error al recibir la orden de compra' });
    }
};
