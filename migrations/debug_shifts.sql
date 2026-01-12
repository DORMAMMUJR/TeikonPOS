-- 🕵️‍♂️ Inspector de Turnos Recientes
-- Ejecuta esto para ver qué está pasando realmente en la base de datos
SELECT s.id,
    s.store_id,
    s.opened_by,
    s.status,
    s.initial_amount,
    s.start_time,
    s.end_time,
    -- Intenta hacer join si existen las tablas, si no, comenta estas líneas
    u.username as opened_by_user
FROM shifts s
    LEFT JOIN "Users" u ON s.opened_by = u.id -- Atención a las comillas en "Users" si es case sensitive
ORDER BY s.start_time DESC
LIMIT 10;