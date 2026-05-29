import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendsApi, type QRInfoResponse } from '@api/endpoints';
import { Icons, IconSize } from '@components/common';
import { useAppSelector } from '@store/hooks';
import { colors, spacing, typography } from '@theme';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'QRCodeFriend'>;
type Tab = 'my-qr' | 'scan-qr';

interface ScannedUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  qrData: string;
}

const parseFriendQR = (value: string): string | null => {
  const [type, version, userId] = value.split('|');
  if (type !== 'OTT_FR' || version !== '1' || !userId) return null;
  return userId;
};

const getInitial = (name?: string) => name?.trim()?.charAt(0)?.toUpperCase() || '?';

const QRCodeFriendScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const authUser = useAppSelector((state) => state.auth.user);
  const friends = useAppSelector((state) => state.chat.friends);

  const currentUserId = useMemo(
    () => String(authUser?.userId ?? authUser?.id ?? ''),
    [authUser]
  );

  const [tab, setTab] = useState<Tab>('my-qr');
  const [qrInfo, setQrInfo] = useState<QRInfoResponse | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [alreadyFriend, setAlreadyFriend] = useState(false);
  const [selfScan, setSelfScan] = useState(false);
  const [scanEnabled, setScanEnabled] = useState(true);

  const loadMyQR = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingQR(true);
    try {
      const info = await friendsApi.getQRInfo(currentUserId);
      setQrInfo(info);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không tải được mã QR.');
    } finally {
      setLoadingQR(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (tab === 'my-qr') {
      loadMyQR();
    }
  }, [tab, loadMyQR]);

  useEffect(() => {
    if (tab === 'scan-qr' && !permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission, tab]);

  const resetScanResult = useCallback(() => {
    setScannedUser(null);
    setSending(false);
    setSent(false);
    setAlreadyFriend(false);
    setSelfScan(false);
    setScanEnabled(true);
  }, []);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (!scanEnabled || scannedUser) return;

      const rawCode = result.data;
      if (!rawCode || rawCode === qrInfo?.qrData) return;

      const userId = parseFriendQR(rawCode);
      if (!userId) return;

      setScanEnabled(false);
      setSelfScan(userId === currentUserId);
      setAlreadyFriend(
        friends.some((f) => String(f.friend_id || f.userId) === String(userId))
      );

      try {
        const info = await friendsApi.getQRInfo(userId);
        setScannedUser({
          userId: info.userId,
          displayName: info.displayName,
          avatarUrl: info.avatarUrl,
          qrData: rawCode,
        });
      } catch {
        setScannedUser({
          userId,
          displayName: 'Người dùng OTT',
          avatarUrl: null,
          qrData: rawCode,
        });
      }
    },
    [currentUserId, friends, qrInfo?.qrData, scanEnabled, scannedUser]
  );

  const handleSendRequest = useCallback(async () => {
    if (!scannedUser?.qrData || sending || sent || selfScan || alreadyFriend) return;

    setSending(true);
    try {
      const result = await friendsApi.sendRequestByQR(scannedUser.qrData);
      const receiver = result.data?.receiver;
      if (receiver) {
        setScannedUser((prev) =>
          prev
            ? {
                ...prev,
                displayName:
                  receiver.displayName ||
                  receiver.display_name ||
                  receiver.username ||
                  prev.displayName,
                avatarUrl: receiver.avatarUrl ?? receiver.avatar_url ?? prev.avatarUrl,
              }
            : prev
        );
      }
      setSent(true);
      Alert.alert('Thành công', result.message || 'Đã gửi lời mời kết bạn.');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Không thể gửi lời mời kết bạn.';
      if (message.toLowerCase().includes('bạn bè') || message.toLowerCase().includes('friend')) {
        setAlreadyFriend(true);
      } else {
        Alert.alert('Lỗi', message);
        resetScanResult();
      }
    } finally {
      setSending(false);
    }
  }, [alreadyFriend, resetScanResult, scannedUser?.qrData, selfScan, sending, sent]);

  const renderMyQR = () => (
    <View style={styles.content}>
      {loadingQR ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.mutedText}>Đang tải mã QR...</Text>
        </View>
      ) : qrInfo ? (
        <View style={styles.qrCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitial(qrInfo.displayName)}</Text>
          </View>
          <Text style={styles.displayName}>{qrInfo.displayName}</Text>
          <Text style={styles.userId}>#{qrInfo.userId}</Text>
          <View style={styles.qrBox}>
            <QRCode value={qrInfo.qrData} size={220} quietZone={8} />
          </View>
          <Text style={styles.helperText}>Đưa mã này cho bạn bè quét để gửi lời mời kết bạn.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              resetScanResult();
              setTab('scan-qr');
            }}
            activeOpacity={0.75}
          >
            {Icons.qrCodeScanner(IconSize.md, colors.text.inverse)}
            <Text style={styles.primaryButtonText}>Quét mã QR của bạn bè</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centerBlock}>
          <Text style={styles.mutedText}>Không thể tải mã QR.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={loadMyQR}>
            <Text style={styles.secondaryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderScanResult = () => {
    if (!scannedUser) return null;

    let title = 'Tìm thấy người dùng';
    let subtitle = `Gửi lời mời kết bạn đến ${scannedUser.displayName}?`;
    if (selfScan) {
      title = 'Đây là mã QR của bạn';
      subtitle = 'Không thể kết bạn với chính mình.';
    } else if (alreadyFriend) {
      title = 'Đã là bạn bè';
      subtitle = 'Hai bạn đã kết nối với nhau.';
    } else if (sent) {
      title = 'Đã gửi lời mời kết bạn';
      subtitle = `Chờ ${scannedUser.displayName} chấp nhận.`;
    }

    return (
      <View style={styles.resultCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(scannedUser.displayName)}</Text>
        </View>
        <Text style={styles.displayName}>{scannedUser.displayName}</Text>
        <Text style={styles.resultTitle}>{title}</Text>
        <Text style={styles.helperText}>{subtitle}</Text>
        {!selfScan && !alreadyFriend && !sent && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSendRequest}
            disabled={sending}
            activeOpacity={0.75}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              Icons.userPlus(IconSize.md, colors.text.inverse)
            )}
            <Text style={styles.primaryButtonText}>
              {sending ? 'Đang gửi...' : 'Gửi lời mời kết bạn'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={resetScanResult}>
          <Text style={styles.secondaryButtonText}>Quét mã khác</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderScanner = () => (
    <View style={styles.content}>
      {!permission ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !permission.granted ? (
        <View style={styles.centerBlock}>
          <Text style={styles.mutedText}>Ứng dụng cần quyền camera để quét mã QR.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Cấp quyền camera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.cameraBox}>
            {scanEnabled && (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
            )}
            <View style={styles.scanFrame} pointerEvents="none" />
          </View>
          <Text style={styles.helperText}>Đưa mã QR vào khung hình để quét.</Text>
          {renderScanResult()}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          {Icons.arrowBack(IconSize.lg, colors.text.primary)}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kết bạn qua QR</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'my-qr' && styles.tabActive]}
          onPress={() => setTab('my-qr')}
          activeOpacity={0.75}
        >
          {Icons.qrCode(IconSize.md, tab === 'my-qr' ? colors.primary : colors.text.secondary)}
          <Text style={[styles.tabText, tab === 'my-qr' && styles.tabTextActive]}>Mã của tôi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'scan-qr' && styles.tabActive]}
          onPress={() => {
            resetScanResult();
            setTab('scan-qr');
          }}
          activeOpacity={0.75}
        >
          {Icons.qrCodeScanner(IconSize.md, tab === 'scan-qr' ? colors.primary : colors.text.secondary)}
          <Text style={[styles.tabText, tab === 'scan-qr' && styles.tabTextActive]}>Quét QR</Text>
        </TouchableOpacity>
      </View>

      {tab === 'my-qr' ? renderMyQR() : renderScanner()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    backgroundColor: colors.background.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    margin: spacing.screenPadding,
    padding: 4,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.background.primary,
  },
  tab: {
    flex: 1,
    height: 42,
    borderRadius: spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: `${colors.primary}14`,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  qrCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.background.primary,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.sm,
  },
  avatarText: {
    ...typography.h2,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  displayName: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  userId: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  qrBox: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  mutedText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: spacing.lg,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  cameraBox: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 230,
    height: 230,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  resultCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
  },
  resultTitle: {
    ...typography.subtitle,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});

export default QRCodeFriendScreen;
