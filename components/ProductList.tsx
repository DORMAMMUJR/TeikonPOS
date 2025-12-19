
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import Button from './Button';
import Modal from './Modal';
import { Edit, Plus, Search, Image as ImageIcon, Upload, AlertTriangle } from 'lucide-react';

const ProductList: React.FC = () => {
  const { products, addProduct, updateProduct, currentUserRole } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.sku || !editingProduct.name) return;

    const productData = {
      sku: editingProduct.sku,
      name: editingProduct.name,
      category: editingProduct.category || '',
      stock: editingProduct.stock || 0,
      costPrice: editingProduct.costPrice || 0,
      salePrice: editingProduct.salePrice || 0,
      minStock: editingProduct.minStock || 0,
      taxRate: editingProduct.taxRate || 0,
      isActive: editingProduct.isActive !== undefined ? editingProduct.isActive : true,
      image: editingProduct.image || undefined
    };

    if (editingProduct.id) {
      updateProduct({ 
        ...productData, 
        id: editingProduct.id,
        ownerId: editingProduct.ownerId || ''
      } as Product);
    } else {
      addProduct(productData);
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted h-4 w-4" />
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            className="w-full pl-9 pr-4 py-2 bg-brand-panel border border-brand-border rounded-lg text-brand-text focus:ring-1 focus:ring-brand-text focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Producto
        </Button>
      </div>

      <div className="bg-brand-panel shadow-lg rounded-xl overflow-hidden border border-brand-border transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-brand-text/5">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-brand-muted uppercase tracking-widest">Imagen</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-brand-muted uppercase tracking-widest">SKU</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-brand-muted uppercase tracking-widest">Nombre</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-brand-muted uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-brand-muted uppercase tracking-widest">Precio Venta</th>
                {currentUserRole === 'admin' && (
                  <th className="px-6 py-4 text-right text-[10px] font-black text-brand-muted uppercase tracking-widest">Costo</th>
                )}
                <th className="px-6 py-4 text-center text-[10px] font-black text-brand-muted uppercase tracking-widest">Stock</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-brand-muted uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map(p => {
                const isNegative = p.stock < 0;
                const isLow = p.stock <= p.minStock && !isNegative;
                
                return (
                  <tr key={p.id} className={`${!p.isActive ? 'opacity-40' : 'hover:bg-brand-text/5'} transition-colors ${isNegative ? 'bg-red-500/5' : ''}`}>
                    <td className="px-6 py-2 whitespace-nowrap">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-10 w-10 rounded-full object-cover border border-brand-border" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-text uppercase">{p.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">{p.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-muted">{p.category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-brand-text font-bold">${p.salePrice}</td>
                    {currentUserRole === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-brand-muted">${p.costPrice}</td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-black uppercase rounded-full transition-all ${
                          isNegative ? 'bg-red-600 text-white animate-pulse' : 
                          isLow ? 'bg-yellow-500 text-black' : 
                          'bg-brand-text text-brand-bg'
                        }`}>
                          {p.stock}
                        </span>
                        {isNegative && (
                          <span className="text-[7px] font-black text-red-600 uppercase tracking-tighter flex items-center gap-1">
                            <AlertTriangle size={8} /> DESCUADRE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button onClick={() => openEdit(p)} className="text-brand-text hover:scale-110 transition-transform">
                        <Edit className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct.id ? "Editar Producto" : "Nuevo Producto"}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-6 mb-4">
            <div className="h-24 w-24 bg-brand-bg border border-brand-border cut-corner flex items-center justify-center overflow-hidden relative">
              {editingProduct.image ? (
                <img src={editingProduct.image} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="text-brand-muted" />
              )}
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">Imagen del Producto</label>
              <div className="flex items-center">
                 <label className="cursor-pointer bg-brand-bg border border-brand-border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-brand-text hover:bg-brand-text hover:text-brand-bg transition-colors flex items-center gap-2 cut-corner-sm">
                    <Upload size={14}/>
                    <span>Subir</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                 </label>
                 {editingProduct.image && (
                   <button type="button" onClick={() => setEditingProduct(p => ({...p, image: undefined}))} className="ml-4 text-[10px] font-black text-red-500 uppercase">Eliminar</button>
                 )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-brand-muted mb-2 tracking-widest">SKU</label>
              <input required className="w-full bg-brand-bg border border-brand-border cut-corner-sm p-3 text-sm text-brand-text uppercase outline-none focus:border-brand-text" value={editingProduct.sku || ''} onChange={e => setEditingProduct(prev => ({...prev, sku: e.target.value}))} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-brand-muted mb-2 tracking-widest">Categoría</label>
              <input className="w-full bg-brand-bg border border-brand-border cut-corner-sm p-3 text-sm text-brand-text uppercase outline-none focus:border-brand-text" value={editingProduct.category || ''} onChange={e => setEditingProduct(prev => ({...prev, category: e.target.value}))} />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-black uppercase text-brand-muted mb-2 tracking-widest">Nombre</label>
            <input required className="w-full bg-brand-bg border border-brand-border cut-corner-sm p-3 text-sm text-brand-text uppercase outline-none focus:border-brand-text" value={editingProduct.name || ''} onChange={e => setEditingProduct(prev => ({...prev, name: e.target.value}))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-brand-muted mb-2 tracking-widest">Precio Venta</label>
              <input type="number" required min="0" step="0.01" className="w-full bg-brand-bg border border-brand-border cut-corner-sm p-3 text-sm text-brand-text outline-none focus:border-brand-text" value={editingProduct.salePrice || ''} onChange={e => setEditingProduct(prev => ({...prev, salePrice: parseFloat(e.target.value)}))} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-brand-muted mb-2 tracking-widest">Costo Compra</label>
              <input type="number" required min="0" step="0.01" className="w-full bg-brand-bg border border-brand-border cut-corner-sm p-3 text-sm text-brand-text outline-none focus:border-brand-text" value={editingProduct.costPrice || ''} onChange={e => setEditingProduct(prev => ({...prev, costPrice: parseFloat(e.target.value)}))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-brand-muted mb-2 tracking-widest">Stock</label>
              <input type="number" required className="w-full bg-brand-bg border border-brand-border cut-corner-sm p-3 text-sm text-brand-text outline-none focus:border-brand-text disabled:opacity-30" value={editingProduct.stock || 0} onChange={e => setEditingProduct(prev => ({...prev, stock: parseInt(e.target.value)}))} disabled={!!editingProduct.id} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-brand-muted mb-2 tracking-widest">Minimo</label>
              <input type="number" required className="w-full bg-brand-bg border border-brand-border cut-corner-sm p-3 text-sm text-brand-text outline-none focus:border-brand-text" value={editingProduct.minStock || 0} onChange={e => setEditingProduct(prev => ({...prev, minStock: parseInt(e.target.value)}))} />
            </div>
          </div>

          <div className="flex items-center gap-3">
             <input type="checkbox" checked={editingProduct.isActive} onChange={e => setEditingProduct(prev => ({...prev, isActive: e.target.checked}))} className="h-4 w-4 rounded border-brand-border" />
             <label className="text-[10px] font-black uppercase text-brand-text tracking-widest">Producto Activo</label>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
            <Button variant="primary" type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductList;
