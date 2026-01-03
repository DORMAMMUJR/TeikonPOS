import { Op } from 'sequelize';
import { Sale, SaleItem, Product, StoreConfig } from '../models.js';

export const getCashCloseDetails = async (req, res) => {
    try {
        const storeId = req.storeId; // From authenticateToken middleware

        // Get shift start time from request (sent from frontend)
        const { shiftStartTime } = req.query;

        if (!shiftStartTime) {
            return res.status(400).json({
                success: false,
                message: 'Shift start time is required'
            });
        }

        const shiftStart = new Date(shiftStartTime);
        const now = new Date();

        // 1. Calculate Totals from shift start to now
        const salesTotal = await Sale.sum('total', {
            where: {
                storeId,
                status: 'ACTIVE',
                createdAt: { [Op.between]: [shiftStart, now] }
            }
        }) || 0;

        const profitTotal = await Sale.sum('netProfit', {
            where: {
                storeId,
                status: 'ACTIVE',
                createdAt: { [Op.between]: [shiftStart, now] }
            }
        }) || 0;

        const ordersCount = await Sale.count({
            where: {
                storeId,
                status: 'ACTIVE',
                createdAt: { [Op.between]: [shiftStart, now] }
            }
        });

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
