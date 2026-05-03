import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '@store/hooks';
import { friendsApi, userApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'ContactsList'>;

const QR_GRADIENT_BG = '#4A688A';

const ContactsListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const authUser = useAppSelector((state) => state.auth.user);
  const friends = useAppSelector((state) => state.chat.friends);

  const [countryCode, setCountryCode] = useState('+84');
  const [phoneInput, setPhoneInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const userId = authUser?.id ?? '';
  const displayName = authUser?.display_name ?? authUser?.username ?? 'Người dùng';

  const handlePhoneSearch = useCallback(async () => {
    // Chuẩn hóa: bỏ tất cả ký tự không phải số (giống web: digitsOnly)
    const query = phoneInput.replace(/\D/g, '');
    if (!query || query.length < 8) {
      Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại hợp lệ.');
      return;
    }
    setIsSearching(true);
    try {
      // Gọi GET /users/ để lấy toàn bộ user, filter phía client (giống web)
      const allUsers = await userApi.searchUsers('');
      const myId = authUser?.id;
      const found = allUsers.find((u: any) => {
        if (myId && String(u.userId ?? u.id) === String(myId)) return false;
        const phone = (u.phone_number || '').replace(/\D/g, '');
        if (!phone) return false;
        // Logic khớp giống web: endsWith, includes ở cả 2 chiều
        return (
          phone.endsWith(query) ||
          query.endsWith(phone) ||
          phone.includes(query) ||
          query.includes(phone)
        );
      });
      if (!found) {
        Alert.alert('Kết quả', 'Không tìm thấy người dùng với số điện thoại này.');
        return;
      }
      const isAlreadyFriend = friends.some(
        (f) => (f.friend_id || f.userId) === (found.userId ?? found.id)
      );
      if (isAlreadyFriend) {
        Alert.alert('Thông báo', 'Người này đã là bạn của bạn.');
        return;
      }
      setSearchResults([found]);
    } catch {
      Alert.alert('Lỗi', 'Không thể tìm kiếm. Vui lòng thử lại.');
    } finally {
      setIsSearching(false);
    }
  }, [phoneInput, friends, authUser]);

  const handleSendRequest = useCallback(
    async (targetUserId: string, name: string) => {
      try {
        await friendsApi.sendRequest(targetUserId);
        Alert.alert('Thành công', `Đã gửi lời mời kết bạn đến ${name}`);
        setSearchResults((prev) => prev.filter((u) => u.userId !== targetUserId));
      } catch (err: any) {
        Alert.alert(
          'Lỗi',
          err?.response?.data?.message || 'Không thể gửi lời mời kết bạn.'
        );
      }
    },
    []
  );

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          {Icons.arrowBack(IconSize.lg, colors.text.primary)}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm bạn</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── QR Card ───────────────────────────────────────────────── */}
        <View style={styles.qrSection}>
          <View style={[styles.qrCard, { backgroundColor: QR_GRADIENT_BG }]}>
            <Text style={styles.qrUserName}>{displayName}</Text>
            <View style={styles.qrPlaceholder}>
              <View style={styles.qrBorder}>
                {Icons.qrCode(140, '#FFFFFF')}
                <View style={styles.qrDots}>
                  {[...Array(3)].map((_, i) => (
                    <View key={i} style={styles.qrDotRow}>
                      {[...Array(3)].map((__, j) => (
                        <View
                          key={j}
                          style={[
                            styles.qrDot,
                            { opacity: Math.random() > 0.5 ? 1 : 0.3 },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <Text style={styles.qrHint}>Quét mã để thêm bạn Zalo với tôi</Text>
          </View>
        </View>

        {/* ── Phone Input Section ───────────────────────────────────── */}
        <View style={styles.phoneSection}>
          <Text style={styles.phoneSectionLabel}>Thêm bạn theo số điện thoại</Text>
          <View style={styles.phoneInputRow}>
            {/* Country code selector */}
            <TouchableOpacity
              style={styles.countryCodeBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.countryCodeText}>{countryCode}</Text>
              {Icons.chevronDown(IconSize.sm, colors.text.secondary)}
            </TouchableOpacity>

            {/* Phone number input */}
            <TextInput
              style={styles.phoneInput}
              placeholder="Nhập số điện thoại"
              placeholderTextColor={colors.text.placeholder}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              autoCorrect={false}
              autoCapitalize="none"
            />

            {/* Search arrow button */}
            <TouchableOpacity
              style={[
                styles.phoneSearchBtn,
                phoneInput.length > 0 && styles.phoneSearchBtnActive,
              ]}
              onPress={handlePhoneSearch}
              activeOpacity={0.7}
              disabled={isSearching}
            >
              {Icons.arrowForward(
                IconSize.md,
                phoneInput.length > 0 ? colors.text.inverse : colors.text.tertiary
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search Results ─────────────────────────────────────────── */}
        {searchResults.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Kết quả tìm kiếm</Text>
            </View>
            {searchResults.map((user) => (
              <View key={user.userId} style={styles.resultItem}>
                <TouchableOpacity
                  style={styles.resultInfo}
                  onPress={() =>
                    navigation.navigate('UserProfile', { userId: user.userId })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultAvatarText}>
                      {(user.display_name || user.username || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.resultText}>
                    <Text style={styles.resultName}>
                      {user.display_name || user.username}
                    </Text>
                    {user.username && (
                      <Text style={styles.resultUsername}>@{user.username}</Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resultAddBtn}
                  onPress={() =>
                    handleSendRequest(
                      user.userId,
                      user.display_name || user.username || ''
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultAddBtnText}>Kết bạn</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Action List ────────────────────────────────────────────── */}
        <View style={styles.optionsSection}>
          {/* QR Scanner */}
          <TouchableOpacity
            style={styles.optionItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Thông báo', 'Tính năng quét mã QR đang được phát triển.')}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconBox, { backgroundColor: '#E8F4FD' }]}>
                {Icons.qrCodeScanner(IconSize.md, colors.primary)}
              </View>
              <Text style={styles.optionText}>Quét mã QR</Text>
            </View>
            {Icons.chevronRight(IconSize.md, colors.text.tertiary)}
          </TouchableOpacity>

          <View style={styles.optionDivider} />

          {/* People you may know */}
          <TouchableOpacity
            style={styles.optionItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Thông báo', 'Tính năng gợi ý bạn bè đang được phát triển.')}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconBox, { backgroundColor: '#FFF3E0' }]}>
                {Icons.personAdd(IconSize.md, '#E65100')}
              </View>
              <Text style={styles.optionText}>Bạn bè có thể quen</Text>
            </View>
            {Icons.chevronRight(IconSize.md, colors.text.tertiary)}
          </TouchableOpacity>
        </View>

        {/* ── Footer Hint ────────────────────────────────────────────── */}
        <View style={styles.footerHint}>
          <Text style={styles.footerHintText}>
            Xem lời mời kết bạn đã gửi tại trang Danh bạ Zalo
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: colors.background.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  backBtn: {
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

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },

  // ── QR Card ────────────────────────────────────────────────────────────────
  qrSection: {
    padding: spacing.screenPadding,
  },
  qrCard: {
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
  },
  qrUserName: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.text.inverse,
    marginBottom: spacing.lg,
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  qrBorder: {
    width: 140,
    height: 140,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrDots: {
    position: 'absolute',
    bottom: 8,
    gap: 4,
  },
  qrDotRow: {
    flexDirection: 'row',
    gap: 4,
  },
  qrDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  qrHint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },

  // ── Phone Section ──────────────────────────────────────────────────────────
  phoneSection: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  phoneSectionLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.secondary,
    gap: 4,
  },
  countryCodeText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text.primary,
  },
  phoneSearchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneSearchBtnActive: {
    backgroundColor: colors.primary,
  },

  // ── Search Results ──────────────────────────────────────────────────────────
  resultsSection: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.listItemPadding,
    backgroundColor: colors.background.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  resultInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultAvatar: {
    width: spacing.iconSize.avatar,
    height: spacing.iconSize.avatar,
    borderRadius: spacing.iconSize.avatar / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    ...typography.subtitle,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  resultText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  resultName: {
    ...typography.subtitle,
    color: colors.text.primary,
  },
  resultUsername: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  resultAddBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.md,
  },
  resultAddBtnText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '600',
  },

  // ── Options ────────────────────────────────────────────────────────────────
  optionsSection: {
    marginTop: spacing.md,
    backgroundColor: colors.background.primary,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.listItemPadding,
    backgroundColor: colors.background.primary,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionText: {
    ...typography.subtitle,
    color: colors.text.primary,
  },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginLeft: spacing.screenPadding + 36 + spacing.md,
  },

  // ── Footer Hint ────────────────────────────────────────────────────────────
  footerHint: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  footerHintText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ContactsListScreen;
