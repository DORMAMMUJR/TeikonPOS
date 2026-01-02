import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { Button } from '../src/components/ui';

interface NewProductFormProps {
  inventory: Product[];
  // Fix: changed signature to accept only the fields provided by this form
  onSave: (product: Pick<Product, 'sku' | 'name' | 'stock'>) => void;
  onCancel: () => void;
}

const NewProductForm: React.FC<NewProductFormProps> = ({ inventory, onSave, onCancel }) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [stock, setStock] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate SKU uniqueness as user types
    if (sku) {
      const exists = inventory.some(p => p.sku.toLowerCase() === sku.toLowerCase());
      if (exists) {
        setError('¡Error! Este SKU ya existe.');
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }, [sku, inventory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (error) return;
    if (!sku.trim() || !name.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    // Fix: the passed object now matches Pick<Product, 'sku' | 'name' | 'stock'>
    onSave({
      sku: sku.trim(),
      name: name.trim(),
      stock: stock
    });

    // Reset form (though typically component unmounts)
    setSku('');
    setName('');
    setStock(0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
          SKU (Código único)
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border rounded-md p-2 ${error && error.includes('SKU') ? 'border-red-300' : 'border-gray-300'
              }`}
            placeholder="Ej. A-001"
            required
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nombre del Producto
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 border rounded-md p-2"
            placeholder="Ej. Zapatos Deportivos"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
          Stock Inicial
        </label>
        <div className="mt-1">
          <input
            type="number"
            id="stock"
            value={stock}
            onChange={(e) => setStock(parseInt(e.target.value) || 0)}
            min="0"
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 border rounded-md p-2"
            required
          />
        </div>
      </div>

      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
        <Button
          type="submit"
          // Fixed variant: changed from 'success' to 'primary' as 'success' is not valid
          variant="primary"
          fullWidth
          disabled={!!error || !sku || !name}
          className="sm:col-start-2"
        >
          Guardar
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

export default NewProductForm;
