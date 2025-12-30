import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Terminal, ArrowRight, Store, User, Lock, Mail, Phone, Loader2 } from 'lucide-react';
import Button from './Button';
import { useStore } from '../context/StoreContext';
import TeikonLogo from './TeikonLogo';
import TeikonWordmark from './TeikonWordmark';
import DevLoginModal from './DevLoginModal';
import { authAPI } from '../utils/api';


const Login: React.FC = () => {
  const { login } = useStore();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevModal, setShowDevModal] = useState(false);

  // Navigation
  const navigate = useNavigate();

  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register specific states
  const [orgName, setOrgName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        // REGISTER FLOW
        await authAPI.register({
          organizationName: orgName,
          storeName: storeName,
          usuario: username,
          password: password,
          email: email,
          telefono: phone
        });

        // Auto login after register
        const response = await authAPI.login(username, password);
        login(response.user, response.token);
        navigate('/dashboard'); // New stores go to dashboard
      } else {
        // LOGIN FLOW
        const response = await authAPI.login(username, password);

        // Update context
        login(response.user, response.token);

        // ---------------------------------------------------------
        // LOGIC FOR SUPER ADMIN REDIRECTION
        // ---------------------------------------------------------
        if (response.user.role === 'SUPER_ADMIN') {
          console.log("👑 Bienvenido Jefe - Redirigiendo a Panel de Tiendas");
          navigate('/admin/dashboard');
        } else {
          console.log("💼 Bienvenido Cliente - Redirigiendo a su POS");
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleDevSuccess = () => {
    // Dev backdoor for testing - kept for compatibility
    login({ id: 'dev-root', username: 'dev_engineer', role: 'SUPER_ADMIN', department: 'ENGINEERING' } as any, 'dev-token');
    setShowDevModal(false);
    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-pink/5 blur-[120px] rounded-full -ml-40 -mb-40 pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <TeikonLogo size={80} className="mb-6" />
          <TeikonWordmark height={24} className="text-slate-900 dark:text-white" />
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.4em] mt-4">
            {isRegisterMode ? 'Nueva Organización' : 'Acceso Seguro'}
          </p>
        </div>

        <div className="bg-white dark:bg-brand-panel backdrop-blur-md p-8 border border-slate-200 dark:border-brand-border rounded-3xl shadow-2xl transition-all duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">

            {isRegisterMode && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Organización</label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted h-4 w-4" />
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-brand-purple transition-all outline-none font-bold text-slate-900 dark:text-white"
                        placeholder="Mi Empresa"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Sucursal</label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-purple transition-all outline-none font-bold text-slate-900 dark:text-white"
                      placeholder="Centro"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted h-4 w-4" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-brand-purple transition-all outline-none font-bold text-slate-900 dark:text-white uppercase placeholder:normal-case"
                  placeholder="admin_user"
                />
              </div>
            </div>

            {isRegisterMode && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted h-4 w-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-brand-purple transition-all outline-none font-bold text-slate-900 dark:text-white"
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted h-4 w-4" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-brand-purple transition-all outline-none font-bold text-slate-900 dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 text-[10px] font-bold rounded-xl border border-red-500/20 animate-in slide-in-from-top-2">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              className="py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black border-none text-[10px] font-black tracking-widest shadow-xl mt-4 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {loading ? <Loader2 className="animate-spin" /> : (isRegisterMode ? 'CREAR ORGANIZACIÓN' : 'INICIAR SESIÓN')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 text-center">
            <button
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-xs font-bold text-brand-muted hover:text-brand-purple transition-colors flex items-center gap-2 mx-auto"
            >
              {isRegisterMode ? '¿Ya tienes una cuenta? Ingresa aquí' : '¿Nueva organización? Regístrate'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
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
