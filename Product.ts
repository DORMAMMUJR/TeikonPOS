
export interface Product {
    id: string;
    storeId: string; // Cambiado de ownerId
    sku: string;
    name: string;
    category: string;
    costPrice: number; // Costo histórico
    salePrice: number;
    unitProfit: number;
    stock: number;
    minStock: number;
    taxRate: number;
    isActive: boolean;
    image?: string;
}
