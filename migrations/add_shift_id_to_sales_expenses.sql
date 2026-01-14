-- ==========================================
-- MIGRACIÓN: Agregar shift_id a Sales y Expenses
-- ==========================================
-- Proyecto: TeikonPOS
-- Fecha: 2026-01-13
-- Propósito: Sincronizar esquema de base de datos con modelos Sequelize
-- Riesgo: BAJO (no destructivo, allowNull: true)
-- ==========================================
-- ==========================================
-- 1. AGREGAR COLUMNA shift_id A SALES
-- ==========================================
DO $$ BEGIN -- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sales'
        AND column_name = 'shift_id'
) THEN -- Agregar columna
ALTER TABLE sales
ADD COLUMN shift_id INTEGER;
RAISE NOTICE 'Columna shift_id agregada a tabla sales';
ELSE RAISE NOTICE 'Columna shift_id ya existe en tabla sales';
END IF;
END $$;
-- Agregar foreign key constraint (solo si no existe)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sales_shift'
) THEN
ALTER TABLE sales
ADD CONSTRAINT fk_sales_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE
SET NULL;
RAISE NOTICE 'Foreign key fk_sales_shift creada';
ELSE RAISE NOTICE 'Foreign key fk_sales_shift ya existe';
END IF;
END $$;
-- Crear índice para performance
CREATE INDEX IF NOT EXISTS sales_shift_id_idx ON sales(shift_id);
-- ==========================================
-- 2. AGREGAR COLUMNA shift_id A EXPENSES
-- ==========================================
DO $$ BEGIN -- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'expenses'
        AND column_name = 'shift_id'
) THEN -- Agregar columna
ALTER TABLE expenses
ADD COLUMN shift_id INTEGER;
RAISE NOTICE 'Columna shift_id agregada a tabla expenses';
ELSE RAISE NOTICE 'Columna shift_id ya existe en tabla expenses';
END IF;
END $$;
-- Agregar foreign key constraint (solo si no existe)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_expenses_shift'
) THEN
ALTER TABLE expenses
ADD CONSTRAINT fk_expenses_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE
SET NULL;
RAISE NOTICE 'Foreign key fk_expenses_shift creada';
ELSE RAISE NOTICE 'Foreign key fk_expenses_shift ya existe';
END IF;
END $$;
-- Crear índice para performance
CREATE INDEX IF NOT EXISTS expenses_shift_id_idx ON expenses(shift_id);
-- ==========================================
-- 3. VERIFICACIÓN POST-MIGRACIÓN
-- ==========================================
-- Verificar estructura de sales
SELECT 'sales' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sales'
    AND column_name = 'shift_id';
-- Verificar estructura de expenses
SELECT 'expenses' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'expenses'
    AND column_name = 'shift_id';
-- Verificar índices
SELECT tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('sales', 'expenses')
    AND indexname LIKE '%shift_id%';
-- Verificar foreign keys
SELECT tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('sales', 'expenses')
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'shift_id';
-- ==========================================
-- 4. ESTADÍSTICAS (OPCIONAL)
-- ==========================================
-- Contar ventas con y sin shift_id
SELECT 'sales' as tabla,
    COUNT(*) FILTER (
        WHERE shift_id IS NOT NULL
    ) as con_shift,
    COUNT(*) FILTER (
        WHERE shift_id IS NULL
    ) as sin_shift,
    COUNT(*) as total
FROM sales;
-- Contar gastos con y sin shift_id
SELECT 'expenses' as tabla,
    COUNT(*) FILTER (
        WHERE shift_id IS NOT NULL
    ) as con_shift,
    COUNT(*) FILTER (
        WHERE shift_id IS NULL
    ) as sin_shift,
    COUNT(*) as total
FROM expenses;
-- ==========================================
-- NOTAS IMPORTANTES
-- ==========================================
-- 1. Esta migración es IDEMPOTENTE (se puede ejecutar múltiples veces)
-- 2. NO elimina datos existentes
-- 3. allowNull: true permite ventas/gastos históricos sin shift_id
-- 4. Los índices mejoran performance de queries por turno
-- 5. ON DELETE SET NULL evita errores si se elimina un shift
-- ==========================================