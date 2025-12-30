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
import AdminPanel from './components/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import StoreGuard from './components/StoreGuard';
import { Routes, Route, Navigate } from 'react-router-dom';

const AppContent: React.FC = () => {
  const { currentUser, logout } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to={currentUser.role === 'SUPER_ADMIN' ? "/admin/stores" : "/dashboard"} replace />} />

      {/* Super Admin Routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute requireAdmin>
          <AdminPanel onExit={logout} />
        </ProtectedRoute>
      } />

      {/* Store User Routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <StoreGuard>
            <Layout activeTab={activeTab} onTabChange={setActiveTab}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'pos' && <POS />}
              {activeTab === 'history' && <SalesHistory />}
              {activeTab === 'products' && <ProductList />}
              {activeTab === 'settings' && <Settings />}
            </Layout>
          </StoreGuard>
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
