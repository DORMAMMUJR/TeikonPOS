import { Op } from 'sequelize';
import { Sale, SaleItem, Product, StoreConfig } from '../models.js';

export const getCashCloseDetails = async (req, res) => {
    try {
        const { storeId } = req.query; // O req.user.storeId

        // Rango de tiempo: Hoy (00:00 a 23:59)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Calcular Totales
        const salesTotal = await Sale.sum('total', {
            where: {
                storeId,
                createdAt: { [Op.between]: [startOfDay, endOfDay] }
            }
        }) || 0;

        const ordersCount = await Sale.count({
            where: {
                storeId,
                createdAt: { [Op.between]: [startOfDay, endOfDay] }
            }
        });

        // 2. Obtener Meta del Día
        const config = await StoreConfig.findOne({ where: { storeId } });
        const dailyGoal = config ? parseFloat(config.dailyGoal || config.breakEvenGoal) : 10000; // Fallback to breakEvenGoal if dailyGoal missing

        // 3. Responder
        res.json({
            success: true,
            salesTotal,
            ordersCount,
            dailyGoal,
            date: new Date()
        });

    } catch (error) {
        console.error("❌ Error en Corte de Caja:", error);
        res.status(500).json({ message: "Error calculando corte", error: error.message });
    }
};
