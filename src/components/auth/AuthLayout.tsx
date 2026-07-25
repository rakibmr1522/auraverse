import React from 'react';
import { motion } from 'motion/react';
import { Logo } from '../common/Logo';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Globe } from 'lucide-react';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage } = useLanguage();
  const { isDark, setTheme } = useTheme();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100 transition-colors duration-300 overflow-hidden">
      {/* Background Animated Gradient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/20 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700/50 backdrop-blur-md transition-all"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === 'en' ? 'English' : 'বাংলা'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 backdrop-blur-md transition-all"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-400" />}
        </button>
      </div>

      {/* Main Glass Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <div className="bg-slate-900/80 dark:bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-violet-950/20">
          {children}
        </div>

        {/* Subtle Footer */}
        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          &copy; {new Date().getFullYear()} AuraVerse. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};
