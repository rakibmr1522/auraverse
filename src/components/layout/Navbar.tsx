import React, { useState, useEffect, useRef } from 'react';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Search,
  PlusSquare,
  Bell,
  MessageSquare,
  UserPlus,
  Globe,
  Sun,
  Moon,
  User,
  ShieldCheck,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  X
} from 'lucide-react';
import { collection, query, where, limit, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile, AppNotification, FriendRequest } from '../../types';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, extraData?: any) => void;
  onOpenCreatePost: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenCreatePost,
}) => {
  const { userProfile, logout, isAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isDark, setTheme } = useTheme();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Dropdown states
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showFriendReqMenu, setShowFriendReqMenu] = useState(false);

  // Badges state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to unread notifications in real time
  useEffect(() => {
    if (!userProfile?.uid) return;

    const qNotif = query(
      collection(db, 'notifications'),
      where('receiverUid', '==', userProfile.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubNotif = onSnapshot(qNotif, (snap) => {
      const items: AppNotification[] = [];
      let unread = 0;
      snap.forEach((doc) => {
        const data = doc.data() as AppNotification;
        items.push({ ...data, notificationId: doc.id });
        if (!data.isRead) unread++;
      });
      setNotifications(items);
      setUnreadCount(unread);
    }, console.error);

    // Listen to pending friend requests
    const qReq = query(
      collection(db, 'friendRequests'),
      where('receiverUid', '==', userProfile.uid),
      where('status', '==', 'pending'),
      limit(5)
    );

    const unsubReq = onSnapshot(qReq, (snap) => {
      const reqs: FriendRequest[] = [];
      snap.forEach((doc) => {
        reqs.push({ ...(doc.data() as FriendRequest), requestId: doc.id });
      });
      setFriendRequests(reqs);
    }, console.error);

    return () => {
      unsubNotif();
      unsubReq();
    };
  }, [userProfile?.uid]);

  // Live user search autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('username', '>=', searchQuery.toLowerCase()),
          where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
          limit(5)
        );
        const snap = await getDocs(q);
        const users: UserProfile[] = [];
        snap.forEach((doc) => {
          users.push(doc.data() as UserProfile);
        });
        setSearchResults(users);
        setShowSearchResults(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-40 w-full bg-black/50 border-b border-white/10 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo */}
        <div
          onClick={() => onNavigate('home')}
          className="cursor-pointer flex items-center shrink-0 hover:opacity-90 transition-opacity"
        >
          <Logo size="md" />
        </div>

        {/* Center: Global Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
              placeholder="Explore the synapse..."
              className="w-full pl-10 pr-9 py-2 rounded-full bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#6366F1]/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Autocomplete Results Popup */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 space-y-1">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 py-1">
                People on AuraVerse
              </p>
              {searching ? (
                <div className="py-4 text-center text-xs text-slate-400">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.uid}
                    onClick={() => {
                      onNavigate('profile', user.uid);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                  >
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                        <span>{user.fullName}</span>
                        {user.verified && <span className="text-cyan-400 text-xs">✓</span>}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">@{user.username}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">No users found for "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons & User Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Create Post Shortcut */}
          <button
            onClick={onOpenCreatePost}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition-all"
          >
            <PlusSquare className="w-4 h-4" />
            <span>Create</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs transition-all shadow-md"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Admin Panel</span>
            </button>
          )}

          {/* Friend Requests Shortcut */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFriendReqMenu(!showFriendReqMenu);
                setShowNotifMenu(false);
                setShowProfileMenu(false);
              }}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all relative"
              title="Friend Requests"
            >
              <UserPlus className="w-4.5 h-4.5 text-cyan-400" />
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center justify-center animate-bounce">
                  {friendRequests.length}
                </span>
              )}
            </button>

            {showFriendReqMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50">
                <h4 className="text-xs font-bold text-slate-200 mb-2">Friend Requests ({friendRequests.length})</h4>
                {friendRequests.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {friendRequests.map((req) => (
                      <div key={req.requestId} className="flex items-center justify-between gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={req.senderPhoto} alt={req.senderName} className="w-7 h-7 rounded-full object-cover" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{req.senderName}</p>
                            <p className="text-[10px] text-slate-400">@{req.senderUsername}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onNavigate('profile', req.senderUid);
                            setShowFriendReqMenu(false);
                          }}
                          className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] font-bold"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No pending friend requests</p>
                )}
              </div>
            )}
          </div>

          {/* Messages Shortcut */}
          <button
            onClick={() => onNavigate('messages')}
            className={`p-2 rounded-xl transition-all relative ${
              currentTab === 'messages' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Messages"
          >
            <MessageSquare className="w-4.5 h-4.5 text-violet-400" />
          </button>

          {/* Notifications Shortcut */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowFriendReqMenu(false);
                setShowProfileMenu(false);
              }}
              className={`p-2 rounded-xl transition-all relative ${
                currentTab === 'notifications' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5 text-amber-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-slate-200">Recent Notifications</h4>
                  <button onClick={() => onNavigate('notifications')} className="text-[11px] font-semibold text-violet-400 hover:underline">
                    View All
                  </button>
                </div>
                {notifications.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.notificationId}
                        onClick={() => {
                          onNavigate('notifications');
                          setShowNotifMenu(false);
                        }}
                        className={`p-2 rounded-xl text-xs flex items-start gap-2.5 cursor-pointer transition-colors ${
                          n.isRead ? 'bg-slate-950/40 text-slate-400' : 'bg-violet-950/30 text-slate-100 border border-violet-800/30'
                        }`}
                      >
                        <img src={n.senderPhoto} alt={n.senderName} className="w-7 h-7 rounded-full object-cover mt-0.5" />
                        <div>
                          <p className="font-semibold text-xs text-white">{n.title}</p>
                          <p className="text-[11px] text-slate-300">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No new notifications</p>
                )}
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
            title="Language"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="hidden md:flex p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-all"
            title="Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-400" />}
          </button>

          {/* User Profile Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifMenu(false);
                setShowFriendReqMenu(false);
              }}
              className="flex items-center gap-2 p-1 rounded-2xl hover:bg-slate-800 transition-all"
            >
              <img
                src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=aura'}
                alt={userProfile?.fullName || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-violet-500/40"
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white truncate">{userProfile?.fullName}</p>
                  <p className="text-[11px] text-slate-400 truncate">@{userProfile?.username}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-full w-fit">
                    <Sparkles className="w-3 h-3" />
                    <span>{userProfile?.auraScore || 100} Aura Points</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onNavigate('profile', userProfile?.uid);
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <User className="w-4 h-4 text-violet-400" />
                  <span>{t('profile')}</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:bg-amber-950/40 flex items-center gap-2 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>{t('adminPanel')}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onNavigate('settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <SettingsIcon className="w-4 h-4 text-cyan-400" />
                  <span>{t('settings')}</span>
                </button>

                <div className="border-t border-slate-800 my-1" />

                <button
                  onClick={async () => {
                    setShowProfileMenu(false);
                    await logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
