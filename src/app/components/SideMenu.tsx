import { motion, AnimatePresence } from "motion/react";
import { X, User, Calendar, Camera, Heart, Settings, Sparkles, Map } from "lucide-react";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const getUserAvatarUrl = () =>
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

  const getUserInitial = () =>
    user?.user_metadata?.full_name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "V";

  const getUserName = () =>
    user?.user_metadata?.full_name ||
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    t('menu.user');

  const menuItems = [
    { icon: User, label: t('menu.profile'), path: "/profile", color: "from-blue-500 to-blue-600" },
    { icon: Calendar, label: t('menu.calendar'), path: "/calendar", color: "from-cyan-500 to-cyan-600" },
    { icon: Map, label: t('menu.itineraries'), path: "/itineraries", color: "from-emerald-500 to-teal-600" },
    { icon: Camera, label: t('menu.community'), path: "/community", color: "from-indigo-500 to-indigo-600" },
    { icon: Heart, label: t('menu.favorites'), path: "/favorites", color: "from-cyan-600 to-cyan-700" },
    { icon: Settings, label: t('menu.settings'), path: "/settings", color: "from-slate-500 to-slate-600" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - No blur on mobile for fluid performance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 bg-black/50 z-40 ${!isMobile ? 'backdrop-blur-sm' : ''}`}
          />

          {/* Menu - Optimized slider */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={isMobile ? { duration: 0.25, ease: "easeOut" } : { type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-[280px] md:w-80 z-50 shadow-2xl overflow-hidden"
            style={{ willChange: "transform" }}
          >
            {/* Background container */}
            <div className="h-full bg-slate-900 border-r border-white/5 flex flex-col">

              {/* Simplified background for mobile performance */}
              {!isMobile && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                  <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-blue-600 rounded-full blur-[80px]" />
                  <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-600 rounded-full blur-[80px]" />
                </div>
              )}

              {/* Content wrapper */}
              <div className="relative h-full flex flex-col z-10">
                {/* Header */}
                <div className="p-5 md:p-6 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 shadow-lg shadow-blue-500/10">
                        {getUserAvatarUrl() ? (
                          <img
                            src={getUserAvatarUrl()}
                            alt={getUserName()}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-sm md:text-base font-bold">{getUserInitial()}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm md:text-base">
                          {getUserName()}
                        </h3>
                        <p className="text-[10px] md:text-xs text-gray-500">{user?.email || "@traveler"}</p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/5 active:scale-90 rounded-lg transition-all"
                      aria-label="Cerrar"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Stats - Simplified */}
                  <div className="grid grid-cols-3 gap-2 mt-5">
                    {[
                      { val: "0", label: t('menu.stats.deptos') },
                      { val: "0", label: t('menu.stats.planes') },
                      { val: "0", label: t('menu.stats.logros') }
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
                        <p className="text-sm font-bold text-white">{stat.val}</p>
                        <p className="text-[10px] text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Menu Items - Optimized transitions */}
                <nav className="flex-1 p-3 md:p-4 overflow-y-auto custom-scrollbar no-scrollbar">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className="w-full h-12 md:h-14 flex items-center gap-4 px-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors group mb-1.5"
                      >
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity shadow-lg`}>
                          <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <span className="font-medium text-white/80 group-hover:text-white transition-colors text-sm md:text-base">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Footer - Static Premium Card on Mobile */}
                <div className="p-4 md:p-5 border-t border-white/5">
                  <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-4 cursor-pointer active:scale-95 transition-transform">
                    <div className="relative flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs md:text-sm">{t('menu.premium')}</p>
                        <p className="text-[10px] text-white/70">{t('menu.premiumFull')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
