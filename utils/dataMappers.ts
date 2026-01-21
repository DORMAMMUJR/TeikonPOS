/**
 * Data Mapping Utilities
 * 
 * Standardizes conversion between backend (snake_case) and frontend (camelCase) data formats
 */

import { Product } from '../Product';
import { CashSession } from '../types';

/**
 * Maps backend shift data (snake_case) to frontend CashSession (camelCase)
 * 
 * @param backendShift - Raw shift data from backend API
 * @param userId - Current user ID for ownerId field
 * @returns Mapped CashSession object
 */
export function mapShiftToSession(backendShift: any, userId?: string): CashSession | null {
    // 1. VALIDACIÓN SEGURA: Si es nulo o vacío, retornamos null (no error)
    if (!backendShift || Object.keys(backendShift).length === 0) {
        return null;
    }

    // 2. Si tiene datos pero le falta el ID, ahí sí es un error de datos
    if (!backendShift.id) {
        console.warn('⚠️ Invalid shift data received:', backendShift);
        return null;
    }

    return {
        id: backendShift.id,
        startTime: backendShift.start_time || backendShift.startTime || new Date().toISOString(),
        startBalance: parseFloat(backendShift.initial_amount || backendShift.initialAmount || 0),
        expectedBalance: parseFloat(
            backendShift.expected_amount ||
            backendShift.expectedAmount ||
            backendShift.initial_amount ||
            backendShift.initialAmount ||
            0
        ),
        cashSales: parseFloat(backendShift.cash_sales || backendShift.cashSales || 0),
        refunds: 0,
        status: 'OPEN',
        ownerId: userId || backendShift.opened_by || backendShift.ownerId
    };
}

/**
 * Maps backend product data (Spanish, snake_case) to frontend Product (English, camelCase)
 * 
 * @param backendProduct - Raw product data from backend API
 * @returns Mapped Product object
 */
export function mapBackendProduct(backendProduct: any): Product {
    return {
        ...backendProduct,
        name: backendProduct.nombre || backendProduct.name || 'Sin Nombre',
        category: backendProduct.categoria || backendProduct.category || 'General',
        image: backendProduct.imagen || backendProduct.image,
        costPrice: Number(backendProduct.costPrice || 0),
        salePrice: Number(backendProduct.salePrice || 0),
        // Bidirectional mapping: backend 'activo' <-> frontend 'isActive'
        isActive: backendProduct.activo !== undefined
            ? backendProduct.activo
            : (backendProduct.isActive !== undefined ? backendProduct.isActive : true)
    } as Product;
}

/**
 * Maps frontend Product to backend format (Spanish, snake_case)
 * 
 * @param product - Frontend Product object
 * @param storeId - Store ID to assign to product
 * @returns Backend-compatible product object
 */
export function mapProductToBackend(product: Partial<Product>, storeId?: string): any {
    return {
        sku: product.sku,
        nombre: product.name,
        categoria: product.category || '',
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        stock: product.stock || 0,
        minStock: product.minStock || 0,
        taxRate: product.taxRate || 0,
        imagen: product.image,
        // Bidirectional mapping: frontend 'isActive' -> backend 'activo'
        activo: product.isActive !== undefined ? product.isActive : true,
        storeId: storeId
    };
}

/**
 * Validates that a product has all required fields
 * 
 * @param product - Product to validate
 * @returns true if valid, throws error if invalid
 */
export function validateProduct(product: Partial<Product>): boolean {
    if (!product.name || product.name.trim() === '') {
        throw new Error('Product name is required');
    }

    if (!product.sku || product.sku.trim() === '') {
        throw new Error('Product SKU is required');
    }

    if (product.salePrice === undefined || product.salePrice <= 0) {
        throw new Error('Product sale price must be greater than 0');
    }

    return true;
}

/**
 * Validates that a storeId exists and is valid
 * 
 * @param storeId - Store ID to validate
 * @param context - Context for error message (e.g., "create product")
 * @returns true if valid, throws error if invalid
 */
export function validateStoreId(storeId: string | undefined | null, context: string = 'operation'): boolean {
    if (!storeId || storeId.trim() === '') {
        throw new Error(`Store ID is required for ${context}. Please select a store.`);
    }

    return true;
}

/**
 * Safely retrieves storeId from multiple sources with fallback
 * 
 * @param currentUser - Current user object
 * @returns storeId or null if not found
 */
export function getStoreId(currentUser: any): string | null {
    // Priority 1: User's storeId
    if (currentUser?.storeId) {
        return currentUser.storeId;
    }

    // Priority 2: localStorage selectedStore
    try {
        const stored = localStorage.getItem('selectedStore');
        if (stored) {
            const parsed = JSON.parse(stored);
            const storeId = typeof parsed === 'object' ? (parsed.id || parsed.storeId) : parsed;
            if (storeId) {
                console.log('📦 Recovered storeId from localStorage:', storeId);
                return storeId;
            }
        }
    } catch (error) {
        console.warn('⚠️ Failed to parse selectedStore from localStorage:', error);
    }

    // Priority 3: Return null (caller should handle)
    console.warn('⚠️ No storeId found in any source');
    return null;
}
