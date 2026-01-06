import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from "@/Product";
import {
  Search, Plus, Edit2, Trash2, Package, AlertTriangle, X,
  DollarSign, PieChart, ImageIcon, TrendingUp, Edit, Upload
} from 'lucide-react';
// Asegúrate de que esta ruta sea correcta según tu proyecto
import { Button, Modal } from '../src/components/ui';

interface ProductListProps {
  targetStoreId?: string;
  products?: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ products: propProducts, targetStoreId }) => {
  const { products: contextProducts, addProduct, updateProduct, deleteProduct, calculateTotalInventoryValue, currentUser } = useStore();

  // 2. Lógica de selección de productos (Props o Contexto)
  const products = propProducts || contextProducts || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      await deleteProduct(id);
    }
  };

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
      image: editingProduct.image || undefined,
      storeId: currentUser?.storeId || targetStoreId || ''
    };

    if (editingProduct.id) {
      updateProduct({
        ...productData,
        id: editingProduct.id,
        storeId: editingProduct.storeId || ''
      } as Product);
    } else {
      // Usamos targetStoreId aquí si es un producto nuevo
      addProduct({
        ...productData,
        storeId: ''
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

      {/* MOBILE-FIRST: Vertical List View (visible on mobile, hidden on md+) */}
      <div className="block md:hidden space-y-3">
        {filtered.map((p) => {
          const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0;
          const profit = p.salePrice - p.costPrice;

          return (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 active:scale-[0.98] transition-all"
            >
              {/* Horizontal Layout: Image | Content | Action */}
              <div className="flex items-center gap-4">
                {/* Left: Item Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                  {p.image ? (
                    <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>

                {/* Center: Item Name, Price, Stock */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate mb-1">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-black text-orange-500">
                      ${p.salePrice.toLocaleString()}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.stock <= p.minStock
                      ? 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                      Stock: {p.stock}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={10} className={profit > 0 ? 'text-emerald-500' : 'text-red-500'} />
                    <span className={`text-[10px] font-bold ${profit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {margin.toFixed(0)}% MG
                    </span>
                  </div>
                </div>

                {/* Right: Action Button */}
                <button
                  onClick={() => openEdit(p)}
                  className="flex items-center justify-center w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all active:scale-95 shadow-sm shrink-0"
                  aria-label={`Ver detalles de ${p.name}`}
                >
                  <Edit size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP: Professional Table View (hidden on mobile, visible on md+) */}
      <div className="hidden md:block w-full max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="table-scroll-container">
            <table className="w-full text-left border-collapse">
              <thead className="bg-orange-50/50 dark:bg-orange-950/10 border-b-2 border-orange-200 dark:border-orange-900/20">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                    ÍTEM
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                    PRECIO
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                    RENTABILIDAD
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                    STOCK
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                    ACCIÓN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => {
                  const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0;
                  const profit = p.salePrice - p.costPrice;

                  return (
                    <tr key={p.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-950/5 transition-colors group">
                      {/* ÍTEM Column - Image + Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                            {p.image ? (
                              <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon size={18} />
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={p.name}>
                            {p.name}
                          </span>
                        </div>
                      </td>

                      {/* SKU Column */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-tight">
                          {p.sku}
                        </span>
                      </td>

                      {/* PRECIO Column */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            ${p.salePrice.toLocaleString()}
                          </span>
                          {p.costPrice > 0 && (
                            <span className="text-[10px] text-slate-400 line-through">
                              Costo: ${p.costPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* RENTABILIDAD Column */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-sm font-black ${profit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            ${profit.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            <TrendingUp size={12} className={profit > 0 ? 'text-emerald-500' : 'text-red-500'} />
                            <span className={`text-[10px] font-bold ${profit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {margin.toFixed(1)}% MG
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* STOCK Column - Badge Style */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-black uppercase border-2 ${p.stock <= p.minStock
                          ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                          {p.stock}
                        </span>
                      </td>

                      {/* ACCIÓN Column - Spaced Buttons */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => openEdit(p)}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold uppercase transition-all active:scale-95 shadow-sm hover:shadow-md"
                            aria-label={`Editar ${p.name}`}
                          >
                            <Edit size={14} />
                            Editar
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, p.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold uppercase transition-all active:scale-95 shadow-sm hover:shadow-md"
                            aria-label={`Eliminar ${p.name}`}
                          >
                            <Trash2 size={14} />
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              <input required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 outline-none uppercase" value={editingProduct.sku || ''} onChange={e => setEditingProduct(prev => ({ ...prev, sku: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoría</label>
              <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 outline-none uppercase" value={editingProduct.category || ''} onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre</label>
            <input required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 outline-none uppercase" value={editingProduct.name || ''} onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))} />
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
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold" value={editingProduct.costPrice || ''} onChange={e => setEditingProduct(prev => ({ ...prev, costPrice: parseFloat(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Precio Venta</label>
              <input type="number" step="0.01" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold" value={editingProduct.salePrice || ''} onChange={e => setEditingProduct(prev => ({ ...prev, salePrice: parseFloat(e.target.value) }))} />
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
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Mínimo Crítico</label>
              <input type="number" required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:border-orange-500 shadow-sm" value={editingProduct.minStock || 0} onChange={e => setEditingProduct(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))} />
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