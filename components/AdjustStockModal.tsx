import React, { useState } from 'react';
import { Product } from "@/Product";
import { useStore } from '../context/StoreContext';
import { Button, Modal } from '../src/components/ui';
import { inventoryAPI } from '../utils/api';
import { PackageMinus, PackagePlus, AlertTriangle, Info } from 'lucide-react';

interface AdjustStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSuccess: () => void;
    targetStoreId?: string;
}

const AdjustStockModal: React.FC<AdjustStockModalProps> = ({ isOpen, onClose, product, onSuccess, targetStoreId }) => {
    const { currentUser } = useStore();
    const [type, setType] = useState<'IN' | 'OUT' | 'ADJUST'>('ADJUST');
    const [reason, setReason] = useState<string>('ADMIN_CORRECTION');
    const [quantity, setQuantity] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    if (!product) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quantity || isNaN(Number(quantity)) || Number(quantity) === 0) {
            alert("Por favor, ingresa una cantidad válida distinta de cero.");
            return;
        }

        setIsLoading(true);
        try {
            await inventoryAPI.createMovement({
                productId: product.id!,
                type,
                reason,
                quantity: Number(quantity),
                notes,
                storeId: targetStoreId || currentUser?.storeId
            });
            onSuccess();
            onClose();
            // Reset form
            setQuantity('');
            setNotes('');
            setType('ADJUST');
            setReason('ADMIN_CORRECTION');
        } catch (error) {
            console.error('Error ajustando inventario:', error);
            alert("Error al ajustar el inventario. Por favor intenta nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTypeChange = (newType: 'IN' | 'OUT' | 'ADJUST') => {
        setType(newType);
        if (newType === 'IN') setReason('PURCHASE');
        if (newType === 'OUT') setReason('SHRINKAGE');
        if (newType === 'ADJUST') setReason('ADMIN_CORRECTION');
    };

    const getNewStockPreview = () => {
        const numQuantity = Number(quantity) || 0;
        if (type === 'IN') return product.stock + Math.abs(numQuantity);
        if (type === 'OUT') return product.stock - Math.abs(numQuantity);
        if (type === 'ADJUST') return product.stock + numQuantity;
        return product.stock;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ajustar Inventario">
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Headers / Info del Producto */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Producto</p>
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{product.name}</p>
                        <p className="text-xs text-slate-400">{product.sku}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Stock Actual</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{product.stock}</p>
                    </div>
                </div>

                {/* Selección de Tipo de Movimiento */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Tipo de Movimiento
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => handleTypeChange('IN')}
                            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${type === 'IN'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <PackagePlus size={24} className="mb-1" />
                            <span className="text-[10px] font-black uppercase">Entrada</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('OUT')}
                            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${type === 'OUT'
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <PackageMinus size={24} className="mb-1" />
                            <span className="text-[10px] font-black uppercase">Salida</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('ADJUST')}
                            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${type === 'ADJUST'
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <AlertTriangle size={24} className="mb-1" />
                            <span className="text-[10px] font-black uppercase">Ajuste</span>
                        </button>
                    </div>
                </div>

                {/* Motivo del Ajuste */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Motivo / Clasificación
                    </label>
                    <select
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-blue outline-none"
                    >
                        {type === 'IN' && (
                            <>
                                <option value="PURCHASE">Compra a Proveedor</option>
                                <option value="RETURN">Devolución (Manual)</option>
                                <option value="TRANSFER">Transferencia / Otros</option>
                            </>
                        )}
                        {type === 'OUT' && (
                            <>
                                <option value="SHRINKAGE">Merma / Desperdicio</option>
                                <option value="THEFT">Pérdida / Robo</option>
                                <option value="TRANSFER">Transferencia / Otros</option>
                            </>
                        )}
                        {type === 'ADJUST' && (
                            <>
                                <option value="ADMIN_CORRECTION">Corrección Administrativa</option>
                                <option value="INITIAL_STOCK">Ajuste de Saldo Inicial</option>
                            </>
                        )}
                    </select>
                </div>

                {/* Cantidad y Vista Previa */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            {type === 'ADJUST' ? 'Diferencia (+ o -)' : 'Cantidad Moviéndose'}
                        </label>
                        <input
                            type="number"
                            required
                            step="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder={type === 'ADJUST' ? "-5 o 10" : "Ej: 5"}
                            className="w-full bg-white dark:bg-slate-950 border-2 border-brand-blue/30 focus:border-brand-blue rounded-xl px-4 py-3 text-xl font-black text-center"
                        />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
                        <p className="text-[9px] uppercase tracking-widest font-black text-slate-500 mb-1 z-10">Nuevo Stock</p>
                        <p className={`text-3xl font-black z-10 ${getNewStockPreview() < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {getNewStockPreview()}
                        </p>

                        {/* Background Decoration */}
                        <div className="absolute opacity-5 -right-2 -bottom-2">
                            <Info size={80} />
                        </div>
                    </div>
                </div>

                {/* Notas Opcionales */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Notas / Documento de Referencia (Opcional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ej: Factura #1234, o 'Se rompieron 2 botellas...'"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-brand-blue outline-none min-h-[80px] resize-none"
                    />
                </div>

                <div className="flex gap-4 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading} fullWidth>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" disabled={isLoading || !quantity} fullWidth>
                        {isLoading ? 'Guardando...' : 'Confirmar Ajuste'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AdjustStockModal;
