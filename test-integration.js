/**
 * TEIKON POS - INTEGRATION TEST SCRIPT
 * 
 * Este script valida la integridad completa del backend:
 * 1. Registro de Organization y Stores
 * 2. Aislamiento de datos entre tiendas
 * 3. Ciclo financiero completo
 * 4. Cálculo correcto de Utilidad Neta
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:80';
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;

// Tokens de autenticación
let tokenCentro = '';
let tokenNorte = '';
let storeIdCentro = '';
let storeIdNorte = '';
let productId = '';

// ==========================================
// UTILIDADES
// ==========================================

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
    if (passed) {
        testsPassed++;
        log(`✅ ${testName}`, colors.green);
        if (details) log(`   ${details}`, colors.cyan);
    } else {
        testsFailed++;
        log(`❌ ${testName}`, colors.red);
        if (details) log(`   ${details}`, colors.yellow);
    }
}

function logSection(title) {
    log(`\n${'='.repeat(60)}`, colors.blue);
    log(`  ${title}`, colors.blue);
    log(`${'='.repeat(60)}`, colors.blue);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// TESTS
// ==========================================

async function test1_RegistroOrganizacion() {
    logSection('TEST 1: Registro de Organización y Tiendas');

    try {
        // Registrar Empresa Alex con Sucursal Centro
        log('\n📝 Registrando Empresa Alex - Sucursal Centro...');
        const resCentro = await axios.post(`${BASE_URL}/api/auth/register`, {
            organizationName: 'Empresa Alex',
            storeName: 'Sucursal Centro',
            usuario: 'centro_admin',
            password: 'test123',
            email: 'alex@empresa.com',
            telefono: '5551234567'
        });

        tokenCentro = resCentro.data.token;
        storeIdCentro = resCentro.data.store.id;

        logTest(
            'Registro de Sucursal Centro',
            resCentro.status === 201 && tokenCentro && storeIdCentro,
            `Token recibido, Store ID: ${storeIdCentro.substring(0, 8)}...`
        );

        // Crear segunda sucursal (Sucursal Norte)
        log('\n📝 Creando Sucursal Norte...');
        const resNorte = await axios.post(
            `${BASE_URL}/api/stores/new`,
            {
                nombre: 'Sucursal Norte',
                usuario: 'norte_admin',
                password: 'test123',
                telefono: '5559876543'
            },
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        storeIdNorte = resNorte.data.id;

        logTest(
            'Creación de Sucursal Norte',
            resNorte.status === 201 && storeIdNorte,
            `Store ID: ${storeIdNorte.substring(0, 8)}...`
        );

        // Login en Sucursal Norte
        log('\n🔐 Login en Sucursal Norte...');
        const resLoginNorte = await axios.post(`${BASE_URL}/api/auth/login`, {
            usuario: 'norte_admin',
            password: 'test123'
        });

        tokenNorte = resLoginNorte.data.token;

        logTest(
            'Login en Sucursal Norte',
            resLoginNorte.status === 200 && tokenNorte,
            'Token recibido correctamente'
        );

        // Verificar que ambas stores pertenecen a la misma organization
        const orgIdCentro = resCentro.data.store.organizationId;
        const orgIdNorte = resNorte.data.organizationId;

        logTest(
            'Ambas sucursales pertenecen a la misma organización',
            orgIdCentro === orgIdNorte,
            `Organization ID: ${orgIdCentro.substring(0, 8)}...`
        );

    } catch (error) {
        logTest('Registro de Organización', false, error.response?.data?.error || error.message);
    }
}

async function test2_CrearProductoEnCentro() {
    logSection('TEST 2: Crear Producto en Sucursal Centro');

    try {
        log('\n📦 Creando producto: Laptop (Costo $50, Precio $100)...');
        const res = await axios.post(
            `${BASE_URL}/api/productos`,
            {
                sku: 'LAP001',
                nombre: 'Laptop Dell',
                categoria: 'Electrónica',
                costPrice: 50,
                salePrice: 100,
                stock: 10,
                minStock: 2,
                taxRate: 0
            },
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        productId = res.data.id;

        logTest(
            'Producto creado en Sucursal Centro',
            res.status === 201 && productId,
            `Product ID: ${productId.substring(0, 8)}..., Stock: 10`
        );

        // Verificar que se creó el movimiento de stock inicial
        const resMovements = await axios.get(
            `${BASE_URL}/api/productos/${productId}/movimientos`,
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        const hasInitialMovement = resMovements.data.length > 0 &&
            resMovements.data[0].tipo === 'PURCHASE' &&
            resMovements.data[0].cantidad === 10;

        logTest(
            'Movimiento de stock inicial creado (Kardex)',
            hasInitialMovement,
            `Tipo: PURCHASE, Cantidad: 10, Stock: 0 → 10`
        );

    } catch (error) {
        logTest('Crear Producto', false, error.response?.data?.error || error.message);
    }
}

async function test3_AislamientoDeDatos() {
    logSection('TEST 3: Verificar Aislamiento de Datos');

    try {
        // Sucursal Norte intenta ver productos
        log('\n🔒 Sucursal Norte intentando ver productos...');
        const resNorte = await axios.get(
            `${BASE_URL}/api/productos`,
            {
                headers: { Authorization: `Bearer ${tokenNorte}` }
            }
        );

        const productosNorte = resNorte.data;

        logTest(
            'Sucursal Norte NO ve productos de Sucursal Centro',
            productosNorte.length === 0,
            `Productos visibles: ${productosNorte.length} (esperado: 0)`
        );

        // Sucursal Centro sí ve su producto
        log('\n✅ Sucursal Centro viendo sus productos...');
        const resCentro = await axios.get(
            `${BASE_URL}/api/productos`,
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        const productosCentro = resCentro.data;

        logTest(
            'Sucursal Centro SÍ ve su producto',
            productosCentro.length === 1 && productosCentro[0].id === productId,
            `Productos visibles: ${productosCentro.length} (esperado: 1)`
        );

        // Verificar que Norte no puede modificar producto de Centro
        log('\n🚫 Sucursal Norte intentando modificar producto de Centro...');
        try {
            await axios.put(
                `${BASE_URL}/api/productos/${productId}`,
                { salePrice: 200 },
                {
                    headers: { Authorization: `Bearer ${tokenNorte}` }
                }
            );
            logTest('Sucursal Norte NO puede modificar producto de Centro', false, 'Modificación permitida (ERROR)');
        } catch (error) {
            logTest(
                'Sucursal Norte NO puede modificar producto de Centro',
                error.response?.status === 404,
                'Acceso denegado correctamente (404)'
            );
        }

    } catch (error) {
        logTest('Aislamiento de Datos', false, error.response?.data?.error || error.message);
    }
}

async function test4_CicloFinanciero() {
    logSection('TEST 4: Ciclo Financiero Completo');

    try {
        // Realizar 2 ventas
        log('\n💰 Realizando Venta #1 (1 unidad a $100)...');
        const resVenta1 = await axios.post(
            `${BASE_URL}/api/ventas`,
            {
                vendedor: 'centro_admin',
                items: [
                    {
                        productId: productId,
                        cantidad: 1,
                        unitPrice: 100
                    }
                ],
                paymentMethod: 'CASH',
                total: 100
            },
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        const venta1 = resVenta1.data;

        logTest(
            'Venta #1 creada correctamente',
            venta1.total === 100 && venta1.totalCost === 50 && venta1.netProfit === 50,
            `Total: $${venta1.total}, Costo: $${venta1.totalCost}, Utilidad: $${venta1.netProfit}`
        );

        // Verificar movimiento de stock por venta
        const resMovements1 = await axios.get(
            `${BASE_URL}/api/productos/${productId}/movimientos`,
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        const saleMovement = resMovements1.data.find(m => m.tipo === 'SALE');

        logTest(
            'Movimiento de stock por venta creado',
            saleMovement && saleMovement.cantidad === -1 && saleMovement.stockNuevo === 9,
            `Stock: 10 → 9 (Venta de 1 unidad)`
        );

        await sleep(100);

        log('\n💰 Realizando Venta #2 (1 unidad a $100)...');
        const resVenta2 = await axios.post(
            `${BASE_URL}/api/ventas`,
            {
                vendedor: 'centro_admin',
                items: [
                    {
                        productId: productId,
                        cantidad: 1,
                        unitPrice: 100
                    }
                ],
                paymentMethod: 'CARD',
                total: 100
            },
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        const venta2 = resVenta2.data;

        logTest(
            'Venta #2 creada correctamente',
            venta2.total === 100 && venta2.totalCost === 50 && venta2.netProfit === 50,
            `Total: $${venta2.total}, Costo: $${venta2.totalCost}, Utilidad: $${venta2.netProfit}`
        );

        // Registrar gasto operativo
        log('\n💸 Registrando Gasto Operativo (Luz $20)...');
        const resGasto = await axios.post(
            `${BASE_URL}/api/gastos`,
            {
                categoria: 'UTILITIES',
                descripcion: 'Recibo de luz',
                monto: 20,
                fecha: new Date().toISOString().split('T')[0],
                recurrente: false
            },
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        logTest(
            'Gasto operativo registrado',
            resGasto.status === 201 && resGasto.data.monto === 20,
            `Categoría: UTILITIES, Monto: $${resGasto.data.monto}`
        );

    } catch (error) {
        logTest('Ciclo Financiero', false, error.response?.data?.error || error.message);
    }
}

async function test5_DashboardMaestro() {
    logSection('TEST 5: PRUEBA MAESTRA - Dashboard Summary');

    try {
        log('\n📊 Consultando Dashboard Summary...');
        await sleep(500); // Dar tiempo para que se procesen las transacciones

        const res = await axios.get(
            `${BASE_URL}/api/dashboard/summary?period=day`,
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        const dashboard = res.data;

        log('\n📈 Resultados del Dashboard:');
        log(`   Ventas: ${dashboard.sales.count}`, colors.cyan);
        log(`   Ingresos Totales: $${dashboard.sales.totalRevenue}`, colors.cyan);
        log(`   Costo Total: $${dashboard.sales.totalCost}`, colors.cyan);
        log(`   Utilidad Bruta: $${dashboard.profitability.grossProfit}`, colors.cyan);
        log(`   Gastos: $${dashboard.expenses.total}`, colors.cyan);
        log(`   Utilidad Neta: $${dashboard.profitability.netProfit}`, colors.cyan);

        // Cálculos esperados
        const expectedSalesCount = 2;
        const expectedRevenue = 200; // 2 ventas × $100
        const expectedCost = 100; // 2 ventas × $50
        const expectedGrossProfit = 100; // $200 - $100
        const expectedExpenses = 20; // Gasto de luz
        const expectedNetProfit = 80; // $100 - $20

        log('\n🎯 Valores Esperados:');
        log(`   Ventas: ${expectedSalesCount}`, colors.yellow);
        log(`   Ingresos: $${expectedRevenue}`, colors.yellow);
        log(`   Costo: $${expectedCost}`, colors.yellow);
        log(`   Utilidad Bruta: $${expectedGrossProfit}`, colors.yellow);
        log(`   Gastos: $${expectedExpenses}`, colors.yellow);
        log(`   Utilidad Neta: $${expectedNetProfit}`, colors.yellow);

        // Validaciones
        logTest(
            'Número de ventas correcto',
            dashboard.sales.count === expectedSalesCount,
            `${dashboard.sales.count} === ${expectedSalesCount}`
        );

        logTest(
            'Ingresos totales correctos',
            parseFloat(dashboard.sales.totalRevenue) === expectedRevenue,
            `$${dashboard.sales.totalRevenue} === $${expectedRevenue}`
        );

        logTest(
            'Costo total correcto',
            parseFloat(dashboard.sales.totalCost) === expectedCost,
            `$${dashboard.sales.totalCost} === $${expectedCost}`
        );

        logTest(
            'Utilidad Bruta correcta',
            parseFloat(dashboard.profitability.grossProfit) === expectedGrossProfit,
            `$${dashboard.profitability.grossProfit} === $${expectedGrossProfit}`
        );

        logTest(
            'Gastos totales correctos',
            parseFloat(dashboard.expenses.total) === expectedExpenses,
            `$${dashboard.expenses.total} === $${expectedExpenses}`
        );

        // LA PRUEBA MAESTRA
        const netProfitCorrect = parseFloat(dashboard.profitability.netProfit) === expectedNetProfit;

        logTest(
            '🏆 PRUEBA MAESTRA: Utilidad Neta Real correcta',
            netProfitCorrect,
            `$${dashboard.profitability.netProfit} === $${expectedNetProfit}`
        );

        if (netProfitCorrect) {
            log('\n🎉 ¡PRUEBA MAESTRA APROBADA!', colors.green);
            log('   La fórmula financiera es correcta:', colors.green);
            log('   (2 ventas × $100) - (2 costos × $50) - ($20 gasto) = $80 ✅', colors.green);
        }

        // Verificar ventas por método de pago
        logTest(
            'Ventas en efectivo correctas',
            parseFloat(dashboard.paymentMethods.CASH || 0) === 100,
            `$${dashboard.paymentMethods.CASH} (1 venta)`
        );

        logTest(
            'Ventas con tarjeta correctas',
            parseFloat(dashboard.paymentMethods.CARD || 0) === 100,
            `$${dashboard.paymentMethods.CARD} (1 venta)`
        );

    } catch (error) {
        logTest('Dashboard Summary', false, error.response?.data?.error || error.message);
    }
}

async function test6_TurnoDeCaja() {
    logSection('TEST 6: Gestión de Turnos de Caja');

    try {
        // Abrir turno
        log('\n🏪 Abriendo turno de caja...');
        const resAbrir = await axios.post(
            `${BASE_URL}/api/turnos/abrir`,
            {
                cajero: 'centro_admin',
                montoInicial: 500
            },
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        const turnoId = resAbrir.data.id;

        logTest(
            'Turno abierto correctamente',
            resAbrir.status === 201 && turnoId,
            `Turno ID: ${turnoId.substring(0, 8)}..., Monto inicial: $500`
        );

        // Cerrar turno
        log('\n🔒 Cerrando turno de caja...');
        const resCerrar = await axios.post(
            `${BASE_URL}/api/turnos/${turnoId}/cerrar`,
            {
                montoReal: 580, // $500 inicial + $100 efectivo - $20 gasto = $580 esperado
                notas: 'Turno de prueba'
            },
            {
                headers: { Authorization: `Bearer ${tokenCentro}` }
            }
        );

        const turno = resCerrar.data;

        logTest(
            'Turno cerrado correctamente',
            turno.status === 'CLOSED',
            `Monto esperado: $${turno.montoEsperado}, Monto real: $${turno.montoReal}, Diferencia: $${turno.diferencia}`
        );

        // Verificar cálculos del turno
        const expectedVentasEfectivo = 100;
        const expectedGastos = 20;
        const expectedMontoEsperado = 580; // 500 + 100 - 20

        logTest(
            'Ventas en efectivo calculadas correctamente',
            parseFloat(turno.ventasEfectivo) === expectedVentasEfectivo,
            `$${turno.ventasEfectivo} === $${expectedVentasEfectivo}`
        );

        logTest(
            'Gastos calculados correctamente',
            parseFloat(turno.gastos) === expectedGastos,
            `$${turno.gastos} === $${expectedGastos}`
        );

        logTest(
            'Monto esperado calculado correctamente',
            parseFloat(turno.montoEsperado) === expectedMontoEsperado,
            `$${turno.montoEsperado} === $${expectedMontoEsperado}`
        );

        logTest(
            'Diferencia calculada correctamente (cuadre perfecto)',
            parseFloat(turno.diferencia) === 0,
            `$${turno.diferencia} === $0 (sin faltante ni sobrante)`
        );

    } catch (error) {
        logTest('Gestión de Turnos', false, error.response?.data?.error || error.message);
    }
}

// ==========================================
// EJECUTAR TODAS LAS PRUEBAS
// ==========================================

async function runAllTests() {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.blue);
    log('║     TEIKON POS - INTEGRATION TEST SUITE                   ║', colors.blue);
    log('║     Validación Completa del Backend                       ║', colors.blue);
    log('╚════════════════════════════════════════════════════════════╝', colors.blue);

    log(`\n🌐 API URL: ${BASE_URL}`, colors.cyan);
    log(`⏰ Inicio: ${new Date().toLocaleString()}\n`, colors.cyan);

    try {
        await test1_RegistroOrganizacion();
        await test2_CrearProductoEnCentro();
        await test3_AislamientoDeDatos();
        await test4_CicloFinanciero();
        await test5_DashboardMaestro();
        await test6_TurnoDeCaja();

        // Resumen final
        logSection('RESUMEN DE PRUEBAS');
        log(`\n✅ Tests Aprobados: ${testsPassed}`, colors.green);
        log(`❌ Tests Fallidos: ${testsFailed}`, colors.red);
        log(`📊 Total: ${testsPassed + testsFailed}`, colors.cyan);

        const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
        log(`\n🎯 Tasa de Éxito: ${successRate}%`, colors.yellow);

        if (testsFailed === 0) {
            log('\n╔════════════════════════════════════════════════════════════╗', colors.green);
            log('║                                                            ║', colors.green);
            log('║   🎉 ¡TODAS LAS PRUEBAS APROBADAS!                        ║', colors.green);
            log('║                                                            ║', colors.green);
            log('║   ✅ Backend validado al 100%                             ║', colors.green);
            log('║   ✅ Integridad de datos confirmada                       ║', colors.green);
            log('║   ✅ Cálculos financieros correctos                       ║', colors.green);
            log('║   ✅ Aislamiento entre tiendas verificado                 ║', colors.green);
            log('║                                                            ║', colors.green);
            log('║   🚀 LISTO PARA PASAR AL FRONTEND                         ║', colors.green);
            log('║                                                            ║', colors.green);
            log('╚════════════════════════════════════════════════════════════╝', colors.green);
        } else {
            log('\n⚠️  Algunas pruebas fallaron. Revisa los detalles arriba.', colors.yellow);
        }

        log(`\n⏰ Fin: ${new Date().toLocaleString()}`, colors.cyan);

    } catch (error) {
        log(`\n❌ Error fatal en las pruebas: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar
runAllTests().then(() => {
    process.exit(testsFailed > 0 ? 1 : 0);
}).catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
