
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
import Modal from './components/Modal';
import Button from './components/Button';
import { Power } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, currentSession, openSession } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openingBalance, setOpeningBalance] = useState('');

  if (!currentUser) return <Login />;

  // Modal de Apertura de Caja Obligatorio
  if (!currentSession) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-brand-panel border border-brand-border p-10 cut-corner shadow-2xl animate-in zoom-in duration-500">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-brand-text/5 rounded-full border border-brand-border">
              <Power className="h-10 w-10 text-brand-text" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-[0.3em]">INICIO DE TURNO</h2>
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mt-2">INGRESE FONDO INICIAL DE CAJA</p>
            </div>
            <div className="w-full relative">
               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-brand-muted">$</span>
               <input 
                 type="number" 
                 autoFocus
                 className="w-full bg-brand-bg border border-brand-border cut-corner p-6 pl-12 text-3xl font-black text-brand-text outline-none focus:border-brand-text transition-all"
                 placeholder="0.00"
                 value={openingBalance}
                 onChange={e => setOpeningBalance(e.target.value)}
               />
            </div>
            <Button 
              fullWidth 
              variant="primary" 
              className="py-5"
              onClick={() => openSession(parseFloat(openingBalance) || 0)}
            >
              ABRIR TERMINAL
            </Button>
            <p className="text-[8px] font-black text-brand-muted uppercase tracking-[0.4em]">PROTOCOLO DE SEGURIDAD TEIKON OS</p>
          </div>
        </div>
      </div>
    );
  }

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
