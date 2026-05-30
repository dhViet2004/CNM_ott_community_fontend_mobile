import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme';
import { socketActions } from '@api/socket';
import type { PollData, PollOption } from '@/types';

interface PollMessageBubbleProps {
  conversationId: string;
  messageId: string | number;
  question: string;
  pollData: PollData;
  currentUserId?: string | number | null;
  time: string;
  isMe: boolean;
  status?: string;
}

const PollMessageBubble: React.FC<PollMessageBubbleProps> = ({
  conversationId,
  messageId,
  question,
  pollData,
  currentUserId,
  time,
  isMe,
}) => {
  const userIdStr = String(currentUserId ?? '');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const userVotedOptionIds = useMemo(() => {
    if (!userIdStr) return [];
    return pollData.pollOptions
      .filter((opt) => (opt.voterIds || []).map(String).includes(userIdStr))
      .map((opt) => opt.id);
  }, [pollData, userIdStr]);

  const totalVotes = useMemo(
    () => pollData.pollOptions.reduce((sum, opt) => sum + (opt.voterIds?.length || 0), 0),
    [pollData]
  );

  const totalVoters = useMemo(() => {
    const voters = new Set<string>();
    pollData.pollOptions.forEach((opt) => {
      (opt.voterIds || []).forEach((id) => voters.add(String(id)));
    });
    return voters.size;
  }, [pollData]);

  const hasVoted = userVotedOptionIds.length > 0;
  const isMultipleChoice = pollData.pollSettings?.multipleChoice === true;

  useEffect(() => {
    if (!isEditing) setSelectedOptions(userVotedOptionIds);
  }, [isEditing, userVotedOptionIds.join('|')]);

  const getPercentage = (option: PollOption) => {
    if (totalVotes === 0) return 0;
    return Math.round(((option.voterIds?.length || 0) / totalVotes) * 100);
  };

  const toggleOption = (optionId: string) => {
    if (isVoting || (hasVoted && !isEditing)) return;
    setSelectedOptions((prev) => {
      if (isMultipleChoice) {
        return prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId];
      }
      return prev.includes(optionId) ? [] : [optionId];
    });
  };

  const submitVote = async () => {
    if (selectedOptions.length === 0) return;
    setIsVoting(true);
    try {
      for (const optionId of selectedOptions) {
        await new Promise<void>((resolve, reject) => {
          socketActions.votePoll(conversationId, messageId, optionId, (res) => {
            if (res?.ok === false) reject(new Error(res.error || 'vote_poll failed'));
            else resolve();
          });
        });
      }
      setIsEditing(false);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <View style={styles.outer}>
      <View style={styles.noticePill}>
        <Ionicons name="bar-chart" size={14} color="#16A34A" />
        <Text style={styles.noticeText} numberOfLines={2}>
          Tạo cuộc bình chọn mới: <Text style={styles.noticeStrong}>{question}</Text>
        </Text>
      </View>

      <View style={[styles.card, isMe && styles.cardMe]}>
        <Text style={styles.question}>{question}</Text>
        <Text style={styles.subtitle}>
          {isMultipleChoice ? 'Chọn nhiều phương án' : 'Chọn một phương án'}
        </Text>
        {totalVoters > 0 ? (
          <Text style={styles.voterCount}>{totalVoters} người bình chọn</Text>
        ) : null}

        <View style={styles.options}>
          {pollData.pollOptions.map((option) => {
            const selected = selectedOptions.includes(option.id);
            const userVoted = userVotedOptionIds.includes(option.id);
            const voteCount = option.voterIds?.length || 0;
            const percentage = getPercentage(option);

            return (
              <View key={option.id} style={styles.optionBlock}>
                <TouchableOpacity
                  activeOpacity={hasVoted && !isEditing ? 1 : 0.75}
                  onPress={() => toggleOption(option.id)}
                  style={[
                    styles.optionRow,
                    (selected || userVoted) && styles.optionRowSelected,
                  ]}
                >
                  <Text
                    style={[styles.optionText, (selected || userVoted) && styles.optionTextSelected]}
                    numberOfLines={2}
                  >
                    {option.text}
                  </Text>
                  <View style={styles.optionRight}>
                    <Text style={styles.voteCount}>{voteCount} phiếu</Text>
                    {selected || userVoted ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </View>
                </TouchableOpacity>
                {totalVotes > 0 ? (
                  <View style={styles.percentRow}>
                    <View style={styles.percentTrack}>
                      <View
                        style={[
                          styles.percentFill,
                          { width: `${percentage}%` },
                          userVoted && styles.percentFillSelected,
                        ]}
                      />
                    </View>
                    <Text style={styles.percentText}>{percentage}%</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {!hasVoted && !isEditing ? (
          <TouchableOpacity
            onPress={submitVote}
            disabled={selectedOptions.length === 0 || isVoting}
            style={[
              styles.primaryButton,
              (selectedOptions.length === 0 || isVoting) && styles.buttonDisabled,
            ]}
          >
            {isVoting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Bình chọn</Text>}
          </TouchableOpacity>
        ) : null}

        {hasVoted && !isEditing ? (
          <TouchableOpacity
            onPress={() => {
              setSelectedOptions(userVotedOptionIds);
              setIsEditing(true);
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Đổi lựa chọn</Text>
          </TouchableOpacity>
        ) : null}

        {isEditing ? (
          <View style={styles.editButtons}>
            <TouchableOpacity
              onPress={() => {
                setSelectedOptions(userVotedOptionIds);
                setIsEditing(false);
              }}
              disabled={isVoting}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submitVote}
              disabled={selectedOptions.length === 0 || isVoting}
              style={[
                styles.updateButton,
                (selectedOptions.length === 0 || isVoting) && styles.buttonDisabled,
              ]}
            >
              {isVoting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.updateButtonText}>Cập nhật</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  noticePill: {
    maxWidth: '95%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  noticeText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.secondary,
    flexShrink: 1,
  },
  noticeStrong: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  card: {
    width: '96%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
  },
  cardMe: {
    borderColor: 'rgba(0,138,243,0.22)',
  },
  question: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
    color: colors.text.secondary,
  },
  voterCount: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.primary,
    fontWeight: '700',
  },
  options: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  optionBlock: {
    gap: 6,
  },
  optionRow: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  optionRowSelected: {
    backgroundColor: '#E4F2FF',
  },
  optionText: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.primary,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voteCount: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  percentTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  percentFill: {
    height: '100%',
    backgroundColor: '#C7CDD4',
  },
  percentFillSelected: {
    backgroundColor: colors.primary,
  },
  percentText: {
    width: 34,
    textAlign: 'right',
    ...typography.caption,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  primaryButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  editButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  updateButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  time: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    ...typography.caption,
    fontSize: 10,
    color: colors.text.tertiary,
  },
});

export default PollMessageBubble;
