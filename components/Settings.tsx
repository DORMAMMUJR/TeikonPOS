
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import Button from './Button';
import Modal from './Modal';
import { Wallet, Calculator, History, AlertTriangle, Scale } from 'lucide-react';

const Settings: React.FC = () => {
  const { settings, updateSettings, currentSession, closeSession, allSessions, currentUser } = useStore();
  const [fixedCosts, setFixedCosts] = useState(settings.monthlyFixedCosts);
  const [margin, setMargin] = useState(settings.targetMargin * 100);
  
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actualCash, setActualCash] = useState('');

  const expectedCash = currentSession 
    ? (currentSession.startBalance + currentSession.cashSales - currentSession.refunds)
    : 0;
    
  const difference = (parseFloat(actualCash) || 0) - expectedCash;

  const handleSaveSettings = () => {
    updateSettings({ monthlyFixedCosts: fixedCosts, targetMargin: margin / 100 });
    alert("ESTRATEGIA ACTUALIZADA");
  };

  const handleConfirmClose = () => {
    const finalCash = parseFloat(actualCash) || 0;
    closeSession(finalCash);
    setIsCloseModalOpen(false);
    setActualCash('');
  };

  const closedSessions = allSessions
    .filter(s => s.status === 'CLOSED' && s.ownerId === currentUser?.id)
    .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-premium p-6 border-l-4 border-brand-blue space-y-6">
          <div className="flex items-center gap-2 text-brand-blue mb-2">
            <Calculator size={18} />
            <h3 className="text-xs font-black uppercase tracking-widest">Estructura de Costos</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-brand-muted uppercase mb-1">Costo Fijo Mensual</label>
              <input
                type="number"
                value={fixedCosts}
                onChange={(e) => setFixedCosts(parseFloat(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-blue shadow-inner"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-brand-muted uppercase mb-1">Margen Objetivo %</label>
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-blue shadow-inner"
              />
            </div>
          </div>
          <Button onClick={handleSaveSettings} className="bg-brand-blue hover:bg-blue-400 text-white border-none rounded-lg py-3 text-[9px] font-black" fullWidth>Guardar Configuración</Button>
        </div>

        <div className="card-premium p-6 flex flex-col justify-between border-l-4 border-brand-blue bg-blue-50/50 dark:bg-brand-blue/5">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-blue">Terminal Activa</h3>
              <span className="bg-brand-blue text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Online</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                 <p className="text-[8px] font-bold text-brand-muted uppercase">Inicio</p>
                 <p className="text-[11px] font-black text-slate-800 dark:text-white">{new Date(currentSession?.startTime || '').toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
               </div>
               <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                 <p className="text-[8px] font-bold text-brand-muted uppercase">Fondo</p>
                 <p className="text-[11px] font-black text-slate-800 dark:text-white">${currentSession?.startBalance}</p>
               </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border-l-2 border-brand-blue shadow-sm">
              <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Efectivo Teórico</p>
              <p className="text-2xl font-black text-brand-blue">${expectedCash.toLocaleString()}</p>
            </div>
          </div>

          <Button 
            onClick={() => setIsCloseModalOpen(true)} 
            className="mt-6 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white bg-transparent dark:bg-transparent rounded-lg py-3 text-[9px] font-black"
            fullWidth 
          >
            ARQUEO Y CIERRE DE TURNO
          </Button>
        </div>
      </div>

      <div className="card-premium overflow-hidden border-l-4 border-brand-blue shadow-sm">
        <div className="p-4 border-b border-brand-border bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white">
            <History size={16} className="text-brand-blue" /> Auditoría de Cierres
          </h3>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-slate-50 dark:bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 text-left text-[9px] font-black text-brand-muted uppercase tracking-widest">Fecha</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">Teórico</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">Físico</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-brand-muted uppercase tracking-widest">Diff</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-brand-muted uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {closedSessions.map(session => {
                const diff = (session.endBalanceReal || 0) - session.expectedBalance;
                return (
                  <tr key={session.id} className="hover:bg-slate-100 dark:hover:bg-brand-blue/5 transition-colors">
                    <td className="px-4 py-3 text-[10px] text-brand-muted font-medium">
                      {new Date(session.endTime!).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-[10px] font-black text-slate-800 dark:text-white">
                      ${session.expectedBalance}
                    </td>
                    <td className="px-4 py-3 text-right text-[10px] font-black text-slate-800 dark:text-white">
                      ${session.endBalanceReal}
                    </td>
                    <td className={`px-4 py-3 text-right text-[10px] font-black ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-amber-500' : 'text-brand-blue'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${Math.abs(diff) < 1 ? 'bg-brand-blue/10 text-brand-blue' : 'bg-red-500/10 text-red-500'}`}>
                          {Math.abs(diff) < 1 ? 'OK' : 'FAIL'}
                       </span>
                    </td>
                  </tr>
                );
              })}
              {closedSessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center opacity-30 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-white">Sin registros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="CONTEO DE EFECTIVO">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <p className="text-[9px] font-bold text-brand-muted uppercase">Esperado</p>
              <p className="text-xl font-black text-brand-blue">${expectedCash.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <p className="text-[9px] font-bold text-brand-muted uppercase">Contable</p>
              <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest">Físico Real</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-brand-muted">$</span>
              <input 
                type="number" autoFocus 
                className="w-full pl-10 pr-4 py-4 text-3xl font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-brand-blue text-slate-900 dark:text-white transition-all shadow-inner"
                placeholder="0.00"
                value={actualCash} 
                onChange={e => setActualCash(e.target.value)}
              />
            </div>
          </div>

          <div className={`p-4 rounded-xl border-2 flex justify-between items-center ${difference < 0 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest">{difference < 0 ? 'Faltante' : 'Sobrante'}</span>
            <span className="text-xl font-black">${Math.abs(difference).toFixed(2)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth className="rounded-xl py-3 text-[9px] font-black text-slate-800 dark:text-white border-slate-200 dark:border-slate-700" onClick={() => setIsCloseModalOpen(false)}>Reanudar</Button>
            <Button fullWidth className="rounded-xl py-3 bg-brand-blue text-white border-none text-[9px] font-black" onClick={handleConfirmClose}>Cerrar Turno</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
