import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Home,
  Compass,
  MessageSquare,
  Bell,
  Users,
  Bookmark,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  LogOut,
  PlusCircle
} from 'lucide-react';

interface SidebarLeftProps {
  currentTab: string;
  onNavigate: (tab: string, extraData?: any) => void;
  onOpenCreateStory?: () => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  currentTab,
  onNavigate,
  onOpenCreateStory,
}) => {
  const { userProfile, logout, isAdmin } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'search', label: t('explore'), icon: Compass },
    { id: 'messages', label: t('messages'), icon: MessageSquare },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'friends', label: t('friends'), icon: Users },
    { id: 'saved', label: t('bookmarks'), icon: Bookmark },
    { id: 'settings', label: t('settings'), icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:block space-y-4 sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto pr-1 select-none">
      
      {/* Profile Mini-Card */}
      <div className="artistic-card rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-16 bg-gradient-to-r from-[#6366F1] via-[#D946EF] to-[#00F5FF] relative">
          {userProfile?.coverPhoto && (
            <img src={userProfile.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="px-4 pb-4 pt-0 relative">
          <div className="flex justify-between items-end -mt-8 mb-2">
            <img
              src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=aura'}
              alt={userProfile?.fullName}
              className="w-14 h-14 rounded-2xl object-cover ring-4 ring-[#08080a] border border-[#6366F1]/50 shadow-lg"
            />
            {onOpenCreateStory && (
              <button
                onClick={onOpenCreateStory}
                className="px-2.5 py-1 rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/80 text-white text-[11px] font-bold flex items-center gap-1 shadow-md transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Story</span>
              </button>
            )}
          </div>

          <div
            onClick={() => onNavigate('profile', userProfile?.uid)}
            className="cursor-pointer group"
          >
            <h3 className="font-bold text-sm text-white group-hover:text-[#6366F1] transition-colors flex items-center gap-1">
              <span>{userProfile?.fullName}</span>
              {userProfile?.verified && <span className="text-[#00F5FF] text-xs">✓</span>}
            </h3>
            <p className="text-[11px] text-white/50 font-medium">@{userProfile?.username}</p>
          </div>

          {/* Aura Points Bar */}
          <div className="mt-3 p-2 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">{t('auraScore')}</span>
            <span className="font-black text-[#00F5FF] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#00F5FF]" />
              {userProfile?.auraScore || 100}
            </span>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-center text-[11px]">
            <div>
              <p className="font-bold text-white">{userProfile?.postCount || 0}</p>
              <p className="text-white/40 text-[9px] uppercase tracking-wider">{t('posts')}</p>
            </div>
            <div>
              <p className="font-bold text-white">{userProfile?.friendCount || 0}</p>
              <p className="text-white/40 text-[9px] uppercase tracking-wider">{t('friends')}</p>
            </div>
            <div>
              <p className="font-bold text-white">{userProfile?.followersCount || 0}</p>
              <p className="text-white/40 text-[9px] uppercase tracking-wider">{t('followers')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="artistic-card rounded-3xl p-3 shadow-2xl space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#6366F1]/30 to-[#D946EF]/20 text-white border border-[#6366F1]/50 shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#00F5FF]' : 'text-white/50'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Admin Console Link if User is Admin */}
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              currentTab === 'admin'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-amber-400 hover:bg-amber-950/30'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>{t('adminPanel')}</span>
          </button>
        )}
      </nav>

      {/* Footer Info & Logout */}
      <div className="artistic-card rounded-3xl p-3 shadow-2xl space-y-2">
        <button
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-white/50 hover:text-white transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-[#00F5FF]" />
          <span>Help & Platform Tips</span>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logout')}</span>
        </button>
      </div>

    </aside>
  );
};
