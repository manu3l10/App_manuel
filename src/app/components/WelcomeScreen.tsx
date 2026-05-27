import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, UserPlus, LogIn, Loader2, Check } from "lucide-react";
import { useEffect, useMemo, useState, type FocusEvent, type FormEvent } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  getRememberAccountPreference,
  setRememberAccountPreference,
  supabase,
} from "../../lib/supabase";
import { getAuthRedirectUrl } from "../../lib/siteUrl";

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

function isAndroidEmbeddedBrowser() {
  const userAgent = navigator.userAgent || "";
  const isAndroid = /Android/i.test(userAgent);
  const isWebView =
    /\bwv\b|; wv\)/i.test(userAgent) ||
    /Version\/[\d.]+ Chrome\/[\d.]+ Mobile Safari\/[\d.]+/i.test(userAgent);
  const isInAppBrowser = /Instagram|FBAN|FBAV|FB_IAB|Line\/|Messenger|Snapchat|TikTok/i.test(userAgent);

  return isAndroid && (isWebView || isInAppBrowser);
}

function MtaLogo() {
  return (
    <div className="relative h-[104px] w-[104px] md:h-28 md:w-28" aria-label="MTA">
      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-blue-500 via-cyan-400 to-indigo-500 shadow-2xl shadow-cyan-500/30" />
      <div className="absolute inset-[3px] rounded-[25px] bg-slate-950/95" />
      <div className="absolute inset-[9px] rounded-[20px] border border-white/15 bg-gradient-to-br from-white/12 to-white/[0.03]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white text-[30px] font-black leading-none tracking-normal md:text-[34px]">
          MTA
        </span>
        <span className="mt-1 h-1 w-12 rounded-full bg-cyan-300 shadow-lg shadow-cyan-300/40" />
      </div>
    </div>
  );
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getAuthErrorMessage(error: unknown) {
  const rawMessage =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "No se pudo completar la autenticacion.";

  if (/invalid login credentials/i.test(rawMessage)) {
    return "Correo o contraseña incorrectos. Revisa los datos e intenta de nuevo.";
  }

  if (/email not confirmed/i.test(rawMessage)) {
    return "Tu correo aun no ha sido confirmado. Revisa tu bandeja de entrada y luego inicia sesión.";
  }

  if (/user already registered/i.test(rawMessage)) {
    return "Ese correo ya está registrado. Intenta iniciar sesión en lugar de crear otra cuenta.";
  }

  if (/password should be at least/i.test(rawMessage)) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  return rawMessage;
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
  const [showAndroidBrowserHint, setShowAndroidBrowserHint] = useState(false);
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [rememberAccount, setRememberAccount] = useState(() => getRememberAccountPreference());
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const primaryActionLabel = useMemo(
    () => (isLogin ? "Entrar" : "Registrarme"),
    [isLogin]
  );

  const handleFieldFocus = (event: FocusEvent<HTMLInputElement>) => {
    window.setTimeout(() => {
      event.currentTarget.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    }, 180);
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    setRememberAccountPreference(rememberAccount);

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      setLoading(false);
      setError("Completa correo y contraseña para continuar.");
      return;
    }

    if (!isLogin && password.length < 6) {
      setLoading(false);
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) throw signInError;
        onStart?.();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        onStart?.();
      } else {
        setPassword("");
        setIsLogin(true);
        setNotice("Cuenta creada. Si el proyecto exige confirmación por correo, revisa tu email antes de iniciar sesión.");
      }
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError("");
    setNotice("");
    setRememberAccountPreference(rememberAccount);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthRedirectUrl(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (oauthError) throw oauthError;
    } catch (authError) {
      console.error("Google OAuth error:", authError);
      setError(getAuthErrorMessage(authError));
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const embeddedAndroidBrowser = isAndroidEmbeddedBrowser();
    setShowAndroidBrowserHint(embeddedAndroidBrowser);

    const oauthError = readOAuthErrorFromUrl();
    if (oauthError) {
      setError(
        embeddedAndroidBrowser
          ? `${oauthError}. Si estas en un navegador embebido de Android, abre la app directamente en Chrome e intenta de nuevo.`
          : oauthError
      );
      clearOAuthErrorFromUrl();
    }
  }, []);

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-hidden overflow-y-auto bg-slate-950"
      style={{
        minHeight: "var(--app-height, 100dvh)",
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
      <div className="absolute top-0 left-0 z-0 h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.1),transparent_50%)]" />
      <div className="absolute top-0 left-0 z-0 h-full w-full bg-[radial-gradient(circle_at_80%_80%,rgba(0,163,255,0.1),transparent_50%)]" />

      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 py-6 text-center sm:px-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="mb-6 flex flex-col items-center sm:mb-8">
            <div className="mb-5 sm:mb-6">
              <MtaLogo />
            </div>
            <h1 className="mb-2 text-3xl leading-tight font-extrabold tracking-tight text-white md:text-4xl">
              My <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Travel Assistance</span>
            </h1>
            <p className="text-sm text-gray-400">{t("welcome.subtitle")}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl md:p-8">
            <h2 className="mb-6 text-center text-xl font-bold text-white">Continúa tu viaje</h2>

            <label className="mb-5 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition active:scale-[0.99]">
              <span>
                <span className="block text-sm font-semibold text-white">Recordar cuenta</span>
                <span className="block text-xs text-gray-400">Mantener la sesión abierta en este dispositivo.</span>
              </span>
              <span className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-white/20 bg-slate-950/60">
                <input
                  type="checkbox"
                  checked={rememberAccount}
                  onChange={(event) => setRememberAccount(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 opacity-0 transition-opacity peer-checked:opacity-100" />
                <Check className="relative z-10 h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
              </span>
            </label>

            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading || loading}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white font-semibold text-slate-900 transition-all hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {googleLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-700" /> : <GoogleIcon />}
                <span>Continuar con Google</span>
              </button>

              {showAndroidBrowserHint && (
                <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-left text-xs text-amber-100">
                  En algunos Android, Google bloquea el login dentro de navegadores embebidos o WebView.
                  Si no abre o vuelve sin iniciar sesion, abre esta pagina directamente en Chrome.
                </p>
              )}
            </div>

            <div className="mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-gray-400">O con email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="mb-4 text-left">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  {isLogin ? <LogIn className="h-4 w-4 text-blue-400" /> : <UserPlus className="h-4 w-4 text-cyan-400" />}
                  {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
                </h3>
              </div>

              <div className="group relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-blue-400" />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onFocus={handleFieldFocus}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  enterKeyHint="next"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/50 py-3.5 pl-12 pr-4 text-white placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-blue-400" />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={handleFieldFocus}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/50 py-3.5 pl-12 pr-4 text-white placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <AnimatePresence>
                {notice && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg bg-emerald-400/10 p-3 text-left text-xs font-medium text-emerald-200"
                  >
                    {notice}
                  </motion.p>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg bg-red-400/10 p-3 text-left text-xs font-medium text-red-400"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || googleLoading || !email.trim() || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 py-4 text-lg font-bold text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : primaryActionLabel}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-4 border-t border-white/5 pt-6 text-sm">
              <p className="text-gray-500">
                {isLogin ? "¿No tienes cuenta?" : "¿Ya eres viajero?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin((prev) => !prev);
                    setError("");
                    setNotice("");
                  }}
                  className="ml-2 font-bold text-blue-400 hover:underline"
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
