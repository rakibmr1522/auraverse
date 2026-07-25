import React from 'react';
import { motion } from 'motion/react';
import { Logo } from '../common/Logo';

export const AuthSplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden">
      {/* Background Animated Gradient Blobs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-violet-600/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 z-10"
      >
        <Logo size="xl" showText={false} />

        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
            AuraVerse
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Discover Your Vibe, Share Your Aura
          </p>
        </div>

        {/* Loading Spinner with Aura Effect */}
        <div className="relative mt-4 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      </motion.div>
    </div>
  );
};
