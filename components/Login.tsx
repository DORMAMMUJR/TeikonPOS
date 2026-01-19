import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Terminal, User, Lock, Loader2, Mail, Phone, X, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { authAPI } from '../utils/api';
import { Button, TeikonLogo, TeikonWordmark } from '../src/components/ui';
import DevLoginModal from './DevLoginModal';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevModal, setShowDevModal] = useState(false);

  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Recovery State
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [isLoadingRecovery, setIsLoadingRecovery] = useState(false);

  const handleRecoveryRequest = async () => {
    if (!recoveryEmail) return;
    setIsLoadingRecovery(true);
    try {
      await authAPI.requestPasswordReset(recoveryEmail, recoveryPhone);
      alert('Solicitud enviada. Soporte te contactará pronto.');
      setIsRecoveryOpen(false);
      setRecoveryEmail('');
      setRecoveryPhone('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoadingRecovery(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Clear expired token BEFORE attempting login
    // This prevents sending expired tokens to the login endpoint
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      try {
        // Check if token is expired
        const base64Url = existingToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);

        // If token is expired, clear it
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.log('🧹 Clearing expired token before login attempt');
          localStorage.removeItem('token');
          localStorage.removeItem('cashSession');
          localStorage.removeItem('selectedStore');
        }
      } catch (err) {
        // If token is corrupted, clear it
        console.warn('🧹 Clearing corrupted token before login attempt');
        localStorage.removeItem('token');
        localStorage.removeItem('cashSession');
        localStorage.removeItem('selectedStore');
      }
    }

    try {
      // REGISTER FLOW REMOVED

      // LOGIN FLOW
      const response = await authAPI.login(username, password);

      // Update context with token only
      login(response.token);

      // Save storeId for critical components like DangerZone
      if (response.user && response.user.storeId) {
        localStorage.setItem('currentStoreId', response.user.storeId);
      }

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
    } catch (err: any) {
      console.error(err);

      // Provide specific error messages
      const errorMessage = err.message || '';
      if (errorMessage.includes('401') || errorMessage.includes('Credenciales')) {
        setError('Usuario o contraseña incorrectos');
      } else if (errorMessage.includes('NETWORK_ERROR')) {
        setError('No se pudo conectar al servidor. Verifica tu conexión.');
      } else {
        setError(errorMessage || 'Error de autenticación');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevSuccess = () => {
    // Dev backdoor - create a mock JWT token for testing
    // In production, this should be removed or properly secured
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZXYtcm9vdCIsInVzZXJuYW1lIjoiZGV2X2VuZ2luZWVyIiwicm9sZSI6IlNVUEVSX0FETUlOIiwic3RvcmVJZCI6bnVsbCwiZXhwIjo5OTk5OTk5OTk5fQ.mock';
    login(mockToken);
    setShowDevModal(false);
    navigate('/admin/dashboard');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 overflow-hidden relative">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-pink/5 blur-[120px] rounded-full -ml-40 -mb-40 pointer-events-none"></div>

        <div className="max-w-md w-full relative z-10">
          <div className="flex flex-col items-center mb-10 text-center">
            <TeikonLogo size={80} className="mb-6" />
            <TeikonWordmark height={24} className="text-slate-900 dark:text-white" />
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.4em] mt-4">
              INVENTORY SOFTWARE
            </p>
          </div>

          <div className="bg-white dark:bg-brand-panel backdrop-blur-md p-8 border border-slate-200 dark:border-brand-border rounded-3xl shadow-2xl transition-all duration-300">
            <form onSubmit={handleSubmit} className="space-y-4">



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



              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted h-4 w-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-12 py-3 text-sm focus:border-brand-purple transition-all outline-none font-bold text-slate-900 dark:text-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-purple transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                {loading ? <Loader2 className="animate-spin" /> : 'INICIAR SESIÓN'}
              </Button>
            </form>


          </div>
        </div>


      </div>

      {showDevModal && (
        <DevLoginModal
          onSuccess={handleDevSuccess}
          onClose={() => setShowDevModal(false)}
        />
      )}
    </>
  );
};

export default Login;
