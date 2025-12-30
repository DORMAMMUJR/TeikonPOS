
import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import ProductList from './components/ProductList';
import Settings from './components/Settings';
import SalesHistory from './components/SalesHistory';
import Login from './components/Login';
import Button from './components/Button';
import AdminPanel from './components/AdminPanel';
import InitialConfig from './components/InitialConfig';
import { Power } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, currentSession, openSession, logout } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openingBalance, setOpeningBalance] = useState('');

  // ==========================================
  // FILTRO 1 (CRÍTICO): AUTENTICACIÓN
  // ==========================================
  if (!currentUser) {
    return <Login />;
  }

  // ==========================================
  // FILTRO 2: RBAC - ACCESO A PANEL DE CONTROL
  // ==========================================
  if ((currentUser as any).role === 'superuser') {
    return <AdminPanel onExit={logout} />;
  }

  // ==========================================
  // FILTRO 3 (MURO DE SEGURIDAD): ONBOARDING
  // Este bloque impide que se procese cualquier lógica de caja o dashboard
  // si la tienda no tiene un nombre válido asignado.
  // ==========================================
  const isStoreConfigured = currentUser.storeName && currentUser.storeName.trim() !== '';
  
  if (!isStoreConfigured) {
    return <InitialConfig />;
  }

  // ==========================================
  // FILTRO 4: APERTURA DE CAJA / SESIÓN
  // Solo se evalúa si el usuario ya pasó exitosamente el Onboarding.
  // ==========================================
  if (!currentSession) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-brand-panel border border-slate-200 dark:border-brand-border p-10 cut-corner shadow-2xl animate-in zoom-in duration-500">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-200 dark:border-brand-border">
              <Power className="h-10 w-10 text-slate-900 dark:text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white">Apertura de Terminal</h2>
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mt-2">
                Nodo Activo: {currentUser.storeName}
              </p>
              <p className="text-[10px] font-medium text-brand-muted uppercase mt-1">
                Ingrese el fondo de caja inicial para comenzar
              </p>
            </div>
            <div className="w-full relative">
               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-brand-muted">$</span>
               <input 
                 type="number" 
                 autoFocus
                 className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cut-corner p-6 pl-14 text-4xl font-black text-slate-900 dark:text-white outline-none focus:border-brand-purple transition-all shadow-inner"
                 placeholder="0.00"
                 value={openingBalance}
                 onChange={e => setOpeningBalance(e.target.value)}
               />
            </div>
            <Button 
              fullWidth 
              variant="primary" 
              className="py-5 bg-slate-900 dark:bg-white text-white dark:text-black hover:opacity-90"
              onClick={() => openSession(parseFloat(openingBalance) || 0)}
            >
              Iniciar Operaciones
            </Button>
            <p className="text-[8px] font-black text-brand-muted uppercase tracking-[0.4em]">SISTEMA TEIKON v2.9.1 SECURE</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // FLUJO FINAL: RENDERIZADO DEL DASHBOARD
  // Solo se llega aquí si Auth, Onboarding y Caja están OK.
  // ==========================================
  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <POS />;
      case 'history': return <SalesHistory />;
      case 'products': return <ProductList />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ThemeProvider>
  );
};

export default App;
