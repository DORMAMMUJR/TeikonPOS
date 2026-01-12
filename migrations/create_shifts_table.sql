-- ==========================================
-- MIGRACIÓN: Crear tabla de Turnos de Caja
-- ==========================================
-- Fecha: 2026-01-12
-- Propósito: Solucionar error al cerrar caja por tabla faltante
-- Crear tabla de Turnos de Caja (Shifts)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    opened_by UUID NOT NULL,
    -- ID del usuario que abrió
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    initial_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(10, 2),
    expected_amount DECIMAL(10, 2),
    cash_sales DECIMAL(10, 2) DEFAULT 0,
    card_sales DECIMAL(10, 2) DEFAULT 0,
    transfer_sales DECIMAL(10, 2) DEFAULT 0,
    refunds DECIMAL(10, 2) DEFAULT 0,
    expenses DECIMAL(10, 2) DEFAULT 0,
    difference DECIMAL(10, 2),
    -- Diferencia entre esperado y real
    status VARCHAR(20) DEFAULT 'OPEN',
    -- 'OPEN' o 'CLOSED'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Índices para que las consultas sean rápidas
CREATE INDEX IF NOT EXISTS idx_shifts_store_id ON shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_created_at ON shifts(created_at);
-- Verificar que la tabla se creó correctamente
SELECT table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'shifts'
ORDER BY ordinal_position;