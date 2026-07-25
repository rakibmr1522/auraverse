import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { timeAgo } from '../../utils/timeAgo';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Send,
  Flag,
  Trash2,
  Edit2,
  Globe,
  Users,
  Lock,
  Sparkles,
  Smile,
  X,
  Check
} from 'lucide-react';
import {
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Post, Comment, ReactionType } from '../../types';

interface PostCardProps {
  post: Post;
  onNavigate: (tab: string, extraData?: any) => void;
  onHashtagClick?: (tag: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onNavigate,
  onHashtagClick,
}) => {
  const { userProfile, isAdmin } = useAuth();
  const { language, t } = useLanguage();

  // Reaction State
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Modals & Popovers
  const [showMenu, setShowMenu] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState<number | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [isSaved, setIsSaved] = useState(false);

  // Sync reactions & saved status
  useEffect(() => {
    if (!userProfile?.uid) return;

    if (post.reactions && post.reactions[userProfile.uid]) {
      setUserReaction(post.reactions[userProfile.uid]);
    }

    // Check if post saved
    const qSave = query(
      collection(db, 'savedPosts'),
      where('userUid', '==', userProfile.uid),
      where('postId', '==', post.postId)
    );
    const unsubSave = onSnapshot(qSave, (snap) => {
      setIsSaved(!snap.empty);
    }, console.error);

    return () => unsubSave();
  }, [userProfile?.uid, post]);

  // Listen to comments real-time when comment drawer open
  useEffect(() => {
    if (!showComments) return;

    const qComments = query(
      collection(db, 'comments'),
      where('postId', '==', post.postId),
      orderBy('createdAt', 'asc')
    );

    const unsubComments = onSnapshot(qComments, (snap) => {
      const list: Comment[] = [];
      snap.forEach((doc) => {
        list.push({ ...(doc.data() as Comment), commentId: doc.id });
      });
      setComments(list);
    }, console.error);

    return () => unsubComments();
  }, [showComments, post.postId]);

  // Reaction handler
  const handleReaction = async (type: ReactionType) => {
    if (!userProfile) return;

    const postRef = doc(db, 'posts', post.postId);
    const currentReactions = { ...(post.reactions || {}) };

    let newCount = likeCount;

    if (userReaction === type) {
      // Remove reaction
      delete currentReactions[userProfile.uid];
      setUserReaction(null);
      newCount = Math.max(0, likeCount - 1);
    } else {
      // Set or update reaction
      if (!userReaction) newCount = likeCount + 1;
      currentReactions[userProfile.uid] = type;
      setUserReaction(type);
    }

    setLikeCount(newCount);
    setShowReactionPicker(false);

    try {
      await updateDoc(postRef, {
        reactions: currentReactions,
        likeCount: newCount,
      });

      // Send notification if new reaction
      if (type && userProfile.uid !== post.ownerUid) {
        await addDoc(collection(db, 'notifications'), {
          receiverUid: post.ownerUid,
          senderUid: userProfile.uid,
          senderName: userProfile.fullName,
          senderPhoto: userProfile.photoURL,
          type: 'post_like',
          title: 'New Reaction',
          message: `${userProfile.fullName} reacted to your post`,
          referenceId: post.postId,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  // Submit comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !userProfile) return;

    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.postId,
        userUid: userProfile.uid,
        userName: userProfile.fullName,
        userUsername: userProfile.username,
        userPhoto: userProfile.photoURL,
        comment: newCommentText.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update commentCount on post
      await updateDoc(doc(db, 'posts', post.postId), {
        commentCount: increment(1),
      });

      // Send notification to post owner
      if (userProfile.uid !== post.ownerUid) {
        await addDoc(collection(db, 'notifications'), {
          receiverUid: post.ownerUid,
          senderUid: userProfile.uid,
          senderName: userProfile.fullName,
          senderPhoto: userProfile.photoURL,
          type: 'post_comment',
          title: 'New Comment',
          message: `${userProfile.fullName} commented on your post`,
          referenceId: post.postId,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }

      setNewCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Toggle Save Post
  const handleToggleSave = async () => {
    if (!userProfile) return;

    try {
      if (isSaved) {
        const q = query(
          collection(db, 'savedPosts'),
          where('userUid', '==', userProfile.uid),
          where('postId', '==', post.postId)
        );
        const snap = await doc(db, 'savedPosts', 'docId');
        // Simple toggle implementation
        setIsSaved(false);
      } else {
        await addDoc(collection(db, 'savedPosts'), {
          userUid: userProfile.uid,
          postId: post.postId,
          savedAt: serverTimestamp(),
        });
        setIsSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Post
  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', post.postId));
      if (userProfile) {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          postCount: increment(-1),
        }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Report
  const handleSubmitReport = async () => {
    if (!userProfile) return;
    try {
      await addDoc(collection(db, 'reports'), {
        targetId: post.postId,
        targetType: 'post',
        targetContentSnippet: post.text?.slice(0, 100),
        reportedByUid: userProfile.uid,
        reportedByName: userProfile.fullName,
        reason: reportReason,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      alert('Report submitted to platform moderators.');
      setShowReportModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const isOwner = userProfile?.uid === post.ownerUid;

  return (
    <article className="artistic-card rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 transition-colors select-none">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={post.ownerPhoto || 'https://api.dicebear.com/7.x/bottts/svg?seed=aura'}
            alt={post.ownerName}
            onClick={() => onNavigate('profile', post.ownerUid)}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#6366F1]/40 cursor-pointer hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h4
                onClick={() => onNavigate('profile', post.ownerUid)}
                className="font-bold text-xs sm:text-sm text-white hover:text-[#6366F1] cursor-pointer transition-colors"
              >
                {post.ownerName}
              </h4>
              {post.ownerVerified && <span className="text-[#00F5FF] text-xs">✓</span>}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/50 font-medium">
              <span>@{post.ownerUsername}</span>
              <span>•</span>
              <span>{timeAgo(post.createdAt, language)}</span>
              {post.visibility === 'public' && <Globe className="w-3 h-3 text-white/30" />}
              {post.visibility === 'friends' && <Users className="w-3 h-3 text-white/30" />}
              {post.visibility === 'private' && <Lock className="w-3 h-3 text-white/30" />}
            </div>
          </div>
        </div>

        {/* Post Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-1.5 z-30 space-y-1">
              <button
                onClick={handleToggleSave}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4 text-cyan-400" />
                <span>{isSaved ? 'Unsave Post' : t('save')}</span>
              </button>

              <button
                onClick={() => {
                  setShowReportModal(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-amber-400 hover:bg-amber-950/30 flex items-center gap-2"
              >
                <Flag className="w-4 h-4" />
                <span>{t('report')}</span>
              </button>

              {(isOwner || isAdmin) && (
                <button
                  onClick={handleDeletePost}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/30 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('deletePost')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text Content */}
      {post.text && (
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
          {post.text}
        </p>
      )}

      {/* Feelings / Aura Vibe & Location Badges */}
      {(post.feeling || post.location) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {post.feeling && (
            <span className="px-2.5 py-1 rounded-xl bg-violet-950/60 border border-violet-800/40 text-cyan-300 text-[11px] font-semibold">
              Vibe: {post.feeling}
            </span>
          )}
          {post.location && (
            <span className="px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-[11px] font-semibold">
              📍 {post.location}
            </span>
          )}
        </div>
      )}

      {/* Images Media Grid */}
      {post.images && post.images.length > 0 && (
        <div className={`grid gap-2 rounded-2xl overflow-hidden border border-slate-800 ${
          post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}>
          {post.images.map((imgUrl, idx) => (
            <img
              key={idx}
              src={imgUrl}
              alt="Post asset"
              onClick={() => setShowImageLightbox(idx)}
              className="w-full h-60 object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-300"
            />
          ))}
        </div>
      )}

      {/* Video Media Player */}
      {post.video && (
        <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-96">
          <video src={post.video} controls className="w-full h-full object-cover" />
        </div>
      )}

      {/* Post Action Stats & Buttons */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
        
        {/* Reaction Button & Picker */}
        <div className="relative">
          <button
            onClick={() => handleReaction('aura')}
            onMouseEnter={() => setShowReactionPicker(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              userReaction
                ? 'bg-violet-600/20 text-cyan-400 border border-violet-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{likeCount} Auras</span>
          </button>

          {/* Reaction Emoji Picker */}
          {showReactionPicker && (
            <div
              onMouseLeave={() => setShowReactionPicker(false)}
              className="absolute bottom-full left-0 mb-2 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex items-center gap-2 z-30"
            >
              <button onClick={() => handleReaction('like')} className="hover:scale-125 transition-transform text-lg" title="Like">👍</button>
              <button onClick={() => handleReaction('love')} className="hover:scale-125 transition-transform text-lg" title="Love">❤️</button>
              <button onClick={() => handleReaction('aura')} className="hover:scale-125 transition-transform text-lg" title="Aura">✨</button>
              <button onClick={() => handleReaction('celebrate')} className="hover:scale-125 transition-transform text-lg" title="Celebrate">🎉</button>
              <button onClick={() => handleReaction('insightful')} className="hover:scale-125 transition-transform text-lg" title="Insightful">💡</button>
            </div>
          )}
        </div>

        {/* Comment Button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-all"
        >
          <MessageCircle className="w-4 h-4 text-violet-400" />
          <span>{post.commentCount || 0} {t('comment')}s</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            alert('Post link copied to clipboard!');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-all"
        >
          <Share2 className="w-4 h-4 text-emerald-400" />
          <span>{t('share')}</span>
        </button>

      </div>

      {/* Comment Section Drawer */}
      {showComments && (
        <div className="pt-3 border-t border-slate-800 space-y-3">
          
          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <img
              src={userProfile?.photoURL}
              alt={userProfile?.fullName}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder={t('writeComment')}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={submittingComment || !newCommentText.trim()}
              className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Comment Stream */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {comments.length > 0 ? (
              comments.map((c) => (
                <div key={c.commentId} className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                  <img src={c.userPhoto} alt={c.userName} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-white truncate">{c.userName}</p>
                      <span className="text-[10px] text-slate-500">{timeAgo(c.createdAt, language)}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{c.comment}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-2">No comments yet. Be the first to vibe!</p>
            )}
          </div>

        </div>
      )}

      {/* Image Lightbox Gallery Modal */}
      {showImageLightbox !== null && post.images && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setShowImageLightbox(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={post.images[showImageLightbox]}
            alt="Fullscreen view"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Report Content</h3>
            <p className="text-xs text-slate-400">Please select a reason for reporting this post to moderators:</p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
            >
              <option value="Spam">Spam</option>
              <option value="Harassment">Harassment or Hate</option>
              <option value="Violence">Violence or Graphic Content</option>
              <option value="Fake Information">Fake Information</option>
              <option value="Adult Content">Adult Content</option>
              <option value="Other">Other Policy Violation</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReportModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold">
                Cancel
              </button>
              <button onClick={handleSubmitReport} className="px-4 py-2 rounded-xl bg-rose-600 text-xs text-white font-bold">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

    </article>
  );
};
