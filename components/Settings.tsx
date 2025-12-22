
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import Modal from './Modal';
import { 
  Wallet, 
  Calculator, 
  History, 
  AlertTriangle, 
  Sun, 
  Moon, 
  LifeBuoy, 
  LogOut, 
  Settings as SettingsIcon,
  ChevronRight,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import SupportTicketModal from './SupportTicketModal';

const Settings: React.FC = () => {
  const { settings, updateSettings, currentSession, closeSession, allSessions, currentUser, logout } = useStore();
  const { theme, toggleTheme } = useTheme();
  
  const [fixedCosts, setFixedCosts] = useState(settings.monthlyFixedCosts);
  const [margin, setMargin] = useState(settings.targetMargin * 100);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [actualCash, setActualCash] = useState('');

  const expectedCash = currentSession 
    ? (currentSession.startBalance + currentSession.cashSales - currentSession.refunds)
    : 0;
    
  const difference = (parseFloat(actualCash) || 0) - expectedCash;

  const handleSaveSettings = () => {
    updateSettings({ monthlyFixedCosts: fixedCosts, targetMargin: margin / 100 });
    // Aquí podrías añadir un toast de notificación
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* SECCIÓN: APARIENCIA & PREFERENCIAS */}
      <div className="card-premium p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-purple/10 rounded-xl">
            <Sun size={18} className="text-brand-purple" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Apariencia del Sistema</h3>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Modo Oscuro</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Optimizar para baja iluminación</p>
            </div>
          </div>
          
          {/* Custom Toggle Switch */}
          <button 
            onClick={toggleTheme}
            className={`w-14 h-8 rounded-full transition-all duration-300 relative px-1 flex items-center ${
              theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'
            }`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
              theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* SECCIÓN: OPERACIONES FINANCIERAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-premium p-6 border-t-4 border-t-brand-blue bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <Calculator size={18} className="text-brand-blue" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Metas & Costos</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Costo Fijo Mensual</label>
              <input
                type="number"
                value={fixedCosts}
                onChange={(e) => setFixedCosts(parseFloat(e.target.value))}
                className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Margen Objetivo (%)</label>
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value))}
                className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-all"
              />
            </div>
            <button 
              onClick={handleSaveSettings}
              className="w-full h-12 bg-brand-blue text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-blue/20 hover:bg-brand-blue/90 transition-all active:scale-95"
            >
              Guardar Cambios
            </button>
          </div>
        </div>

        <div className="card-premium p-6 flex flex-col justify-between border-t-4 border-t-brand-emerald bg-white dark:bg-slate-900 shadow-sm">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-emerald">Arqueo de Caja</h3>
              <span className="bg-brand-emerald/10 text-brand-emerald px-3 py-1 rounded-full text-[8px] font-black uppercase border border-brand-emerald/20">Turno Activo</span>
            </div>

            <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-brand-emerald/10">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Efectivo Teórico</p>
              <p className="text-3xl font-black text-brand-emerald tracking-tighter">${expectedCash.toLocaleString()}</p>
            </div>
          </div>

          <button 
            onClick={() => setIsCloseModalOpen(true)} 
            className="mt-6 w-full h-14 border-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <ShieldCheck size={16} /> Finalizar Jornada
          </button>
        </div>
      </div>

      {/* SECCIÓN: SOPORTE TÉCNICO */}
      <div className="card-premium p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <LifeBuoy size={18} className="text-indigo-500" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Ayuda & Soporte</h3>
        </div>

        <button 
          onClick={() => setIsSupportModalOpen(true)}
          className="w-full h-16 px-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-500/30 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-500/20">
              <LifeBuoy size={18} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Contactar Soporte</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Asistencia técnica y reporte de errores</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
        </button>
      </div>

      {/* SECCIÓN: CUENTA & SEGURIDAD */}
      <div className="card-premium p-6 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 dark:border-red-500/20 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/10 rounded-xl">
            <LogOut size={18} className="text-red-500" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Sesión & Cuenta</h3>
        </div>

        <button 
          onClick={logout}
          className="w-full h-16 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-red-500/20 flex items-center justify-center gap-3 text-red-500 hover:bg-red-500 hover:text-white transition-all group active:scale-95 shadow-lg shadow-red-500/5"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">Cerrar Sesión Segura</span>
        </button>
        
        <p className="mt-6 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] opacity-50">
          TEIKON CORE OS // {new Date().getFullYear()}
        </p>
      </div>

      {/* MODALES */}
      <SupportTicketModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />

      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="CIERRE DE TERMINAL">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Esperado</p>
              <p className="text-xl font-black text-brand-blue">${expectedCash.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
              <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Efectivo Físico Real</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">$</span>
              <input 
                type="number" autoFocus 
                className="w-full h-16 pl-10 pr-4 text-3xl font-black bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-brand-blue text-slate-900 dark:text-white transition-all shadow-inner"
                placeholder="0.00"
                value={actualCash} 
                onChange={e => setActualCash(e.target.value)}
              />
            </div>
          </div>

          <div className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all ${
            difference < 0 ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-widest">{difference < 0 ? 'Faltante de Caja' : 'Sobrante / Balance'}</span>
            <span className="text-xl font-black">${Math.abs(difference).toFixed(2)}</span>
          </div>

          <div className="flex gap-4 pt-4">
            <button className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 border-slate-200 dark:border-slate-800 text-slate-500" onClick={() => setIsCloseModalOpen(false)}>Cancelar</button>
            <button className="flex-1 h-12 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20" onClick={handleConfirmClose}>Cerrar Turno</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
