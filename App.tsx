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

// Componente hijo que consume el contexto de forma segura
const AppContent: React.FC = () => {
  const { currentUser, logout } = useStore();
  const [activeTab, setActiveTab] = useState('pos');

  // Secure Token Expiration Check
  useEffect(() => {
    if (currentUser) {
      const token = localStorage.getItem('token');

      if (token) {
        try {
          // 1. Decodificación manual segura (evita dependencias circulares)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const decoded = JSON.parse(jsonPayload);

          // 2. Verificar expiración estricta
          const currentTime = Date.now() / 1000;

          if (decoded.exp && decoded.exp < currentTime) {
            console.warn("🔒 Token expirado detectado en App.tsx - Ejecutando cierre de sesión forzado.");
            logout(); // <--- ESTO ROMPE EL BUCLE INFINITO
            return;
          }
        } catch (error) {
          // Si el token es corrupto, cerramos sesión por seguridad
          console.error("🔒 Error al verificar token:", error);
          logout();
          return;
        }
      }

      // 3. Si el token es válido, ejecutar la advertencia de "próximo a vencer" (si aplica)
      checkTokenExpirationWarning();
    }
  }, [currentUser, logout]);

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
          <Layout activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'pos' && (
              <StoreGuard>
                <CashRegisterGuard>
                  <POS />
                </CashRegisterGuard>
              </StoreGuard>
            )}
            {activeTab === 'history' && <SalesHistory />}
            {activeTab === 'products' && <ProductList />}
            {activeTab === 'settings' && <Settings />}
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

// Componente principal que provee el contexto
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
