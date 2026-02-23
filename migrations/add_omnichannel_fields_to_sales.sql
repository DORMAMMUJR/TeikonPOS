-- Migration: add_omnichannel_fields_to_sales.sql
-- Description: Agrega campos para soporte omnicanal (Ventas Mayoristas, Pedidos, Entregas, E-commerce)

-- 1. Añadir nuevos campos de datos
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS sale_type VARCHAR(50) DEFAULT 'RETAIL',
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS ecommerce_order_id VARCHAR(100);

-- 2. Modificar el ENUM de status para soportar nuevos estados complejos
-- NOTA: PostgreSQL requiere ALTER TYPE para modificar un ENUM existente.
-- Los estados existentes son: 'ACTIVE', 'CANCELLED', 'PENDING_SYNC'
-- Nuevos estados a agregar: 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED' (para mayor claridad)

ALTER TYPE enum_sales_status ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE enum_sales_status ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE enum_sales_status ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE enum_sales_status ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE enum_sales_status ADD VALUE IF NOT EXISTS 'COMPLETED';
