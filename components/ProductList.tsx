
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import Button from './Button';
import Modal from './Modal';
import { Edit, Plus, Search, Image as ImageIcon, Upload, TrendingUp, DollarSign, PieChart, AlertTriangle, Trash2 } from 'lucide-react';

interface ProductListProps {
  products?: Product[];
  targetStoreId?: string;
}

const ProductList: React.FC<ProductListProps> = ({ products: propProducts, targetStoreId }) => {
  const { products: contextProducts, addProduct, updateProduct, deleteProduct, calculateTotalInventoryValue } = useStore();

  // Use props if provided (Drill-Down mode), otherwise use context (Context mode)
  const products = propProducts || contextProducts;

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      await deleteProduct(id);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});

  // Recalculate based on current products view
  const totalInvestment = products.reduce((acc, product) => {
    const cost = Number(product.costPrice) || 0;
    const currentStock = Number(product.stock) || 0;
    return acc + (cost * currentStock);
  }, 0);

  const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.sku || !editingProduct.name) return;

    const purchaseCost = parseFloat((editingProduct.costPrice || 0).toString());
    const sellingPrice = parseFloat((editingProduct.salePrice || 0).toString());
    const currentStock = parseInt((editingProduct.stock || 0).toString());

    if (isNaN(purchaseCost) || isNaN(sellingPrice) || isNaN(currentStock)) {
      alert("Los valores numéricos ingresados no son válidos.");
      return;
    }

    if (sellingPrice < purchaseCost) {
      alert("PRECIO VENTA es menor que COSTO COMPRA. Por favor, revise los precios.");
      return;
    }

    const unitProfit = sellingPrice - purchaseCost;

    const productData = {
      sku: editingProduct.sku,
      name: editingProduct.name,
      category: editingProduct.category || '',
      stock: currentStock,
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
        ownerId: editingProduct.ownerId || '',
        storeId: editingProduct.storeId || ''
      } as Product);
    } else {
      addProduct({
        ...productData
      }, targetStoreId);
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
    setEditingProduct({ isActive: true, costPrice: 0, salePrice: 0, stock: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct({ ...p });
    setIsModalOpen(true);
  };

  const filtered = products.filter(p => p.isActive !== false).filter(p =>
    (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const calculatedProfit = (editingProduct.salePrice || 0) - (editingProduct.costPrice || 0);
  const calculatedMargin = editingProduct.salePrice && editingProduct.salePrice > 0
    ? (calculatedProfit / editingProduct.salePrice) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* HEADER KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-premium p-5 flex items-center justify-between bg-white dark:bg-slate-900 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-500/10 rounded-xl text-orange-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor de Inversión</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">${totalInvestment.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card-premium p-5 flex items-center justify-between bg-white dark:bg-slate-900 border-l-4 border-l-brand-blue">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-xl text-brand-blue">
              <PieChart size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unidades Totales</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalUnits.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH BAR & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por SKU o Nombre..."
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800/40 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 shadow-sm transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={openNew} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-all py-3.5">
          <Plus size={18} className="mr-2" /> AGREGAR ÍTEM
        </Button>
      </div>

      {/* MOBILE LIST VIEW (Cards) */}
      <div className="block md:hidden space-y-4">
        {filtered.map((p) => {
          const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0;
          return (
            <div key={p.id} onClick={() => openEdit(p)} className="card-premium bg-white dark:bg-slate-900 p-4 active:scale-[0.98] transition-transform border border-slate-200 dark:border-slate-800">
              <div className="flex gap-4">
                <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                  {p.image ? (
                    <img src={p.image} className="h-full w-full object-cover" alt={p.name} />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase truncate pr-2">{p.name}</h4>
                    <span className="text-[10px] font-black text-brand-muted bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{p.sku}</span>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Precio Venta</p>
                      <p className="text-xl font-black text-orange-500">${p.salePrice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${p.stock <= p.minStock ? 'bg-red-500 text-white border-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                        Stock: {p.stock}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <TrendingUp size={12} /> MG: {margin.toFixed(1)}%
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <button onClick={(e) => handleDelete(e, p.id)} className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors">
                    <Trash2 size={12} /> Eliminar
                  </button>
                  <span className="flex items-center gap-1 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => openEdit(p)}>
                    <Edit size={12} /> Editar
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block card-premium overflow-hidden border-t-4 border-t-orange-500">
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
            <tbody className="divide-y divide-brand-border bg-white dark:bg-slate-900">
              {filtered.map((p, idx) => {
                const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0;
                return (
                  <tr key={p.id} className="hover:bg-orange-500/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-orange-100 dark:border-orange-900/20 shadow-sm shrink-0 bg-slate-50 dark:bg-slate-800">
                          {p.image ? (
                            <img src={p.image} className="h-full w-full object-cover" alt="" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-300">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{p.name}</span>
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
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${p.stock <= p.minStock ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button onClick={(e) => handleDelete(e, p.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-90 mr-1" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                      <button onClick={() => openEdit(p)} className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-all active:scale-90" title="Editar">
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
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="h-24 w-24 bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-800/40 rounded-2xl flex items-center justify-center overflow-hidden shadow-md shrink-0">
              {editingProduct.image ? (
                <img src={editingProduct.image} className="h-full w-full object-cover" alt="Preview" />
              ) : (
                <ImageIcon className="text-orange-200 dark:text-orange-800" size={32} />
              )}
            </div>
            <div className="flex-1 w-full text-center sm:text-left">
              <label className="cursor-pointer bg-orange-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all active:scale-95 flex items-center justify-center sm:justify-start gap-2 rounded-xl shadow-lg shadow-orange-600/20 min-h-[44px]">
                <Upload size={16} />
                <span>Cargar Imagen</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">SKU</label>
              <input required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 outline-none uppercase" value={editingProduct.sku || ''} onChange={e => setEditingProduct(prev => ({ ...prev, sku: e.target.value }))} aria-label="SKU del producto" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoría</label>
              <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 outline-none uppercase" value={editingProduct.category || ''} onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))} aria-label="Categoría del producto" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre</label>
            <input required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 outline-none uppercase" value={editingProduct.name || ''} onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))} aria-label="Nombre del producto" />
          </div>

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
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Costo Compra</label>
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold" value={editingProduct.costPrice || ''} onChange={e => setEditingProduct(prev => ({ ...prev, costPrice: parseFloat(e.target.value) }))} aria-label="Costo de compra" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Precio Venta</label>
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold" value={editingProduct.salePrice || ''} onChange={e => setEditingProduct(prev => ({ ...prev, salePrice: parseFloat(e.target.value) }))} aria-label="Precio de venta" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                {editingProduct.id ? 'Ajuste Stock' : 'Stock Inicial'}
              </label>
              <input
                type="number"
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 shadow-sm"
                value={editingProduct.stock || 0}
                onChange={e => setEditingProduct(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                aria-label="Stock del producto"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Mínimo Crítico</label>
              <input type="number" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 shadow-sm" value={editingProduct.minStock || 0} onChange={e => setEditingProduct(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))} aria-label="Stock mínimo crítico" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button onClick={() => setIsModalOpen(false)} type="button" className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 border-slate-200 dark:border-slate-800 active:scale-95 order-2 sm:order-1 min-h-[44px]">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-orange-600 text-white rounded-xl shadow-lg active:scale-95 order-1 sm:order-2 min-h-[44px]">
              Guardar Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductList;
