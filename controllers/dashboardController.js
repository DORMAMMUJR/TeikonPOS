import { Op } from 'sequelize';
import { Sale, Product, StoreConfig, GoalHistory, Shift, sequelize } from '../models.js';

// ==========================================
// DASHBOARD SUMMARY (CORREGIDO - LÓGICA DE FECHA REAL)
// ==========================================
export const getDashboardSummary = async (req, res) => {
    try {
        const { storeId } = req; // Extracted from authenticateToken middleware

        // 1. Calcular rangos de tiempo EXACTOS para "HOY"
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`📊 [Dashboard] Calculando métricas para HOY: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

        // 2. Obtener Costo Operativo Diario (Meta mensual / 30 días)
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
        let monthlyGoal = 0;
        if (goalRecord) {
            monthlyGoal = parseFloat(goalRecord.amount || 0);
            console.log(`📊 Using historical goal for ${currentMonth}/${currentYear}: $${monthlyGoal}`);
        } else {
            const config = await StoreConfig.findOne({ where: { storeId } });
            monthlyGoal = config ? parseFloat(config.breakEvenGoal || 0) : 0;
            console.log(`📊 No historical goal found, using current config: $${monthlyGoal}`);
        }

        const costoOperativoDiario = monthlyGoal / 30; // Este es el "333"

        // 3. Buscar ventas SOLO de hoy (ignorando si el turno es viejo)
        const ventasHoy = await Sale.findAll({
            where: {
                storeId: storeId,
                status: 'ACTIVE',
                createdAt: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        });

        let ventaTotalHoy = 0;
        let utilidadBrutaHoy = 0;
        let ordersCount = ventasHoy.length;

        // 4. Sumar totales
        for (const venta of ventasHoy) {
            const totalVenta = parseFloat(venta.total || 0);
            ventaTotalHoy += totalVenta;

            // Si la venta guardó su ganancia (netProfit), la usamos
            const utilidadVenta = parseFloat(venta.netProfit || 0);
            utilidadBrutaHoy += utilidadVenta;
        }

        console.log(`📊 Ventas HOY: ${ordersCount} órdenes, Total: $${ventaTotalHoy.toFixed(2)}, Utilidad Bruta: $${utilidadBrutaHoy.toFixed(2)}`);

        // 5. Calcular Utilidad Neta Real (Lo que ganaste hoy - Tu costo de existir hoy)
        const utilidadNetaHoy = utilidadBrutaHoy - costoOperativoDiario;

        // 6. Calcular Porcentaje de la Barra
        let porcentajeEquilibrio = 0;
        if (costoOperativoDiario > 0) {
            // Ejemplo: Si necesitas $333 para salir tablas y llevas $150 de ganancia, llevas 45%
            porcentajeEquilibrio = (utilidadBrutaHoy / costoOperativoDiario) * 100;
        }

        // 7. Calculate Total Investment (Inventory Value)
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

        // 8. Enviar datos limpios al frontend
        res.json({
            // Nombres compatibles con el frontend actual
            salesToday: Number(ventaTotalHoy.toFixed(2)),
            ordersCount: ordersCount,
            grossProfit: Number(utilidadBrutaHoy.toFixed(2)),
            netProfit: Number(utilidadNetaHoy.toFixed(2)),
            investment: Number(investment.toFixed(2)),
            dailyTarget: Number(costoOperativoDiario.toFixed(2)),
            dailyOperationalCost: Number(costoOperativoDiario.toFixed(2)),
            monthlyGoal: Number(monthlyGoal.toFixed(2)),
            goalMonth: currentMonth,
            goalYear: currentYear,
            // Campos adicionales para compatibilidad
            costoOperativo: Number(costoOperativoDiario.toFixed(2)),
            ventaTotal: Number(ventaTotalHoy.toFixed(2)),
            utilidadBruta: Number(utilidadBrutaHoy.toFixed(2)),
            utilidadNeta: Number(utilidadNetaHoy.toFixed(2)),
            porcentajeEquilibrio: Number(porcentajeEquilibrio.toFixed(2))
        });

    } catch (error) {
        console.error('❌ Error en Dashboard Summary:', error);
        res.status(500).json({ error: "Error interno al calcular dashboard" });
    }
};
