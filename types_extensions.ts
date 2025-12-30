import { Product, Sale } from './types.ts';

// Add PendingSale type if not already in types.ts
export interface PendingSale extends Omit<Sale, 'id'> {
    tempId: string;
    createdAt: string;
}
