import { z } from 'zod';
import { ProductSchema, ValidatedProduct } from '../schemas/productSchema';

// ─── Key normalization map ────────────────────────────────────────────────────
// Maps any known alias (lowercase) → canonical ProductSchema key.
const KEY_ALIASES: Record<string, keyof z.input<typeof ProductSchema>> = {
  // id
  id: 'id',

  // sku
  sku: 'sku',
  'código': 'sku',
  codigo: 'sku',
  clave: 'sku',
  'cod.': 'sku',
  cod: 'sku',
  barcode: 'sku',
  'código de barras': 'sku',

  // name
  name: 'name',
  nombre: 'name',
  producto: 'name',
  descripcion: 'name',
  'descripción': 'name',
  description: 'name',

  // salePrice
  saleprice: 'salePrice',
  'sale price': 'salePrice',
  'precio venta': 'salePrice',
  'precio de venta': 'salePrice',
  'p. venta': 'salePrice',
  pventa: 'salePrice',
  price: 'salePrice',
  precio: 'salePrice',

  // costPrice
  costprice: 'costPrice',
  'cost price': 'costPrice',
  'precio costo': 'costPrice',
  'precio de costo': 'costPrice',
  'costo': 'costPrice',
  'p. costo': 'costPrice',
  pcosto: 'costPrice',
  cost: 'costPrice',

  // stock
  stock: 'stock',
  existencia: 'stock',
  existencias: 'stock',
  cantidad: 'stock',
  qty: 'stock',
  inventory: 'stock',
  inventario: 'stock',

  // isActive
  isactive: 'isActive',
  activo: 'isActive',
  active: 'isActive',
  habilitado: 'isActive',
  enabled: 'isActive',

  // optional fields
  storeid: 'storeId',
  'store id': 'storeId',
  tienda: 'storeId',

  category: 'category',
  categoria: 'category',
  'categoría': 'category',

  unitprofit: 'unitProfit',
  ganancia: 'unitProfit',
  utilidad: 'unitProfit',

  minstock: 'minStock',
  'stock minimo': 'minStock',
  'stock mínimo': 'minStock',
  minimo: 'minStock',

  taxrate: 'taxRate',
  iva: 'taxRate',
  impuesto: 'taxRate',
  tax: 'taxRate',

  image: 'image',
  imagen: 'image',
  foto: 'image',
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ImportError {
  /** 0-based index of the row in the original input array */
  index: number;
  /** Raw object as received from the CSV parser */
  raw: Record<string, unknown>;
  /** Human-readable list of validation failures */
  reasons: string[];
}

export interface ParseProductImportResult {
  validProducts: ValidatedProduct[];
  errors: ImportError[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize a single raw CSV key to its canonical ProductSchema counterpart.
 * Returns `null` if the key is unrecognized.
 */
function normalizeKey(rawKey: string): keyof z.input<typeof ProductSchema> | null {
  const cleaned = rawKey.trim().toLowerCase();
  return KEY_ALIASES[cleaned] ?? null;
}

/**
 * Coerce common string representations to the expected primitive types
 * so Zod integer/number/boolean validators work correctly.
 */
function coerceValue(key: keyof z.input<typeof ProductSchema>, value: unknown): unknown {
  if (value === null || value === undefined || value === '') return value;

  switch (key) {
    case 'salePrice':
    case 'costPrice':
    case 'unitProfit':
    case 'taxRate':
    case 'minStock':
    case 'stock': {
      const n = Number(String(value).replace(/[,$\s]/g, ''));
      return isNaN(n) ? value : n;
    }
    case 'isActive': {
      if (typeof value === 'boolean') return value;
      const s = String(value).trim().toLowerCase();
      if (['1', 'true', 'yes', 'sí', 'si', 'activo', 'active'].includes(s)) return true;
      if (['0', 'false', 'no', 'inactivo', 'inactive'].includes(s)) return false;
      return value;
    }
    default:
      return typeof value === 'string' ? value.trim() : value;
  }
}

/**
 * Transform a raw CSV row into a normalized object whose keys match
 * the ProductSchema field names. Does NOT mutate the original object.
 */
function normalizeRow(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [rawKey, rawValue] of Object.entries(raw)) {
    const canonicalKey = normalizeKey(rawKey);
    if (canonicalKey !== null) {
      // Only set the first occurrence of a canonical key to avoid overwriting
      if (!(canonicalKey in normalized)) {
        normalized[canonicalKey] = coerceValue(canonicalKey, rawValue);
      }
    }
    // Unknown keys are intentionally dropped — schema will reject stray fields
  }

  return normalized;
}

// ─── Main utility ─────────────────────────────────────────────────────────────

/**
 * Parse and validate an array of raw CSV row objects.
 *
 * @param rows   Raw objects from a CSV parser (e.g. papaparse output)
 * @returns      `{ validProducts, errors }` — never throws.
 *
 * @example
 * ```ts
 * const { validProducts, errors } = parseProductImport(csvRows);
 * if (errors.length) console.warn('Import issues:', errors);
 * await bulkInsert(validProducts);
 * ```
 */
export function parseProductImport(
  rows: Record<string, unknown>[],
): ParseProductImportResult {
  const validProducts: ValidatedProduct[] = [];
  const errors: ImportError[] = [];

  rows.forEach((raw, index) => {
    const normalized = normalizeRow(raw);
    const result = ProductSchema.safeParse(normalized);

    if (result.success) {
      validProducts.push(result.data);
    } else {
      const reasons = result.error.issues.map(
        (issue) => `[${issue.path.join('.') || 'root'}] ${issue.message}`,
      );
      errors.push({ index, raw, reasons });
    }
  });

  return { validProducts, errors };
}
