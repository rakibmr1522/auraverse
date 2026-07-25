import React from 'react';
import { Home, Compass, PlusSquare, MessageSquare, Bell, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  currentTab: string;
  onNavigate: (tab: string, extraData?: any) => void;
  onOpenCreatePost: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onNavigate,
  onOpenCreatePost,
}) => {
  const { userProfile } = useAuth();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-slate-900/95 border-t border-slate-800 backdrop-blur-2xl px-2 py-1.5 flex items-center justify-around shadow-2xl">
      <button
        onClick={() => onNavigate('home')}
        className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
          currentTab === 'home' ? 'text-cyan-400 font-bold' : 'text-slate-400'
        }`}
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </button>

      <button
        onClick={() => onNavigate('search')}
        className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
          currentTab === 'search' ? 'text-cyan-400 font-bold' : 'text-slate-400'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span>Explore</span>
      </button>

      {/* Central Floating Create Button */}
      <button
        onClick={onOpenCreatePost}
        className="p-3 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white shadow-lg shadow-violet-600/30 -mt-5 ring-4 ring-slate-950 active:scale-95 transition-all"
      >
        <PlusSquare className="w-6 h-6" />
      </button>

      <button
        onClick={() => onNavigate('messages')}
        className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
          currentTab === 'messages' ? 'text-cyan-400 font-bold' : 'text-slate-400'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span>Chat</span>
      </button>

      <button
        onClick={() => onNavigate('profile', userProfile?.uid)}
        className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
          currentTab === 'profile' ? 'text-cyan-400 font-bold' : 'text-slate-400'
        }`}
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
      </button>
    </div>
  );
};
