
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import Button from './Button';
import Modal from './Modal';
import { Edit, Plus, Search, Image as ImageIcon, Upload, TrendingUp, DollarSign } from 'lucide-react';

const ProductList: React.FC = () => {
  const { products, addProduct, updateProduct, currentUserRole } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.sku || !editingProduct.name) return;

    // Numerical validation and parsing
    const purchaseCost = parseFloat((editingProduct.costPrice || 0).toString());
    const sellingPrice = parseFloat((editingProduct.salePrice || 0).toString());

    if (isNaN(purchaseCost) || isNaN(sellingPrice)) {
      alert("Costo de Compra o Precio de Venta no son números válidos.");
      return;
    }

    // Prevents saving if profit is negative
    if (sellingPrice < purchaseCost) {
      alert("PRECIO VENTA es menor que COSTO COMPRA. Por favor, revise los precios.");
      return;
    }

    // Calculate unit_profit as requested
    const unitProfit = sellingPrice - purchaseCost;

    const productData = {
      sku: editingProduct.sku,
      name: editingProduct.name,
      category: editingProduct.category || '',
      stock: editingProduct.stock || 0,
      costPrice: purchaseCost,
      salePrice: sellingPrice,
      unitProfit: unitProfit,
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
    setEditingProduct({ isActive: true, costPrice: 0, salePrice: 0 });
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

  const calculatedProfit = (editingProduct.salePrice || 0) - (editingProduct.costPrice || 0);
  const calculatedMargin = editingProduct.salePrice && editingProduct.salePrice > 0 
    ? (calculatedProfit / editingProduct.salePrice) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda Adaptable */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Buscar por SKU/Nombre..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800/40 rounded-lg text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          onClick={openNew} 
          className="bg-orange-600 hover:bg-orange-500 text-white rounded-lg shadow-lg shadow-orange-600/20"
        >
          <Plus size={16} className="mr-2" /> AGREGAR ITEM
        </Button>
      </div>

      <div className="card-premium overflow-hidden border-t-4 border-t-orange-500">
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-orange-50/50 dark:bg-orange-950/10">
              <tr>
                <th className="px-6 py-4 text-left text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Ítem</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">SKU</th>
                <th className="px-6 py-4 text-right text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Precio</th>
                <th className="px-6 py-4 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">Rentabilidad</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Stock</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map(p => {
                const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0;
                return (
                  <tr key={p.id} className="hover:bg-orange-500/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-orange-100 dark:border-orange-900/20 shadow-sm shrink-0">
                          {p.image ? (
                            <img src={p.image} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-200">
                               <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[10px] font-black text-brand-muted uppercase tracking-tighter">{p.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-[11px] text-right text-slate-900 dark:text-brand-text font-black">${p.salePrice.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-emerald-500">${(p.salePrice - p.costPrice).toLocaleString()}</span>
                        <span className="text-[8px] font-bold text-slate-400">{margin.toFixed(1)}% MG</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${p.stock < 0 ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {p.stock}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button onClick={() => openEdit(p)} className="p-3 text-orange-500 hover:bg-orange-500/10 rounded-xl transition-all min-h-[44px] min-w-[44px]">
                        <Edit size={18} />
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
          {/* Layout Responsivo para Imagen/Subida */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="h-24 w-24 bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-800/40 rounded-2xl flex items-center justify-center overflow-hidden shadow-md shrink-0">
              {editingProduct.image ? (
                <img src={editingProduct.image} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="text-orange-200 dark:text-orange-800" size={32} />
              )}
            </div>
            <div className="flex-1 w-full text-center sm:text-left">
              <label className="cursor-pointer bg-orange-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all flex items-center justify-center sm:justify-start gap-2 rounded-xl shadow-lg shadow-orange-600/20 min-h-[44px]">
                <Upload size={16}/>
                <span>Cargar Imagen</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU</label>
              <input required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 outline-none" value={editingProduct.sku || ''} onChange={e => setEditingProduct(prev => ({...prev, sku: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
              <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 outline-none" value={editingProduct.category || ''} onChange={e => setEditingProduct(prev => ({...prev, category: e.target.value}))} />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
            <input required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 outline-none" value={editingProduct.name || ''} onChange={e => setEditingProduct(prev => ({...prev, name: e.target.value}))} />
          </div>

          {/* KPI DE RENTABILIDAD EN TIEMPO REAL */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
             <div className="space-y-1">
               <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                 <DollarSign size={10} /> Utilidad Bruta
               </p>
               <p className="text-lg font-black text-emerald-500">${calculatedProfit.toLocaleString()}</p>
             </div>
             <div className="space-y-1">
               <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                 <TrendingUp size={10} /> Margen Bruto
               </p>
               <p className="text-lg font-black text-emerald-500">{calculatedMargin.toFixed(2)}%</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Costo Compra</label>
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold" value={editingProduct.costPrice || ''} onChange={e => setEditingProduct(prev => ({...prev, costPrice: parseFloat(e.target.value)}))} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio Venta</label>
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold" value={editingProduct.salePrice || ''} onChange={e => setEditingProduct(prev => ({...prev, salePrice: parseFloat(e.target.value)}))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Inicial</label>
              <input type="number" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 disabled:opacity-30 shadow-sm" value={editingProduct.stock || 0} onChange={e => setEditingProduct(prev => ({...prev, stock: parseInt(e.target.value)}))} disabled={!!editingProduct.id} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mínimo Crítico</label>
              <input type="number" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 shadow-sm" value={editingProduct.minStock || 0} onChange={e => setEditingProduct(prev => ({...prev, minStock: parseInt(e.target.value)}))} />
            </div>
          </div>

          {/* Botones del Formulario: Pila en móviles */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={() => setIsModalOpen(false)} 
              type="button" 
              className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 border-slate-200 dark:border-slate-800 order-2 sm:order-1 min-h-[44px]"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-orange-600 text-white rounded-xl shadow-lg order-1 sm:order-2 min-h-[44px]"
            >
              Guardar Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductList;
