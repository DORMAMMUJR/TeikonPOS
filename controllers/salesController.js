import { Op } from 'sequelize';
import { Sale, SaleItem, Product, StoreConfig, Shift } from '../models.js';

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
