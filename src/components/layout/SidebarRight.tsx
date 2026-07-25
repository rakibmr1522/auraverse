import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserPlus, Hash, Sparkles, Check } from 'lucide-react';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile } from '../../types';

interface SidebarRightProps {
  onNavigate: (tab: string, extraData?: any) => void;
  onHashtagClick?: (tag: string) => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  onNavigate,
  onHashtagClick,
}) => {
  const { userProfile } = useAuth();
  const { t } = useLanguage();

  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<UserProfile[]>([]);
  const [requestedUids, setRequestedUids] = useState<Set<string>>(new Set());

  const trendingTags = [
    '#AuraVerse',
    '#VibeCheck',
    '#TechRevolution',
    '#DigitalCreation',
    '#MindfulSocial',
  ];

  // Fetch suggested users and online friends
  useEffect(() => {
    if (!userProfile?.uid) return;

    const fetchSuggestions = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('uid', '!=', userProfile.uid),
          limit(4)
        );
        const snap = await getDocs(q);
        const users: UserProfile[] = [];
        const online: UserProfile[] = [];
        snap.forEach((doc) => {
          const u = doc.data() as UserProfile;
          users.push(u);
          if (u.online) online.push(u);
        });
        setSuggestedUsers(users);
        setOnlineFriends(online);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSuggestions();
  }, [userProfile?.uid]);

  const handleSendFriendRequest = async (targetUser: UserProfile) => {
    if (!userProfile) return;
    try {
      await addDoc(collection(db, 'friendRequests'), {
        senderUid: userProfile.uid,
        senderName: userProfile.fullName,
        senderPhoto: userProfile.photoURL,
        senderUsername: userProfile.username,
        receiverUid: targetUser.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send notification
      await addDoc(collection(db, 'notifications'), {
        receiverUid: targetUser.uid,
        senderUid: userProfile.uid,
        senderName: userProfile.fullName,
        senderPhoto: userProfile.photoURL,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${userProfile.fullName} sent you a friend request.`,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      setRequestedUids((prev) => new Set(prev).add(targetUser.uid));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <aside className="w-80 shrink-0 hidden xl:block space-y-4 sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto pl-1 select-none">
      
      {/* Suggested Friends Card */}
      <div className="artistic-card rounded-3xl p-4 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/40">{t('suggestedFriends')}</h3>
          <button onClick={() => onNavigate('search')} className="text-[11px] font-semibold text-[#6366F1] hover:underline">
            View All
          </button>
        </div>

        <div className="space-y-2.5">
          {suggestedUsers.length > 0 ? (
            suggestedUsers.map((user) => {
              const isSent = requestedUids.has(user.uid);
              return (
                <div key={user.uid} className="flex items-center justify-between gap-2 p-2 rounded-2xl hover:bg-white/5 transition-all">
                  <div
                    onClick={() => onNavigate('profile', user.uid)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                  >
                    <img
                      src={user.photoURL}
                      alt={user.fullName}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate hover:text-[#6366F1] flex items-center gap-1">
                        <span>{user.fullName}</span>
                        {user.verified && <span className="text-[#00F5FF] text-[10px]">✓</span>}
                      </p>
                      <p className="text-[10px] text-white/40 truncate">@{user.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendFriendRequest(user)}
                    disabled={isSent}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                      isSent
                        ? 'bg-white/5 text-[#00F5FF] border border-[#00F5FF]/30'
                        : 'bg-[#6366F1]/20 hover:bg-[#6366F1] text-[#6366F1] hover:text-white border border-[#6366F1]/30'
                    }`}
                  >
                    {isSent ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-white/30 py-2">Discovering vibrant users...</p>
          )}
        </div>
      </div>

      {/* Trending Hashtags */}
      <div className="artistic-card rounded-3xl p-4 shadow-2xl space-y-3">
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
          <Hash className="w-4 h-4 text-[#00F5FF]" />
          <span>{t('trendingHashtags')}</span>
        </h3>

        <div className="flex flex-wrap gap-2">
          {trendingTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onHashtagClick && onHashtagClick(tag)}
              className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-white/10 border border-white/5 text-white/70 hover:text-[#00F5FF] text-xs font-medium transition-all"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Online Friends Widget */}
      <div className="artistic-card rounded-3xl p-4 shadow-2xl space-y-3">
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/40 flex items-center justify-between">
          <span>{t('onlineFriends')}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </h3>

        {onlineFriends.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {onlineFriends.map((u) => (
              <div
                key={u.uid}
                onClick={() => onNavigate('messages')}
                className="relative cursor-pointer shrink-0 group"
                title={u.fullName}
              >
                <img src={u.photoURL} alt={u.fullName} className="w-9 h-9 rounded-full object-cover ring-2 ring-[#6366F1]/30" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#08080a]" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30">Your connected friends will appear online here</p>
        )}
      </div>

      {/* Platform Tips / Vibe Guide */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#6366F1]/20 via-black to-[#00F5FF]/10 border border-[#6366F1]/30 text-xs space-y-2 shadow-2xl">
        <div className="flex items-center gap-1.5 text-[#00F5FF] font-bold uppercase tracking-wider text-[10px]">
          <Sparkles className="w-4 h-4" />
          <span>AuraVerse Tip</span>
        </div>
        <p className="text-white/70 leading-relaxed text-[11px]">
          Share posts, interact with friends, and participate in stories to boost your <strong className="text-[#00F5FF]">Aura Score</strong> daily!
        </p>
      </div>

    </aside>
  );
};
