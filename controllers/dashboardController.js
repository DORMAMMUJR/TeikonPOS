import { Op } from 'sequelize';
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
                [Op.gte]: startOfDay
            };
        } else if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            whereSale.createdAt = {
                [Op.gte]: startOfMonth
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

        // 3. Obtener Configuración para Metas y Gastos Fijos (STRICT MODE - NO FALLBACKS)
        let dailyTarget = 0;
        let monthlyExpenses = 0;

        if (targetStoreId) {
            const config = await StoreConfig.findOne({ where: { storeId: targetStoreId } });

            if (config) {
                // Use strict values from DB, default to 0 if null
                // Note: database field might be 'breakEvenGoal' or 'monthly_expenses' depending on schema version
                // We use breakEvenGoal as the field for monthly fixed costs based on previous context
                monthlyExpenses = parseFloat(config.breakEvenGoal || 0);

                // If period is 'day', divide by 30. If 'month', use full value.
                if (period === 'day') {
                    dailyTarget = monthlyExpenses / 30;
                } else {
                    dailyTarget = monthlyExpenses;
                }
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
