import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import ProductList from './components/ProductList';
import Settings from './components/Settings';
import SalesHistory from './components/SalesHistory';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import StoreGuard from './components/StoreGuard';
import CashRegisterGuard from './components/CashRegisterGuard';
import { Routes, Route, Navigate } from 'react-router-dom';
import { checkTokenExpirationWarning } from './utils/api';

const AppContent: React.FC = () => {
  const { currentUser, logout } = useStore();
  // CAMBIO 1: Iniciamos en 'pos' para que sea la primera pantalla,
  // pero ya no estará bloqueada globalmente.
  const [activeTab, setActiveTab] = useState('pos');

  useEffect(() => {
    if (currentUser) {
      checkTokenExpirationWarning();
    }
  }, [currentUser]);

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to={currentUser.role === 'SUPER_ADMIN' ? "/admin/stores" : "/pos"} replace />} />

      {/* Super Admin Routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute requireAdmin>
          <AdminPanel onExit={logout} />
        </ProtectedRoute>
      } />

      {/* Store User Routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          {/* CAMBIO 2: Eliminamos StoreGuard de aquí. El Layout es libre. */}
          <Layout activeTab={activeTab} onTabChange={setActiveTab}>

            {activeTab === 'dashboard' && <Dashboard />}

            {/* CAMBIO 3: El bloqueo AHORA vive solo aquí, protegiendo al POS */}
            {activeTab === 'pos' && (
              <StoreGuard>
                <CashRegisterGuard>
                  <POS />
                </CashRegisterGuard>
              </StoreGuard>
            )}

            {/* El resto de pestañas son accesibles sin abrir caja */}
            {activeTab === 'history' && <SalesHistory />}
            {activeTab === 'products' && <ProductList />}
            {activeTab === 'settings' && <Settings />}

          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
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
