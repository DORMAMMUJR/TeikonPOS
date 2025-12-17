import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import Button from './Button';
import Modal from './Modal';
import { Edit, Plus, Search, Image as ImageIcon, Upload } from 'lucide-react';

const ProductList: React.FC = () => {
  const { products, addProduct, updateProduct, currentUserRole } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.sku || !editingProduct.name) return;

    const productData = {
      ...editingProduct,
      stock: editingProduct.stock || 0,
      costPrice: editingProduct.costPrice || 0,
      salePrice: editingProduct.salePrice || 0,
      minStock: editingProduct.minStock || 0,
      isActive: editingProduct.isActive !== undefined ? editingProduct.isActive : true,
      image: editingProduct.image || undefined
    } as Product;

    if (editingProduct.id) {
      updateProduct(productData);
    } else {
      addProduct({ ...productData, id: crypto.randomUUID() });
    }
    setIsModalOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openNew = () => {
    setEditingProduct({ isActive: true });
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct({ ...p });
    setIsModalOpen(true);
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="info" onClick={openNew} className="shadow-md">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Producto
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Imagen</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Precio Venta</th>
                {currentUserRole === 'admin' && (
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Costo</th>
                )}
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map(p => (
                <tr key={p.id} className={`${!p.isActive ? 'bg-gray-50 dark:bg-gray-900 opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} transition-colors`}>
                   <td className="px-6 py-2 whitespace-nowrap">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                        <ImageIcon size={16} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{p.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{p.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">${p.salePrice}</td>
                  {currentUserRole === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">${p.costPrice}</td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${p.stock <= p.minStock ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                      <Edit className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct.id ? "Editar Producto" : "Nuevo Producto"}>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Image Upload */}
          <div className="flex items-center gap-4 mb-4">
            <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center overflow-hidden relative">
              {editingProduct.image ? (
                <img src={editingProduct.image} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Imagen del Producto</label>
              <div className="flex items-center">
                 <label className="cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-colors flex items-center gap-2">
                    <Upload size={16}/>
                    <span>Subir Imagen</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                 </label>
                 {editingProduct.image && (
                   <button type="button" onClick={() => setEditingProduct(p => ({...p, image: undefined}))} className="ml-2 text-sm text-red-500 hover:text-red-700">Eliminar</button>
                 )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Formatos: JPG, PNG, WEBP (Max 1MB recomendado)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">SKU</label>
              <input 
                required 
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white" 
                value={editingProduct.sku || ''} 
                onChange={e => setEditingProduct(prev => ({...prev, sku: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Categoría</label>
              <input 
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white" 
                value={editingProduct.category || ''} 
                onChange={e => setEditingProduct(prev => ({...prev, category: e.target.value}))}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Nombre</label>
            <input 
              required 
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white" 
              value={editingProduct.name || ''} 
              onChange={e => setEditingProduct(prev => ({...prev, name: e.target.value}))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Precio Venta</label>
              <input 
                type="number" required min="0" step="0.01"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white" 
                value={editingProduct.salePrice || ''} 
                onChange={e => setEditingProduct(prev => ({...prev, salePrice: parseFloat(e.target.value)}))}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Costo Compra</label>
              <input 
                type="number" required min="0" step="0.01"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white" 
                value={editingProduct.costPrice || ''} 
                onChange={e => setEditingProduct(prev => ({...prev, costPrice: parseFloat(e.target.value)}))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Stock Inicial / Actual</label>
              <input 
                type="number" required
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white disabled:opacity-50" 
                value={editingProduct.stock || 0} 
                onChange={e => setEditingProduct(prev => ({...prev, stock: parseInt(e.target.value)}))}
                disabled={!!editingProduct.id} 
              />
              {editingProduct.id && <span className="text-xs text-gray-500 dark:text-gray-400">Usa el módulo de inventario para ajustar.</span>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Stock Mínimo</label>
              <input 
                type="number" required
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white" 
                value={editingProduct.minStock || 0} 
                onChange={e => setEditingProduct(prev => ({...prev, minStock: parseInt(e.target.value)}))}
              />
            </div>
          </div>

          <div className="flex items-center">
             <input 
                type="checkbox"
                checked={editingProduct.isActive}
                onChange={e => setEditingProduct(prev => ({...prev, isActive: e.target.checked}))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
             />
             <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Producto Activo</label>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
            <Button variant="primary" type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductList;