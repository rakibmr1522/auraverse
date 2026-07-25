import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PostCard } from '../feed/PostCard';
import { EditProfileModal } from '../profile/EditProfileModal';
import {
  UserPlus,
  UserCheck,
  MessageSquare,
  Edit3,
  Sparkles,
  MapPin,
  Globe,
  Calendar,
  Image as ImageIcon,
  Users,
  Grid,
  Heart,
  Check,
  X,
  UserX,
  Lock
} from 'lucide-react';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile, Post, FriendRequest } from '../../types';

interface ProfileViewProps {
  targetUid?: string;
  onNavigate: (tab: string, extraData?: any) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  targetUid,
  onNavigate,
}) => {
  const { userProfile: currentUser } = useAuth();
  const { t } = useLanguage();

  const uid = targetUid || currentUser?.uid;
  const isOwnProfile = currentUser?.uid === uid;

  const [profile, setProfile] = useState<UserProfile | null>(isOwnProfile ? currentUser : null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'about' | 'media' | 'friends'>('timeline');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  
  // Relationship state
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [requestId, setRequestId] = useState<string>('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch target user profile
  useEffect(() => {
    if (!uid) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (isOwnProfile && currentUser) {
          setProfile(currentUser);
        } else {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid, isOwnProfile, currentUser]);

  // Fetch friends list for target user
  useEffect(() => {
    if (!uid) return;

    const fetchFriends = async () => {
      try {
        const qSender = query(
          collection(db, 'friendRequests'),
          where('senderUid', '==', uid),
          where('status', '==', 'accepted')
        );
        const qRecv = query(
          collection(db, 'friendRequests'),
          where('receiverUid', '==', uid),
          where('status', '==', 'accepted')
        );

        const [snapSent, snapRecv] = await Promise.all([getDocs(qSender), getDocs(qRecv)]);
        const friendUids = new Set<string>();

        snapSent.forEach((d) => friendUids.add((d.data() as FriendRequest).receiverUid));
        snapRecv.forEach((d) => friendUids.add((d.data() as FriendRequest).senderUid));

        if (friendUids.size === 0) {
          setFriendsList([]);
          return;
        }

        const profiles: UserProfile[] = [];
        for (const fUid of friendUids) {
          const userSnap = await getDoc(doc(db, 'users', fUid));
          if (userSnap.exists()) {
            profiles.push(userSnap.data() as UserProfile);
          }
        }
        setFriendsList(profiles);
      } catch (err) {
        console.error('Fetch friends list error:', err);
      }
    };

    fetchFriends();
  }, [uid, friendStatus]);

  // Check friendship & request status
  useEffect(() => {
    if (!currentUser?.uid || !uid || isOwnProfile) return;

    const checkStatus = async () => {
      // Check friendRequests sent or received
      const qSent = query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', currentUser.uid),
        where('receiverUid', '==', uid)
      );
      const unsubSent = onSnapshot(qSent, (snap) => {
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data() as FriendRequest;
          if (data.status === 'pending') {
            setFriendStatus('pending_sent');
            setRequestId(d.id);
            return;
          } else if (data.status === 'accepted') {
            setFriendStatus('friends');
            return;
          }
        }
      });

      const qRecv = query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', uid),
        where('receiverUid', '==', currentUser.uid)
      );
      const unsubRecv = onSnapshot(qRecv, (snap) => {
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data() as FriendRequest;
          if (data.status === 'pending') {
            setFriendStatus('pending_received');
            setRequestId(d.id);
            return;
          } else if (data.status === 'accepted') {
            setFriendStatus('friends');
            return;
          }
        }
      });

      return () => {
        unsubSent();
        unsubRecv();
      };
    };

    checkStatus();
  }, [currentUser?.uid, uid, isOwnProfile]);

  // Fetch user posts
  useEffect(() => {
    if (!uid) return;

    const qPosts = query(
      collection(db, 'posts'),
      where('ownerUid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const list: Post[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as Post), postId: d.id });
      });
      setUserPosts(list);
    }, console.error);

    return () => unsubPosts();
  }, [uid]);

  // Send Friend Request
  const handleSendRequest = async () => {
    if (!currentUser || !profile) return;
    try {
      const docRef = await addDoc(collection(db, 'friendRequests'), {
        senderUid: currentUser.uid,
        senderName: currentUser.fullName,
        senderPhoto: currentUser.photoURL,
        senderUsername: currentUser.username,
        receiverUid: profile.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send real-time notification to receiver
      await addDoc(collection(db, 'notifications'), {
        receiverUid: profile.uid,
        senderUid: currentUser.uid,
        senderName: currentUser.fullName,
        senderPhoto: currentUser.photoURL,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${currentUser.fullName} (@${currentUser.username}) sent you a friend request`,
        referenceId: docRef.id,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      setRequestId(docRef.id);
      setFriendStatus('pending_sent');
    } catch (err) {
      console.error('Send request error:', err);
    }
  };

  // Accept Friend Request
  const handleAcceptRequest = async () => {
    if (!requestId || !currentUser || !profile) return;
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });

      // Update friend counts
      await updateDoc(doc(db, 'users', currentUser.uid), { friendCount: increment(1) });
      await updateDoc(doc(db, 'users', profile.uid), { friendCount: increment(1) });

      // Send real-time notification back to request sender
      await addDoc(collection(db, 'notifications'), {
        receiverUid: profile.uid,
        senderUid: currentUser.uid,
        senderName: currentUser.fullName,
        senderPhoto: currentUser.photoURL,
        type: 'friend_accept',
        title: 'Friend Request Accepted',
        message: `${currentUser.fullName} (@${currentUser.username}) accepted your friend request`,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      setFriendStatus('friends');
    } catch (err) {
      console.error('Accept request error:', err);
    }
  };

  // Cancel / Remove Request
  const handleCancelRequest = async () => {
    if (!requestId) return;
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
      setFriendStatus('none');
      setRequestId('');
    } catch (err) {
      console.error('Cancel request error:', err);
    }
  };

  if (loading || !profile) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p>Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 select-none">
      
      {/* Cover Photo Banner & Header */}
      <div className="artistic-card rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-44 sm:h-56 bg-gradient-to-r from-[#6366F1] via-[#D946EF] to-[#00F5FF] relative">
          {profile.coverPhoto && (
            <img src={profile.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="p-4 sm:p-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
            
            {/* Avatar & Online Indicator */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden ring-4 ring-[#08080a] border-2 border-[#6366F1] shadow-2xl">
              <img src={profile.photoURL} alt={profile.fullName} className="w-full h-full object-cover" />
              {profile.online && (
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-[#08080a]" title="Online Now" />
              )}
            </div>

            {/* Relationship Action Buttons */}
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{t('editProfile')}</span>
                </button>
              ) : (
                <>
                  {friendStatus === 'none' && (
                    <button
                      onClick={handleSendRequest}
                      className="px-4 py-2 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{t('addFriend')}</span>
                    </button>
                  )}

                  {friendStatus === 'pending_sent' && (
                    <button
                      onClick={handleCancelRequest}
                      className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs flex items-center gap-2"
                      title="Click to cancel request"
                    >
                      <Check className="w-4 h-4" />
                      <span>Request Sent (Cancel)</span>
                    </button>
                  )}

                  {friendStatus === 'pending_received' && (
                    <button
                      onClick={handleAcceptRequest}
                      className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t('accept')} Request</span>
                    </button>
                  )}

                  {friendStatus === 'friends' && (
                    <button disabled className="px-4 py-2 rounded-2xl bg-emerald-950 text-emerald-300 font-bold text-xs border border-emerald-800 flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      <span>Connected Friends</span>
                    </button>
                  )}

                  <button
                    onClick={() => onNavigate('messages')}
                    className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-violet-400" />
                    <span>Message</span>
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Profile Identity Info */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">{profile.fullName}</h1>
              {profile.verified && <span className="text-cyan-400 text-base" title="Verified Creator">✓</span>}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">@{profile.username}</p>

            {profile.bio && (
              <p className="text-xs sm:text-sm text-slate-200 mt-2.5 max-w-xl leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Profile Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium mt-3 pt-3 border-t border-slate-800/80">
              {profile.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{profile.city}</span>
                </div>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-violet-400 hover:underline">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{profile.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              <div className="flex items-center gap-1 text-cyan-300 font-bold bg-cyan-950/40 px-2.5 py-1 rounded-xl border border-cyan-800/30">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{profile.auraScore || 100} Aura Points</span>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-800/80 text-xs sm:text-sm">
              <div><strong className="text-white">{profile.postCount || 0}</strong> <span className="text-slate-400">{t('posts')}</span></div>
              <div><strong className="text-white">{profile.friendCount || 0}</strong> <span className="text-slate-400">{t('friends')}</span></div>
              <div><strong className="text-white">{profile.followersCount || 0}</strong> <span className="text-slate-400">{t('followers')}</span></div>
            </div>

          </div>

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'timeline' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'about' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>{t('about')}</span>
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'media' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>{t('media')}</span>
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'friends' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('friends')}</span>
        </button>
      </div>

      {/* Private Profile Check */}
      {profile.privacy === 'private' && !isOwnProfile && friendStatus !== 'friends' ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">This Account is Private</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Send a friend request to {profile.fullName} to view their timeline posts, photos, and friends list.
          </p>
        </div>
      ) : (
        /* Tab Content */
        <>
          {activeTab === 'timeline' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              {userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <PostCard key={post.postId} post={post} onNavigate={onNavigate} />
                ))
              ) : (
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-10 text-center text-slate-400 text-xs">
                  No timeline posts published yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs text-slate-200">
              <h3 className="font-bold text-sm text-white">About {profile.fullName}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div><span className="text-slate-400">Full Name:</span> <strong className="text-white block mt-0.5">{profile.fullName}</strong></div>
                <div><span className="text-slate-400">Username:</span> <strong className="text-white block mt-0.5">@{profile.username}</strong></div>
                <div><span className="text-slate-400">Email Status:</span> <strong className="text-cyan-400 block mt-0.5">{profile.emailVerified ? 'Verified Account' : 'Standard Account'}</strong></div>
                <div><span className="text-slate-400">Privacy Mode:</span> <strong className="text-white block mt-0.5">{profile.privacy}</strong></div>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {userPosts.filter((p) => !!p.mediaUrl).length > 0 ? (
                userPosts
                  .filter((p) => !!p.mediaUrl)
                  .map((post) => (
                    <div
                      key={post.postId}
                      onClick={() => onNavigate('feed')}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer"
                    >
                      <img
                        src={post.mediaUrl}
                        alt="Media post"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-bold">
                        <span>❤️ {post.likesCount || 0}</span>
                        <span>💬 {post.commentsCount || 0}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="col-span-full bg-slate-900/80 border border-slate-800 rounded-3xl p-10 text-center text-slate-400 text-xs">
                  No media or photos posted yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friendsList.length > 0 ? (
                friendsList.map((friend) => (
                  <div
                    key={friend.uid}
                    className="artistic-card p-4 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => onNavigate('profile', friend.uid)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <img
                        src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`}
                        alt={friend.fullName}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-violet-500/40"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-white group-hover:text-violet-400 transition-colors">
                          {friend.fullName}
                        </h4>
                        <p className="text-[11px] text-slate-400">@{friend.username}</p>
                        <span className="inline-block mt-1 text-[10px] text-cyan-400 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-800/30">
                          ✨ {friend.auraScore || 100} Aura
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => onNavigate('profile', friend.uid)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold transition-all"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => onNavigate('messages')}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-[11px] font-bold shadow-md hover:opacity-90 transition-all"
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-slate-900/80 border border-slate-800 rounded-3xl p-10 text-center text-slate-400 text-xs">
                  No connected friends yet. Search or send requests to connect!
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={profile}
        />
      )}

    </div>
  );
};
