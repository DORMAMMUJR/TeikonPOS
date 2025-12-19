
import React from 'react';
import { Product } from '../types';
import { PackageOpen, AlertTriangle } from 'lucide-react';

interface InventoryTableProps {
  inventory: Product[];
}

const InventoryTable: React.FC<InventoryTableProps> = ({ inventory }) => {
  if (inventory.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
        <PackageOpen className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
        <p className="mt-1 text-sm text-gray-500">Comienza registrando un nuevo producto.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-6">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
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
                {inventory.map((product) => (
                  <tr key={product.sku} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.stock < 0 ? 'bg-red-600 text-white animate-pulse' :
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
        </div>
      </div>
    </div>
  );
};

export default InventoryTable;
