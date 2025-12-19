
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import Button from './Button';
import Modal from './Modal';
import { Wallet, Calculator, History, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';

const Settings: React.FC = () => {
  const { settings, updateSettings, currentSession, closeSession, allSessions, currentUser } = useStore();
  const [fixedCosts, setFixedCosts] = useState(settings.monthlyFixedCosts);
  const [margin, setMargin] = useState(settings.targetMargin * 100);
  
  // Arqueo State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actualCash, setActualCash] = useState('');

  const expectedCash = currentSession 
    ? (currentSession.startBalance + currentSession.cashSales - currentSession.refunds)
    : 0;
    
  const difference = (parseFloat(actualCash) || 0) - expectedCash;

  const handleSaveSettings = () => {
    updateSettings({ monthlyFixedCosts: fixedCosts, targetMargin: margin / 100 });
    alert("CONFIGURACIÓN ACTUALIZADA");
  };

  const handleConfirmClose = () => {
    const finalCash = parseFloat(actualCash) || 0;
    closeSession(finalCash);
    setIsCloseModalOpen(false);
    setActualCash('');
    alert("TURNO FINALIZADO CORRECTAMENTE. CAJA CERRADA.");
  };

  const closedSessions = allSessions
    .filter(s => s.status === 'CLOSED' && s.ownerId === currentUser?.id)
    .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime());

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel Financiero */}
        <div className="bg-brand-panel border border-brand-border p-10 cut-corner space-y-8">
          <div className="flex items-center gap-4 mb-2">
            <Calculator className="text-brand-text" />
            <h3 className="text-sm font-black uppercase tracking-[0.3em]">PARÁMETROS DEL SISTEMA</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2">COSTOS FIJOS MENSUALES ($)</label>
              <input
                type="number"
                value={fixedCosts}
                onChange={(e) => setFixedCosts(parseFloat(e.target.value))}
                className="w-full bg-brand-bg border border-brand-border cut-corner-sm p-4 text-sm font-bold text-brand-text outline-none focus:border-brand-text transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2">MARGEN DE CONTRIBUCIÓN (%)</label>
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value))}
                className="w-full bg-brand-bg border border-brand-border cut-corner-sm p-4 text-sm font-bold text-brand-text outline-none focus:border-brand-text transition-all"
              />
            </div>

            <Button onClick={handleSaveSettings} variant="primary" fullWidth>GUARDAR CAMBIOS</Button>
          </div>
        </div>

        {/* Panel de Control de Turno */}
        <div className="bg-brand-panel border border-brand-border p-10 cut-corner flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Wallet className="text-brand-text" />
                <h3 className="text-sm font-black uppercase tracking-[0.3em]">ESTADO DE TURNO</h3>
              </div>
              <span className="bg-green-500 text-black px-3 py-1 text-[8px] font-black uppercase cut-corner-sm">OPERATIVO</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-brand-text/5 border border-brand-border cut-corner-sm">
                 <p className="text-[8px] font-black text-brand-muted uppercase mb-1">INICIO DE SESIÓN</p>
                 <p className="text-[10px] font-bold text-brand-text uppercase">{new Date(currentSession?.startTime || '').toLocaleTimeString()}</p>
               </div>
               <div className="p-4 bg-brand-text/5 border border-brand-border cut-corner-sm">
                 <p className="text-[8px] font-black text-brand-muted uppercase mb-1">FONDO INICIAL</p>
                 <p className="text-sm font-black text-brand-text">${currentSession?.startBalance.toLocaleString()}</p>
               </div>
            </div>

            <div className="p-6 bg-brand-text/5 border-l-4 border-brand-text">
              <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1">EFECTIVO CALCULADO EN CAJA</p>
              <p className="text-3xl font-black text-brand-text">${expectedCash.toLocaleString()}</p>
            </div>
          </div>

          <Button 
            onClick={() => setIsCloseModalOpen(true)} 
            variant="secondary" 
            fullWidth 
            className="mt-8 border-red-500 text-red-500 hover:bg-red-500 hover:text-white py-5"
          >
            FINALIZAR TURNO / CIERRE DE CAJA
          </Button>
        </div>
      </div>

      {/* Historial de Arqueos */}
      <div className="bg-brand-panel border border-brand-border cut-corner overflow-hidden">
        <div className="p-8 border-b border-brand-border bg-brand-text/5 flex items-center gap-4">
          <History size={18} className="text-brand-muted" />
          <h3 className="text-xs font-black uppercase tracking-[0.3em]">REGISTRO HISTÓRICO DE ARQUEOS</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-brand-text/5">
              <tr>
                <th className="px-6 py-4 text-left text-[8px] font-black text-brand-muted uppercase tracking-widest">FECHA/HORA CIERRE</th>
                <th className="px-6 py-4 text-right text-[8px] font-black text-brand-muted uppercase tracking-widest">ESPERADO</th>
                <th className="px-6 py-4 text-right text-[8px] font-black text-brand-muted uppercase tracking-widest">CONTADO</th>
                <th className="px-6 py-4 text-right text-[8px] font-black text-brand-muted uppercase tracking-widest">DIFERENCIA</th>
                <th className="px-6 py-4 text-center text-[8px] font-black text-brand-muted uppercase tracking-widest">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {closedSessions.map(session => {
                const diff = (session.endBalanceReal || 0) - session.expectedBalance;
                return (
                  <tr key={session.id} className="hover:bg-brand-text/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-[10px] font-bold text-brand-muted uppercase">
                      {new Date(session.endTime!).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[10px] font-black text-brand-text">
                      ${session.expectedBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[10px] font-black text-brand-text">
                      ${session.endBalanceReal?.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-[10px] font-black ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {diff > 0 && '+'}${diff.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                       <span className={`px-2 py-1 text-[7px] font-black uppercase cut-corner-sm ${Math.abs(diff) < 0.01 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {Math.abs(diff) < 0.01 ? 'CUADRADO' : 'CON DIFERENCIA'}
                       </span>
                    </td>
                  </tr>
                );
              })}
              {closedSessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center opacity-30 text-[10px] font-black uppercase tracking-widest">Sin registros de cierre</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CIERRE DE CAJA (CASH CLOSE MODAL) */}
      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="ARQUEO DE CAJA Y CIERRE">
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-brand-bg border border-brand-border cut-corner-sm">
              <p className="text-[8px] font-black text-brand-muted uppercase mb-1">FONDO + VENTAS NETAS</p>
              <p className="text-xl font-black text-brand-text">${expectedCash.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-brand-bg border border-brand-border cut-corner-sm">
              <p className="text-[8px] font-black text-brand-muted uppercase mb-1">FECHA CONTABLE</p>
              <p className="text-[10px] font-bold text-brand-text uppercase">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase text-brand-muted tracking-widest">INGRESE EFECTIVO REAL CONTADO EN CAJA</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl text-brand-muted font-black">$</span>
              <input 
                type="number" autoFocus className="w-full pl-14 pr-6 py-6 text-4xl font-black bg-brand-bg border border-brand-border cut-corner outline-none text-brand-text focus:border-brand-text transition-all"
                placeholder="0.00"
                value={actualCash} 
                onChange={e => setActualCash(e.target.value)}
              />
            </div>
          </div>

          <div className={`p-6 cut-corner border-2 transition-all flex justify-between items-center ${difference < 0 ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-green-500/10 border-green-500 text-green-500'}`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1">DIFERENCIA DE ARQUEO</p>
              <div className="flex items-center gap-2">
                {difference < 0 ? <AlertTriangle size={14}/> : <Scale size={14}/>}
                <span className="text-[10px] font-black uppercase">{difference < 0 ? 'FALTANTE DETECTADO' : difference > 0 ? 'SOBRANTE DETECTADO' : 'CAJA CUADRADA'}</span>
              </div>
            </div>
            <p className="text-3xl font-black">${difference.toFixed(2)}</p>
          </div>

          <div className="flex gap-4">
            <Button variant="secondary" fullWidth onClick={() => setIsCloseModalOpen(false)}>CANCELAR</Button>
            <Button variant="primary" fullWidth onClick={handleConfirmClose} className="bg-red-600 border-red-600 text-white">CONFIRMAR CIERRE</Button>
          </div>

          <p className="text-[8px] font-bold text-center text-brand-muted uppercase tracking-widest">
            ESTA ACCIÓN ES INREVERSIBLE Y QUEDARÁ REGISTRADA EN EL LOG DE AUDITORÍA
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
