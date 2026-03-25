import { motion, AnimatePresence } from "motion/react";
import { Plane, Sparkles, Mail, Lock, UserPlus, LogIn, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onStart();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        const { data: confirmData, error: confirmError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!confirmError && confirmData.user) {
          onStart();
        } else {
          setError("Cuenta creada. Por favor inicia sesión.");
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const setHeight = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setHeight();
    window.addEventListener('resize', setHeight);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', setHeight);
    };
  }, []);

  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden bg-slate-950"
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      {/* Background - Static for extreme performance on mobile */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pointer-events-none z-0" />

      {/* Glow effects - CSS Only */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.1),transparent_50%)] z-0" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(0,163,255,0.1),transparent_50%)] z-0" />

      {/* Main Content */}
      <main className="relative z-10 w-full px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          {/* Header */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-500 rounded-2xl animate-pulse shadow-2xl shadow-blue-500/50" />
              <div className="absolute inset-1 bg-slate-950 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight text-white leading-tight">
              My <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Travel Assistance</span>
            </h1>
            <p className="text-gray-400 text-sm">{t('welcome.subtitle')}</p>
          </div>

          {/* Auth Form */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 text-left flex items-center gap-2">
              {isLogin ? <LogIn className="w-5 h-5 text-blue-400" /> : <UserPlus className="w-5 h-5 text-cyan-400" />}
              {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
            </h2>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-xs font-medium bg-red-400/10 p-3 rounded-lg text-left"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isLogin ? "Entrar" : "Registrarme")}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-4 text-sm">
              <p className="text-gray-500">
                {isLogin ? "¿No tienes cuenta?" : "¿Ya eres viajero?"}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-400 font-bold ml-2 hover:underline"
                >
                  {isLogin ? "Regístrate aquí" : "Inicia sesión"}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
