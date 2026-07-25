import React, { useState, useEffect } from 'react';
import { Search, Compass, Users, FileText, Hash, X, UserPlus, UserCheck, Check, Clock } from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, Post, FriendRequest } from '../../types';
import { PostCard } from '../feed/PostCard';

interface SearchViewProps {
  initialQuery?: string;
  onNavigate: (tab: string, extraData?: any) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ initialQuery = '', onNavigate }) => {
  const { userProfile: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'posts'>('all');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [friendRequestsMap, setFriendRequestsMap] = useState<Record<string, { id: string; status: string; isSender: boolean }>>({});
  const [loading, setLoading] = useState(false);

  // Real-time listener for users to allow instant search
  useEffect(() => {
    const qUsers = query(collection(db, 'users'), limit(100));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const users: UserProfile[] = [];
      snap.forEach((d) => users.push(d.data() as UserProfile));
      setAllUsers(users);
    }, console.error);

    return () => unsubUsers();
  }, []);

  // Real-time listener for friend requests involving current user
  useEffect(() => {
    if (!currentUser?.uid) return;

    const qRequests = query(
      collection(db, 'friendRequests'),
      where('senderUid', '==', currentUser.uid)
    );
    const unsubSent = onSnapshot(qRequests, (snap) => {
      setFriendRequestsMap((prev) => {
        const next = { ...prev };
        snap.forEach((d) => {
          const req = d.data() as FriendRequest;
          next[req.receiverUid] = { id: d.id, status: req.status, isSender: true };
        });
        return next;
      });
    });

    const qRecv = query(
      collection(db, 'friendRequests'),
      where('receiverUid', '==', currentUser.uid)
    );
    const unsubRecv = onSnapshot(qRecv, (snap) => {
      setFriendRequestsMap((prev) => {
        const next = { ...prev };
        snap.forEach((d) => {
          const req = d.data() as FriendRequest;
          next[req.senderUid] = { id: d.id, status: req.status, isSender: false };
        });
        return next;
      });
    });

    return () => {
      unsubSent();
      unsubRecv();
    };
  }, [currentUser?.uid]);

  // Perform filtering whenever search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setUserResults([]);
      setPostResults([]);
      return;
    }

    const term = searchTerm.toLowerCase().trim();

    // Filter Users by username, fullName, displayName
    const matchedUsers = allUsers.filter((u) => {
      if (u.uid === currentUser?.uid) return false;
      const usernameMatch = u.username?.toLowerCase().includes(term);
      const fullNameMatch = u.fullName?.toLowerCase().includes(term);
      const displayNameMatch = u.displayName?.toLowerCase().includes(term);
      return usernameMatch || fullNameMatch || displayNameMatch;
    });

    setUserResults(matchedUsers);

    // Search Posts
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const qPosts = query(collection(db, 'posts'), limit(30));
        const snapPosts = await getDocs(qPosts);
        const posts: Post[] = [];
        snapPosts.forEach((d) => {
          const p = { ...(d.data() as Post), postId: d.id };
          if (
            p.text?.toLowerCase().includes(term) ||
            p.hashtags?.some((h) => h.toLowerCase().includes(term)) ||
            p.ownerUsername?.toLowerCase().includes(term) ||
            p.ownerName?.toLowerCase().includes(term)
          ) {
            posts.push(p);
          }
        });
        setPostResults(posts);
      } catch (err) {
        console.error('Post search error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [searchTerm, allUsers, currentUser?.uid]);

  const handleAddFriend = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'friendRequests'), {
        senderUid: currentUser.uid,
        senderName: currentUser.fullName,
        senderPhoto: currentUser.photoURL,
        senderUsername: currentUser.username,
        receiverUid: targetUser.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send Notification to receiver
      await addDoc(collection(db, 'notifications'), {
        receiverUid: targetUser.uid,
        senderUid: currentUser.uid,
        senderName: currentUser.fullName,
        senderPhoto: currentUser.photoURL,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${currentUser.fullName} sent you a friend request`,
        referenceId: docRef.id,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      setFriendRequestsMap((prev) => ({
        ...prev,
        [targetUser.uid]: { id: docRef.id, status: 'pending', isSender: true },
      }));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 select-none">
      
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search people by @username, full name, posts on AuraVerse..."
          className="w-full pl-12 pr-10 py-3.5 rounded-3xl artistic-card text-white placeholder-slate-400 text-sm focus:outline-none focus:border-violet-500 transition-all shadow-2xl"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'all' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          All Results
        </button>
        <button
          onClick={() => setActiveTab('people')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'people' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          People ({userResults.length})
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'posts' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          Posts ({postResults.length})
        </button>
      </div>

      {/* Results View */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Searching AuraVerse...</div>
      ) : (
        <div className="space-y-6">
          {(activeTab === 'all' || activeTab === 'people') && userResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">People</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userResults.map((u) => {
                  const reqInfo = friendRequestsMap[u.uid];
                  let statusLabel = 'Add Friend';
                  let isConnected = false;
                  let isPending = false;

                  if (reqInfo) {
                    if (reqInfo.status === 'accepted') {
                      statusLabel = 'Friends';
                      isConnected = true;
                    } else if (reqInfo.status === 'pending') {
                      statusLabel = reqInfo.isSender ? 'Request Sent' : 'Accept Request';
                      isPending = true;
                    }
                  }

                  return (
                    <div
                      key={u.uid}
                      className="p-3.5 artistic-card rounded-2xl flex items-center justify-between gap-3 hover:border-violet-500/50 transition-all"
                    >
                      <div
                        onClick={() => onNavigate('profile', u.uid)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <img src={u.photoURL} alt={u.fullName} className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500/30" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-white truncate flex items-center gap-1">
                            <span>{u.fullName}</span>
                            {u.verified && <span className="text-cyan-400 text-xs">✓</span>}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">@{u.username}</p>
                        </div>
                      </div>

                      {/* Action Button */}
                      {!isConnected && !isPending && (
                        <button
                          onClick={() => handleAddFriend(u)}
                          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition-all shadow-md"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}

                      {isPending && (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-cyan-400 font-bold text-[11px] flex items-center gap-1 shrink-0 border border-slate-700">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{statusLabel}</span>
                        </span>
                      )}

                      {isConnected && (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-950/80 text-emerald-300 font-bold text-[11px] flex items-center gap-1 shrink-0 border border-emerald-800/50">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Friends</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'posts') && postResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Posts</h3>
              {postResults.map((p) => (
                <PostCard key={p.postId} post={p} onNavigate={onNavigate} />
              ))}
            </div>
          )}

          {!loading && searchTerm && userResults.length === 0 && postResults.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs artistic-card rounded-3xl">
              No results found for "{searchTerm}".
            </div>
          )}
        </div>
      )}

    </div>
  );
};
