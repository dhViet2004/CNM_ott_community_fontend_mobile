import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons, IconSize } from '@components/common';
import { colors, spacing, typography } from '@theme';
import type { RootStackScreenProps } from '@navigation/types';
import { fetchGroupById, fetchGroupInvite, type InviteInfo } from '../api';

type Props = RootStackScreenProps<'GroupInviteLink'>;

const ZALO_BLUE = '#008AF3';

const getClipboard = () => {
  try {
    return require('react-native').Clipboard;
  } catch {
    return null;
  }
};

const displayLink = (link?: string) => {
  if (!link) return '';
  return link.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

const GroupInviteLinkScreen: React.FC<Props> = ({ route, navigation }) => {
  const groupId = route.params.groupId;
  const insets = useSafeAreaInsets();
  const qrRef = useRef<any>(null);

  const [groupName, setGroupName] = useState('');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [group, invite] = await Promise.all([
        fetchGroupById(groupId),
        fetchGroupInvite(groupId),
      ]);
      setGroupName(group.name || 'Nhóm');
      setInviteInfo(invite);
    } catch (err: any) {
      Alert.alert(
        'Lỗi',
        err?.response?.data?.message || err?.message || 'Không thể tải link nhóm'
      );
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyLink = useCallback(async () => {
    const link = inviteInfo?.inviteLink;
    if (!link) return;

    const clipboard = getClipboard();
    if (clipboard?.setString) {
      clipboard.setString(link);
      Alert.alert('Đã sao chép', 'Link nhóm đã được sao chép.');
      return;
    }

    await Share.share({ message: link });
  }, [inviteInfo?.inviteLink]);

  const handleShareLink = useCallback(async () => {
    const link = inviteInfo?.inviteLink;
    if (!link) return;
    await Share.share({
      message: `Tham gia nhóm "${groupName || 'Nhóm'}" bằng link: ${link}`,
    });
  }, [groupName, inviteInfo?.inviteLink]);

  const handleSaveQR = useCallback(() => {
    if (!qrRef.current?.toDataURL) {
      Alert.alert('Thông báo', 'Không thể tạo ảnh QR trên thiết bị này.');
      return;
    }

    qrRef.current.toDataURL(async (data: string) => {
      try {
        await Share.share({
          title: `QR ${groupName || 'nhóm'}`,
          url: `data:image/png;base64,${data}`,
          message: inviteInfo?.inviteLink,
        } as any);
      } catch {
        Alert.alert('Thông báo', 'Không thể mở trình lưu/chia sẻ mã QR.');
      }
    });
  }, [groupName, inviteInfo?.inviteLink]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ZALO_BLUE} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {Icons.back(IconSize.xl, colors.text.inverse)}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Link nhóm</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.avatar}>
            {Icons.people(44)}
          </View>

          <Text style={styles.groupName} numberOfLines={2}>
            {groupName || 'Nhóm'}
          </Text>
          <Text style={styles.description}>
            Mời mọi người tham gia nhóm bằng mã QR hoặc link dưới đây:
          </Text>

          <View style={styles.qrWrap}>
            {inviteInfo?.inviteLink ? (
              <>
                <QRCode
                  value={inviteInfo.inviteLink}
                  size={236}
                  quietZone={8}
                  ecl="H"
                  getRef={(ref) => {
                    qrRef.current = ref;
                  }}
                />
                <View style={styles.qrLogo}>
                  <Text style={styles.qrLogoText}>OTT</Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>Chưa có link nhóm</Text>
            )}
          </View>

          {!!inviteInfo?.inviteLink && (
            <View style={styles.linkPill}>
              <Text style={styles.linkText} numberOfLines={1}>
                {displayLink(inviteInfo.inviteLink)}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionItem} onPress={handleCopyLink}>
              <View style={styles.actionIcon}>
                {Icons.copy(IconSize.xl)}
              </View>
              <Text style={styles.actionLabel}>Sao chép link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleShareLink}>
              <View style={styles.actionIcon}>
                {Icons.shareOutline(IconSize.xl)}
              </View>
              <Text style={styles.actionLabel}>Chia sẻ link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleSaveQR}>
              <View style={styles.actionIcon}>
                {Icons.download(IconSize.xl)}
              </View>
              <Text style={styles.actionLabel}>Lưu mã QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: ZALO_BLUE,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...typography.h2,
    color: colors.text.inverse,
    fontSize: 26,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECECF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  groupName: {
    ...typography.h1,
    color: '#000000',
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: '#7A7A7A',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 25,
    marginBottom: spacing.lg,
  },
  qrWrap: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  qrLogo: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogoText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  linkPill: {
    maxWidth: '90%',
    borderRadius: 10,
    backgroundColor: '#F1F7FF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  linkText: {
    ...typography.h3,
    color: '#0B7FE8',
    fontSize: 19,
    fontWeight: '800',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  actionItem: {
    width: '31%',
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    ...typography.body,
    color: '#000000',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
});

export default GroupInviteLinkScreen;
