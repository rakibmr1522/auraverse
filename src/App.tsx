import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthSplashScreen } from './components/auth/AuthSplashScreen';
import { AuthLayout } from './components/auth/AuthLayout';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { EmailVerificationScreen } from './components/auth/EmailVerificationScreen';
import { Navbar } from './components/layout/Navbar';
import { SidebarLeft } from './components/layout/SidebarLeft';
import { SidebarRight } from './components/layout/SidebarRight';
import { MobileNav } from './components/layout/MobileNav';
import { HomeFeedView } from './components/views/HomeFeedView';
import { ProfileView } from './components/views/ProfileView';
import { MessengerView } from './components/views/MessengerView';
import { SearchView } from './components/views/SearchView';
import { NotificationsView } from './components/views/NotificationsView';
import { SettingsView } from './components/views/SettingsView';
import { AdminView } from './components/views/AdminView';
import { CreatePostModal } from './components/feed/CreatePostModal';

type AuthScreen = 'login' | 'register' | 'forgot' | 'verification';

const AppContent: React.FC = () => {
  const { firebaseUser, authLoading } = useAuth();
  
  // Auth view routing state
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');

  // Main application navigation state
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedUid, setSelectedUid] = useState<string | undefined>(undefined);
  const [initialSearchQuery, setInitialSearchQuery] = useState<string>('');

  // Modals state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState<boolean>(false);

  // 1. Initial Auth Loading Splash
  if (authLoading) {
    return <AuthSplashScreen />;
  }

  // 2. Unauthenticated Routes
  if (!firebaseUser) {
    return (
      <AuthLayout>
        {authScreen === 'login' && (
          <LoginForm
            onNavigateRegister={() => setAuthScreen('register')}
            onNavigateForgot={() => setAuthScreen('forgot')}
          />
        )}

        {authScreen === 'register' && (
          <RegisterForm
            onNavigateLogin={() => setAuthScreen('login')}
            onNavigateVerification={() => setAuthScreen('verification')}
          />
        )}

        {authScreen === 'forgot' && (
          <ForgotPasswordForm onNavigateLogin={() => setAuthScreen('login')} />
        )}

        {authScreen === 'verification' && (
          <EmailVerificationScreen onNavigateLogin={() => setAuthScreen('login')} />
        )}
      </AuthLayout>
    );
  }

  // Helper navigation router
  const handleNavigate = (tab: string, extraData?: any) => {
    setCurrentTab(tab);
    if (tab === 'profile') {
      setSelectedUid(extraData);
    } else if (tab === 'search') {
      setInitialSearchQuery(extraData || '');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 3. Authenticated App Layout
  return (
    <div className="min-h-screen bg-white dark:bg-[#08080a] text-slate-900 dark:text-[#f0f0f2] flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden artistic-glow-bg">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenCreatePost={() => setIsCreatePostOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 py-4 sm:py-6 flex gap-6">
        
        {/* Left Sidebar */}
        <SidebarLeft
          currentTab={currentTab}
          onNavigate={handleNavigate}
        />

        {/* Center Main View Area */}
        <main className="flex-1 min-w-0">
          {currentTab === 'home' && (
            <HomeFeedView
              onNavigate={handleNavigate}
              onOpenCreatePost={() => setIsCreatePostOpen(true)}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              targetUid={selectedUid}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'messages' && (
            <MessengerView onNavigate={handleNavigate} />
          )}

          {currentTab === 'search' && (
            <SearchView initialQuery={initialSearchQuery} onNavigate={handleNavigate} />
          )}

          {currentTab === 'notifications' && (
            <NotificationsView onNavigate={handleNavigate} />
          )}

          {currentTab === 'friends' && (
            <ProfileView targetUid={firebaseUser.uid} onNavigate={handleNavigate} />
          )}

          {currentTab === 'saved' && (
            <HomeFeedView onNavigate={handleNavigate} onOpenCreatePost={() => setIsCreatePostOpen(true)} />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}

          {currentTab === 'admin' && (
            <AdminView />
          )}
        </main>

        {/* Right Sidebar (Hidden on small viewports) */}
        {currentTab === 'home' && (
          <SidebarRight
            onNavigate={handleNavigate}
            onHashtagClick={(tag) => handleNavigate('search', tag)}
          />
        )}

      </div>

      {/* Footer bar with Artistic Flair theme status */}
      <footer className="hidden sm:flex h-10 border-t border-white/5 bg-black/40 backdrop-blur-md items-center justify-between px-8 text-[10px] text-white/30 uppercase tracking-[0.25em] font-bold shrink-0">
        <div>© AuraVerse Protocol</div>
        <div className="flex gap-6">
          <button onClick={() => handleNavigate('home')} className="hover:text-white transition-colors">Feed</button>
          <button onClick={() => handleNavigate('search')} className="hover:text-white transition-colors">Explore</button>
          <button onClick={() => handleNavigate('settings')} className="hover:text-white transition-colors">Settings</button>
        </div>
        <div className="flex items-center gap-2 text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Neural Feed Connected
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenCreatePost={() => setIsCreatePostOpen(true)}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => setCurrentTab('home')}
      />

    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
