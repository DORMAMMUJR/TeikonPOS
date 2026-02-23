import { AccountReceivable, AccountPayable, PaymentTransaction, Client, Supplier, Sale, PurchaseOrder, Shift, sequelize } from '../models.js';

// GET /api/financials/receivables
export const getReceivables = async (req, res) => {
    try {
        const storeId = req.storeId;
        const receivables = await AccountReceivable.findAll({
            where: { storeId },
            include: [
                { model: Client, as: 'client', attributes: ['nombre', 'telefono'] },
                { model: Sale, as: 'sale', attributes: ['total', 'createdAt'] }
            ],
            order: [['fechaVencimiento', 'ASC']]
        });
        res.json(receivables);
    } catch (error) {
        console.error('Error fetching Accounts Receivable:', error);
        res.status(500).json({ error: 'Error al obtener Cuentas por Cobrar' });
    }
};

// GET /api/financials/payables
export const getPayables = async (req, res) => {
    try {
        const storeId = req.storeId;
        const payables = await AccountPayable.findAll({
            where: { storeId },
            include: [
                { model: Supplier, as: 'supplier', attributes: ['nombre', 'telefono'] }
            ],
            order: [['fechaVencimiento', 'ASC']]
        });
        res.json(payables);
    } catch (error) {
        console.error('Error fetching Accounts Payable:', error);
        res.status(500).json({ error: 'Error al obtener Cuentas por Pagar' });
    }
};

// POST /api/financials/receivables/:id/pay
export const payReceivable = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { monto, metodoPago, referencia, shiftId } = req.body;

        const receivable = await AccountReceivable.findOne({
            where: { id, storeId },
            transaction: t
        });

        if (!receivable) {
            await t.rollback();
            return res.status(404).json({ error: 'Cuenta por Cobrar no encontrada' });
        }

        if (receivable.estado === 'PAID' || receivable.saldoPendiente <= 0) {
            await t.rollback();
            return res.status(400).json({ error: 'La cuenta ya está pagada completamente.' });
        }

        const montoAporte = parseFloat(monto);
        if (montoAporte > receivable.saldoPendiente) {
            await t.rollback();
            return res.status(400).json({ error: 'El monto supera el saldo pendiente' });
        }

        // 1. Crear Transacción de Pago
        const payment = await PaymentTransaction.create({
            storeId,
            cuentaId: receivable.id,
            tipoCuenta: 'RECEIVABLE',
            monto: montoAporte,
            metodoPago,
            referencia,
            registradoPor: req.username || 'System',
            shiftId: shiftId || null
        }, { transaction: t });

        // 2. Actualizar saldo y estado del CxC
        const nuevoSaldo = parseFloat(receivable.saldoPendiente) - montoAporte;
        let nuevoEstado = receivable.estado;
        if (nuevoSaldo <= 0) {
            nuevoEstado = 'PAID';
        } else if (nuevoSaldo < receivable.montoTotal) {
            nuevoEstado = 'PARTIAL';
        }

        await receivable.update({
            saldoPendiente: nuevoSaldo,
            estado: nuevoEstado
        }, { transaction: t });

        // 3. Afectar el Shift (Turno de caja) activo si aplica
        if (shiftId) {
            const currentShift = await Shift.findOne({ where: { id: shiftId, storeId }, transaction: t });
            if (currentShift && currentShift.status === 'OPEN') {
                // Treated functionally as sales cash entering the register to keep the box balanced.
                if (metodoPago === 'CASH') {
                    await currentShift.increment('cashSales', { by: montoAporte, transaction: t });
                } else if (metodoPago === 'CARD') {
                    await currentShift.increment('cardSales', { by: montoAporte, transaction: t });
                } else if (metodoPago === 'TRANSFER') {
                    await currentShift.increment('transferSales', { by: montoAporte, transaction: t });
                }
            }
        }

        await t.commit();
        res.json({ message: 'Pago registrado exitosamente', payment, receivable });
    } catch (error) {
        await t.rollback();
        console.error('Error paying Account Receivable:', error);
        res.status(500).json({ error: 'Error al registrar el pago' });
    }
};

// POST /api/financials/payables/:id/pay
export const payPayable = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Pagar una compra o gasto significa SALIDA de dinero.
        const { monto, metodoPago, referencia, shiftId } = req.body;

        const payable = await AccountPayable.findOne({
            where: { id, storeId },
            transaction: t
        });

        if (!payable) {
            await t.rollback();
            return res.status(404).json({ error: 'Cuenta por Pagar no encontrada' });
        }

        if (payable.estado === 'PAID' || payable.saldoPendiente <= 0) {
            await t.rollback();
            return res.status(400).json({ error: 'La cuenta ya está saldada.' });
        }

        const montoAPagar = parseFloat(monto);
        if (montoAPagar > payable.saldoPendiente) {
            await t.rollback();
            return res.status(400).json({ error: 'El monto a pagar supera el saldo de la deuda.' });
        }

        // 1. Crear Transacción
        const payment = await PaymentTransaction.create({
            storeId,
            cuentaId: payable.id,
            tipoCuenta: 'PAYABLE',
            monto: montoAPagar,
            metodoPago,
            referencia,
            registradoPor: req.username || 'System',
            shiftId: shiftId || null
        }, { transaction: t });

        // 2. Actualizar Balance CxP
        const nuevoSaldo = parseFloat(payable.saldoPendiente) - montoAPagar;
        let nuevoEstado = payable.estado;
        if (nuevoSaldo <= 0) {
            nuevoEstado = 'PAID';

            // Si es referencia a PurchaseOrder, actualizar estado pago
            if (payable.tipoReferencia === 'PURCHASE') {
                const po = await PurchaseOrder.findOne({ where: { id: payable.referenciaId }, transaction: t });
                if (po) await po.update({ estadoPago: 'PAID' }, { transaction: t });
            }
        } else {
            nuevoEstado = 'PARTIAL';
            if (payable.tipoReferencia === 'PURCHASE') {
                const po = await PurchaseOrder.findOne({ where: { id: payable.referenciaId }, transaction: t });
                if (po) await po.update({ estadoPago: 'PARTIAL' }, { transaction: t });
            }
        }

        await payable.update({
            saldoPendiente: nuevoSaldo,
            estado: nuevoEstado
        }, { transaction: t });

        // 3. Afectar el Shift (Salida de Dinero = Expenses)
        if (shiftId) {
            const currentShift = await Shift.findOne({ where: { id: shiftId, storeId }, transaction: t });
            if (currentShift && currentShift.status === 'OPEN') {
                if (metodoPago === 'CASH') {
                    // Los pagos a proveedores reducen el efectivo esperado (lo manejamos incrementando gastos)
                    await currentShift.increment('expensesTotal', { by: montoAPagar, transaction: t });
                }
            }
        }

        await t.commit();
        res.json({ message: 'Pago emitido exitosamente', payment, payable });
    } catch (error) {
        await t.rollback();
        console.error('Error paying Account Payable:', error);
        res.status(500).json({ error: 'Error al emitir el pago' });
    }
};
