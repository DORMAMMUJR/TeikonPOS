import { Op } from 'sequelize';
import { Sale, Product, StoreConfig, sequelize } from '../models.js';

export const getDashboardSummary = async (req, res) => {
    try {
        const { storeId } = req; // Extracted from authenticateToken middleware

        // --- 1. Define Time Range (Today) ---
        // Using server time. For widespread usage, timezone handling should be improved.
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // --- 2. Aggregate Sales Data (Today) ---
        // We calculate metrics based on sales created today
        const salesMetrics = await Sale.findAll({
            where: {
                storeId,
                status: 'ACTIVE', // Only active sales
                createdAt: {
                    [Op.gte]: startOfDay,
                    [Op.lte]: endOfDay
                }
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'ordersCount'],
                [sequelize.fn('SUM', sequelize.col('total')), 'salesToday'],
                [sequelize.fn('SUM', sequelize.col('net_profit')), 'grossProfit'] // netProfit in DB is actually Gross Profit (Rev - Cost) per sale
            ],
            raw: true
        });

        const metrics = salesMetrics[0] || {};
        const ordersCount = parseInt(metrics.ordersCount || 0);
        const salesToday = parseFloat(metrics.salesToday || 0);
        const grossProfit = parseFloat(metrics.grossProfit || 0);

        // --- 3. Calculate Total Investment (Inventory Value) ---
        // Sum of (costPrice * stock) for all active products
        const productsInvestment = await Product.findAll({
            where: {
                storeId,
                activo: true
            },
            attributes: [
                [sequelize.literal('SUM("cost_price" * "stock")'), 'totalInvestment']
            ],
            raw: true
        });

        const investment = parseFloat(productsInvestment[0]?.totalInvestment || 0);

        // --- 4. Get Store Configuration (Operational Costs) ---
        const config = await StoreConfig.findOne({ where: { storeId } });
        const monthlyOperationalCost = config ? parseFloat(config.breakEvenGoal || 0) : 0;

        // Calculate Daily Operational Cost portion
        const dailyOperationalCost = monthlyOperationalCost / 30;

        // --- 5. Calculate Net Profit ---
        // Net Profit = Gross Profit (from sales) - Daily Operational Cost
        const netProfit = grossProfit - dailyOperationalCost;

        // --- 6. Construct Response ---
        // dailyTarget: Usually the Break Even Goal is the monthly target, 
        // so daily target is that / 30.
        const dailyTarget = monthlyOperationalCost / 30;

        res.json({
            salesToday,
            ordersCount,
            grossProfit,
            netProfit,
            investment,
            dailyTarget,
            dailyOperationalCost
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: 'Error calculating dashboard metrics' });
    }
};
