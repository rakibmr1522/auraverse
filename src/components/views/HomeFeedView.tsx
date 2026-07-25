import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { StoriesBar } from '../feed/StoriesBar';
import { PostCard } from '../feed/PostCard';
import { Sparkles, PlusSquare, Image as ImageIcon, Video, Flame, Clock, Compass } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Post } from '../../types';

interface HomeFeedViewProps {
  onNavigate: (tab: string, extraData?: any) => void;
  onOpenCreatePost: () => void;
  onOpenCreateStory?: () => void;
}

export const HomeFeedView: React.FC<HomeFeedViewProps> = ({
  onNavigate,
  onOpenCreatePost,
  onOpenCreateStory,
}) => {
  const { userProfile } = useAuth();
  const { t } = useLanguage();

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedFilter, setFeedFilter] = useState<'latest' | 'trending' | 'recommended'>('latest');
  const [loading, setLoading] = useState(true);

  // Real-time listener for posts
  useEffect(() => {
    setLoading(true);

    const qPosts = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(qPosts, (snap) => {
      const list: Post[] = [];
      snap.forEach((doc) => {
        list.push({ ...(doc.data() as Post), postId: doc.id });
      });

      // Apply client sorting if filter changed
      if (feedFilter === 'trending') {
        list.sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount));
      }

      setPosts(list);
      setLoading(false);
    }, (err) => {
      console.error('Home feed snapshot error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [feedFilter]);

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-12 select-none">
      
      {/* Top Stories Bar */}
      <StoriesBar onOpenCreateStory={onOpenCreateStory} />

      {/* Quick Create Post Card */}
      <div className="artistic-card rounded-3xl p-4 shadow-2xl space-y-3">
        <div className="flex items-center gap-3">
          <img
            src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=aura'}
            alt={userProfile?.fullName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#6366F1]/40"
          />
          <button
            onClick={onOpenCreatePost}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/5 text-left text-xs sm:text-sm text-white/50 font-medium transition-all"
          >
            {t('whatsOnYourMind')}
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 text-xs font-semibold text-[#6366F1] transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            <span>{t('photo')}</span>
          </button>

          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 text-xs font-semibold text-[#00F5FF] transition-colors"
          >
            <Video className="w-4 h-4" />
            <span>{t('video')}</span>
          </button>

          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 text-xs font-semibold text-amber-400 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('feeling')}</span>
          </button>
        </div>
      </div>

      {/* Feed Sorting Options Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Feed Timeline</h2>

        <div className="flex items-center gap-1 bg-black/40 border border-white/5 p-1 rounded-2xl">
          <button
            onClick={() => setFeedFilter('latest')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              feedFilter === 'latest' ? 'bg-[#6366F1] text-white shadow-md' : 'text-white/40 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Latest</span>
          </button>

          <button
            onClick={() => setFeedFilter('trending')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              feedFilter === 'trending' ? 'bg-[#6366F1] text-white shadow-md' : 'text-white/40 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Trending</span>
          </button>
        </div>
      </div>

      {/* Feed Content Stream */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-slate-800 rounded w-1/3" />
                  <div className="h-2 bg-slate-800 rounded w-1/4" />
                </div>
              </div>
              <div className="h-16 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              onNavigate={onNavigate}
              onHashtagClick={(tag) => onNavigate('search', tag)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/20 text-cyan-400 flex items-center justify-center mx-auto border border-violet-500/30">
            <Compass className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-white">{t('noPostsYet')}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Be the first to ignite the AuraVerse feed by sharing a post or connecting with friends!
          </p>
          <button
            onClick={onOpenCreatePost}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg"
          >
            Publish First Post
          </button>
        </div>
      )}

    </div>
  );
};
