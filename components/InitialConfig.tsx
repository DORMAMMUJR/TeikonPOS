import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Store, Phone, ShieldCheck, Rocket } from 'lucide-react';
import { Button, TeikonLogo } from '../src/components/ui';

const InitialConfig: React.FC = () => {
  const { updateCurrentUser, addProduct, currentUser } = useStore();
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * handleCompleteOnboarding
   * Objetivo: Finalizar el registro del nodo de tienda y preparar el inventario inicial.
   */
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !phone.trim() || !currentUser) return;

    setIsSubmitting(true);

    try {
      // 1. ACTUALIZACIÓN DE PERFIL Y SINCRONIZACIÓN CON SUPER ADMIN
      // Simulamos la latencia de red de una actualización en base de datos
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Actualizamos el estado local del usuario (esto gatilla la redirección en App.tsx)
      updateCurrentUser({ storeName, phone });

      // Persistencia para que el 'Panel de Super Admin' vea la nueva tienda inmediatamente
      const savedStoresRaw = localStorage.getItem('teikon_all_stores');
      const allStores = savedStoresRaw ? JSON.parse(savedStoresRaw) : [];

      const newStoreEntry = {
        id: `ST-${Math.floor(Math.random() * 900 + 100)}`,
        name: storeName,
        owner: currentUser.username,
        phone: phone,
        plan: 'Premium',
        status: 'active',
        lastActive: 'Recién configurada'
      };

      localStorage.setItem('teikon_all_stores', JSON.stringify([newStoreEntry, ...allStores]));

      // 2. SIEMBRA DE PRODUCTO DEMO (INVENTARIO INICIAL)
      // Requerimiento: Coca Cola 600ml, Costo 15, Venta 22, Stock 12, Categoría Bebidas
      await new Promise(resolve => setTimeout(resolve, 500));
      addProduct({
        storeId: currentUser!.storeId!,
        sku: 'DEMO-COKE-01',
        name: 'Coca Cola 600ml (Ejemplo)',
        category: 'Bebidas',
        costPrice: 15,
        salePrice: 22,
        unitProfit: 7, // Calculado: 22 - 15
        stock: 12,
        minStock: 3,
        taxRate: 0,
        isActive: true,
      });

      // 3. REDIRECCIÓN POST-ONBOARDING
      // En el ecosistema React de Teikon, la redirección a /dashboard es reactiva.
      // Al haber ejecutado updateCurrentUser({ storeName }), App.tsx re-renderizará
      // y permitirá el acceso al Panel Principal automáticamente.
      console.log('>>> SISTEMA: Onboarding exitoso. Nodo activado.');

    } catch (error) {
      console.error('>>> ERROR CRÍTICO EN ONBOARDING:', error);
      alert('Error de sincronización con el servidor central. Reintentando...');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-emerald/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-purple/5 blur-[120px] rounded-full -ml-40 -mb-40 pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 animate-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8 text-center">
          <TeikonLogo size={80} className="mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Configuración del Nodo</h2>
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.4em] mt-2">Paso obligatorio de inicialización</p>
        </div>

        <div className="bg-white dark:bg-brand-panel border border-slate-200 dark:border-brand-border p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-emerald text-white px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
            <ShieldCheck size={12} /> Acceso Restringido
          </div>

          <form onSubmit={handleCompleteOnboarding} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest ml-1">Nombre Comercial de la Tienda</label>
              <div className="relative group">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-emerald transition-colors" size={18} />
                <input
                  required
                  type="text"
                  placeholder="EJ. MI TIENDA TEIKON"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-emerald transition-all text-slate-900 dark:text-white uppercase"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest ml-1">Contacto Directo (WhatsApp)</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-emerald transition-colors" size={18} />
                <input
                  required
                  type="tel"
                  placeholder="EJ. 5512345678"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-emerald transition-all text-slate-900 dark:text-white"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="sales"
                fullWidth
                disabled={isSubmitting || !storeName.trim() || !phone.trim()}
                className="py-5 flex items-center gap-3"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    SINCRONIZANDO...
                  </span>
                ) : (
                  <>
                    <Rocket size={18} />
                    GUARDAR Y COMENZAR
                  </>
                )}
              </Button>
            </div>

            <p className="text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Al activar el nodo, aceptas los términos de servicio de Teikon OS. Usuario: <span className="text-slate-900 dark:text-white font-black">{currentUser?.username}</span>
            </p>
          </form>
        </div>

        <div className="mt-8 text-center opacity-20">
          <p className="text-[8px] font-black text-brand-muted uppercase tracking-[0.5em]">Teikon OS Core // Secure Onboarding v1.1</p>
        </div>
      </div>
    </div>
  );
};

export default InitialConfig;
