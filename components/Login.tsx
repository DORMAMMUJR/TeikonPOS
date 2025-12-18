
import React, { useState } from 'react';
import { Lock, User, LogIn, AlertCircle } from 'lucide-react';
import Button from './Button';
import { useStore } from '../context/StoreContext';
import { User as UserType } from '../types';

const Login: React.FC = () => {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  // Usuarios de prueba con aislamiento de datos
  const USERS_DB: Record<string, UserType & { pass: string }> = {
    'admin': { id: 'usr-1', username: 'admin', role: 'admin', department: 'General', pass: '1234' },
    'lentes_user': { id: 'usr-2', username: 'lentes_user', role: 'seller', department: 'Lentes', pass: 'lentes123' }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = USERS_DB[username];
    
    if (user && user.pass === password) {
      // No pasamos la contraseña al contexto por seguridad
      const { pass, ...userData } = user;
      login(userData);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 transition-colors duration-300">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                <Lock size={32} />
              </div>
            </div>
            
            <h2 className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-2">
              Teikon
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
              Sesión Segura (se cierra al salir del navegador)
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white transition-all"
                    placeholder="admin o lentes_user"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white transition-all"
                    placeholder="1234 o lentes123"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-bold animate-pulse">
                  <AlertCircle size={16} />
                  <span>Acceso denegado. Revisa tus datos.</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                className="py-3 text-lg"
              >
                <LogIn className="mr-2" size={20} />
                Entrar al Sistema
              </Button>
            </form>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 text-center border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-400">Aislamiento de Datos Activo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
