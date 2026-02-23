-- Este script agrega los nuevos valores de ENUM requeridos para la trazabilidad de inventario
-- a la tabla 'stock_movements' existente.

-- POSTGRESQL REQUIERE QUE ALTER TYPE CAMBIE FUERA DENTRO O FUERA DE UN BLOQUE DE TRANSACCION DEPENDIENDO DE LA VERSION, 
-- PERO GENERALMENTE FUNCIONA DIRECTAMENTE.

-- 1. Agregar MERMA/DESPERDICIO (SHRINKAGE)
ALTER TYPE "enum_stock_movements_tipo" ADD VALUE IF NOT EXISTS 'SHRINKAGE';

-- 2. Agregar CORRECCIÓN ADMINISTRATIVA (ADMIN_CORRECTION)
ALTER TYPE "enum_stock_movements_tipo" ADD VALUE IF NOT EXISTS 'ADMIN_CORRECTION';

-- Nota: Si tu base de datos no se llama exactamente así, puedes verificar el nombre del ENUM ejecutando:
-- SELECT typname FROM pg_type WHERE typcategory = 'E' AND typname LIKE '%stock_movements%';
