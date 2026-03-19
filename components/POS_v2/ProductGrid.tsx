import React, { useMemo } from 'react';
import { ImageOff, Plus } from 'lucide-react';
import { Product } from '../../domain/cart/types';
import { useCartStore } from '../../store/cartStore';
import { useSearchStore } from '../../store/searchStore';

interface ProductGridProps {
  /** 
   * Diccionario O(1) de productos, indexado típicamente por ID o SKU.
   * Ej: { "uuid-1": { id: "uuid-1", name: "Cable USB", stock: 10, ... } }
   */
  productsMap: Record<string, Product>;
  /** El ID del último producto agregado para aplicar el highlight/animación (anillo esmeralda) */
  lastAddedId?: string | null;
}

/**
 * Componente altamente optimizado (memoizado) encargado exclusivamente de renderizar 
 * el grid de productos y gestionar clics.
 * No administra estados complejos ni carritos; todo se delega al Zustand Store mediante `.getState()`.
 */
export const ProductGrid: React.FC<ProductGridProps> = React.memo(({ productsMap, lastAddedId }) => {
  // Suscripción al término de búsqueda desde el store aislado
  const searchTerm = useSearchStore((state) => state.searchTerm);
  
  // Convertir el diccionario O(1) a un array iterable solo para renderizar, y filtrar por búsqueda.
  // Memoizamos el resultado para que no recalcule en cada render si los argumentos no cambian.
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const productList = Object.values(productsMap);

    if (!term) {
      // Filtrar solo activos si no hay búsqueda
      return productList.filter(p => p.isActive);
    }

    return productList.filter(p => 
      p.isActive && (
        p.name.toLowerCase().includes(term) || 
        // Si el SKU no viene, omitimos ese filtro dinámico y evitamos crasheos
        (p.sku && p.sku.toLowerCase().includes(term))
      )
    );
  }, [productsMap, searchTerm]);

  // Handler ligero: mutación imperativa en Zustand sin re-renderizar este grid entero.
  const handleProductClick = (product: Product) => {
    if (product.stock > 0) {
      // Mutación directa al store global sin ensuciar la cadena de props
      useCartStore.getState().addProduct(product);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:w-2/3 card-premium overflow-hidden border-t-4 border-t-brand-emerald bg-white dark:bg-slate-900 shadow-xl min-h-0 pb-0 relative">
      <div className="absolute inset-0 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 content-start pb-[100px] lg:pb-4 custom-scrollbar">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            onClick={() => handleProductClick(p)}
            className={`group relative p-1.5 sm:p-2 md:p-2.5 bg-white dark:bg-slate-800 border-2 rounded-2xl transition-all duration-200 ease-out hover:scale-105 hover:shadow-xl min-h-[140px] sm:min-h-[160px] ${
              p.stock === 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'
            } ${
              lastAddedId === p.id
                ? 'border-brand-emerald ring-4 ring-brand-emerald/10'
                : 'border-slate-100 dark:border-slate-700 hover:border-brand-emerald/40'
            }`}
          >
            {/* Contenedor de Imagen */}
            <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-900 rounded-xl mb-1.5 sm:mb-2 md:mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
              {p.image ? (
                <img 
                  src={p.image} 
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  alt={p.name} 
                  loading="lazy"
                />
              ) : (
                <ImageOff className="text-slate-200 dark:text-slate-700" size={32} />
              )}

              {/* Badge de Stock Absoluto */}
              <div
                className={`absolute top-2 right-2 px-2 py-1.5 sm:px-2.5 rounded-lg font-bold uppercase tracking-tight shadow-md ${
                  p.stock === 0
                    ? 'text-red-500 bg-red-50 ring-2 ring-red-500 text-xl sm:text-2xl animate-pulse'
                    : p.stock <= p.minStock
                    ? 'bg-red-500 text-white text-sm sm:text-base md:text-xl animate-pulse'
                    : 'bg-black/50 dark:bg-white/20 text-white text-sm sm:text-base md:text-xl backdrop-blur-sm'
                }`}
              >
                {p.stock} U.
              </div>
            </div>

            {/* Información de Producto */}
            <div className="px-1 space-y-1">
              <h4 className="text-[9px] sm:text-[10px] md:text-[11px] font-black text-slate-900 dark:text-white line-clamp-2 min-h-[1.75rem] sm:min-h-[2rem] leading-tight uppercase tracking-tight">
                {p.name}
              </h4>
              <div className="flex justify-between items-center pt-1">
                <p className="text-sm sm:text-base md:text-lg font-black text-brand-emerald tracking-tighter">
                  ${(p.salePrice || 0).toLocaleString()}
                </p>
                {/* Botón flotante al hover (solo si hay stock) */}
                {p.stock > 0 && (
                  <div className="hidden md:block p-1.5 bg-brand-emerald/10 text-brand-emerald rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={14} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
            No se encontraron productos coincidentes.
          </div>
        )}
      </div>
    </div>
  );
});

// Ayuda al DevTools a identificar el nombre
ProductGrid.displayName = 'ProductGrid';
