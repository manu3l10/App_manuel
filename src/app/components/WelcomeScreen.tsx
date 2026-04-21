import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Mail, Lock, UserPlus, LogIn, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";

const OAUTH_ERROR_KEYS = ["error", "error_code", "error_description"];

function decodeAuthMessage(value: string | null) {
  if (!value) return "";

  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function readOAuthErrorFromUrl() {
  const readParams = (params: URLSearchParams) => {
    for (const key of OAUTH_ERROR_KEYS) {
      const value = decodeAuthMessage(params.get(key));
      if (value) return value;
    }

    return "";
  };

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);

  return readParams(hashParams) || readParams(searchParams);
}

function clearOAuthErrorFromUrl() {
  const url = new URL(window.location.href);
  let hasOAuthError = false;

  OAUTH_ERROR_KEYS.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      hasOAuthError = true;
    }
  });

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  OAUTH_ERROR_KEYS.forEach((key) => {
    if (hashParams.has(key)) {
      hashParams.delete(key);
      hasOAuthError = true;
    }
  });

  if (!hasOAuthError) return;

  url.hash = hashParams.toString() ? `#${hashParams.toString()}` : "";
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
}

function getOAuthRedirectUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  return url.toString();
}

function isAndroidEmbeddedBrowser() {
  const userAgent = navigator.userAgent || "";
  const isAndroid = /Android/i.test(userAgent);
  const isWebView = /\bwv\b|; wv\)/i.test(userAgent) || /Version\/[\d.]+ Chrome\/[\d.]+ Mobile Safari\/[\d.]+/i.test(userAgent);
  const isInAppBrowser = /Instagram|FBAN|FBAV|FB_IAB|Line\/|Messenger|Snapchat|TikTok/i.test(userAgent);

  return isAndroid && (isWebView || isInAppBrowser);
}

// Google icon SVG component
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

interface WelcomeScreenProps {
  onStart?: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showAndroidBrowserHint, setShowAndroidBrowserHint] = useState(false);
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
        onStart?.();
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
          onStart?.();
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

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getOAuthRedirectUrl(),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const isEmbeddedAndroidBrowser = isAndroidEmbeddedBrowser();

    checkMobile();
    setShowAndroidBrowserHint(isEmbeddedAndroidBrowser);
    window.addEventListener('resize', checkMobile);

    const oauthError = readOAuthErrorFromUrl();
    if (oauthError) {
      setError(
        isEmbeddedAndroidBrowser
          ? `${oauthError}. Si estas en un navegador embebido de Android, abre la app directamente en Chrome e intenta de nuevo.`
          : oauthError
      );
      clearOAuthErrorFromUrl();
    }

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
            <h2 className="text-xl font-bold text-white mb-6 text-center">Continúa tu viaje</h2>

            {/* Google OAuth - First Option */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-3"
              >
                <GoogleIcon />
                <span>Continuar con Google</span>
              </button>

              {showAndroidBrowserHint && (
                <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-left text-xs text-amber-100">
                  En algunos Android, Google bloquea el login dentro de navegadores embebidos o WebView.
                  Si no abre o vuelve sin iniciar sesion, abre esta pagina directamente en Chrome.
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-400 text-xs">O con email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="text-left mb-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  {isLogin ? <LogIn className="w-4 h-4 text-blue-400" /> : <UserPlus className="w-4 h-4 text-cyan-400" />}
                  {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
                </h3>
              </div>

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
