import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { timeAgo } from '../../utils/timeAgo';
import {
  ShieldCheck,
  Users,
  FileText,
  AlertTriangle,
  Activity,
  Search,
  CheckCircle2,
  Ban,
  Trash2,
  UserCheck,
  Lock,
  RefreshCw,
  Power,
  Edit2,
  Save,
  Download,
  Settings,
  X,
  Check
} from 'lucide-react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  getDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile, ContentReport, SystemLog, UserRole, UserStatus, Post } from '../../types';

export const AdminView: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const { language, t } = useLanguage();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  // Search & Filter state
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [postSearch, setPostSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'moderation' | 'settings' | 'logs'>('users');

  // Modal & Toast states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    actionText: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    platformName: 'AuraVerse',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    homepageBanner: 'Welcome to AuraVerse Protocol - The Next Generation Social Synapse',
    googleLoginEnabled: true,
    registrationEnabled: true,
    maintenanceMode: false,
    defaultTheme: 'dark',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Listen to platform settings in real-time
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(doc(db, 'settings', 'platform'), (snap) => {
      if (snap.exists()) {
        setPlatformSettings((prev) => ({ ...prev, ...snap.data() }));
      }
    }, console.error);
    return () => unsub();
  }, [isAdmin]);

  // Listen to users, reports, logs, posts in real-time
  useEffect(() => {
    if (!isAdmin) return;

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      setUsers(list);
    }, console.error);

    const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), (snap) => {
      const list: ContentReport[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as ContentReport), reportId: d.id }));
      setReports(list);
    }, console.error);

    const unsubLogs = onSnapshot(query(collection(db, 'systemLogs'), orderBy('timestamp', 'desc')), (snap) => {
      const list: SystemLog[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as SystemLog), logId: d.id }));
      setLogs(list);
    }, console.error);

    const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), (snap) => {
      const list: Post[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as Post), postId: d.id }));
      setPosts(list);
    }, console.error);

    return () => {
      unsubUsers();
      unsubReports();
      unsubLogs();
      unsubPosts();
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400">
          You do not have administrative privileges to view the AuraVerse Admin Console.
        </p>
      </div>
    );
  }

  // Audit Action Logger
  const logAdminAction = async (action: string, details: string) => {
    if (!userProfile) return;
    await addDoc(collection(db, 'systemLogs'), {
      action,
      performedByUid: userProfile.uid,
      performedByName: userProfile.fullName,
      details,
      timestamp: serverTimestamp(),
    }).catch(console.error);
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Filter posts
  const filteredPosts = posts.filter((p) =>
    p.text.toLowerCase().includes(postSearch.toLowerCase()) ||
    p.ownerName.toLowerCase().includes(postSearch.toLowerCase()) ||
    p.ownerUsername.toLowerCase().includes(postSearch.toLowerCase())
  );

  // Admin User Actions
  const handleUpdateUserStatus = async (targetUid: string, newStatus: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), { status: newStatus });
      await logAdminAction('USER_STATUS_CHANGE', `Updated status of user ${targetUid} to ${newStatus}`);
      showToast(`User status updated to ${newStatus}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  const handleToggleVerify = async (targetUser: UserProfile) => {
    try {
      const nextVal = !targetUser.verified;
      await updateDoc(doc(db, 'users', targetUser.uid), { verified: nextVal });
      await logAdminAction('USER_VERIFICATION_TOGGLE', `Toggled verification for ${targetUser.username} to ${nextVal}`);
      showToast(`Verification badge ${nextVal ? 'granted to' : 'removed from'} @${targetUser.username}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle verification', 'error');
    }
  };

  const handleToggleRole = async (targetUser: UserProfile, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole });
      await logAdminAction('USER_ROLE_CHANGE', `Changed role of ${targetUser.username} to ${newRole}`);
      showToast(`Role of @${targetUser.username} changed to ${newRole}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to change user role', 'error');
    }
  };

  const handleDeleteUser = (targetUser: UserProfile) => {
    setConfirmDialog({
      title: 'Delete User Account',
      message: `Are you sure you want to permanently delete @${targetUser.username}? This action cannot be undone.`,
      actionText: 'Delete User',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', targetUser.uid));
          await logAdminAction('USER_DELETE', `Deleted user account @${targetUser.username}`);
          showToast(`User @${targetUser.username} deleted successfully`);
        } catch (err: any) {
          showToast(err.message || 'Failed to delete user', 'error');
        }
      }
    });
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        fullName: editingUser.fullName,
        username: editingUser.username.toLowerCase().trim(),
        auraScore: Number(editingUser.auraScore) || 100,
        role: editingUser.role,
        status: editingUser.status,
        verified: editingUser.verified
      });
      await logAdminAction('USER_EDIT', `Admin edited user profile for @${editingUser.username}`);
      showToast(`User profile for @${editingUser.username} updated!`);
      setEditingUser(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save user edit', 'error');
    }
  };

  // Post Moderation Actions
  const handleDeletePost = (postId: string) => {
    setConfirmDialog({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post from the feed?',
      actionText: 'Delete Post',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'posts', postId));
          await logAdminAction('POST_DELETE', `Deleted post ${postId}`);
          showToast('Post deleted successfully');
        } catch (err: any) {
          showToast(err.message || 'Failed to delete post', 'error');
        }
      }
    });
  };

  // Report Actions
  const handleDismissReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'dismissed' });
      showToast('Report dismissed');
    } catch (err: any) {
      showToast(err.message || 'Failed to dismiss report', 'error');
    }
  };

  const handleActionReport = (report: ContentReport) => {
    setConfirmDialog({
      title: 'Action Reported Content',
      message: 'This will delete the reported content and mark report as resolved.',
      actionText: 'Action & Delete',
      onConfirm: async () => {
        try {
          if (report.targetType === 'post') {
            await deleteDoc(doc(db, 'posts', report.targetId));
          }
          await updateDoc(doc(db, 'reports', report.reportId), { status: 'actioned' });
          await logAdminAction('CONTENT_MODERATION', `Deleted reported ${report.targetType} ${report.targetId}`);
          showToast('Content deleted and report resolved');
        } catch (err: any) {
          showToast(err.message || 'Failed to action report', 'error');
        }
      }
    });
  };

  // Save Platform Settings
  const handleSavePlatformSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'platform'), platformSettings, { merge: true });
      await logAdminAction('PLATFORM_SETTINGS_UPDATE', 'Updated global platform configuration');
      showToast('Platform settings saved successfully to Firestore!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    }
  };

  // Database Backup Export (JSON Download)
  const handleExportDatabase = () => {
    const dump = {
      exportedAt: new Date().toISOString(),
      platform: 'AuraVerse Admin Dump',
      usersCount: users.length,
      postsCount: posts.length,
      reportsCount: reports.length,
      users,
      posts,
      reports,
      systemLogs: logs
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dump, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `auraverse_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Database backup downloaded successfully!');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 select-none">
      
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600 border border-emerald-400' : 'bg-rose-600 border border-rose-400'
        }`}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await fn();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 shadow-lg"
              >
                {confirmDialog.actionText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Edit User: @{editingUser.username}</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Aura Score</label>
                  <input
                    type="number"
                    value={editingUser.auraScore}
                    onChange={(e) => setEditingUser({ ...editingUser, auraScore: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="superAdmin">SuperAdmin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as UserStatus })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="userVerifyCheck"
                    checked={editingUser.verified}
                    onChange={(e) => setEditingUser({ ...editingUser, verified: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-violet-600"
                  />
                  <label htmlFor="userVerifyCheck" className="text-xs font-bold text-cyan-400">
                    Verified Badge ✓
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 shadow-lg flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="artistic-card rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-lg text-white uppercase tracking-tight">{t('adminDashboard')}</h1>
            <p className="text-xs text-slate-400">Full platform controls & real-time administration console</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDatabase}
            className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export Backup</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-1 shadow-xl">
          <p className="text-slate-400 text-xs font-semibold">{t('totalUsers')}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">{users.length}</p>
          <p className="text-[10px] text-emerald-400 font-medium">Registered Accounts</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-1 shadow-xl">
          <p className="text-slate-400 text-xs font-semibold">{t('activeNow')}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400">{users.filter((u) => u.online).length}</p>
          <p className="text-[10px] text-cyan-400 font-medium">Live Online Sessions</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-1 shadow-xl">
          <p className="text-slate-400 text-xs font-semibold">Total Posts</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-violet-400">{posts.length}</p>
          <p className="text-[10px] text-violet-400 font-medium">Published Feed Content</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-1 shadow-xl">
          <p className="text-slate-400 text-xs font-semibold">{t('reportsPending')}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-400">{reports.filter((r) => r.status === 'pending').length}</p>
          <p className="text-[10px] text-amber-400 font-medium">Flagged Items</p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'users' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('userManagement')} ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'posts' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          Posts Management ({posts.length})
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'moderation' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('contentModeration')} ({reports.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'settings' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          Platform Settings
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'logs' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('systemLogs')} ({logs.length})
        </button>
      </div>

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name, username, or email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="superAdmin">SuperAdmin</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Aura</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img src={u.photoURL} alt={u.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                        <div>
                          <p className="font-bold text-white flex items-center gap-1">
                            <span>{u.fullName}</span>
                            {u.verified && <span className="text-cyan-400 text-[10px]">✓</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">@{u.username} • {u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                        u.role === 'admin' || u.role === 'superAdmin'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : u.role === 'moderator'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                        u.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="p-3 font-bold text-cyan-400">{u.auraScore || 100}</td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-lg bg-violet-950 hover:bg-violet-900 text-violet-300 text-[10px] font-bold border border-violet-800"
                          title="Edit User Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleVerify(u)}
                          className="px-2 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-[10px] font-bold border border-cyan-800"
                          title="Toggle Verification Badge"
                        >
                          Verify
                        </button>

                        <button
                          onClick={() => handleUpdateUserStatus(u.uid, u.status === 'banned' ? 'active' : 'banned')}
                          className="px-2 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 text-[10px] font-bold border border-rose-800"
                          title="Ban/Unban User"
                        >
                          {u.status === 'banned' ? 'Unban' : 'Ban'}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-400 text-[10px] font-bold border border-rose-800"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Posts Management Tab */}
      {activeTab === 'posts' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-white">All Published Posts ({posts.length})</h3>
            <input
              type="text"
              value={postSearch}
              onChange={(e) => setPostSearch(e.target.value)}
              placeholder="Filter post content or author..."
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs w-64"
            />
          </div>

          <div className="space-y-3">
            {filteredPosts.map((p) => (
              <div key={p.postId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <img src={p.ownerPhoto} alt={p.ownerName} className="w-6 h-6 rounded-full object-cover" />
                    <span className="font-bold text-xs text-white">{p.ownerName}</span>
                    <span className="text-[10px] text-slate-400">@{p.ownerUsername}</span>
                    <span className="text-[10px] text-slate-500">• {timeAgo(p.createdAt, language)}</span>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-2">{p.text}</p>
                  {p.images && p.images.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {p.images.slice(0, 3).map((url, i) => (
                        <img key={i} src={url} alt="Attachment" className="w-12 h-12 rounded-lg object-cover border border-slate-800" />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeletePost(p.postId)}
                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderation Tab */}
      {activeTab === 'moderation' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
          <h3 className="font-bold text-sm text-white">Pending Moderation Items ({reports.length})</h3>
          {reports.length > 0 ? (
            reports.map((r) => (
              <div key={r.reportId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400">Reported {r.targetType}</span>
                  <span className="text-slate-500">{timeAgo(r.createdAt, language)}</span>
                </div>
                <p className="text-xs text-slate-200"><strong className="text-slate-400">Reason:</strong> {r.reason}</p>
                {r.targetContentSnippet && (
                  <p className="text-xs text-slate-400 italic bg-slate-900 p-2 rounded-xl">"{r.targetContentSnippet}"</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => handleDismissReport(r.reportId)} className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                    Dismiss
                  </button>
                  <button onClick={() => handleActionReport(r)} className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold">
                    Delete Content
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 text-center py-8">No content reports in queue.</p>
          )}
        </div>
      )}

      {/* Platform Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>Global Platform Settings</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Control registration rules, authentication, and platform features</p>
            </div>

            <button
              onClick={handleSavePlatformSettings}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Platform Branding</h4>
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Platform Name</label>
                <input
                  type="text"
                  value={platformSettings.platformName}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, platformName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Homepage Banner</label>
                <textarea
                  rows={2}
                  value={platformSettings.homepageBanner}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, homepageBanner: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Authentication & Rules</h4>
              
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-white">Google Login</p>
                  <p className="text-[10px] text-slate-400">Allow users to sign in with Google OAuth</p>
                </div>
                <input
                  type="checkbox"
                  checked={platformSettings.googleLoginEnabled}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, googleLoginEnabled: e.target.checked })}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-white">New User Registration</p>
                  <p className="text-[10px] text-slate-400">Allow new users to sign up for accounts</p>
                </div>
                <input
                  type="checkbox"
                  checked={platformSettings.registrationEnabled}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, registrationEnabled: e.target.checked })}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-rose-400">Maintenance Mode</p>
                  <p className="text-[10px] text-slate-400">Restrict access to admins only</p>
                </div>
                <input
                  type="checkbox"
                  checked={platformSettings.maintenanceMode}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-rose-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-xl">
          <h3 className="font-bold text-sm text-white">System Audit Trail</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((l) => (
              <div key={l.logId} className="p-3 rounded-xl bg-slate-950 text-xs space-y-1 border border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-400">{l.action}</span>
                  <span className="text-slate-500">{timeAgo(l.timestamp, language)}</span>
                </div>
                <p className="text-slate-300">{l.details}</p>
                <p className="text-[10px] text-slate-500">Performed by: {l.performedByName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
