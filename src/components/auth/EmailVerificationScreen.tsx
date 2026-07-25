import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { MailCheck, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react';

interface EmailVerificationScreenProps {
  onNavigateLogin: () => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ onNavigateLogin }) => {
  const { resendVerificationEmail, firebaseUser } = useAuth();
  const { t } = useLanguage();

  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendVerificationEmail();
      setResent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
        <MailCheck className="w-7 h-7" />
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{t('emailVerificationTitle')}</h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          {t('emailVerificationMessage')}
        </p>
        {firebaseUser?.email && (
          <p className="mt-2 text-xs font-semibold text-cyan-400 bg-slate-950/80 py-1.5 px-3 rounded-xl border border-slate-800 inline-block">
            {firebaseUser.email}
          </p>
        )}
      </div>

      {resent && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
          ✓ Verification email resent! Please check your spam/inbox.
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => window.open('https://mail.google.com', '_blank')}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-lg flex items-center justify-center gap-2 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Email App</span>
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('resendVerification')}</span>
        </button>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onNavigateLogin}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('backToLogin')}</span>
        </button>
      </div>
    </div>
  );
};
