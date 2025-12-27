
import React, { useState } from 'react';
import { ShieldAlert, Terminal } from 'lucide-react';
import Button from './Button';
import { useStore } from '../context/StoreContext';
import { User as UserType } from '../types';
import TeikonLogo from './TeikonLogo';
import TeikonWordmark from './TeikonWordmark';
import DevLoginModal from './DevLoginModal';

const Login: React.FC = () => {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);

  const USERS_DB: Record<string, UserType & { pass: string }> = {
    'ADMIN': { 
      id: 'usr-1', 
      username: 'admin', 
      role: 'admin', 
      department: 'CORE', 
      pass: '1234',
      storeName: 'TEIKON MATRIZ' // Usuario ya configurado
    },
    'LENTES_USER': { 
      id: 'usr-2', 
      username: 'lentes_user', 
      role: 'seller', 
      department: 'OPTICA', 
      pass: 'lentes123' 
      // Sin storeName para forzar ONBOARDING
    }
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

  const handleDevSuccess = () => {
    // Al autenticarse como DEV, logueamos al usuario con rol SUPERUSER que ya tiene acceso al Admin Panel
    login({ id: 'dev-root', username: 'dev_engineer', role: 'superuser', department: 'ENGINEERING' } as any);
    setShowDevModal(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 overflow-hidden relative">
      {/* Luces de fondo sutiles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[120px] rounded-full -mr-40 -mt-40"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-pink/5 blur-[120px] rounded-full -ml-40 -mb-40"></div>

      <div className="max-w-xs w-full relative z-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <TeikonLogo size={100} className="mb-6" />
          <TeikonWordmark height={30} className="text-slate-900 dark:text-white" />
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.4em] mt-6">Inventario Digital</p>
        </div>

        <div className="bg-white dark:bg-brand-panel backdrop-blur-md p-8 border border-slate-200 dark:border-brand-border rounded-2xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Identificador</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-purple transition-all outline-none uppercase font-black text-slate-900 dark:text-white placeholder:text-brand-muted/20"
                placeholder="USUARIO"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Clave</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-purple transition-all outline-none font-black text-slate-900 dark:text-white placeholder:text-brand-muted/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 text-[9px] font-black uppercase rounded-lg border border-red-500/20">
                <ShieldAlert size={14} />
                <span>Credenciales Invalidas</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              className="py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black border-none text-[10px] font-black tracking-widest shadow-xl"
            >
              ENTRAR
            </Button>
          </form>
        </div>
        
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-center text-[8px] font-bold text-brand-muted uppercase tracking-[0.4em] opacity-40">
            TEIKON OS // V2.9 CORE
          </p>
          <button 
            onClick={() => setShowDevModal(true)}
            className="flex items-center gap-2 text-[8px] font-black text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-[0.3em] opacity-30 hover:opacity-100"
          >
            <Terminal size={12} /> Acceso Desarrollador
          </button>
        </div>
      </div>

      {showDevModal && (
        <DevLoginModal 
          onSuccess={handleDevSuccess}
          onClose={() => setShowDevModal(false)}
        />
      )}
    </div>
  );
};

export default Login;
