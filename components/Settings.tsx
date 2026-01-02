import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import {
  Moon, Sun, DollarSign, TrendingUp, Package, Percent,
  Save, RotateCcw, AlertTriangle, CheckCircle, Settings as SettingsIcon,
  Bell, Lock, Globe, Smartphone, Monitor, Palette, Zap, Shield,
  Calculator, ShieldCheck, LifeBuoy, ChevronRight, LogOut
} from 'lucide-react';
import { Modal, Button } from '../src/components/ui';
import DangerZone from './DangerZone';
import SupportTicketModal from './SupportTicketModal';

const Settings: React.FC = () => {
  const { settings, updateSettings, currentUser, calculateTotalInventoryValue, currentSession, closeSession, logout } = useStore();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState(settings.monthlyFixedCosts);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'danger'>('general');


  const [fixedCosts, setFixedCosts] = useState(settings.monthlyFixedCosts);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [actualCash, setActualCash] = useState('');

  const expectedCash = currentSession
    ? (currentSession.startBalance + currentSession.cashSales - currentSession.refunds)
    : 0;

  const difference = (parseFloat(actualCash) || 0) - expectedCash;

  const handleSaveSettings = () => {
    updateSettings({ monthlyFixedCosts: fixedCosts });
  };

  const handleConfirmClose = () => {
    const finalCash = parseFloat(actualCash) || 0;
    closeSession(finalCash);
    setIsCloseModalOpen(false);
    setActualCash('');
  };

  const handleStoreDeleted = () => {
    // Redirect to login after store deletion
    window.location.href = '/login';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">

      {/* APARIENCIA */}
      <div className="card-premium p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-purple/10 rounded-xl">
            <Sun size={18} className="text-brand-purple" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Apariencia</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-4 w-full">
            <div className={`p-3 rounded-xl shrink-0 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
              {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Modo Oscuro</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Interfaz optimizada</p>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`w-16 h-8 rounded-full transition-all duration-300 relative px-1 flex items-center shrink-0 min-h-[44px] ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'
              }`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-8' : 'translate-x-0'
              }`} />
          </button>
        </div>
      </div>

      {/* FINANZAS Y ARQUEO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-premium p-6 border-t-4 border-t-brand-blue bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <Calculator size={18} className="text-brand-blue" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Gastos</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fijo Mensual</label>
              <input
                type="number"
                value={fixedCosts}
                onChange={(e) => setFixedCosts(parseFloat(e.target.value))}
                className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-all"
              />
            </div>
            <Button
              fullWidth
              variant="finance"
              onClick={handleSaveSettings}
              className="py-5"
            >
              ACTUALIZAR GASTOS
            </Button>
          </div>
        </div>

        <div className="card-premium p-6 flex flex-col justify-between border-t-4 border-t-brand-emerald bg-white dark:bg-slate-900 shadow-sm">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-emerald">Arqueo</h3>
              <span className="bg-brand-emerald/10 text-brand-emerald px-3 py-1 rounded-full text-[8px] font-black uppercase border border-brand-emerald/20 shrink-0">Turno Activo</span>
            </div>

            <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-brand-emerald/10">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Teórico</p>
              <p className="text-4xl font-black text-brand-emerald tracking-tighter text-center">${expectedCash.toLocaleString()}</p>
            </div>
          </div>

          <button
            onClick={() => setIsCloseModalOpen(true)}
            className="mt-6 w-full h-14 border-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 min-h-[56px]"
          >
            <ShieldCheck size={18} /> FINALIZAR JORNADA
          </button>
        </div>
      </div>

      {/* SOPORTE */}
      <div className="card-premium p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => setIsSupportModalOpen(true)}
          className="w-full min-h-[64px] px-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-500/30 transition-all gap-4"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg shrink-0">
              <LifeBuoy size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Ayuda Técnica</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Reportar errores o dudas</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
        </button>
      </div>

      {/* CIERRE DE SESIÓN */}
      <div className="card-premium p-6 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 shadow-sm">
        <button
          onClick={logout}
          className="w-full h-16 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-red-500/20 flex items-center justify-center gap-3 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-red-500/5 min-h-[64px]"
        >
          <LogOut size={20} />
          <span className="text-[11px] font-black uppercase tracking-[0.3em]">SALIR DEL SISTEMA</span>
        </button>
      </div>

      {/* DANGER ZONE */}
      <DangerZone onStoreDeleted={handleStoreDeleted} />

      <SupportTicketModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />

      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="CIERRE DE TERMINAL">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Esperado</p>
              <p className="text-2xl font-black text-brand-blue">${expectedCash.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
              <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Efectivo Real</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
              <input
                type="number" autoFocus
                className="w-full h-16 pl-12 pr-4 text-4xl font-black bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-brand-blue text-slate-900 dark:text-white transition-all shadow-inner"
                placeholder="0.00"
                value={actualCash}
                onChange={e => setActualCash(e.target.value)}
              />
            </div>
          </div>

          <div className={`p-5 rounded-2xl border-2 flex justify-between items-center transition-all ${difference < 0 ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'
            }`}>
            <span className="text-[10px] font-black uppercase tracking-widest">{difference < 0 ? 'Faltante' : 'Balance'}</span>
            <span className="text-3xl font-black">${Math.abs(difference).toFixed(2)}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 border-slate-200 dark:border-slate-800 order-2 sm:order-1 min-h-[56px]" onClick={() => setIsCloseModalOpen(false)}>Cancelar</button>
            <button className="flex-1 h-14 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg order-1 sm:order-2 min-h-[56px]" onClick={handleConfirmClose}>Cerrar Turno</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
