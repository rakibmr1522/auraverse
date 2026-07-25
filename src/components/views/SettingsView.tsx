import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Settings, Globe, Moon, Sun, Shield, Lock, Mail, Save, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { AppLanguage, PrivacySetting } from '../../types';

export const SettingsView: React.FC = () => {
  const { userProfile, firebaseUser, resendVerificationEmail, resetPassword, refreshUserProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [privacy, setPrivacyState] = useState<PrivacySetting>(userProfile?.privacy || 'public');
  const [resetSent, setResetSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    if (!userProfile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        privacy,
        theme,
        language,
        updatedAt: serverTimestamp(),
      });
      await refreshUserProfile();
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerPasswordReset = async () => {
    if (!firebaseUser?.email) return;
    try {
      await resetPassword(firebaseUser.email);
      setResetSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 select-none">
      
      {/* Header */}
      <div className="artistic-card rounded-3xl p-5 flex items-center gap-3 shadow-2xl">
        <div className="p-3 rounded-2xl bg-[#6366F1]/20 text-[#00F5FF] border border-[#6366F1]/30">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-black text-lg text-white uppercase tracking-tight">{t('settings')}</h2>
          <p className="text-xs text-white/40">Manage your preferences, account security, and privacy</p>
        </div>
      </div>

      {/* Language & Appearance */}
      <div className="artistic-card rounded-3xl p-5 space-y-4 shadow-2xl">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#00F5FF]" />
          <span>Language & Theme</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">App Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as AppLanguage)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none"
            >
              <option value="en" className="bg-[#08080a]">English (US)</option>
              <option value="bn" className="bg-[#08080a]">বাংলা (Bengali)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">Color Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none"
            >
              <option value="dark" className="bg-[#08080a]">Dark Aura Glass (Recommended)</option>
              <option value="light" className="bg-[#08080a]">Light Mode</option>
              <option value="system" className="bg-[#08080a]">System Default</option>
            </select>
          </div>
        </div>
      </div>

      {/* Privacy & Visibility */}
      <div className="artistic-card rounded-3xl p-5 space-y-4 shadow-2xl">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#6366F1]" />
          <span>Privacy Controls</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1.5">Profile Visibility</label>
          <select
            value={privacy}
            onChange={(e) => setPrivacyState(e.target.value as PrivacySetting)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none"
          >
            <option value="public" className="bg-[#08080a]">🌐 Public (Visible to everyone on AuraVerse)</option>
            <option value="friends" className="bg-[#08080a]">👥 Friends Only (Only accepted friends can view posts)</option>
            <option value="private" className="bg-[#08080a]">🔒 Private (Hidden profile)</option>
          </select>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Account Security</span>
        </h3>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
          <div>
            <p className="font-bold text-xs text-white">Email Verification Status</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {firebaseUser?.emailVerified ? '✓ Verified' : '⚠️ Pending verification'}
            </p>
          </div>
          {!firebaseUser?.emailVerified && (
            <button
              onClick={resendVerificationEmail}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold"
            >
              Send Link
            </button>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-xs text-white">Password Change</p>
              <p className="text-[11px] text-slate-400">Send password reset email to {firebaseUser?.email}</p>
            </div>
            <button
              onClick={handleTriggerPasswordReset}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
            >
              Reset Password
            </button>
          </div>
          {resetSent && (
            <p className="text-[11px] text-emerald-400 font-semibold">✓ Password reset email sent!</p>
          )}
        </div>
      </div>

      {/* Save Settings Button */}
      <button
        onClick={handleSaveSettings}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2 transition-all"
      >
        <Save className="w-4 h-4" />
        <span>{t('saveChanges')}</span>
      </button>

    </div>
  );
};
