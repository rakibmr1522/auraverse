import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { timeAgo } from '../../utils/timeAgo';
import { Bell, CheckCheck, UserPlus, Heart, MessageSquare, Share2, Sparkles, ShieldCheck } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { AppNotification } from '../../types';

interface NotificationsViewProps {
  onNavigate: (tab: string, extraData?: any) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();
  const { language, t } = useLanguage();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('receiverUid', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: AppNotification[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as AppNotification), notificationId: d.id });
      });
      setNotifications(list);
    }, console.error);

    return () => unsub();
  }, [userProfile?.uid]);

  const handleMarkAllRead = async () => {
    if (!userProfile?.uid) return;
    try {
      const unread = notifications.filter((n) => !n.isRead);
      for (const n of unread) {
        await updateDoc(doc(db, 'notifications', n.notificationId), { isRead: true });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifs = notifications.filter((n) => filter === 'all' || !n.isRead);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16 select-none">
      
      {/* Header */}
      <div className="artistic-card rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#6366F1]/20 text-[#00F5FF] border border-[#6366F1]/30">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-white uppercase tracking-tight">{t('notifications')}</h2>
            <p className="text-xs text-white/40">Stay up to date with your AuraVerse interactions</p>
          </div>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
        >
          <CheckCheck className="w-4 h-4 text-[#00F5FF]" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Stream List */}
      <div className="space-y-2">
        {filteredNotifs.length > 0 ? (
          filteredNotifs.map((n) => (
            <div
              key={n.notificationId}
              onClick={() => {
                if (n.referenceId) onNavigate('home');
              }}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                n.isRead
                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-300'
                  : 'bg-violet-950/30 border-violet-800/40 text-white shadow-lg shadow-violet-950/20'
              }`}
            >
              <img src={n.senderPhoto} alt={n.senderName} className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5 ring-2 ring-violet-500/30" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs text-white">{n.title}</p>
                  <span className="text-[10px] text-slate-500">{timeAgo(n.createdAt, language)}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-slate-500 text-xs bg-slate-900/80 border border-slate-800 rounded-3xl">
            No notifications to display right now.
          </div>
        )}
      </div>

    </div>
  );
};
