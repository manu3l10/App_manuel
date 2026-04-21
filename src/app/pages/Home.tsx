import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, Settings, Bell } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { AIChat } from "../components/AIChat";
import { SideMenu } from "../components/SideMenu";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import {
  CommunityNotificationRecord,
  listCommunityNotifications,
  markCommunityNotificationAsRead,
} from "../../lib/communityApi";

export function Home() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<CommunityNotificationRecord[]>([]);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Fix for mobile address bar height
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

  const [showWelcome, setShowWelcome] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openMenu) {
      setMenuOpen(true);
      // Optional: clear state to avoid reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setShowWelcome(false);
        setUser(session.user);
        fetchNotifications();
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) {
        setShowWelcome(false);
        setUser(session.user);
        fetchNotifications();
      } else {
        setShowWelcome(true);
        setUser(null);
        setNotifications([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStart = () => {
    setShowWelcome(false);
  };

  const fetchNotifications = async () => {
    try {
      setNotificationsError(null);
      const records = await listCommunityNotifications();
      setNotifications(records);
    } catch (error: any) {
      console.error("Error loading notifications:", error);
      setNotificationsError(error?.message ?? "No se pudieron cargar las notificaciones.");
    }
  };

  const unreadNotifications = notifications.filter((notification) => !notification.read_at);

  const openNotification = async (notification: CommunityNotificationRecord) => {
    if (!notification.read_at) {
      try {
        await markCommunityNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? { ...item, read_at: new Date().toISOString() }
              : item
          )
        );
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    setShowNotifications(false);
    navigate("/community");
  };

  if (showWelcome) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  return (
    <div
      className="relative flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900"
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Background Effects - Simplified for maximum performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(30,120,255,0.15),transparent_50%)]" />
        {!isMobile && (
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(0,100,255,0.1),transparent_50%)]" />
        )}

        {/* Simple CSS-only stars for better performance */}
        <div className="stars-container opacity-30">
          {Array.from({ length: isMobile ? 10 : 25 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Top Navigation Bar - Now relative in flex col */}
      <header className="relative z-30 flex-shrink-0 bg-slate-950/40 backdrop-blur-3xl border-b border-white/5">
        <div className="max-w-[2000px] mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 hover:bg-white/5 active:scale-95 rounded-lg transition-all"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5 text-white/80" />
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white text-[10px] md:text-xs font-bold font-mono">MTA</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-xs md:text-sm leading-tight">My Travel Assistance</h1>
                <p className="text-gray-400 text-[10px] leading-tight sm:block hidden">{t('home.tagline')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  const nextOpen = !showNotifications;
                  setShowNotifications(nextOpen);
                  setShowUserMenu(false);
                  if (nextOpen) fetchNotifications();
                }}
                className={`p-2 hover:bg-white/5 active:scale-95 rounded-lg transition-all relative ${showNotifications ? 'bg-white/10' : ''}`}
              >
                <Bell className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
                {unreadNotifications.length > 0 && (
                  <div className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-cyan-500 rounded-full ring-2 ring-slate-950 flex items-center justify-center">
                    <span className="text-[9px] leading-none font-bold text-white">
                      {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
                    </span>
                  </div>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 md:w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/5 bg-white/5">
                        <h3 className="text-sm font-bold text-white">{t('home.notificationsTitle')}</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notificationsError && (
                          <div className="p-4 text-xs text-red-300">
                            {notificationsError}
                            <button onClick={fetchNotifications} className="ml-2 underline">
                              Reintentar
                            </button>
                          </div>
                        )}

                        {!notificationsError && notifications.length === 0 && (
                          <div className="p-8 text-center">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Bell className="w-6 h-6 text-gray-600" />
                            </div>
                            <p className="text-xs text-gray-500">{t('home.noNotifications')}</p>
                          </div>
                        )}

                        {!notificationsError && notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => openNotification(notification)}
                            className="w-full p-4 flex items-start gap-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                          >
                            <img
                              src={notification.actor_avatar}
                              alt={notification.actor_name}
                              className="w-9 h-9 rounded-full border border-white/10"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-200 leading-relaxed">{notification.message}</p>
                              <p className="text-[10px] text-gray-500 mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                            {!notification.read_at && (
                              <span className="mt-1 w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Settings */}
            <button
              onClick={() => navigate("/settings")}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
            </button>

            {/* User Avatar & Menu */}
            <div className="relative">
              <div
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className={`w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center cursor-pointer border border-white/10 shadow-lg hover:scale-105 active:scale-95 transition-all ${showUserMenu ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950' : ''}`}
              >
                <span className="text-white text-xs font-bold font-mono">V</span>
              </div>

              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">
                            {user?.email?.[0].toUpperCase() || "V"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {user?.email?.split('@')[0] || "Viajero"}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">{user?.email || "@traveler"}</p>
                        </div>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => {
                            supabase.auth.signOut();
                          }}
                          className="w-full flex items-center gap-2 p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors text-sm font-medium"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-400/10 flex items-center justify-center">
                            <Menu className="w-4 h-4 rotate-180" /> {/* Reusing Menu as Logout icon for simplicity */}
                          </div>
                          {t('home.logout')}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Height Chat Area */}
      <main className="relative flex-1 flex flex-col min-h-0 z-10 max-w-[2000px] w-full mx-auto">
        <AIChat />
      </main>
    </div>
  );
}
