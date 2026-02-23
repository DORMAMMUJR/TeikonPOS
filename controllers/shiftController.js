import { Shift, Sale, StoreConfig, sequelize } from '../models.js';
import { Op } from 'sequelize';

// POST /api/shifts/start
export const startShift = async (req, res) => {
    try {
        const { storeId, initialAmount, openedBy } = req.body;

        if (!storeId) {
            return res.status(400).json({ success: false, message: 'storeId es requerido' });
        }

        // Revisar si ya hay un turno abierto
        const activeShift = await Shift.findOne({
            where: { storeId, status: 'OPEN' }
        });

        if (activeShift) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un turno abierto para esta tienda.',
                shift: activeShift
            });
        }

        if (!openedBy) {
            return res.status(400).json({ success: false, message: 'openedBy (ID del usuario) es requerido' });
        }

        const startBal = initialAmount !== undefined ? initialAmount : (req.body.startBalance || 0);

        // Crear nuevo turno
        const newShift = await Shift.create({
            storeId,
            startTime: new Date(),
            startBalance: startBal,
            status: 'OPEN',
            openedBy: openedBy
        });

        res.status(201).json(newShift);
    } catch (error) {
        console.error('Error al abrir turno:', error);
        res.status(500).json({ success: false, message: 'Error interno al abrir el turno', error: error.message });
    }
};

// POST /api/shifts/end
export const endShift = async (req, res) => {
    try {
        const { shiftId, endBalance, finalAmount, expectedBalance, expectedAmount, totalSales, totalCash, totalCard, totalTransfer, difference, notes, closedBy } = req.body;

        const actualEndBalance = endBalance !== undefined ? endBalance : (finalAmount || 0);
        const actualExpectedBalance = expectedBalance !== undefined ? expectedBalance : (expectedAmount || 0);

        // Obtener el turno abierto de la tienda o por el shiftId proporcionado
        let shift;
        if (shiftId) {
            shift = await Shift.findByPk(shiftId);
        } else if (req.storeId) {
            shift = await Shift.findOne({ where: { storeId: req.storeId, status: 'OPEN' } });
        }

        if (!shift) {
            return res.status(404).json({ success: false, message: 'Turno abierto no encontrado' });
        }

        if (shift.status === 'CLOSED') {
            return res.status(400).json({ success: false, message: 'El turno ya ha sido cerrado' });
        }

        // Actualizar datos del turno al cerrar
        shift.endTime = new Date();
        shift.endBalance = actualEndBalance;
        shift.expectedBalance = actualExpectedBalance || shift.startBalance + totalCash;
        shift.totalSales = totalSales;
        shift.cashReceived = totalCash;
        shift.cardReceived = totalCard;
        shift.transferReceived = totalTransfer;
        shift.difference = difference;
        shift.notes = notes || '';
        shift.status = 'CLOSED';

        await shift.save();

        res.json({ success: true, message: 'Turno cerrado correctamente', shift });
    } catch (error) {
        console.error('Error al cerrar turno:', error);
        res.status(500).json({ success: false, message: 'Error interno al cerrar el turno', error: error.message });
    }
};

// GET /api/shifts/current
export const getCurrentShift = async (req, res) => {
    try {
        const storeId = req.query.storeId || req.storeId;

        if (!storeId) {
            return res.status(400).json({ success: false, message: 'storeId es requerido' });
        }

        const activeShift = await Shift.findOne({
            where: { storeId, status: 'OPEN' }
        });

        if (!activeShift) {
            return res.status(204).send(); // NoContent
        }

        res.json(activeShift);
    } catch (error) {
        console.error('Error al obtener turno actual:', error);
        res.status(500).json({ success: false, message: 'Error interno al obtener turno', error: error.message });
    }
};
