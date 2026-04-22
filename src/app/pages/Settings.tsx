import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Bell,
  Globe,
  Shield,
  CreditCard,
  HelpCircle,
  ChevronRight,
  X,
  Check
} from "lucide-react";
import { useNavigate } from "react-router";
import { useLanguage } from "../../contexts/LanguageContext";

export function Settings() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [showLangModal, setShowLangModal] = useState(false);

  interface SettingsItem {
    icon: any;
    label: string;
    value?: string;
    toggle?: boolean;
    state?: boolean;
    setState?: (val: boolean) => void;
    action?: boolean;
    onClick?: () => void;
  }

  const settingsSections: { title: string; items: SettingsItem[] }[] = [
    {
      title: t('settings.account'),
      items: [
        {
          icon: Globe,
          label: t('settings.language'),
          value: lang === "es" ? "Español" : "English",
          action: true,
          onClick: () => setShowLangModal(true)
        },
        { icon: Bell, label: t('settings.notifications'), toggle: true, state: notifications, setState: setNotifications },
      ],
    },
    {
      title: t('settings.privacy'),
      items: [
        { icon: Shield, label: t('settings.privacyLabel'), action: true },
        { icon: CreditCard, label: t('settings.payment'), action: true },
      ],
    },
    {
      title: t('settings.support'),
      items: [
        { icon: HelpCircle, label: t('settings.help'), action: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-slate-950 text-white overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div
        className="sticky top-0 z-30 bg-slate-950/40 backdrop-blur-xl border-b border-white/5"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/", { state: { openMenu: true } })}
            className="p-2 hover:bg-white/5 active:scale-95 rounded-lg transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white/80" />
          </button>
          <h1 className="font-semibold text-lg">{t('settings.title')}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div
        className="relative z-10 max-w-xl mx-auto w-full overflow-x-hidden px-4 py-8"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 2rem)" }}
      >
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
            className="mb-8"
          >
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">{section.title}</h2>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    onClick={item.onClick}
                    className={`flex items-center justify-between p-4 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer ${index < section.items.length - 1 ? "border-b border-white/5" : ""
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-white/5">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="font-medium text-white/90">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.toggle && item.setState ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.setState) item.setState(!item.state);
                          }}
                          className={`relative w-11 h-6 rounded-full transition-colors ${item.state
                            ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                            : "bg-slate-700"
                            }`}
                        >
                          <motion.div
                            animate={{ x: item.state ? 22 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          {item.value && (
                            <span className="text-sm text-gray-400 mr-1">{item.value}</span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-xl shadow-blue-500/20">
            MTA
          </div>
          <h3 className="font-bold text-white mb-1">{t('welcome.title')}</h3>
          <p className="text-sm text-gray-500">{t('settings.version')} 1.2.0</p>
          <p className="text-xs text-gray-600 mt-4">© 2026 My Travel Assistance</p>
        </motion.div>
      </div>

      {/* Language Selection Modal */}
      <AnimatePresence>
        {showLangModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-hidden px-3 py-3 sm:p-4"
            style={{
              paddingTop: "calc(var(--safe-top) + 0.75rem)",
              paddingBottom: "calc(var(--safe-bottom) + 0.75rem)",
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLangModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full max-w-sm overflow-y-auto overscroll-contain bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl"
              style={{ maxHeight: "calc(100dvh - var(--safe-top) - var(--safe-bottom) - 1.5rem)" }}
            >
              <div className="p-5 flex items-center justify-between border-b border-white/5">
                <h3 className="font-bold text-lg">{t('settings.language')}</h3>
                <button onClick={() => setShowLangModal(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-3">
                {[
                  { id: 'es', label: 'Español (Colombia)', icon: '🇨🇴' },
                  { id: 'en', label: 'English (United States)', icon: '🇺🇸' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setLang(option.id as any);
                      setShowLangModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all mb-1 ${lang === option.id ? "bg-blue-500/10 border border-blue-500/20" : "hover:bg-white/5 border border-transparent"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.icon}</span>
                      <span className={`font-medium ${lang === option.id ? "text-blue-400" : "text-white/80"}`}>
                        {option.label}
                      </span>
                    </div>
                    {lang === option.id && <Check className="w-5 h-5 text-blue-400" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
