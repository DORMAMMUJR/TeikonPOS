
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 h-3.5 w-3.5" />
          <input 
            type="text" 
            placeholder="Buscar por SKU/Nombre..." 
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800/40 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 shadow-sm transition-colors"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={openNew} 
          className="flex items-center justify-center px-4 py-2 h-10 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 transition-all active:scale-95"
        >
          <Plus size={14} className="mr-1.5" /> Agregar Item
        </button>
      </div>

      <div className="card-premium overflow-hidden border-t-4 border-t-orange-500">
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-orange-50/50 dark:bg-orange-950/10">
              <tr>
                <th className="px-4 py-3 text-left text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Ítem</th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">SKU</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Precio</th>
                {currentUserRole === 'admin' && (
                  <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">Costo</th>
                )}
                <th className="px-4 py-3 text-center text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Stock</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map(p => {
                const isNegative = p.stock < 0;
                const isLow = p.stock <= p.minStock && !isNegative;
                
                return (
                  <tr key={p.id} className={`${!p.isActive ? 'opacity-30' : 'hover:bg-orange-500/5'} transition-colors`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} className="h-8 w-8 rounded-lg object-cover border border-orange-100 dark:border-orange-900/20 shadow-sm" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-200 dark:text-orange-800 border border-orange-100 dark:border-orange-900/10">
                            <ImageIcon size={14} />
                          </div>
                        )}
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] font-black text-brand-muted uppercase tracking-tighter">{p.sku}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-right text-slate-900 dark:text-brand-text font-black">${p.salePrice}</td>
                    {currentUserRole === 'admin' && (
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-right text-brand-muted/60">${p.costPrice}</td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 inline-flex text-[9px] leading-tight font-black uppercase rounded ${
                          isNegative ? 'bg-red-600 text-white' : 
                          isLow ? 'bg-amber-500 text-black' : 
                          'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40'
                        }`}>
                          {p.stock}
                        </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button onClick={() => openEdit(p)} className="text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors p-1">
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct.id ? "Modificar" : "Nuevo Ítem"}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-20 w-20 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/40 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
              {editingProduct.image ? (
                <img src={editingProduct.image} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="text-orange-200 dark:text-orange-800" size={32} />
              )}
            </div>
            <div className="flex-1">
              <label className="cursor-pointer bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors flex items-center gap-2 rounded-xl inline-flex shadow-sm">
                <Upload size={14}/>
                <span>Cargar Imagen</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">SKU</label>
              <input required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text uppercase outline-none focus:border-orange-500 shadow-sm" value={editingProduct.sku || ''} onChange={e => setEditingProduct(prev => ({...prev, sku: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Categoría</label>
              <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text uppercase outline-none focus:border-orange-500 shadow-sm" value={editingProduct.category || ''} onChange={e => setEditingProduct(prev => ({...prev, category: e.target.value}))} />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Nombre del Producto</label>
            <input required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text uppercase outline-none focus:border-orange-500 shadow-sm" value={editingProduct.name || ''} onChange={e => setEditingProduct(prev => ({...prev, name: e.target.value}))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Precio Venta</label>
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text outline-none focus:border-orange-500 shadow-sm" value={editingProduct.salePrice || ''} onChange={e => setEditingProduct(prev => ({...prev, salePrice: parseFloat(e.target.value)}))} />
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Costo Compra</label>
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text outline-none focus:border-orange-500 shadow-sm" value={editingProduct.costPrice || ''} onChange={e => setEditingProduct(prev => ({...prev, costPrice: parseFloat(e.target.value)}))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Stock Inicial</label>
              <input type="number" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text outline-none focus:border-orange-500 disabled:opacity-30 shadow-sm" value={editingProduct.stock || 0} onChange={e => setEditingProduct(prev => ({...prev, stock: parseInt(e.target.value)}))} disabled={!!editingProduct.id} />
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Mínimo Crítico</label>
              <input type="number" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text outline-none focus:border-orange-500 shadow-sm" value={editingProduct.minStock || 0} onChange={e => setEditingProduct(prev => ({...prev, minStock: parseInt(e.target.value)}))} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={() => setIsModalOpen(false)} 
              type="button" 
              className="flex-1 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-white"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-xl bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-600/20 active:scale-95"
            >
              Confirmar Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductList;
