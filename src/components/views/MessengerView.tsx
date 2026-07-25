import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { timeAgo } from '../../utils/timeAgo';
import {
  Send,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Smile,
  Search,
  MoreVertical,
  CheckCheck,
  Trash2,
  Edit2,
  Pin,
  X,
  Sparkles,
  Phone,
  Video
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db, uploadMediaFile } from '../../firebase/config';
import { Conversation, ChatMessage, UserProfile } from '../../types';

interface MessengerViewProps {
  onNavigate: (tab: string, extraData?: any) => void;
}

export const MessengerView: React.FC<MessengerViewProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();
  const { language, t } = useLanguage();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [receiverProfile, setReceiverProfile] = useState<UserProfile | null>(null);

  // New message input states
  const [messageText, setMessageText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceSecs, setVoiceSecs] = useState(0);

  // New chat modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchPeopleQuery, setSearchPeopleQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState<UserProfile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen to user conversations real-time
  useEffect(() => {
    if (!userProfile?.uid) return;

    const qConv = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userProfile.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubConv = onSnapshot(qConv, (snap) => {
      const list: Conversation[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as Conversation), conversationId: d.id });
      });
      setConversations(list);
      if (!activeConversation && list.length > 0) {
        setActiveConversation(list[0]);
      }
    }, console.error);

    return () => unsubConv();
  }, [userProfile?.uid]);

  // Listen to messages of active conversation & fetch receiver profile
  useEffect(() => {
    if (!activeConversation || !userProfile) return;

    const otherUid = activeConversation.participants.find((id) => id !== userProfile.uid);
    if (otherUid) {
      // Fetch receiver details
      const qUser = query(collection(db, 'users'), where('uid', '==', otherUid));
      getDocs(qUser).then((snap) => {
        if (!snap.empty) {
          setReceiverProfile(snap.docs[0].data() as UserProfile);
        }
      });
    }

    const qMsgs = query(
      collection(db, 'messages'),
      where('conversationId', '==', activeConversation.conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubMsgs = onSnapshot(qMsgs, (snap) => {
      const msgs: ChatMessage[] = [];
      snap.forEach((d) => {
        msgs.push({ ...(d.data() as ChatMessage), messageId: d.id });
      });
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, console.error);

    return () => unsubMsgs();
  }, [activeConversation, userProfile]);

  // Voice Recording Simulator
  useEffect(() => {
    let timer: any;
    if (recordingVoice) {
      timer = setInterval(() => setVoiceSecs((s) => s + 1), 1000);
    } else {
      setVoiceSecs(0);
    }
    return () => clearInterval(timer);
  }, [recordingVoice]);

  // Image select
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file as Blob));
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !activeConversation || (!messageText.trim() && !imageFile && !recordingVoice)) return;

    let mediaUrl = '';
    let messageType: 'text' | 'image' | 'voice' = 'text';

    if (imageFile) {
      mediaUrl = await uploadMediaFile(`chat-images/${Date.now()}_${imageFile.name}`, imageFile);
      messageType = 'image';
    } else if (recordingVoice) {
      messageType = 'voice';
    }

    const receiverUid = activeConversation.participants.find((id) => id !== userProfile.uid) || '';

    const textToSend = recordingVoice ? `🎤 Voice Message (${voiceSecs}s)` : messageText.trim();

    try {
      await addDoc(collection(db, 'messages'), {
        conversationId: activeConversation.conversationId,
        senderUid: userProfile.uid,
        receiverUid,
        messageType,
        message: textToSend,
        mediaUrl: mediaUrl || null,
        duration: recordingVoice ? voiceSecs : null,
        seen: false,
        edited: false,
        deleted: false,
        createdAt: serverTimestamp(),
      });

      // Update conversation lastMessage
      await updateDoc(doc(db, 'conversations', activeConversation.conversationId), {
        lastMessage: textToSend,
        lastMessageTime: serverTimestamp(),
        lastSenderUid: userProfile.uid,
      });

      setMessageText('');
      setImageFile(null);
      setImagePreview('');
      setRecordingVoice(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Search people to start new conversation
  useEffect(() => {
    if (!searchPeopleQuery.trim()) {
      setPeopleResults([]);
      return;
    }
    const q = query(
      collection(db, 'users'),
      where('username', '>=', searchPeopleQuery.toLowerCase()),
      where('username', '<=', searchPeopleQuery.toLowerCase() + '\uf8ff')
    );
    getDocs(q).then((snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      setPeopleResults(list);
    });
  }, [searchPeopleQuery]);

  // Start chat with selected user
  const handleStartChatWith = async (targetUser: UserProfile) => {
    if (!userProfile) return;

    // Check if conversation already exists
    const existing = conversations.find((c) => c.participants.includes(targetUser.uid));
    if (existing) {
      setActiveConversation(existing);
      setShowNewChatModal(false);
      return;
    }

    // Create new conversation document
    try {
      const docRef = await addDoc(collection(db, 'conversations'), {
        participants: [userProfile.uid, targetUser.uid],
        lastMessage: 'Conversation started',
        lastMessageTime: serverTimestamp(),
        lastSenderUid: userProfile.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowNewChatModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete message for everyone
  const handleDeleteMessage = async (msgId: string) => {
    try {
      await updateDoc(doc(db, 'messages', msgId), {
        deleted: true,
        message: 'This message was deleted',
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-7.5rem)] artistic-card rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row select-none">
      
      {/* Sidebar: Conversation List */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0 bg-black/40">
        
        {/* List Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-black text-base text-white uppercase tracking-tight">{t('messages')}</h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/80 text-white text-xs font-bold shadow-md"
          >
            + New Chat
          </button>
        </div>

        {/* Conversations Stream */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length > 0 ? (
            conversations.map((c) => {
              const isActive = activeConversation?.conversationId === c.conversationId;
              return (
                <div
                  key={c.conversationId}
                  onClick={() => setActiveConversation(c)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${
                    isActive
                      ? 'bg-violet-600/20 border border-violet-500/40 text-white'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${c.conversationId}`}
                      alt="Chat"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500/30"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-white truncate">Aura Chat</p>
                      <span className="text-[10px] text-slate-500">{timeAgo(c.lastMessageTime, language)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.lastMessage}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-500 text-center py-10">No active chats. Click + New Chat to connect!</p>
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      {activeConversation && receiverProfile ? (
        <div className="flex-1 flex flex-col bg-slate-900/60">
          
          {/* Chat Top Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
            <div
              onClick={() => onNavigate('profile', receiverProfile.uid)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="relative">
                <img
                  src={receiverProfile.photoURL}
                  alt={receiverProfile.fullName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500"
                />
                {receiverProfile.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                )}
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-white group-hover:text-violet-400 transition-colors flex items-center gap-1">
                  <span>{receiverProfile.fullName}</span>
                  {receiverProfile.verified && <span className="text-cyan-400 text-xs">✓</span>}
                </p>
                <p className="text-[11px] text-slate-400">
                  {receiverProfile.online ? 'Online now' : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <button className="p-2 rounded-xl hover:bg-slate-800 hover:text-white" title="Voice Call">
                <Phone className="w-4.5 h-4.5" />
              </button>
              <button className="p-2 rounded-xl hover:bg-slate-800 hover:text-white" title="Video Call">
                <Video className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => {
              const isMine = m.senderUid === userProfile?.uid;
              return (
                <div
                  key={m.messageId}
                  className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl text-xs sm:text-sm space-y-1 ${
                      isMine
                        ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 text-white rounded-br-none shadow-md'
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                    }`}
                  >
                    {m.mediaUrl && (
                      <img src={m.mediaUrl} alt="Chat attachment" className="rounded-xl max-h-48 object-cover mb-1 border border-white/20" />
                    )}

                    <p className="leading-relaxed">{m.message}</p>

                    <div className="flex items-center justify-end gap-1 text-[9px] opacity-70 mt-1">
                      <span>{timeAgo(m.createdAt, language)}</span>
                      {isMine && <CheckCheck className="w-3 h-3 text-cyan-300" />}
                      {isMine && !m.deleted && (
                        <button onClick={() => handleDeleteMessage(m.messageId)} className="hover:text-rose-300 ml-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Controls */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
            
            {imagePreview && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="absolute top-0 right-0 p-1 bg-black/80 text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              
              <label className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <ImageIcon className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => setRecordingVoice(!recordingVoice)}
                className={`p-2.5 rounded-2xl transition-all ${
                  recordingVoice ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Voice Message"
              >
                <Mic className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={recordingVoice ? `Recording voice... (${voiceSecs}s)` : t('chatPlaceholder')}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-violet-500"
              />

              <button
                type="submit"
                disabled={!messageText.trim() && !imageFile && !recordingVoice}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-lg disabled:opacity-50 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>

          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
          <Sparkles className="w-10 h-10 text-cyan-400 animate-pulse" />
          <p className="font-bold text-white text-sm">Select a chat to open conversation</p>
          <p className="text-xs">Enjoy secure real-time messaging on AuraVerse.</p>
        </div>
      )}

      {/* Start New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Start New Conversation</h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={searchPeopleQuery}
              onChange={(e) => setSearchPeopleQuery(e.target.value)}
              placeholder="Search username..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
            />

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {peopleResults.map((u) => (
                <div
                  key={u.uid}
                  onClick={() => handleStartChatWith(u)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <img src={u.photoURL} alt={u.fullName} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold text-white">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400">@{u.username}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-violet-400">Chat →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
