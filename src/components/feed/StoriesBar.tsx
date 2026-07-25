import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Eye, Sparkles } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, uploadMediaFile } from '../../firebase/config';
import { Story } from '../../types';

interface StoriesBarProps {
  onOpenCreateStory?: () => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = () => {
  const { userProfile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create story state
  const [caption, setCaption] = useState('');
  const [auraVibe, setAuraVibe] = useState('✨ Stellar');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Fetch non-expired stories
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const q = query(
          collection(db, 'stories'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const list: Story[] = [];
        const now = new Date().getTime();
        snap.forEach((doc) => {
          const data = doc.data() as Story;
          const createdAtTime = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : now;
          // Filter stories under 24 hours
          if (now - createdAtTime < 24 * 60 * 60 * 1000) {
            list.push({ ...data, storyId: doc.id });
          }
        });
        setStories(list);
      } catch (err) {
        console.error('Fetch stories error:', err);
      }
    };

    fetchStories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected as Blob));
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || (!file && !caption.trim())) return;

    setUploading(true);
    try {
      let mediaUrl = '';
      if (file) {
        mediaUrl = await uploadMediaFile(`story-images/${Date.now()}_${file.name}`, file);
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await addDoc(collection(db, 'stories'), {
        ownerUid: userProfile.uid,
        ownerName: userProfile.fullName,
        ownerPhoto: userProfile.photoURL,
        image: mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        caption: caption.trim(),
        auraVibe,
        visibility: 'public',
        expiresAt,
        createdAt: serverTimestamp(),
      });

      setShowCreateModal(false);
      setCaption('');
      setFile(null);
      setPreviewUrl('');
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full select-none">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        
        {/* Create Story Button */}
        <div
          onClick={() => setShowCreateModal(true)}
          className="relative w-28 h-44 rounded-3xl artistic-card overflow-hidden cursor-pointer group shrink-0 flex flex-col justify-between p-2.5 shadow-2xl hover:border-[#6366F1]/50 transition-all"
        >
          <img
            src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=aura'}
            alt="My Avatar"
            className="w-full h-24 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-[#6366F1] to-[#D946EF] text-white flex items-center justify-center ring-4 ring-[#08080a] shadow-md">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-center text-white mt-3 truncate">
            Add Aura
          </span>
        </div>

        {/* Existing Active Stories List */}
        {stories.map((story, idx) => (
          <div
            key={story.storyId}
            onClick={() => setActiveStoryIndex(idx)}
            className="relative w-28 h-44 rounded-3xl bg-[#08080a] border-2 border-[#6366F1] overflow-hidden cursor-pointer group shrink-0 shadow-2xl hover:scale-[1.02] transition-all"
          >
            <img
              src={story.image || story.ownerPhoto}
              alt={story.ownerName}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 p-2.5 flex flex-col justify-between">
              <img
                src={story.ownerPhoto}
                alt={story.ownerName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-[#00F5FF]"
              />
              <div>
                <p className="text-[10px] font-bold text-[#00F5FF] truncate">{story.auraVibe}</p>
                <p className="text-[11px] font-bold text-white truncate">{story.ownerName}</p>
              </div>
            </div>
          </div>
        ))}

      </div>

      {/* Story Fullscreen Viewer Modal */}
      {activeStoryIndex !== null && stories[activeStoryIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <button
            onClick={() => setActiveStoryIndex(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative w-full max-w-sm h-[80vh] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-black flex flex-col">
            <img
              src={stories[activeStoryIndex].image}
              alt="Story Content"
              className="w-full h-full object-cover"
            />

            {/* Story Header */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3">
              <img
                src={stories[activeStoryIndex].ownerPhoto}
                alt="Owner"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500"
              />
              <div>
                <p className="font-bold text-sm text-white">{stories[activeStoryIndex].ownerName}</p>
                <p className="text-xs font-semibold text-cyan-400">{stories[activeStoryIndex].auraVibe}</p>
              </div>
            </div>

            {/* Story Caption Overlay */}
            {stories[activeStoryIndex].caption && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <p className="text-sm font-medium text-white text-center leading-snug">
                  {stories[activeStoryIndex].caption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Create Aura Story</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="space-y-4">
              {/* Vibe Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Aura Vibe</label>
                <select
                  value={auraVibe}
                  onChange={(e) => setAuraVibe(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                >
                  <option value="✨ Cosmic Energy">✨ Cosmic Energy</option>
                  <option value="🔥 On Fire">🔥 On Fire</option>
                  <option value="🌊 Chill Vibe">🌊 Chill Vibe</option>
                  <option value="⚡ Electric Shift">⚡ Electric Shift</option>
                  <option value="🌸 Peace & Love">🌸 Peace & Love</option>
                </select>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Caption</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Share a thought for your story..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500"
                />
                {previewUrl && (
                  <img src={previewUrl} alt="Preview" className="mt-3 w-full h-40 object-cover rounded-2xl border border-slate-800" />
                )}
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Publish Story</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
