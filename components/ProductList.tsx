
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-brand-border">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted h-3.5 w-3.5" />
          <input 
            type="text" 
            placeholder="Buscar por SKU/Nombre..." 
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-text shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="primary" onClick={openNew} className="text-[9px] py-2 h-10 rounded-lg">
          <Plus size={14} className="mr-1.5" /> Agregar Item
        </Button>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-slate-50 dark:bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 text-left text-[9px] font-black text-brand-muted uppercase tracking-widest">Ítem</th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-brand-muted uppercase tracking-widest">SKU</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">Precio</th>
                {currentUserRole === 'admin' && (
                  <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">Costo</th>
                )}
                <th className="px-4 py-3 text-center text-[9px] font-black text-brand-muted uppercase tracking-widest">Stock</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-brand-muted uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map(p => {
                const isNegative = p.stock < 0;
                const isLow = p.stock <= p.minStock && !isNegative;
                
                return (
                  <tr key={p.id} className={`${!p.isActive ? 'opacity-30' : 'hover:bg-brand-text/5'} transition-colors`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-brand-border shadow-sm" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-brand-muted/20 border border-slate-200 dark:border-slate-800">
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
                          'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600'
                        }`}>
                          {p.stock}
                        </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button onClick={() => openEdit(p)} className="text-brand-muted hover:text-slate-900 dark:hover:text-white transition-colors">
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
            <div className="h-20 w-20 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
              {editingProduct.image ? (
                <img src={editingProduct.image} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="text-brand-muted/20" size={32} />
              )}
            </div>
            <div className="flex-1">
              <label className="cursor-pointer bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-brand-text hover:bg-slate-200 dark:hover:bg-white/5 transition-colors flex items-center gap-2 rounded-xl inline-flex shadow-sm">
                <Upload size={14}/>
                <span>Cargar Imagen</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">SKU</label>
              <input required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text uppercase outline-none focus:border-brand-text shadow-sm" value={editingProduct.sku || ''} onChange={e => setEditingProduct(prev => ({...prev, sku: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Categoría</label>
              <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text uppercase outline-none focus:border-brand-text shadow-sm" value={editingProduct.category || ''} onChange={e => setEditingProduct(prev => ({...prev, category: e.target.value}))} />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Nombre del Producto</label>
            <input required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text uppercase outline-none focus:border-brand-text shadow-sm" value={editingProduct.name || ''} onChange={e => setEditingProduct(prev => ({...prev, name: e.target.value}))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Precio Venta</label>
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text outline-none focus:border-brand-text shadow-sm" value={editingProduct.salePrice || ''} onChange={e => setEditingProduct(prev => ({...prev, salePrice: parseFloat(e.target.value)}))} />
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Costo Compra</label>
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text outline-none focus:border-brand-text shadow-sm" value={editingProduct.costPrice || ''} onChange={e => setEditingProduct(prev => ({...prev, costPrice: parseFloat(e.target.value)}))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Stock Inicial</label>
              <input type="number" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text outline-none focus:border-brand-text disabled:opacity-30 shadow-sm" value={editingProduct.stock || 0} onChange={e => setEditingProduct(prev => ({...prev, stock: parseInt(e.target.value)}))} disabled={!!editingProduct.id} />
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] font-black uppercase text-brand-muted mb-1 tracking-widest">Mínimo Crítico</label>
              <input type="number" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-brand-text outline-none focus:border-brand-text shadow-sm" value={editingProduct.minStock || 0} onChange={e => setEditingProduct(prev => ({...prev, minStock: parseInt(e.target.value)}))} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button" className="text-[9px] py-3 rounded-xl flex-1">Cancelar</Button>
            <Button variant="primary" type="submit" className="text-[9px] py-3 rounded-xl flex-1">Confirmar Item</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductList;
