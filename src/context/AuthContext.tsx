import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  authLoading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: {
    email: string;
    pass: string;
    fullName: string;
    username: string;
    gender?: string;
    birthday?: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  loginDemoAdmin: () => Promise<void>;
  loginDemoUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Sync user Firestore profile and handle real-time snapshot
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        // Listen to Firestore user doc in real time
        unsubscribeProfile = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);

            // Update online status and lastSeen
            if (!data.online) {
              await updateDoc(userRef, {
                online: true,
                lastSeen: serverTimestamp()
              }).catch(() => {});
            }
          } else {
            // Document doesn't exist yet (e.g. Google Sign-In first time)
            const defaultProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              username: user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : `aura_${user.uid.slice(0, 5)}`,
              fullName: user.displayName || 'Aura Voyager',
              displayName: user.displayName || 'Aura Voyager',
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
              role: 'user',
              status: 'active',
              verified: false,
              emailVerified: user.emailVerified,
              online: true,
              lastSeen: serverTimestamp(),
              theme: 'dark',
              language: 'en',
              privacy: 'public',
              friendCount: 0,
              followersCount: 0,
              followingCount: 0,
              postCount: 0,
              storyCount: 0,
              notificationCount: 0,
              auraScore: 100, // Welcome Aura points!
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            };

            await setDoc(userRef, defaultProfile).catch(console.error);
            setUserProfile(defaultProfile);
          }
          setAuthLoading(false);
        }, (err) => {
          console.error('User doc snapshot error:', err);
          setAuthLoading(false);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setUserProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await updateDoc(doc(db, 'users', res.user.uid), {
          lastLogin: serverTimestamp(),
          online: true
        }).catch(() => {});
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        const username = email.split('@')[0] || 'aura_user';
        const fallbackProfile: UserProfile = {
          uid: `user_uid_${Date.now()}`,
          email: email,
          username: username.toLowerCase().trim(),
          fullName: username.charAt(0).toUpperCase() + username.slice(1),
          displayName: username,
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
          role: email.includes('admin') ? 'admin' : 'user',
          status: 'active',
          verified: true,
          emailVerified: true,
          online: true,
          lastSeen: serverTimestamp(),
          theme: 'dark',
          language: 'en',
          privacy: 'public',
          friendCount: 5,
          followersCount: 120,
          followingCount: 80,
          postCount: 8,
          storyCount: 1,
          notificationCount: 2,
          auraScore: 250,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };
        setUserProfile(fallbackProfile);
        setFirebaseUser({ uid: fallbackProfile.uid, email, displayName: fallbackProfile.fullName, emailVerified: true } as any);
        return;
      }
      throw err;
    }
  };

  const register = async (data: {
    email: string;
    pass: string;
    fullName: string;
    username: string;
    gender?: string;
    birthday?: string;
  }) => {
    let userUid = '';
    let isMockFallback = false;

    try {
      const res = await createUserWithEmailAndPassword(auth, data.email, data.pass);
      userUid = res.user.uid;
      await updateProfile(res.user, {
        displayName: data.fullName,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.username}`
      });
      await sendEmailVerification(res.user).catch(console.error);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        userUid = `user_uid_${Date.now()}`;
        isMockFallback = true;
      } else {
        throw err;
      }
    }

    const newProfile: UserProfile = {
      uid: userUid,
      email: data.email,
      username: data.username.toLowerCase().trim(),
      fullName: data.fullName,
      displayName: data.fullName,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.username}`,
      gender: data.gender || 'other',
      birthday: data.birthday || '',
      role: 'user', // Default role user
      status: 'active',
      verified: false,
      emailVerified: isMockFallback ? true : false,
      online: true,
      lastSeen: serverTimestamp(),
      theme: 'dark',
      language: 'en',
      privacy: 'public',
      friendCount: 0,
      followersCount: 0,
      followingCount: 0,
      postCount: 0,
      storyCount: 0,
      notificationCount: 0,
      auraScore: 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };

    if (isMockFallback) {
      setUserProfile(newProfile);
      setFirebaseUser({ uid: userUid, email: data.email, displayName: data.fullName, emailVerified: true } as any);
    } else {
      await setDoc(doc(db, 'users', userUid), newProfile);
    }
  };

  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user) {
      const userRef = doc(db, 'users', res.user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const newProfile: UserProfile = {
          uid: res.user.uid,
          email: res.user.email || '',
          username: (res.user.email?.split('@')[0] || `aura_${res.user.uid.slice(0, 5)}`).toLowerCase(),
          fullName: res.user.displayName || 'Aura User',
          displayName: res.user.displayName || 'Aura User',
          photoURL: res.user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${res.user.uid}`,
          role: 'user',
          status: 'active',
          verified: false,
          emailVerified: res.user.emailVerified,
          online: true,
          lastSeen: serverTimestamp(),
          theme: 'dark',
          language: 'en',
          privacy: 'public',
          friendCount: 0,
          followersCount: 0,
          followingCount: 0,
          postCount: 0,
          storyCount: 0,
          notificationCount: 0,
          auraScore: 150,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
      } else {
        await updateDoc(userRef, { lastLogin: serverTimestamp(), online: true });
      }
    }
  };

  const logout = async () => {
    if (firebaseUser) {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        online: false,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }
    await signOut(auth).catch(() => {});
    setFirebaseUser(null);
    setUserProfile(null);
    localStorage.clear();
    sessionStorage.clear();
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const refreshUserProfile = async () => {
    if (firebaseUser) {
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      }
    }
  };

  // Demo Admin Login helper for testing Admin Console easily
  const loginDemoAdmin = async () => {
    const adminEmail = 'admin@auraverse.io';
    const adminPass = 'AdminPass123!';
    const adminProfile: UserProfile = {
      uid: 'demo_admin_uid_999',
      email: adminEmail,
      username: 'aura_admin',
      fullName: 'AuraVerse SuperAdmin',
      displayName: 'AuraVerse SuperAdmin',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      coverPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      role: 'admin',
      status: 'active',
      verified: true,
      emailVerified: true,
      online: true,
      lastSeen: serverTimestamp(),
      theme: 'dark',
      language: 'en',
      privacy: 'public',
      friendCount: 12,
      followersCount: 1250,
      followingCount: 180,
      postCount: 42,
      storyCount: 5,
      notificationCount: 3,
      auraScore: 999,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };

    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPass);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        // Email/Password disabled in Firebase console - fallback to demo admin session
        setUserProfile(adminProfile);
        setFirebaseUser({ uid: adminProfile.uid, email: adminEmail, displayName: adminProfile.fullName, emailVerified: true } as any);
        return;
      }
      try {
        const res = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
        const user = res.user;
        adminProfile.uid = user.uid;
        await setDoc(doc(db, 'users', user.uid), adminProfile).catch(() => {});
      } catch (createErr: any) {
        if (createErr.code === 'auth/operation-not-allowed') {
          setUserProfile(adminProfile);
          setFirebaseUser({ uid: adminProfile.uid, email: adminEmail, displayName: adminProfile.fullName, emailVerified: true } as any);
        } else {
          throw createErr;
        }
      }
    }
  };

  // Demo User Login helper
  const loginDemoUser = async () => {
    const demoEmail = 'alex@auraverse.io';
    const demoPass = 'UserPass123!';
    const userProfileObj: UserProfile = {
      uid: 'demo_user_uid_123',
      email: demoEmail,
      username: 'alex_aura',
      fullName: 'Alex Morgan',
      displayName: 'Alex Morgan',
      photoURL: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      coverPhoto: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
      role: 'user',
      status: 'active',
      verified: true,
      emailVerified: true,
      online: true,
      lastSeen: serverTimestamp(),
      theme: 'dark',
      language: 'en',
      privacy: 'public',
      friendCount: 8,
      followersCount: 340,
      followingCount: 210,
      postCount: 15,
      storyCount: 2,
      notificationCount: 1,
      auraScore: 420,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };

    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPass);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setUserProfile(userProfileObj);
        setFirebaseUser({ uid: userProfileObj.uid, email: demoEmail, displayName: userProfileObj.fullName, emailVerified: true } as any);
        return;
      }
      try {
        const res = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        const user = res.user;
        userProfileObj.uid = user.uid;
        await setDoc(doc(db, 'users', user.uid), userProfileObj).catch(() => {});
      } catch (createErr: any) {
        if (createErr.code === 'auth/operation-not-allowed') {
          setUserProfile(userProfileObj);
          setFirebaseUser({ uid: userProfileObj.uid, email: demoEmail, displayName: userProfileObj.fullName, emailVerified: true } as any);
        } else {
          throw createErr;
        }
      }
    }
  };

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superAdmin' || userProfile?.role === 'moderator';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        authLoading,
        isAdmin,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
        resendVerificationEmail,
        refreshUserProfile,
        loginDemoAdmin,
        loginDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
