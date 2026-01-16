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
