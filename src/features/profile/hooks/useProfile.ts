import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@store';
import { updateUser } from '@store/slices/authSlice';
import { userApi, friendsApi } from '@api';
import type { User } from '@/types';

interface ProfileUser {
  id: string;
  fullName: string;
  avatarUrl?: string;
  coverUrl?: string;
  phoneNumber?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  friendStatus?: 'none' | 'friends' | 'pending_sent' | 'pending_received';
}

interface UseProfileOptions {
  userId?: string;
  autoLoad?: boolean;
}

interface UseProfileReturn {
  user: ProfileUser | null;
  isMyProfile: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isRefreshing: boolean;
  friendStatus: ProfileUser['friendStatus'];
  friendshipId?: string;
  fetchProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendFriendRequest: () => Promise<void>;
  cancelFriendRequest: (friendshipId: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  unfriend: (friendshipId: string) => Promise<void>;
  updateMyProfile: (data: Partial<ProfileUser>) => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
}

const mapUserToProfile = (u: User): ProfileUser => ({
  id: u.userId,
  fullName: u.display_name,
  avatarUrl: u.avatar_url || undefined,
  coverUrl: u.coverImage,
  phoneNumber: u.phone_number || undefined,
  bio: u.status,
  isOnline: u.isOnline,
  lastSeen: u.lastSeen,
});

export const useProfile = (options: UseProfileOptions = {}): UseProfileReturn => {
  const { userId, autoLoad = true } = options;

  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localFriendStatus, setLocalFriendStatus] = useState<ProfileUser['friendStatus']>('none');
  const [localFriendshipId, setLocalFriendshipId] = useState<string | undefined>(undefined);

  const isMyProfile = useMemo(() => {
    if (!userId) return true;
    return userId === currentUser?.userId;
  }, [userId, currentUser]);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      if (isMyProfile) {
        // Fetch current user's profile from API
        const u = await userApi.getMe();
        setProfile(mapUserToProfile(u));
      } else if (userId) {
        const u = await userApi.getUserById(userId);
        setProfile(mapUserToProfile(u));
        // Check friend status from API
        const pending = await friendsApi.getPendingRequests().catch(() => []);
        const pendingItem = pending.find((p) => p.userId === userId);
        if (pendingItem) {
          setLocalFriendshipId(pendingItem.id ?? pendingItem.friendshipId ?? pendingItem.requestId);
          setLocalFriendStatus('pending_received');
        } else {
          setLocalFriendshipId(undefined);
          setLocalFriendStatus('none');
        }
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err?.response?.data?.message || 'Không tìm thấy người dùng');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isMyProfile]);

  useEffect(() => {
    if (autoLoad && !profile && !isLoading) {
      fetchProfile();
    }
  }, [autoLoad, profile, isLoading, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProfile();
    setIsRefreshing(false);
  }, [fetchProfile]);

  const updateMyProfileHandler = useCallback(
    async (data: Partial<ProfileUser>) => {
      if (!isMyProfile) return;
      setIsLoading(true);
      try {
        const updateData: Parameters<typeof userApi.updateProfile>[0] = {};
        if (data.fullName !== undefined) updateData.display_name = data.fullName;
        if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
        if (data.bio !== undefined) updateData.display_name = data.fullName ?? currentUser?.display_name;

        const updated = await userApi.updateProfile(updateData);
        dispatch(updateUser(updated));
        setProfile((prev) => (prev ? { ...prev, ...mapUserToProfile(updated) } : prev));
      } catch (err: any) {
        console.error('Update profile failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isMyProfile, dispatch, currentUser]
  );

  const updateStatus = useCallback(
    async (status: string) => {
      setProfile((prev) => (prev ? { ...prev, bio: status } : prev));
      dispatch(updateUser({ status }));
    },
    [dispatch]
  );

  const sendFriendRequest = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await friendsApi.sendRequest(userId);
      // Backend returns { message, data: { id: friendshipId, ... } }
      const fid = (res as any)?.data?.id;
      if (fid) {
        setLocalFriendshipId(fid);
      }
      setLocalFriendStatus('pending_sent');
    } catch {}
  }, [userId]);

  // Backend uses /friends/reject for both cancel and unfriend
  const cancelFriendRequest = useCallback(async (friendshipId: string) => {
    if (!friendshipId) return;
    try {
      await friendsApi.cancelRequest(friendshipId);
      setLocalFriendStatus('none');
    } catch {}
  }, []);

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    if (!friendshipId) return;
    try {
      await friendsApi.acceptRequest(friendshipId);
      setLocalFriendStatus('friends');
    } catch {}
  }, []);

  const unfriend = useCallback(async (friendshipId: string) => {
    if (!friendshipId) return;
    try {
      await friendsApi.rejectRequest(friendshipId);
      setLocalFriendStatus('none');
    } catch {}
  }, []);

  return {
    user: profile,
    isMyProfile,
    isLoading,
    isError,
    errorMessage,
    isRefreshing,
    friendStatus: isMyProfile ? undefined : localFriendStatus,
    friendshipId: isMyProfile ? undefined : localFriendshipId,
    fetchProfile,
    refreshProfile,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    unfriend,
    updateMyProfile: updateMyProfileHandler,
    updateStatus,
  };
};

export default useProfile;
