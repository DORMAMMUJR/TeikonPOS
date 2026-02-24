import { StockMovement, Product, User, Store } from '../models.js';
import { Op } from 'sequelize';

// ==========================================
// 1. Obtener Historial de Movimientos de Inventario
// ==========================================
export const getInventoryMovements = async (req, res) => {
    try {
        const { storeId: queryStoreId, productId, type, startDate, endDate, page = 1, limit = 50 } = req.query;

        const whereClause = {};

        // Seguridad Multi-Tenant
        if (req.role === 'SUPER_ADMIN' && queryStoreId) {
            whereClause.storeId = queryStoreId;
        } else if (req.role !== 'SUPER_ADMIN') {
            whereClause.storeId = req.storeId;
        }

        if (productId) {
            whereClause.productId = productId;
        }

        if (type) {
            whereClause.type = type;
        }

        if (startDate && endDate) {
            whereClause.created_at = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await StockMovement.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'sku', 'nombre']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            data: rows,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit))
        });

    } catch (error) {
        console.error('Error al obtener movimientos de inventario:', error);
        res.status(500).json({ success: false, message: 'Error al obtener movimientos log de inventario.', error: error.message });
    }
};

// ==========================================
// 2. Registrar Movimiento Manual (Ajuste, Merma, etc.)
// ==========================================
export const createInventoryMovement = async (req, res) => {
    try {
        const { productId, type, reason, quantity, notes } = req.body;

        let targetStoreId = req.storeId;
        if (req.role === 'SUPER_ADMIN' && req.body.storeId) {
            targetStoreId = req.body.storeId;
        }

        // Validate basic fields
        if (!productId || !type || !reason || !quantity) {
            return res.status(400).json({ success: false, message: 'Faltan campos requeridos (productId, type, reason, quantity).' });
        }

        const validTypes = ['IN', 'OUT', 'ADJUST']; // Types front-end sends or custom pseudo-types
        // Mapear tipos del front-end a los permitidos por StockMovement
        let finalTipo = 'ADJUSTMENT';
        if (reason === 'SHRINKAGE') finalTipo = 'SHRINKAGE';
        else if (reason === 'THEFT') finalTipo = 'THEFT';
        else if (reason === 'ADMIN_CORRECTION') finalTipo = 'ADMIN_CORRECTION';
        else if (type === 'IN') finalTipo = 'PURCHASE';
        else if (type === 'OUT') finalTipo = 'ADJUSTMENT';

        const product = await Product.findOne({
            where: { id: productId, storeId: targetStoreId }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        }

        const parsedQuantity = Math.abs(Number(quantity));
        const stockAnterior = product.stock;
        let stockNuevo = stockAnterior;

        if (type === 'IN') {
            stockNuevo = stockAnterior + parsedQuantity;
        } else if (type === 'OUT') {
            stockNuevo = stockAnterior - parsedQuantity;
        } else { // ADJUST (quantity can be the final desired stock, or delta, usually we process it as delta or setting directly. Let's assume SET stock for ADJUST)
            // If 'ADJUST' and reason='ADMIN_CORRECTION' with quantity as newStock:
            // Depende de cómo el frontend lo envía. Asumiremos que es un delta. 
            // Si el frontend envía delta negativo, parseQuantity es abs, necesitamos saber. 
            // Mejor: type 'IN' -> sumar. type 'OUT' -> restar.
            if (quantity < 0) {
                stockNuevo = stockAnterior - parsedQuantity;
            } else {
                stockNuevo = stockAnterior + parsedQuantity;
            }
        }

        // Update product stock
        await product.update({ stock: stockNuevo });

        // Record trace
        const movement = await StockMovement.create({
            productId: product.id,
            storeId: targetStoreId,
            type: type === 'IN' ? 'IN' : (type === 'OUT' ? 'OUT' : 'ADJUST'),
            reason: reason, // Must be one of the enum values: 'SALE', 'RETURN', 'PURCHASE', 'SHRINKAGE', 'THEFT', 'ADMIN_CORRECTION', 'INITIAL_STOCK'
            quantity: type === 'OUT' || (type === 'ADJUST' && quantity < 0) ? -parsedQuantity : parsedQuantity,
            previousStock: stockAnterior,
            newStock: stockNuevo,
            notes: notes,
            createdBy: req.user?.id || null
        });

        res.json({ success: true, message: 'Inventario ajustado correctamente.', data: movement, newStock: stockNuevo });

    } catch (error) {
        console.error('Error al ajustar inventario:', error);
        res.status(500).json({ success: false, message: 'Error interno al ajustar inventario.', error: error.message });
    }
};
