-- Migration para cambiar el tipo de dato de la columna imagen
-- Ejecutar en la base de datos de producción

ALTER TABLE products 
ALTER COLUMN imagen TYPE TEXT;
