import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { inventoryAPI } from '../utils/api';
import {
    History, ArrowDownRight, ArrowUpRight, AlertTriangle,
    Search, Calendar, Filter, FileText, User
} from 'lucide-react';
import { Button } from '../src/components/ui';

interface Movement {
    id: string;
    productId: string;
    storeId: string;
    tipo: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'THEFT' | 'RETURN' | 'TRANSFER' | 'SHRINKAGE' | 'ADMIN_CORRECTION';
    cantidad: number;
    stockAnterior: number;
    stockNuevo: number;
    motivo: string;
    referenciaId?: string;
    registradoPor: string;
    createdAt: string;
    product?: {
        id: string;
        sku: string;
        nombre: string;
    };
}

interface InventoryHistoryProps {
    targetStoreId?: string;
}

const InventoryHistory: React.FC<InventoryHistoryProps> = ({ targetStoreId }) => {
    const { currentUser } = useStore();
    const [movements, setMovements] = useState<Movement[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const params: any = { page, limit };
            if (targetStoreId) params.storeId = targetStoreId;
            else if (currentUser?.storeId) params.storeId = currentUser.storeId;

            if (filterType) params.type = filterType;

            const response = await inventoryAPI.getMovements(params);

            if (response && response.data) {
                setMovements(response.data);
                setTotalPages(response.totalPages || 1);
            } else {
                setMovements([]);
            }
        } catch (error) {
            console.error('Error al cargar el historial de inventario:', error);
            setMovements([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [page, filterType, targetStoreId, currentUser?.storeId]);

    // Opciones de tipos de movimiento para el filtro y la UI
    const movementTypes: Record<string, { label: string, color: string, icon: any }> = {
        'SALE': { label: 'Venta', color: 'text-red-500 bg-red-50 cursor-pointer', icon: ArrowUpRight },
        'PURCHASE': { label: 'Compra', color: 'text-emerald-500 bg-emerald-50', icon: ArrowDownRight },
        'ADJUSTMENT': { label: 'Ajuste Sist.', color: 'text-amber-500 bg-amber-50', icon: AlertTriangle },
        'THEFT': { label: 'Robo', color: 'text-rose-600 bg-rose-50', icon: AlertTriangle },
        'RETURN': { label: 'Devolución', color: 'text-emerald-600 bg-emerald-50', icon: ArrowDownRight },
        'TRANSFER': { label: 'Transferencia', color: 'text-blue-500 bg-blue-50', icon: History },
        'SHRINKAGE': { label: 'Merma', color: 'text-orange-500 bg-orange-50', icon: ArrowUpRight },
        'ADMIN_CORRECTION': { label: 'Corrección Admin.', color: 'text-violet-500 bg-violet-50', icon: AlertTriangle }
    };

    const getTypeInfo = (tipo: string) => movementTypes[tipo] || { label: tipo, color: 'text-gray-500 bg-gray-50', icon: History };

    // Filtro local en resultados (por si acaso el usuario quiere buscar rápido sin consultar API)
    const filteredMovements = movements.filter(m => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            m.motivo.toLowerCase().includes(term) ||
            m.registradoPor.toLowerCase().includes(term) ||
            (m.product?.nombre && m.product.nombre.toLowerCase().includes(term)) ||
            (m.product?.sku && m.product.sku.toLowerCase().includes(term))
        );
    });

    return (
        <div className="space-y-4">

            {/* Header del Historial */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">

                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Buscar por producto, motivo, usuario..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-blue transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filtros y Refrescar */}
                <div className="flex gap-2">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <select
                            className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-blue cursor-pointer appearance-none"
                            value={filterType}
                            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                        >
                            <option value="">Todos los Tipos</option>
                            <option value="IN">Solo Entradas (Compras/Devs)</option>
                            <option value="OUT">Solo Salidas (Ventas/Termas)</option>
                            <option value="ADJUST">Ajustes (Manu/Admin)</option>
                        </select>
                    </div>

                    <Button onClick={fetchHistory} variant="secondary" className="px-3" title="Refrescar">
                        <History size={16} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {/* Tabla de Movimientos */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha y Hora</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Producto</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Variación</th>
                                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Stock Final</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-1/4">Motivo / Operador</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                            {isLoading && movements.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Cargando historial...</td></tr>
                            ) : filteredMovements.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-slate-500">No se encontraron movimientos.</td></tr>
                            ) : (
                                filteredMovements.map(m => {
                                    const typeInfo = getTypeInfo(m.tipo);
                                    const Icon = typeInfo.icon;
                                    const date = new Date(m.createdAt);

                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            {/* FECHA */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <Calendar size={14} className="opacity-50" />
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">{date.toLocaleDateString()}</span>
                                                        <span className="text-[10px]">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* PRODUCTO */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col max-w-[200px]">
                                                    <span className="font-bold text-slate-900 dark:text-white truncate" title={m.product?.nombre || 'Producto Desconocido'}>
                                                        {m.product?.nombre || 'Producto Desconocido'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                                                        {m.product?.sku || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* TIPO */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${typeInfo.color}`}>
                                                    <Icon size={12} />
                                                    {typeInfo.label}
                                                </span>
                                            </td>

                                            {/* VARIACIÓN */}
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-black text-lg ${m.cantidad > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                                                </span>
                                            </td>

                                            {/* STOCK FINAL */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                        {m.stockNuevo}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 flex items-center gap-1">
                                                        (Ant: {m.stockAnterior})
                                                    </span>
                                                </div>
                                            </td>

                                            {/* MOTIVO / OPERADOR */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2" title={m.motivo}>
                                                        {m.motivo || 'Sin detalles'}
                                                    </span>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                            <User size={10} /> {m.registradoPor || 'Sistema'}
                                                        </span>
                                                        {m.referenciaId && (
                                                            <span className="text-[9px] font-black text-brand-blue uppercase bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                                #{m.referenciaId.substring(0, 6)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <span className="text-xs text-slate-500">
                            Página {page} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                className="px-3 py-1 text-xs"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="secondary"
                                className="px-3 py-1 text-xs"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryHistory;
