-- ==========================================
-- SCRIPT DE EMERGENCIA: Cerrar Turnos Zombie
-- ==========================================
-- Propósito: Resolver bucle lógico cuando hay turnos abiertos huérfanos
-- Fecha: 2026-01-12
-- Uso: Ejecutar cuando el sistema reporta error 409 al abrir caja
-- ==========================================
-- OPCIÓN 1: Cerrar TODOS los turnos abiertos
-- ==========================================
-- Esta es la opción más segura para resetear el sistema
UPDATE shifts
SET status = 'CLOSED',
    end_time = NOW(),
    notes = COALESCE(notes || ' | ', '') || 'Cierre administrativo por corrección de sistema - ' || NOW()::TEXT
WHERE status = 'OPEN';
-- Verificar cuántos turnos se cerraron
SELECT COUNT(*) as turnos_cerrados,
    'Turnos zombie cerrados exitosamente' as mensaje
FROM shifts
WHERE status = 'CLOSED'
    AND notes LIKE '%Cierre administrativo%';
-- ==========================================
-- OPCIÓN 2: Cerrar solo turnos de una tienda específica
-- ==========================================
-- Usar si solo una tienda tiene el problema
-- UPDATE shifts 
-- SET 
--     status = 'CLOSED',
--     end_time = NOW(),
--     final_amount = expected_amount, -- Asume que el monto final es igual al esperado
--     difference = 0,
--     notes = 'Cierre administrativo por corrección de sistema'
-- WHERE status = 'OPEN' 
-- AND store_id = 'TU_STORE_ID_AQUI';
-- ==========================================
-- OPCIÓN 3: Ver turnos abiertos antes de cerrar
-- ==========================================
-- Ejecutar primero para ver qué se va a cerrar
SELECT id,
    store_id,
    opened_by,
    start_time,
    initial_amount,
    status,
    EXTRACT(
        EPOCH
        FROM (NOW() - start_time)
    ) / 3600 as horas_abierto
FROM shifts
WHERE status = 'OPEN'
ORDER BY start_time DESC;
-- ==========================================
-- OPCIÓN 4: Cierre completo con cálculos
-- ==========================================
-- Más completo: calcula montos esperados y diferencias
UPDATE shifts
SET status = 'CLOSED',
    end_time = NOW(),
    final_amount = COALESCE(expected_amount, initial_amount + cash_sales),
    difference = 0,
    -- Asume sin diferencia
    notes = CASE
        WHEN notes IS NULL
        OR notes = '' THEN 'Cierre administrativo por corrección de sistema'
        ELSE notes || ' | Cierre administrativo por corrección de sistema'
    END
WHERE status = 'OPEN'
RETURNING id,
    store_id,
    start_time,
    end_time,
    'Cerrado exitosamente' as resultado;
-- ==========================================
-- VERIFICACIÓN POST-CIERRE
-- ==========================================
-- Ejecutar después del UPDATE para confirmar
-- 1. Verificar que no quedan turnos abiertos
SELECT COUNT(*) as turnos_abiertos,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ Sistema limpio - No hay turnos abiertos'
        ELSE '⚠️ Aún hay turnos abiertos - Revisar'
    END as estado
FROM shifts
WHERE status = 'OPEN';
-- 2. Ver últimos turnos cerrados
SELECT id,
    store_id,
    start_time,
    end_time,
    status,
    notes
FROM shifts
WHERE status = 'CLOSED'
ORDER BY end_time DESC
LIMIT 5;
-- ==========================================
-- LIMPIEZA TOTAL (USAR CON PRECAUCIÓN)
-- ==========================================
-- Solo si quieres eliminar TODOS los turnos y empezar de cero
-- ⚠️ ESTO BORRARÁ TODO EL HISTORIAL DE TURNOS
-- TRUNCATE TABLE shifts RESTART IDENTITY CASCADE;
-- SELECT 'Tabla shifts limpiada completamente' as resultado;
-- ==========================================
-- NOTAS IMPORTANTES
-- ==========================================
-- 1. Ejecuta OPCIÓN 3 primero para ver qué turnos están abiertos
-- 2. Luego ejecuta OPCIÓN 1 o OPCIÓN 4 para cerrarlos
-- 3. Finalmente ejecuta VERIFICACIÓN POST-CIERRE
-- 4. Después de esto, el frontend debería poder abrir caja normalmente