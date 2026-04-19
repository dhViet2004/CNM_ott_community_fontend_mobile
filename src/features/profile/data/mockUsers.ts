export interface ProfileUser {
  id: string;
  fullName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  phoneNumber?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string;
  relationship?: string;
  city?: string;
  isOnline?: boolean;
  lastSeen?: string;
  friendStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  totalFriends?: number;
  totalPhotos?: number;
  totalPosts?: number;
}

export const MOCK_CURRENT_USER: ProfileUser = {
  id: 'current-user-001',
  fullName: 'Hoàng Việt',
  avatarUrl: 'https://i.pravatar.cc/300?img=12',
  coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  bio: 'Yêu công nghệ, thích khám phá những điều mới mẻ. Luôn học hỏi mỗi ngày 🚀',
  phoneNumber: '0842 819 372',
  gender: 'male',
  birthday: '15/04/2004',
  city: 'TP. Hồ Chí Minh',
  isOnline: true,
  friendStatus: 'none',
  totalFriends: 248,
  totalPhotos: 67,
  totalPosts: 124,
};

export const MOCK_USERS: Record<string, ProfileUser> = {
  'user-002': {
    id: 'user-002',
    fullName: 'Nguyễn Thanh Lam',
    avatarUrl: 'https://i.pravatar.cc/300?img=5',
    coverUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
    bio: 'Designer. Yêu nghệ thuật và ánh sáng 🌸',
    phoneNumber: '0912 345 678',
    gender: 'female',
    city: 'Hà Nội',
    isOnline: true,
    lastSeen: 'Vừa xong',
    friendStatus: 'friends',
    totalFriends: 512,
    totalPhotos: 234,
    totalPosts: 89,
  },
  'user-003': {
    id: 'user-003',
    fullName: 'Trần Minh Đức',
    avatarUrl: 'https://i.pravatar.cc/300?img=8',
    coverUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    bio: 'Developer | Freelancer',
    phoneNumber: '0903 123 456',
    gender: 'male',
    city: 'Đà Nẵng',
    isOnline: false,
    lastSeen: '2 giờ trước',
    friendStatus: 'pending_sent',
    totalFriends: 156,
    totalPhotos: 42,
    totalPosts: 67,
  },
  'user-004': {
    id: 'user-004',
    fullName: 'Lê Phương Linh',
    avatarUrl: 'https://i.pravatar.cc/300?img=9',
    coverUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
    bio: 'Student at FTU 💙',
    phoneNumber: '0978 654 321',
    gender: 'female',
    city: 'TP. Hồ Chí Minh',
    isOnline: true,
    lastSeen: 'Đang hoạt động',
    friendStatus: 'pending_received',
    totalFriends: 734,
    totalPhotos: 189,
    totalPosts: 201,
  },
};
