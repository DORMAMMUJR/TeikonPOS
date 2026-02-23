import React from 'react';
import { CheckCircle, Printer, X } from 'lucide-react';
import { SaleTicket } from './SaleTicket';
import { Button } from '../src/components/ui';

interface SaleCompleteModalProps {
    isOpen: boolean;
    sale: {
        id: string;
        items: any[];
        total: number;
        amountPaid?: number;
        change?: number;
        date: string;
        paymentMethod?: string;
        sellerId?: string;
    } | null;
    storeInfo: {
        name: string;
        address?: string;
        phone?: string;
    };
    onClose: () => void;
    onPrint: () => void;
}

export const SaleCompleteModal: React.FC<SaleCompleteModalProps> = ({
    isOpen,
    sale,
    storeInfo,
    onClose,
    onPrint
}) => {
    if (!isOpen || !sale) return null;

    // Handle ESC key to close
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                Venta Completada
                            </h2>
                            <p className="text-sm text-emerald-100 font-medium mt-1">
                                Ticket #{String(sale.id || (sale as any)._id || '').slice(0, 8).toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Ticket Preview */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4">
                        <SaleTicket
                            items={sale.items}
                            total={sale.total}
                            amountPaid={sale.amountPaid}
                            change={sale.change}
                            date={sale.date}
                            folio={String(sale.id || (sale as any)._id || '').slice(0, 8)}
                            paymentMethod={sale.paymentMethod}
                            sellerId={sale.sellerId}
                            storeInfo={storeInfo}
                        // NO pasar onClose para que no muestre botón de cerrar
                        // NO pasar shouldAutoPrint para que no imprima automáticamente
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="primary"
                            onClick={onPrint}
                            className="flex-1 h-14 text-base font-black uppercase bg-slate-900 hover:bg-slate-800 text-white"
                        >
                            <Printer className="h-5 w-5 mr-2" />
                            Imprimir Ticket
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1 h-14 text-base font-black uppercase"
                        >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Cerrar y Nueva Venta
                        </Button>
                    </div>

                    <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4 font-medium">
                        Presiona ESC para cerrar
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SaleCompleteModal;
