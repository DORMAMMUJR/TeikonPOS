import React, { useState } from 'react';
import { X, Lock, User, ShieldAlert, Terminal } from 'lucide-react';

interface DevLoginModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

const DevLoginModal: React.FC<DevLoginModalProps> = ({ onSuccess, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación hardcoded: dev / 3232
    if (username === 'dev' && password === '3232') {
      onSuccess();
    } else {
      setError('Credenciales de desarrollador inválidas. Acceso denegado.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="p-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                <Terminal size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white">Dev Portal</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Módulo de Ingeniería</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuario</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="dev_access"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <ShieldAlert className="text-red-500 shrink-0" size={18} />
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/10 transition-all active:scale-[0.98] mt-4"
            >
              Iniciar Override
            </button>
          </form>

          <p className="mt-8 text-center text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] opacity-50">
            TEIKON ENGINEERING SECURE ACCESS
          </p>
        </div>
      </div>
    </div>
  );
};

export default DevLoginModal;
