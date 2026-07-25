export type UserRole = 'user' | 'moderator' | 'admin' | 'superAdmin';
export type UserStatus = 'active' | 'suspended' | 'banned';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AppLanguage = 'en' | 'bn';
export type PrivacySetting = 'public' | 'friends' | 'private';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  displayName: string;
  photoURL: string;
  coverPhoto?: string;
  bio?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  country?: string;
  city?: string;
  website?: string;
  role: UserRole;
  status: UserStatus;
  verified: boolean;
  emailVerified: boolean;
  online: boolean;
  lastSeen: any;
  theme: ThemeMode;
  language: AppLanguage;
  privacy: PrivacySetting;
  friendCount: number;
  followersCount: number;
  followingCount: number;
  postCount: number;
  storyCount: number;
  notificationCount: number;
  auraScore: number;
  createdAt: any;
  updatedAt: any;
  lastLogin: any;
  deviceInformation?: string;
}

export type ReactionType = 'like' | 'love' | 'aura' | 'celebrate' | 'insightful';

export interface Post {
  postId: string;
  ownerUid: string;
  ownerName: string;
  ownerUsername: string;
  ownerPhoto: string;
  ownerVerified?: boolean;
  text: string;
  images?: string[];
  video?: string;
  visibility: PrivacySetting;
  location?: string;
  feeling?: string;
  hashtags?: string[];
  mentions?: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  reportCount: number;
  edited: boolean;
  createdAt: any;
  updatedAt: any;
  reactions?: Record<string, ReactionType>; // uid -> reactionType
}

export interface Comment {
  commentId: string;
  postId: string;
  userUid: string;
  userName: string;
  userUsername?: string;
  userPhoto: string;
  comment: string;
  imageUrl?: string;
  createdAt: any;
  updatedAt: any;
  likeCount?: number;
}

export interface Reply {
  replyId: string;
  commentId: string;
  userUid: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: any;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface FriendRequest {
  requestId: string;
  senderUid: string;
  senderName: string;
  senderPhoto: string;
  senderUsername: string;
  receiverUid: string;
  status: FriendRequestStatus;
  createdAt: any;
  updatedAt: any;
}

export interface FriendRelation {
  friendId: string;
  userOne: string;
  userTwo: string;
  since: any;
}

export interface Conversation {
  conversationId: string;
  participants: string[];
  participantData?: Record<string, { name: string; photo: string; username: string; online?: boolean }>;
  lastMessage: string;
  lastMessageTime: any;
  lastSenderUid: string;
  pinnedBy?: string[];
  unreadCount?: Record<string, number>;
  createdAt: any;
  updatedAt: any;
}

export type MessageType = 'text' | 'image' | 'voice' | 'file';

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderUid: string;
  receiverUid: string;
  messageType: MessageType;
  message: string;
  mediaUrl?: string;
  fileUrl?: string;
  fileName?: string;
  voiceUrl?: string;
  duration?: number;
  seen: boolean;
  seenAt?: any;
  edited: boolean;
  deleted: boolean;
  deletedForEveryone?: boolean;
  deletedForUids?: string[];
  createdAt: any;
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'post_like'
  | 'post_comment'
  | 'post_share'
  | 'mention'
  | 'new_message'
  | 'story_view'
  | 'system';

export interface AppNotification {
  notificationId: string;
  receiverUid: string;
  senderUid: string;
  senderName: string;
  senderPhoto: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string; // postId, conversationId, etc.
  isRead: boolean;
  createdAt: any;
}

export interface Story {
  storyId: string;
  ownerUid: string;
  ownerName: string;
  ownerPhoto: string;
  image?: string;
  video?: string;
  caption?: string;
  auraVibe?: string;
  visibility: PrivacySetting;
  expiresAt: any;
  createdAt: any;
  viewsCount?: number;
}

export interface SavedPost {
  saveId: string;
  userUid: string;
  postId: string;
  savedAt: any;
}

export interface ContentReport {
  reportId: string;
  targetId: string;
  targetType: 'post' | 'comment' | 'user' | 'story' | 'message';
  targetContentSnippet?: string;
  reportedByUid: string;
  reportedByName: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  createdAt: any;
}

export interface SystemLog {
  logId: string;
  action: string;
  performedByUid: string;
  performedByName: string;
  details?: string;
  ip?: string;
  timestamp: any;
}

export interface SystemSettings {
  platformName: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  maxUploadMB: number;
  allowedLocales: AppLanguage[];
}
