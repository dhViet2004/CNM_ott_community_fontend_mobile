import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { CoverHeader, UserInfo, ProfileMenu } from '../components';
import { useProfile } from '../hooks';
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
    updateStatus,
  } = useProfile({ autoLoad: false });

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
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

  const handleChangeCover = () => {
    // TODO: Open image picker for cover
  };

  const handleChangeAvatar = () => {
    // TODO: Open image picker for avatar
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, COVER_HEIGHT * 0.5, COVER_HEIGHT],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const initialHeaderOpacity = scrollY.interpolate({
    inputRange: [0, COVER_HEIGHT * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerTitleScale = scrollY.interpolate({
    inputRange: [0, COVER_HEIGHT],
    outputRange: [0.7, 1],
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
              { transform: [{ scale: headerTitleScale }] },
            ]}
          >
            {user.fullName}
          </Animated.Text>
        </View>
      </Animated.View>

      {/* Header ban đầu */}
      <Animated.View
        style={[
          styles.initialHeader,
          { paddingTop: insets.top, opacity: initialHeaderOpacity },
        ]}
      >
        <View style={styles.initialHeaderBg}>
          <Text style={styles.initialHeaderTitle}>Cá nhân</Text>
        </View>
      </Animated.View>

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

        {/* Profile Menu */}
        <ProfileMenu
          isMyProfile={isMyProfile}
          onChangeCover={handleChangeCover}
          onChangeAvatar={handleChangeAvatar}
          onQRCode={() => {}}
          onCloud={() => {}}
          onPrivacySettings={() => {}}
          onSecurity={() => {}}
          onSettings={handleSettings}
          onTimeline={() => {}}
          onPhotos={() => {}}
        />
      </Animated.ScrollView>
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
  initialHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  initialHeaderBg: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
  },
  initialHeaderTitle: {
    ...typography.h2,
    color: colors.text.inverse,
    fontWeight: '700',
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
