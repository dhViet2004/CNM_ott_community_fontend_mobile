import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { CoverHeader, UserInfo, ProfileMenu, ProfileMedia, FriendSection, PersonalInfo } from '../components';
import { useProfile } from '../hooks';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { uploadApi } from '@api/endpoints';
import type { MainTabScreenProps } from '@navigation/types';

type Props = MainTabScreenProps<'ProfileTab'>;

const COVER_HEIGHT = 200;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const {
    user,
    isMyProfile,
    isLoading,
    isRefreshing,
    friendStatus,
    friendshipId,
    refreshProfile,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    unfriend,
    updateMyProfile,
    updateStatus,
    realFriends,
  } = useProfile();

  const { logout } = useAuth();

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleLogout = () => {
    logout();
  };

  const handleSendMessage = () => {
    if (user) {
      navigation.navigate('Chat', {
        conversationId: user.id,
        title: user.fullName,
      });
    }
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleChangeCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri, 'cover');
    }
  };

  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri, 'avatar');
    }
  };

  const uploadImage = async (uri: string, type: 'avatar' | 'cover') => {
    try {
      const fileName = uri.split('/').pop() || `${type}.jpg`;
      const fileType = 'image/jpeg';
      
      const uploadRes = await uploadApi.uploadDirect(
        { uri, name: fileName, type: fileType },
        type === 'avatar' ? 'avatars' : 'covers'
      );
      
      const s3Url = uploadRes.url;
      if (type === 'avatar') {
        await updateMyProfile({ avatarUrl: s3Url });
      } else {
        await updateMyProfile({ coverUrl: s3Url });
      }
      Alert.alert('Thành công', 'Đã cập nhật ảnh');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải ảnh lên');
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, COVER_HEIGHT * 0.5, COVER_HEIGHT],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });



  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={styles.headerTitle}>Cá nhân</Text>
        </View>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />

      {/* Scroll content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: undefined }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshProfile}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Cover + Avatar (parallax) */}
        <CoverHeader
          user={user}
          isMyProfile={isMyProfile}
          scrollY={scrollY}
          onChangeCoverPress={handleChangeCover}
          onChangeAvatarPress={handleChangeAvatar}
        />

        {/* User Info */}
        <UserInfo
          user={user}
          isMyProfile={isMyProfile}
          friendStatus={friendStatus}
          friendshipId={friendshipId}
          onSendMessage={handleSendMessage}
          onSendFriendRequest={sendFriendRequest}
          onCancelRequest={cancelFriendRequest}
          onAcceptRequest={acceptFriendRequest}
          onUnfriend={unfriend}
          onEditProfile={handleEditProfile}
          onUpdateStatus={updateStatus}
        />

        {/* Personal Info Section */}
        <PersonalInfo 
          username={user.username || ''} 
          gender={user.gender} 
          birthday={user.birthday}
          phone={user.phoneNumber}
        />

        {/* Media Section */}
        <ProfileMedia 
          photos={[user.coverUrl, user.avatarUrl].filter(Boolean) as string[]} 
          totalPhotos={[user.coverUrl, user.avatarUrl].filter(Boolean).length} 
          onSeeAll={() => {
            navigation.navigate('MediaGallery', {
              conversationId: user.id,
              title: user.fullName,
              initialTab: 'Ảnh',
            });
          }}
        />

        {/* Friend Section */}
        <FriendSection 
          friends={realFriends} 
          totalFriends={realFriends.length || user.totalFriends} 
          onSeeAll={() => navigation.navigate('Friends')} 
        />

        {/* Profile Menu */}
        <ProfileMenu
          isMyProfile={isMyProfile}
          onChangeCover={handleChangeCover}
          onChangeAvatar={handleChangeAvatar}
          onQRCode={() => {}}
          onCloud={() => {}}
          onPrivacySettings={() => {}}
          onSecurity={handleSettings}
          onSettings={handleSettings}
          onTimeline={() => {}}
          onPhotos={() => {}}
          onLogout={handleLogout}
        />
      </Animated.ScrollView>

      {/* Header khi scroll */}
      <Animated.View
        style={[
          styles.stickyHeader,
          { paddingTop: insets.top, opacity: headerOpacity },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.stickyHeaderBg}>
          <Animated.Text
            style={[
              styles.stickyHeaderTitle,
            ]}
          >
            Cá nhân
          </Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  scrollView: {
    flex: 1,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  stickyHeaderBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: colors.primary,
    width: '100%',
    paddingHorizontal: spacing.screenPadding,
  },
  stickyHeaderTitle: {
    ...typography.h3,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    height: 56,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.inverse,
    fontWeight: '700',
  },
});

export default ProfileScreen;
