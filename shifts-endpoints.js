// ==========================================
// ENDPOINTS DE CASH SHIFTS (Gestión de Caja)
// ==========================================

/**
 * POST /api/shifts/start
 * Purpose: Initiate a new cash shift for a specific store
 * Request Body: { storeId, initialAmount, openedBy }
 * Response: 201 Created with shift details | 400 Bad Request | 409 Conflict
 */
app.post('/api/shifts/start', authenticateToken, async (req, res) => {
    try {
        const { storeId, initialAmount, openedBy } = req.body;

        // 1. Validate required fields
        if (!storeId || initialAmount === undefined || !openedBy) {
            return res.status(400).json({
                error: 'Campos requeridos: storeId, initialAmount, openedBy'
            });
        }

        // 2. Validate initialAmount is positive
        const parsedAmount = parseFloat(initialAmount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return res.status(400).json({
                error: 'El monto inicial debe ser un número positivo o cero'
            });
        }

        // 3. Check for existing OPEN shift for this store
        const existingOpenShift = await CashShift.findOne({
            where: {
                storeId,
                status: 'OPEN'
            }
        });

        if (existingOpenShift) {
            return res.status(409).json({
                error: 'Ya existe un turno abierto para esta tienda',
                existingShift: {
                    id: existingOpenShift.id,
                    openedAt: existingOpenShift.apertura,
                    openedBy: existingOpenShift.cajero
                }
            });
        }

        // 4. Create new shift
        const newShift = await CashShift.create({
            storeId,
            cajero: openedBy,
            apertura: new Date(),
            montoInicial: parsedAmount,
            ventasEfectivo: 0,
            ventasTarjeta: 0,
            ventasTransferencia: 0,
            gastos: 0,
            status: 'OPEN'
        });

        console.log(`✅ Cash shift opened: ${newShift.id} for store ${storeId} by ${openedBy}`);

        // 5. Return created shift
        res.status(201).json({
            id: newShift.id,
            storeId: newShift.storeId,
            openedBy: newShift.cajero,
            initialAmount: parseFloat(newShift.montoInicial),
            startTime: newShift.apertura,
            status: newShift.status,
            createdAt: newShift.createdAt
        });

    } catch (error) {
        console.error('❌ Error al abrir turno de caja:', error);
        res.status(500).json({ error: 'Error interno al abrir turno de caja' });
    }
});

/**
 * POST /api/shifts/end
 * Purpose: Close an active cash shift
 * Request Body: { storeId, finalAmount, expectedAmount, notes }
 * Response: 200 OK with updated shift | 400 Bad Request | 404 Not Found
 */
app.post('/api/shifts/end', authenticateToken, async (req, res) => {
    try {
        const { storeId, finalAmount, expectedAmount, notes } = req.body;

        // 1. Validate required fields
        if (!storeId || finalAmount === undefined || expectedAmount === undefined) {
            return res.status(400).json({
                error: 'Campos requeridos: storeId, finalAmount, expectedAmount'
            });
        }

        // 2. Validate amounts are positive numbers
        const parsedFinalAmount = parseFloat(finalAmount);
        const parsedExpectedAmount = parseFloat(expectedAmount);

        if (isNaN(parsedFinalAmount) || parsedFinalAmount < 0) {
            return res.status(400).json({
                error: 'El monto final debe ser un número positivo o cero'
            });
        }

        if (isNaN(parsedExpectedAmount) || parsedExpectedAmount < 0) {
            return res.status(400).json({
                error: 'El monto esperado debe ser un número positivo o cero'
            });
        }

        // 3. Find the OPEN shift for this store
        const openShift = await CashShift.findOne({
            where: {
                storeId,
                status: 'OPEN'
            }
        });

        if (!openShift) {
            return res.status(404).json({
                error: 'No se encontró un turno abierto para esta tienda'
            });
        }

        // 4. Calculate difference
        const difference = parsedFinalAmount - parsedExpectedAmount;

        // 5. Update shift with closing data
        openShift.cierre = new Date();
        openShift.montoEsperado = parsedExpectedAmount;
        openShift.montoReal = parsedFinalAmount;
        openShift.diferencia = difference;
        openShift.notas = notes || null;
        openShift.status = 'CLOSED';

        await openShift.save();

        console.log(`✅ Cash shift closed: ${openShift.id} for store ${storeId}`);
        console.log(`   Expected: $${parsedExpectedAmount}, Real: $${parsedFinalAmount}, Difference: $${difference}`);

        // 6. Return updated shift
        res.status(200).json({
            id: openShift.id,
            storeId: openShift.storeId,
            openedBy: openShift.cajero,
            initialAmount: parseFloat(openShift.montoInicial),
            finalAmount: parseFloat(openShift.montoReal),
            expectedAmount: parseFloat(openShift.montoEsperado),
            difference: parseFloat(openShift.diferencia),
            notes: openShift.notas,
            startTime: openShift.apertura,
            endTime: openShift.cierre,
            status: openShift.status,
            cashSales: parseFloat(openShift.ventasEfectivo),
            cardSales: parseFloat(openShift.ventasTarjeta),
            transferSales: parseFloat(openShift.ventasTransferencia),
            expenses: parseFloat(openShift.gastos)
        });

    } catch (error) {
        console.error('❌ Error al cerrar turno de caja:', error);
        res.status(500).json({ error: 'Error interno al cerrar turno de caja' });
    }
});

/**
 * GET /api/shifts/current
 * Purpose: Retrieve the currently active cash shift for a store
 * Query Parameters: ?storeId=<uuid>
 * Response: 200 OK with shift details | 204 No Content | 400 Bad Request
 */
app.get('/api/shifts/current', authenticateToken, async (req, res) => {
    try {
        const { storeId } = req.query;

        // 1. Validate storeId parameter
        if (!storeId) {
            return res.status(400).json({
                error: 'El parámetro storeId es requerido'
            });
        }

        // 2. Find OPEN shift for this store
        const currentShift = await CashShift.findOne({
            where: {
                storeId,
                status: 'OPEN'
            },
            order: [['apertura', 'DESC']] // Get most recent if multiple exist
        });

        // 3. Return 204 No Content if no open shift found
        if (!currentShift) {
            return res.status(204).send();
        }

        // 4. Return current shift details
        res.status(200).json({
            id: currentShift.id,
            storeId: currentShift.storeId,
            openedBy: currentShift.cajero,
            initialAmount: parseFloat(currentShift.montoInicial),
            startTime: currentShift.apertura,
            status: currentShift.status,
            cashSales: parseFloat(currentShift.ventasEfectivo),
            cardSales: parseFloat(currentShift.ventasTarjeta),
            transferSales: parseFloat(currentShift.ventasTransferencia),
            expenses: parseFloat(currentShift.gastos),
            createdAt: currentShift.createdAt
        });

    } catch (error) {
        console.error('❌ Error al obtener turno actual:', error);
        res.status(500).json({ error: 'Error interno al obtener turno actual' });
    }
});
