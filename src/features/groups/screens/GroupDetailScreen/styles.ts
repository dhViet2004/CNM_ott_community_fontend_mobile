import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme';

const ZALO_BLUE = '#008AF3';

export const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: ZALO_BLUE,
  },

  // Header
  header: {
    backgroundColor: ZALO_BLUE,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  moreBtn: {
    padding: spacing.xs,
  },

  container: { flex: 1, backgroundColor: colors.background.secondary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary },

  // Profile Section
  profileCard: {
    backgroundColor: colors.background.primary,
    marginBottom: spacing.sm,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  avatarCameraBtn: {
    position: 'absolute',
    right: '38%',
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  groupTitle: {
    ...typography.h1,
    color: colors.text.primary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 74,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F1F1',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    ...typography.bodySmall,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  descriptionRow: {
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  descriptionMuted: {
    ...typography.h3,
    color: colors.text.tertiary,
    fontSize: 20,
  },

  // Section Card
  sectionCard: {
    backgroundColor: colors.background.primary,
    marginBottom: spacing.sm,
  },
  rowItem: {
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontSize: 20,
  },
  rowMutedText: {
    ...typography.h3,
    color: colors.text.tertiary,
    fontSize: 20,
  },
  rowSubTitle: {
    ...typography.body,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  badge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.status.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
  },

  // Media Section
  mediaRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  mediaThumb: {
    width: 92,
    height: 92,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  mediaThumbText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  mediaArrow: {
    width: 92,
    height: 92,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#EDF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },

  // Switch Row
  switchRow: {
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  // Leave/Danger
  leaveText: {
    ...typography.h3,
    color: colors.status.error,
    fontSize: 20,
  },

  // Start Chat Button
  startChatBtn: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  startChatBtnText: {
    ...typography.button,
    color: colors.text.inverse,
  },
});
