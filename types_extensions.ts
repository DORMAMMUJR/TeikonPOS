import { Sale } from './types.ts';
import { Product } from "./Product.ts";

// Add PendingSale type if not already in types.ts
export interface PendingSale extends Omit<Sale, 'id'> {
    tempId: string;
    createdAt: string;
}
