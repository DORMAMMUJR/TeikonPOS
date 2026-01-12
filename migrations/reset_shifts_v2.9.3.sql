-- ==========================================
-- RESET DE TURNOS - VERSIÓN 2.9.3
-- ==========================================
-- Propósito: Cerrar todos los turnos abiertos para testing limpio
-- Fecha: 2026-01-12
-- Uso: Ejecutar antes de probar la nueva implementación
-- 1. Ver turnos que se van a cerrar (OPCIONAL - Para verificar primero)
SELECT id,
    store_id,
    opened_by,
    start_time,
    status,
    EXTRACT(
        EPOCH
        FROM (NOW() - start_time)
    ) / 3600 as horas_abierto
FROM shifts
WHERE status = 'OPEN';
-- 2. CERRAR TODOS LOS TURNOS ABIERTOS
UPDATE shifts
SET status = 'CLOSED',
    end_time = NOW(),
    notes = CASE
        WHEN notes IS NULL
        OR notes = '' THEN 'Reinicio de sistema por actualización v2.9.3'
        ELSE notes || ' | Reinicio de sistema por actualización v2.9.3'
    END
WHERE status = 'OPEN';
-- 3. Verificar que se cerraron correctamente
SELECT COUNT(*) as turnos_cerrados,
    'Turnos cerrados exitosamente' as mensaje
FROM shifts
WHERE notes LIKE '%v2.9.3%';
-- 4. Confirmar que NO quedan turnos abiertos
SELECT COUNT(*) as turnos_abiertos,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ Sistema limpio - Listo para testing'
        ELSE '⚠️ Aún hay turnos abiertos - Revisar'
    END as estado
FROM shifts
WHERE status = 'OPEN';
-- ==========================================
-- RESULTADO ESPERADO
-- ==========================================
-- - Todos los turnos OPEN → CLOSED
-- - end_time = NOW()
-- - notes = 'Reinicio de sistema por actualización v2.9.3'
-- - Sistema listo para login limpio