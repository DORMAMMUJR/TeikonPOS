
import React, { useState } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import Button from './Button';
import { useStore } from '../context/StoreContext';
import { User as UserType } from '../types';
import TeikonLogo from './TeikonLogo';
import TeikonWordmark from './TeikonWordmark';

const Login: React.FC = () => {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const USERS_DB: Record<string, UserType & { pass: string }> = {
    'ADMIN': { id: 'usr-1', username: 'admin', role: 'admin', department: 'CORE', pass: '1234' },
    'LENTES_USER': { id: 'usr-2', username: 'lentes_user', role: 'seller', department: 'OPTICA', pass: 'lentes123' }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUsername = username.trim().toUpperCase();
    const user = USERS_DB[normalizedUsername];

    if (user && user.pass === password) {
      const { pass, ...userData } = user;
      login(userData);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 overflow-hidden relative transition-colors duration-700">
      {/* Elementos decorativos minimalistas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/20"></div>
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/20"></div>
      </div>

      <div className="max-w-sm w-full relative z-10">
        <div className="flex flex-col items-center mb-12">
          <TeikonLogo size={140} className="mb-8" />
          <TeikonWordmark height={45} className="text-white" />
          <div className="h-[2px] w-12 bg-purple-500 mt-6 shadow-[0_0_15px_rgba(168,85,247,0.8)]"></div>
        </div>

        <div className="bg-black p-8 border border-white/10 cut-corner shadow-2xl shadow-purple-900/10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                IDENTIFICADOR
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border-b border-white/10 px-0 py-3 text-sm focus:border-purple-500 transition-all outline-none uppercase tracking-widest font-black text-white"
                placeholder="USUARIO"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                CLAVE DE ACCESO
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-white/10 px-0 py-3 text-sm focus:border-purple-500 transition-all outline-none font-black text-white"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-white bg-red-900/40 p-3 text-[9px] font-black uppercase tracking-widest cut-corner-sm border border-red-500 animate-bounce">
                <ShieldAlert size={14} />
                <span>ACCESO DENEGADO</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              className="py-4"
            >
              AUTENTICAR
            </Button>
          </form>
        </div>
        
        <p className="mt-8 text-center text-[9px] font-bold text-gray-400 uppercase tracking-[0.5em] opacity-50">
          TEIKON CORE OS v2.5
        </p>
      </div>
    </div>
  );
};

export default Login;
