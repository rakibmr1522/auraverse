import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { X, Camera, Save, User, MapPin, Globe, Phone, FileText } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, uploadMediaFile } from '../../firebase/config';
import { UserProfile } from '../../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  const { refreshUserProfile } = useAuth();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState(profile.fullName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [location, setLocation] = useState(profile.city || profile.country || '');
  const [phone, setPhone] = useState(profile.phone || '');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.photoURL);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(profile.coverPhoto || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let newAvatarUrl = profile.photoURL;
      if (avatarFile) {
        newAvatarUrl = await uploadMediaFile(`profile-images/${profile.uid}_${Date.now()}`, avatarFile);
      }

      let newCoverUrl = profile.coverPhoto || '';
      if (coverFile) {
        newCoverUrl = await uploadMediaFile(`cover-images/${profile.uid}_${Date.now()}`, coverFile);
      }

      await updateDoc(doc(db, 'users', profile.uid), {
        fullName: fullName.trim(),
        displayName: fullName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        city: location.trim(),
        phone: phone.trim(),
        photoURL: newAvatarUrl,
        coverPhoto: newCoverUrl,
        updatedAt: serverTimestamp(),
      });

      await refreshUserProfile();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-bold text-base text-white">{t('editProfile')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Cover & Avatar Upload Preview */}
          <div className="relative">
            {/* Cover Banner */}
            <div className="h-28 rounded-2xl bg-slate-950 overflow-hidden relative border border-slate-800">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500" />
              )}
              <label className="absolute top-2 right-2 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 backdrop-blur-md">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Change Cover</span>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              </label>
            </div>

            {/* Avatar Circle */}
            <div className="absolute left-4 -bottom-6">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-slate-900 border border-violet-500">
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                <label className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-5 h-5 text-cyan-400" />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('fullName')}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t('bio')}</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a brief bio..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            {/* Location & Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('location')}</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="New York, USA"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('website')}</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://mywebsite.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('saveChanges')}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
