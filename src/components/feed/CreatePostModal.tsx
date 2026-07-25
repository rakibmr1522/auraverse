import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  Image as ImageIcon,
  Video as VideoIcon,
  Smile,
  MapPin,
  Globe,
  Users,
  Lock,
  Sparkles,
  Send,
  Trash2
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, uploadMediaFile } from '../../firebase/config';
import { PrivacySetting } from '../../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const { userProfile, refreshUserProfile } = useAuth();
  const { t } = useLanguage();

  const [text, setText] = useState('');
  const [privacy, setPrivacy] = useState<PrivacySetting>('public');
  const [location, setLocation] = useState('');
  const [feeling, setFeeling] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  
  const [showFeelingsMenu, setShowFeelingsMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const vibesList = [
    '✨ Inspired',
    '⚡ Energized',
    '🌊 Peaceful',
    '🔥 On Fire',
    '🎧 In the Zone',
    '🚀 Future-Minded',
    '💡 Creative Shift',
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (imageFiles.length + selected.length > 10) {
        setError('Maximum 10 images allowed per post.');
      }
      const allowed = selected.slice(0, 10 - imageFiles.length);
      setImageFiles((prev) => [...prev, ...allowed]);
      const newPreviews = allowed.map((file) => URL.createObjectURL(file as Blob));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setVideoFile(selected);
      setVideoPreview(URL.createObjectURL(selected as Blob));
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const extractHashtags = (str: string): string[] => {
    const matches = str.match(/#[a-zA-Z0-9_]+/g);
    return matches ? matches.map((tag) => tag.toLowerCase()) : [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!text.trim() && imageFiles.length === 0 && !videoFile) {
      setError('Post cannot be empty. Add text or media!');
      return;
    }

    setLoading(true);

    try {
      // Helper with timeout guard (20s max per upload)
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 20000): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Upload operation timed out. Please try a smaller image or check network.')), timeoutMs)
          )
        ]);
      };

      // Upload Images
      const imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          setUploadProgress(`Compressing & uploading image ${i + 1} of ${imageFiles.length}...`);
          const url = await withTimeout(uploadMediaFile(`post-images/${Date.now()}_${file.name}`, file));
          imageUrls.push(url);
        }
      }

      // Upload Video if present
      let videoUrl = '';
      if (videoFile) {
        setUploadProgress('Compressing & uploading video...');
        videoUrl = await withTimeout(uploadMediaFile(`post-videos/${Date.now()}_${videoFile.name}`, videoFile), 30000);
      }

      setUploadProgress('Publishing post to feed...');

      const hashtags = extractHashtags(text);

      if (!userProfile) throw new Error('User profile not loaded.');

      // Add to Firestore posts collection
      await addDoc(collection(db, 'posts'), {
        ownerUid: userProfile.uid,
        ownerName: userProfile.fullName,
        ownerUsername: userProfile.username,
        ownerPhoto: userProfile.photoURL,
        ownerVerified: userProfile.verified || false,
        text: text.trim(),
        images: imageUrls,
        video: videoUrl || null,
        visibility: privacy,
        location: location.trim() || null,
        feeling: feeling || null,
        hashtags,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        saveCount: 0,
        reportCount: 0,
        edited: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update User stats
      await updateDoc(doc(db, 'users', userProfile.uid), {
        postCount: increment(1),
        auraScore: increment(25),
      }).catch(() => {});

      await refreshUserProfile().catch(() => {});

      setUploadProgress('');
      setSuccessMsg('🎉 Post published successfully!');

      setTimeout(() => {
        setLoading(false);
        setSuccessMsg('');
        onClose();
        if (onPostCreated) onPostCreated();

        // Reset state
        setText('');
        setLocation('');
        setFeeling('');
        setImageFiles([]);
        setImagePreviews([]);
        setVideoFile(null);
        setVideoPreview('');
      }, 1000);

    } catch (err: any) {
      console.error('Create post error:', err);
      setError(err.message || 'Failed to publish post. Please try again.');
      setUploadProgress('');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base text-white">Create New Post</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {uploadProgress && (
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center gap-2 animate-pulse">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>{uploadProgress}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-bounce">
            {successMsg}
          </div>
        )}

        {/* User Mini Bar & Privacy Selector */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={userProfile?.photoURL}
              alt={userProfile?.fullName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500/40"
            />
            <div>
              <p className="font-bold text-xs text-white">{userProfile?.fullName}</p>
              <p className="text-[10px] text-slate-400">@{userProfile?.username}</p>
            </div>
          </div>

          {/* Privacy Dropdown */}
          <div className="relative">
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as PrivacySetting)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs font-semibold text-slate-300 focus:outline-none"
            >
              <option value="public">🌐 Public</option>
              <option value="friends">👥 Friends</option>
              <option value="private">🔒 Private</option>
            </select>
          </div>
        </div>

        {/* Post Text Area */}
        <div className="space-y-2">
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('whatsOnYourMind')}
            maxLength={5000}
            className="w-full p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-violet-500 transition-all resize-none"
          />

          {feeling && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-950/50 border border-violet-800/40 text-cyan-300 text-xs font-semibold">
              <span>Aura Vibe: {feeling}</span>
              <button onClick={() => setFeeling('')} className="hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {location && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/50 border border-cyan-800/40 text-cyan-300 text-xs font-semibold ml-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location}</span>
              <button onClick={() => setLocation('')} className="hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Selected Image Previews Grid */}
        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {imagePreviews.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 h-24">
                <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Selected Video Preview */}
        {videoPreview && (
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 max-h-48">
            <video src={videoPreview} controls className="w-full h-48 object-cover" />
            <button
              type="button"
              onClick={() => {
                setVideoFile(null);
                setVideoPreview('');
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Feelings Popover */}
        {showFeelingsMenu && (
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Select Vibe</p>
            <div className="flex flex-wrap gap-1.5">
              {vibesList.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setFeeling(v);
                    setShowFeelingsMenu(false);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 border border-slate-700"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1">
            
            {/* Image Upload Trigger */}
            <label className="p-2 rounded-xl hover:bg-slate-800 text-violet-400 cursor-pointer transition-colors" title="Upload Photos">
              <ImageIcon className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>

            {/* Video Upload Trigger */}
            <label className="p-2 rounded-xl hover:bg-slate-800 text-cyan-400 cursor-pointer transition-colors" title="Upload Video">
              <VideoIcon className="w-5 h-5" />
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </label>

            {/* Feelings Toggle */}
            <button
              type="button"
              onClick={() => setShowFeelingsMenu(!showFeelingsMenu)}
              className="p-2 rounded-xl hover:bg-slate-800 text-amber-400 transition-colors"
              title="Add Aura Vibe"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Location Prompt */}
            <button
              type="button"
              onClick={() => {
                const loc = prompt('Enter your location:');
                if (loc) setLocation(loc);
              }}
              className="p-2 rounded-xl hover:bg-slate-800 text-emerald-400 transition-colors"
              title="Add Location"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>

          {/* Submit Post Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-lg shadow-violet-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Publish</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
