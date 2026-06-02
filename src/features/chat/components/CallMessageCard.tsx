import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icons } from '@components/common';

// ── Types ─────────────────────────────────────────────────────────────────

export type CallVariant = 'direct' | 'group';
export type CallStatus = 'active' | 'ended' | 'missed' | 'cancelled' | 'rejected';

export interface CallMessageCardProps {
  variant: CallVariant;
  callType?: 'video' | 'audio';
  status: CallStatus;
  durationSeconds?: number;
  participantCount?: number;
  endedReason?: string | null;
  isOwn?: boolean;
  onJoin?: () => void;
  onCall?: (callType: 'video' | 'audio') => void;
  joinDisabled?: boolean;
  joinLabel?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function resolveStatusText(
  variant: CallVariant,
  callType: 'video' | 'audio',
  status: CallStatus,
  durationSeconds: number,
  endedReason?: string | null,
  isOwn?: boolean,
): { text: string; isNegative: boolean; isNeutral: boolean } {
  const typeLabel =
    variant === 'group'
      ? 'Cuộc gọi nhóm'
      : callType === 'video'
        ? 'Cuộc gọi video'
        : 'Cuộc gọi thoại';

  if (status === 'active') {
    return { text: typeLabel, isNegative: false, isNeutral: false };
  }

  if (status === 'ended') {
    if (durationSeconds > 0) {
      return { text: `${typeLabel} · ${formatDuration(durationSeconds)}`, isNegative: false, isNeutral: false };
    }
    return { text: `${typeLabel} · đã kết thúc`, isNegative: false, isNeutral: true };
  }

  if (status === 'rejected') {
    return { 
      text: isOwn ? `${typeLabel} · không bắt máy` : `${typeLabel} · đã từ chối`, 
      isNegative: !isOwn, 
      isNeutral: isOwn 
    };
  }

  if (status === 'cancelled') {
    return { 
      text: isOwn ? `${typeLabel} · đã hủy` : `${typeLabel} · nhỡ`, 
      isNegative: !isOwn, 
      isNeutral: isOwn 
    };
  }

  // missed
  return { 
    text: isOwn ? `${typeLabel} · không bắt máy` : `${typeLabel} · nhỡ`, 
    isNegative: !isOwn, 
    isNeutral: isOwn 
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export const CallMessageCard: React.FC<CallMessageCardProps> = ({
  variant,
  callType = 'video',
  status,
  durationSeconds = 0,
  participantCount,
  endedReason,
  isOwn = false,
  onJoin,
  onCall,
  joinDisabled = false,
  joinLabel = 'Tham gia',
}) => {
  const isActive = status === 'active';
  const { text: statusText, isNegative, isNeutral } = resolveStatusText(
    variant,
    callType,
    status,
    durationSeconds,
    endedReason,
    isOwn,
  );

  // ── Colors ──────────────────────────────────────────────────────────────
  const cardBg = isActive ? '#EFF6FF' : '#FFFFFF';
  const cardBorder = isActive ? '#BFDBFE' : isNegative ? '#FEE2E2' : '#E5E7EB';
  const iconCircleBg = isActive ? '#DBEAFE' : isNegative ? '#FEF2F2' : isOwn && !isNeutral ? '#EFF6FF' : '#F3F4F6';
  const iconColor = isActive ? '#2563EB' : isNegative ? '#EF4444' : isOwn && !isNeutral ? '#2563EB' : '#6B7280';
  const titleColor = isActive ? '#1E40AF' : isNegative ? '#EF4444' : '#374151';
  const subtitleColor = isActive ? '#2563EB' : '#6B7280';

  let iconNode;
  if (callType === 'video') {
    iconNode = (isNegative || isNeutral) && !isActive ? Icons.videocam(20, iconColor) : Icons.videocam(20, iconColor); 
  } else {
    iconNode = (isNegative || isNeutral) && !isActive ? Icons.call(20, iconColor) : Icons.call(20, iconColor);
  }

  // ── Subtitle ────────────────────────────────────────────────────────────
  let subtitle: string | null = null;
  if (isActive) {
    subtitle = 'Đang diễn ra';
  } else if (variant === 'group' && participantCount && participantCount > 0) {
    subtitle = `${participantCount} người tham gia`;
  }

  return (
    <View style={styles.cardWrapper}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
            {iconNode}
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: titleColor }]}>{statusText}</Text>
            {subtitle && (
              <View style={styles.statusRow}>
                {isActive && <View style={styles.liveDot} />}
                <Text style={[styles.cardSubtitle, { color: subtitleColor }]}>
                  {subtitle}
                </Text>
              </View>
            )}
          </View>
        </View>
        {isActive && onJoin && (
          <TouchableOpacity
            style={[styles.joinButton, joinDisabled && styles.joinButtonDisabled]}
            activeOpacity={0.7}
            disabled={joinDisabled}
            onPress={onJoin}
          >
            <Text style={styles.joinButtonText}>{joinLabel}</Text>
          </TouchableOpacity>
        )}
        {!isActive && onCall && (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: '#F3F4F6' }]}
            activeOpacity={0.7}
            onPress={() => onCall(callType)}
          >
            <Text style={[styles.joinButtonText, { color: '#374151' }]}>Gọi lại</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardWrapper: {
    alignItems: 'center',
    marginVertical: 4,
  },
  card: {
    width: 280,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  cardSubtitle: {
    fontSize: 12,
  },
  joinButton: {
    marginTop: 12,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CallMessageCard;
