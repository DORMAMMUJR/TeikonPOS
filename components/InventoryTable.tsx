
import React, { useState, useMemo } from 'react';
import { Product } from "@/Product";
import { PackageOpen, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface InventoryTableProps {
  inventory: Product[];
}

const InventoryTable: React.FC<InventoryTableProps> = ({ inventory }) => {
  // Estado para controlar qué categorías están expandidas
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Agrupar productos por categoría
  const groupedInventory = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};

    inventory.forEach(product => {
      // Sanitizar categoría: Si es null, undefined o vacío, usar "General"
      const category = (product.category && product.category.trim() !== '')
        ? product.category.trim()
        : 'General';

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(product);
    });

    // Ordenar categorías alfabéticamente
    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {} as { [key: string]: Product[] });
  }, [inventory]);

  // Toggle expansión de categoría
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Expandir todas las categorías por defecto si hay pocas
  React.useEffect(() => {
    const categories = Object.keys(groupedInventory);
    if (categories.length <= 5) {
      setExpandedCategories(new Set(categories));
    }
  }, [groupedInventory]);

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
        <PackageOpen className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
        <p className="mt-1 text-sm text-gray-500">Comienza registrando un nuevo producto.</p>
      </div>
    );
  }

  const categories = Object.keys(groupedInventory);

  return (
    <div className="flex flex-col mt-6 space-y-4">
      {categories.map(category => {
        const products = groupedInventory[category];
        const isExpanded = expandedCategories.has(category);
        const lowStockCount = products.filter(p => p.stock <= p.minStock && p.stock >= 0).length;
        const negativeStockCount = products.filter(p => p.stock < 0).length;

        return (
          <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-600 transition-transform" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-600 transition-transform" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {category}
                </h3>
                <span className="text-sm text-gray-500 font-medium">
                  ({products.length} {products.length === 1 ? 'producto' : 'productos'})
                </span>
              </div>

              {/* Indicadores de stock */}
              <div className="flex items-center gap-2">
                {negativeStockCount > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {negativeStockCount} descuadre{negativeStockCount > 1 ? 's' : ''}
                  </span>
                )}
                {lowStockCount > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                    {lowStockCount} stock bajo
                  </span>
                )}
              </div>
            </button>

            {/* Products Table */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Actual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.sku} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock < 0 ? 'bg-red-600 text-white animate-pulse' :
                              product.stock > 10 ? 'bg-green-100 text-green-800' :
                                product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                              }`}>
                              {product.stock}
                            </span>
                            {product.stock < 0 && (
                              <span className="text-[10px] text-red-600 font-black uppercase flex items-center gap-1">
                                <AlertTriangle size={10} /> DESCUADRE
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InventoryTable;
