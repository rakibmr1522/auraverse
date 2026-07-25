import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-lg' },
    md: { icon: 'w-9 h-9', text: 'text-xl' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl' },
    xl: { icon: 'w-16 h-16', text: 'text-4xl' },
  };

  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${icon} flex items-center justify-center shrink-0`}>
        {/* Glowing Aura Ring Background */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 blur-sm opacity-80 animate-pulse" />
        
        {/* Core Vector Logo */}
        <svg
          viewBox="0 0 100 100"
          className="relative w-full h-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="auraGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#D946EF" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient id="auraGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          
          {/* Rounded Container */}
          <rect x="5" y="5" width="90" height="90" rx="28" fill="url(#auraGradient1)" />
          
          {/* Overlaid Geometric Orb & Wave */}
          <circle cx="50" cy="50" r="28" stroke="white" strokeWidth="6" strokeDasharray="140" strokeDashoffset="20" opacity="0.9" />
          <path d="M 30 50 Q 50 25 70 50 Q 50 75 30 50 Z" fill="url(#auraGradient2)" opacity="0.95" />
          <circle cx="50" cy="50" r="10" fill="white" className="animate-ping" style={{ animationDuration: '3s' }} />
          <circle cx="50" cy="50" r="8" fill="#0F172A" />
          <circle cx="50" cy="50" r="4" fill="#38BDF8" />
        </svg>
      </div>

      {showText && (
        <span className={`font-extrabold tracking-tight bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent ${text}`}>
          Aura<span className="font-light text-slate-800 dark:text-white">Verse</span>
        </span>
      )}
    </div>
  );
};
