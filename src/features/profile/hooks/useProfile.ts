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
  fetchProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendFriendRequest: () => Promise<void>;
  cancelFriendRequest: () => Promise<void>;
  acceptFriendRequest: () => Promise<void>;
  unfriend: () => Promise<void>;
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
        const isPendingSent = pending.some((p) => p.userId === userId);
        setLocalFriendStatus(isPendingSent ? 'pending_sent' : 'none');
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
      await friendsApi.sendRequest(userId);
      setLocalFriendStatus('pending_sent');
    } catch {}
  }, [userId]);

  const cancelFriendRequest = useCallback(async () => {
    setLocalFriendStatus('none');
  }, []);

  const acceptFriendRequest = useCallback(async () => {
    if (!userId) return;
    try {
      await friendsApi.acceptRequest(userId);
      setLocalFriendStatus('friends');
    } catch {}
  }, [userId]);

  const unfriend = useCallback(async () => {
    if (!userId) return;
    try {
      await friendsApi.rejectRequest(userId);
      setLocalFriendStatus('none');
    } catch {}
  }, [userId]);

  return {
    user: profile,
    isMyProfile,
    isLoading,
    isError,
    errorMessage,
    isRefreshing,
    friendStatus: isMyProfile ? undefined : localFriendStatus,
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
