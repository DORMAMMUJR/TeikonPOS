import { Op } from 'sequelize';
import { Sale, Product, StoreConfig, GoalHistory, sequelize } from '../models.js';

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

        // --- 4. Get Monthly Goal (Historical or Current) ---
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYear = now.getFullYear();

        // Try to get historical goal for current month
        const goalRecord = await GoalHistory.findOne({
            where: {
                storeId,
                month: currentMonth,
                year: currentYear
            }
        });

        // Fallback to current config if no historical goal exists
        let monthlyOperationalCost = 0;
        if (goalRecord) {
            monthlyOperationalCost = parseFloat(goalRecord.amount || 0);
            console.log(`📊 Using historical goal for ${currentMonth}/${currentYear}: $${monthlyOperationalCost}`);
        } else {
            const config = await StoreConfig.findOne({ where: { storeId } });
            monthlyOperationalCost = config ? parseFloat(config.breakEvenGoal || 0) : 0;
            console.log(`📊 No historical goal found, using current config: $${monthlyOperationalCost}`);
        }

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
            dailyOperationalCost,
            monthlyGoal: monthlyOperationalCost, // Added for frontend reference
            goalMonth: currentMonth,
            goalYear: currentYear
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: 'Error calculating dashboard metrics' });
    }
};
