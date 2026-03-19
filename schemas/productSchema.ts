import { z } from 'zod';

/**
 * Zod validation schema for the Product model.
 *
 * Rules:
 *  - id        → valid UUID v4
 *  - sku       → string, minimum 3 characters
 *  - name      → non-empty string
 *  - salePrice → positive number   (> 0)
 *  - costPrice → positive number   (> 0)
 *  - stock     → non-negative integer (>= 0)
 *  - isActive  → boolean, defaults to true when omitted
 *
 * Optional / contextual fields from Product.ts are included as
 * optional so the schema can validate full Product objects without
 * breaking existing code that already carries those fields.
 */
export const ProductSchema = z.object({
  // ── Required identity fields ──────────────────────────────────────
  id: z
    .string()
    .uuid({ message: 'id must be a valid UUID (v4)' }),

  sku: z
    .string()
    .min(3, { message: 'SKU must be at least 3 characters long' }),

  name: z
    .string()
    .min(1, { message: 'Product name cannot be empty' }),

  // ── Pricing ───────────────────────────────────────────────────────
  salePrice: z
    .number()
    .positive({ message: 'salePrice must be greater than 0' }),

  costPrice: z
    .number()
    .positive({ message: 'costPrice must be greater than 0' }),

  // ── Inventory ─────────────────────────────────────────────────────
  stock: z
    .number()
    .int({ message: 'stock must be an integer' })
    .nonnegative({ message: 'stock cannot be negative' }),

  // ── Status ────────────────────────────────────────────────────────
  isActive: z
    .boolean()
    .default(true),

  // ── Optional / contextual fields (preserve compatibility) ─────────
  storeId:    z.string().optional(),
  category:   z.string().optional(),
  unitProfit: z.number().optional(),
  minStock:   z.number().int().nonnegative().optional(),
  taxRate:    z.number().min(0).max(1).optional(),
  image:      z.string().url({ message: 'image must be a valid URL' }).optional().or(z.literal('')),
});

/**
 * TypeScript type inferred directly from the schema.
 * Use this instead of the plain interface whenever you need
 * guaranteed runtime-validated data.
 */
export type ValidatedProduct = z.infer<typeof ProductSchema>;

/**
 * Convenience helpers
 */

/** Parse and throw on invalid data (use at trust boundaries: API responses, form submissions). */
export const parseProduct = (data: unknown): ValidatedProduct =>
  ProductSchema.parse(data);

/** Safe parse — returns { success, data } or { success: false, error } without throwing. */
export const safeParseProduct = (data: unknown) =>
  ProductSchema.safeParse(data);
