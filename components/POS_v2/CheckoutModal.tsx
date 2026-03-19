import React, { useState, useEffect, useCallback } from 'react';
import {
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Store,
  Globe,
  MessageCircle,
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button, Modal } from '../../src/components/ui';
import { useStore } from '../../context/StoreContext';
import SaleTicket from '../SaleTicket';
import { useCartStore } from '../../store/cartStore';

// ─── TIPOS ESTRICTOS (Alineados con la firma de processSaleAndContributeToGoal) ───

type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
type SaleType = 'RETAIL' | 'WHOLESALE' | 'ECOMMERCE';
type SaleStatus = 'ACTIVE' | 'PENDING';

// Mapa de colores por método de pago para consistencia visual
const PAYMENT_COLORS: Record<PaymentMethod, { active: string; idle: string }> = {
  CASH:     { active: 'border-brand-emerald bg-emerald-50 dark:bg-emerald-950/20 text-brand-emerald', idle: 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400' },
  CARD:     { active: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600',                idle: 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400' },
  TRANSFER: { active: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 text-purple-600',        idle: 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400' },
};

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * CheckoutModal V2
 *
 * Responsabilidades:
 * 1. Suscripción mínima a Zustand (solo carrito y totales).
 * 2. Estado local del formulario de cobro (paymentMethod, amountReceived).
 * 3. Omnicanalidad: saleType, saleStatus y campos condicionales.
 * 4. Mutación segura vía `processSaleAndContributeToGoal` del contexto legacy.
 * 5. Cleanup post-venta: clearCart() → onClose() → impresión de ticket.
 */
export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  // ─── Dependencias Globales ───────────────────────────────────────────────────
  const { processSaleAndContributeToGoal, currentUser } = useStore();

  // ─── Suscripción Mínima a Zustand ────────────────────────────────────────────
  // Solo leemos lo estrictamente necesario para calcular el cobro.
  const cartDict = useCartStore((state) => state.cart);
  const cartItems = Object.values(cartDict);
  
  // FIX: Evita bucles infinitos en Zustand devolviendo la refención exacta de getTotals 
  // antes de generar el objeto dinámico.
  const getTotals = useCartStore((state) => state.getTotals);
  const { total } = getTotals();

  // ─── Estado Local: Método de Pago ────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState('');

  // ─── Estado Local: Omnicanalidad ─────────────────────────────────────────────
  const [saleType, setSaleType]       = useState<SaleType>('RETAIL');
  const [saleStatus, setSaleStatus]   = useState<SaleStatus>('ACTIVE');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  // ─── Estado UI ───────────────────────────────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [showTicket, setShowTicket]     = useState(false);
  const [saleSummary, setSaleSummary]   = useState<any>(null);
  // Idempotency: generado una sola vez por intento de cobro, se reutiliza en reintentos
  const [transactionId, setTransactionId] = useState<string>(() => crypto.randomUUID());

  // ─── Cálculos en Tiempo Real ─────────────────────────────────────────────────
  const safeTotal    = Number(total) || 0;
  const safePay      = parseFloat(amountReceived) || 0;
  const change       = safePay - safeTotal;
  const canFinalize  = cartItems.length > 0
    && (paymentMethod !== 'CASH' || change >= 0)
    && !isProcessing;

  // Auto-completar monto cuando el método no requiere conteo de efectivo
  useEffect(() => {
    if (!isOpen) return;
    if (paymentMethod !== 'CASH') {
      setAmountReceived(safeTotal.toFixed(2));
    } else {
      setAmountReceived('');
    }
  }, [paymentMethod, isOpen, safeTotal]);

  // Resetear formulario al cerrar (si no hay ticket pendiente)
  useEffect(() => {
    if (!isOpen && !showTicket) {
      setPaymentMethod('CASH');
      setSaleType('RETAIL');
      setSaleStatus('ACTIVE');
      setDeliveryDate('');
      setShippingAddress('');
      setAmountReceived('');
      setError(null);
      // Generar nuevo transactionId para el próximo cobro
      setTransactionId(crypto.randomUUID());
    }
  }, [isOpen, showTicket]);

  // ─── Mutación Segura ─────────────────────────────────────────────────────────
  const handleFinalizeSale = useCallback(async () => {
    if (!canFinalize) return;
    setError(null);
    setIsProcessing(true);

    try {
      // Construimos el payload para el contexto legacy
      const payloadItems = cartItems.map((i) => ({
        productId:    i.productId,
        name:         i.name,
        sellingPrice: Number(i.sellingPrice) || 0,
        unitCost:     Number(i.unitCost) || 0,
        quantity:     Number(i.quantity) || 1,
      }));

      const result = await processSaleAndContributeToGoal(payloadItems, paymentMethod, {
        saleType,
        status:          saleStatus,
        deliveryDate:    saleStatus === 'PENDING' && saleType !== 'RETAIL' ? deliveryDate : undefined,
        shippingAddress: saleStatus === 'PENDING' && saleType !== 'RETAIL' ? shippingAddress.trim() : undefined,
        transactionId,   // 🔑 Clave de idempotencia: garantiza exactamente-una-vez
      });

      if (result.success) {
        const savedSale = result.sale;

        // Armar el objeto para el ticket
        setSaleSummary({
          ...(savedSale || {}),
          revenue:         result.totalRevenueAdded,
          profit:          result.totalProfitAdded,
          items:           cartItems,
          folio:           savedSale?.id?.slice(0, 8) || crypto.randomUUID().slice(0, 8),
          paymentMethod,
          saleType,
          saleStatus,
          shippingAddress,
        });

        // ─── Cleanup Post-Venta ──────────────────────────────────────────────
        // Imperativo: clearCart() antes de cerrar el modal.
        useCartStore.getState().clearCart();
        onClose();
        setShowTicket(true);
      } else {
        setError('La venta no pudo procesarse. Intenta de nuevo.');
      }
    } catch (err: any) {
      console.error('❌ CheckoutModal: handleFinalizeSale error:', err);
      setError(err?.message || 'Error inesperado al procesar la venta.');
    } finally {
      setIsProcessing(false);
    }
  }, [
    canFinalize, cartItems, paymentMethod, saleType,
    saleStatus, deliveryDate, shippingAddress,
    processSaleAndContributeToGoal, onClose,
  ]);

  return (
    <>
      {/* ─── MODAL PRINCIPAL: COBRO ─────────────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={onClose} title="FINALIZAR OPERACIÓN">
        <div className="space-y-5 p-1 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">

          {/* Total a Cobrar */}
          <div className="text-center p-6 bg-emerald-500/5 rounded-[2rem] border-2 border-brand-emerald/10">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.5em] mb-2">
              Total a Cobrar
            </p>
            <p className="text-4xl md:text-6xl font-black text-brand-emerald tracking-tighter">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(safeTotal)}
            </p>
          </div>

          {/* ─── MÉTODO DE PAGO ──────────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Método de Pago
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['CASH', 'CARD', 'TRANSFER'] as PaymentMethod[]).map((method) => {
                const label   = method === 'CASH' ? 'Efectivo' : method === 'CARD' ? 'Tarjeta' : 'Transfer';
                const Icon    = method === 'CASH' ? Banknote : method === 'CARD' ? CreditCard : ArrowRightLeft;
                const isActive = paymentMethod === method;
                return (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[44px] cursor-pointer ${
                      isActive ? PAYMENT_COLORS[method].active : PAYMENT_COLORS[method].idle
                    }`}
                  >
                    <Icon size={22} className="mb-1" />
                    <span className="text-[10px] font-black uppercase">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── OMNICANALIDAD: TIPO DE VENTA ────────────────────────────────── */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Canal y Entrega
            </p>

            {/* Sale Type */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSaleType('RETAIL')}
                className={`flex gap-1.5 items-center justify-center p-2 rounded-lg border-2 text-[10px] font-black uppercase transition-colors cursor-pointer ${
                  saleType === 'RETAIL'
                    ? 'border-brand-emerald text-brand-emerald bg-brand-emerald/10'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <Store size={13} /> Físico
              </button>
              <button
                onClick={() => setSaleType('WHOLESALE')}
                className={`flex gap-1.5 items-center justify-center p-2 rounded-lg border-2 text-[10px] font-black uppercase transition-colors cursor-pointer ${
                  saleType === 'WHOLESALE'
                    ? 'border-orange-500 text-orange-600 bg-orange-500/10'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <PackageCheck size={13} /> Mayoreo
              </button>
              <button
                onClick={() => setSaleType('ECOMMERCE')}
                className={`flex gap-1.5 items-center justify-center p-2 rounded-lg border-2 text-[10px] font-black uppercase transition-colors cursor-pointer ${
                  saleType === 'ECOMMERCE'
                    ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <Globe size={13} /> E-com
              </button>
            </div>

            {/* Sale Status — solo visible si no es venta directa en tienda */}
            {saleType !== 'RETAIL' && (
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 animate-fade-in-up">
                <button
                  onClick={() => setSaleStatus('ACTIVE')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase rounded-md transition-all cursor-pointer ${
                    saleStatus === 'ACTIVE'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-brand-emerald'
                      : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2 size={13} /> Entregado
                </button>
                <button
                  onClick={() => setSaleStatus('PENDING')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase rounded-md transition-all cursor-pointer ${
                    saleStatus === 'PENDING'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-yellow-600'
                      : 'text-slate-400'
                  }`}
                >
                  <Clock size={13} /> Pendiente
                </button>
              </div>
            )}

            {/* Campos condicionales para PENDING */}
            {saleStatus === 'PENDING' && saleType !== 'RETAIL' && (
              <div className="space-y-2 animate-fade-in-up">
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full p-3 text-xs font-bold bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-brand-emerald outline-none"
                />
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Dirección completa de entrega..."
                  className="w-full p-3 text-xs font-bold bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-brand-emerald outline-none"
                />
              </div>
            )}
          </div>

          {/* ─── INPUT PRINCIPAL: MONTO RECIBIDO ─────────────────────────────── */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest">
              {paymentMethod === 'CASH' ? '💵 Efectivo Recibido' : '🔖 Referencia / Autorización'}
            </label>
            <input
              type="number"
              className="w-full py-5 text-4xl font-black text-center bg-slate-50 dark:bg-slate-950 border-4 border-slate-100 dark:border-slate-800 rounded-[2rem] outline-none focus:border-brand-emerald transition-colors"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0"
              autoFocus
              readOnly={paymentMethod !== 'CASH'}
            />
          </div>

          {/* ─── VISUALIZADOR DE CAMBIO (Solo efectivo) ──────────────────────── */}
          {paymentMethod === 'CASH' && (
            <div className={`p-4 rounded-[1.5rem] border-2 flex justify-between items-center transition-colors ${
              change >= 0
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}>
              <span className="text-[9px] font-black uppercase tracking-widest">
                {change >= 0 ? 'Cambio a Devolver' : 'Monto Faltante'}
              </span>
              <span className={`text-2xl font-black ${change >= 0 ? 'text-brand-emerald' : 'text-red-500'}`}>
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.abs(change))}
              </span>
            </div>
          )}

          {/* ─── ERROR INLINE ─────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[11px] font-bold animate-fade-in-up">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* ─── BOTONES DE ACCIÓN ────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={onClose}
              className="h-[48px]"
              disabled={isProcessing}
            >
              MODIFICAR
            </Button>
            <Button
              variant="sales"
              fullWidth
              disabled={!canFinalize}
              onClick={handleFinalizeSale}
              className="h-[48px]"
            >
              {isProcessing ? 'PROCESANDO...' : 'FINALIZAR VENTA'}
            </Button>
          </div>

        </div>
      </Modal>

      {/* ─── MODAL DE TICKET: VENTA COMPLETADA ──────────────────────────────── */}
      <Modal
        isOpen={showTicket && saleSummary !== null}
        onClose={() => {
          setShowTicket(false);
          setSaleSummary(null);
        }}
        title="✅ VENTA REGISTRADA"
      >
        {saleSummary && (
          <div className="space-y-4">
            <SaleTicket
              saleId={saleSummary.id || saleSummary.folio}
              items={saleSummary.items}
              total={safeTotal}
              paymentMethod={saleSummary.paymentMethod || 'CASH'}
              sellerId={currentUser?.username || 'SISTEMA'}
              folio={saleSummary.folio}
              date={saleSummary.date || new Date().toISOString()}
              storeInfo={{
                name:    currentUser?.storeName || 'TEIKON OS',
                address: `Canal: ${saleSummary.saleType || 'RETAIL'}${
                  saleSummary.saleStatus === 'PENDING' ? ' · Pendiente envío' : ' · Entregado'
                }`,
                phone:   currentUser?.phone || 'N/A',
              }}
              onClose={() => {}}
              hideControls={true}
            />

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowTicket(false);
                  setSaleSummary(null);
                }}
                className="h-[48px]"
              >
                CERRAR
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => window.print()}
                className="h-[48px]"
              >
                IMPRIMIR
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
