import React, { useState } from 'react';
import { StoreProvider } from './context/StoreContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import ProductList from './components/ProductList';
import Settings from './components/Settings';
import SalesHistory from './components/SalesHistory';
import Login from './components/Login';

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Si no está autenticado, mostramos la pantalla de login únicamente
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
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
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;