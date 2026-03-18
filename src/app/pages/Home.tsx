import { useState } from "react";
import { motion } from "motion/react";
import { Menu, Settings, Bell } from "lucide-react";
import { useNavigate } from "react-router";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { InsightsSidebar } from "../components/InsightsSidebar";
import { AIChat } from "../components/AIChat";
import { AgendaSidebar } from "../components/AgendaSidebar";
import { SideMenu } from "../components/SideMenu";

export function Home() {
  const navigate = useNavigate();
  // Check localStorage to see if user has already dismissed the welcome screen
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem("hasSeenWelcome") !== "true";
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const handleStart = () => {
    setShowWelcome(false);
    localStorage.setItem("hasSeenWelcome", "true");
  };

  if (showWelcome) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-pink-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Subtle stars */}
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-[2000px] mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center"
                >
                  <span className="text-white text-sm font-bold">AI</span>
                </motion.div>
                <div>
                  <h1 className="text-white font-semibold text-sm">AI Travel Assistant</h1>
                  <p className="text-gray-400 text-xs">Tu compañero de viajes inteligente</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5 text-white" />
                <div className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-white" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center cursor-pointer">
                <span className="text-white text-sm font-semibold">V</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Solo Chat */}
      <div className="relative h-full pt-[73px] max-w-[2000px] mx-auto">
        <div className="h-full flex flex-col">
          {/* Centered AI Chat taking full width/height */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 relative"
          >
            <AIChat />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
