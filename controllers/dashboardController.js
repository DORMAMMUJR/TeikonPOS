import { sequelize, Sale, Product, StoreConfig } from '../models.js';

export const getDashboardSummary = async (req, res) => {
    try {
        const { period = 'day', storeId } = req.query;
        const whereSale = { status: 'ACTIVE' };

        // Aislamiento de tiendas
        // Si se pasa storeId explícitamente (ej. Super Admin filtrando), usarlo.
        // Si no, y no es Super Admin, usar req.storeId del token.
        // Nota: req.storeId viene del middleware authenticateToken.

        let targetStoreId = storeId;
        if (req.role !== 'SUPER_ADMIN') {
            targetStoreId = req.storeId;
        }

        if (targetStoreId) {
            whereSale.storeId = targetStoreId;
        }

        // Filtro de Fecha
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (period === 'day') {
            whereSale.createdAt = {
                [sequelize.Sequelize.Op.gte]: startOfDay
            };
        } else if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            whereSale.createdAt = {
                [sequelize.Sequelize.Op.gte]: startOfMonth
            };
        }

        // 1. Calcular Ventas y Utilidad Bruta
        const salesStats = await Sale.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'totalSales'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('net_profit')), 'grossProfit']
            ],
            where: whereSale,
            raw: true
        });

        const salesToday = parseFloat(salesStats[0].totalSales || 0);
        const ordersCount = parseInt(salesStats[0].count || 0);
        const grossProfit = parseFloat(salesStats[0].grossProfit || 0);

        // 2. Calcular Valor de Inventario (Solo productos activos)
        const whereProduct = { activo: true };
        if (targetStoreId) {
            whereProduct.storeId = targetStoreId;
        }

        // Calcular inversión: SUM(costPrice * stock)
        const inventoryStats = await Product.findAll({
            attributes: [
                [sequelize.literal('SUM("cost_price" * "stock")'), 'investment']
            ],
            where: whereProduct,
            raw: true
        });

        const investment = parseFloat(inventoryStats[0].investment || 0);

        // 3. Obtener Configuración para Metas y Gastos Fijos
        let dailyTarget = 0;
        if (targetStoreId) {
            const config = await StoreConfig.findOne({ where: { storeId: targetStoreId } });
            if (config && config.breakEvenGoal) {
                // Asumimos que la meta es mensual, dividimos por 30 para diario
                dailyTarget = parseFloat(config.breakEvenGoal) / 30;
            }
        }

        // 4. Calcular Utilidad Neta (Utilidad Bruta - Gastos Operativos Diarios)
        const netProfit = grossProfit - dailyTarget;

        res.json({
            salesToday,
            ordersCount,
            grossProfit,
            investment,
            netProfit,
            dailyTarget,
            dailyOperationalCost: dailyTarget, // Map dailyTarget to dailyOperationalCost for frontend compatibility
            period
        });

    } catch (error) {
        console.error('Error en dashboard summary:', error);
        res.status(500).json({ error: 'Error al obtener resumen del dashboard' });
    }
};
