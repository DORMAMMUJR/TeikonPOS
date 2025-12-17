import React, { useState } from 'react';
import { Product } from '../types';
import Button from './Button';

interface RestockFormProps {
  inventory: Product[];
  onUpdate: (sku: string, amountToAdd: number) => void;
  onCancel: () => void;
}

const RestockForm: React.FC<RestockFormProps> = ({ inventory, onUpdate, onCancel }) => {
  const [selectedSku, setSelectedSku] = useState('');
  const [amount, setAmount] = useState<string>(''); // Keep as string to handle empty input better

  const selectedProduct = inventory.find(p => p.sku === selectedSku);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(amount);
    if (!selectedSku || isNaN(amountNum)) return;
    
    onUpdate(selectedSku, amountNum);
    setSelectedSku('');
    setAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="productSelect" className="block text-sm font-medium text-gray-700">
          Selecciona Producto
        </label>
        <div className="mt-1">
          <select
            id="productSelect"
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
          >
            <option value="">-- Seleccionar --</option>
            {inventory.map((product) => (
              <option key={product.sku} value={product.sku}>
                {product.sku} - {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <p className="text-sm text-gray-500">Stock Actual</p>
        <p className="text-2xl font-bold text-gray-900">
          {selectedProduct ? selectedProduct.stock : '-'}
        </p>
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Sumar Unidades (+)
        </label>
        <div className="mt-1">
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Cantidad a agregar"
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 border rounded-md p-2"
            disabled={!selectedSku}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
           Ingresa un número negativo para restar stock.
        </p>
      </div>

      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
        <Button 
          type="submit" 
          variant="primary" 
          fullWidth
          disabled={!selectedSku || !amount}
          className="sm:col-start-2"
        >
          Actualizar Stock
        </Button>
        <Button 
          type="button" 
          variant="secondary" 
          fullWidth
          onClick={onCancel}
          className="sm:col-start-1 mt-3 sm:mt-0"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default RestockForm;