import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import { FilePickerButton } from './FilePickerButton';
import { VoiceRecorderButton } from './VoiceRecorderButton';
import { ImagePickerButton } from './ImagePickerButton';
import CreatePollModal from './CreatePollModal';
import type { PollData } from '@/types';

const BOT_MENTION_LABEL = 'Trợ lý AI';
const BOT_MENTION_INSERT = `@${BOT_MENTION_LABEL} `;

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  placeholder?: string;
  /**
   * Callback khi upload file thành công
   * Nhận (url, name, size) sau khi file được upload
   * @param messageData - Full message object returned from backend
   */
  onUploadSuccess?: (url: string, name: string, size: number, messageData?: any) => void;
  /**
   * Callback khi ghi âm hoàn tất
   * Nhận audioUri sau khi ghi âm xong
   */
  onVoiceRecord?: (audioUri: string) => void;
  /**
   * Conversation ID để gửi file message
   */
  conversationId?: string;
  /**
   * Sender ID (user hiện tại)
   */
  senderId?: string;
  /**
   * Receiver ID (người nhận) - cho DM
   */
  receiverId?: string;
  /**
   * Callback khi người dùng focus vào ô nhập tin nhắn
   */
  onFocus?: () => void;
  replyingMessage?: {
    id: string | number;
    content?: string | null;
    contentType?: string;
    type?: string;
    senderDisplayName?: string | null;
    senderName?: string | null;
    attachments?: Array<{ url: string; type?: string; size?: number }> | null;
    file_url?: string | null;
  } | null;
  onCancelReply?: () => void;
  onJumpToReply?: (messageId: string | number) => void;
  onCreatePoll?: (payload: { content: string; pollData: PollData }) => Promise<void>;
  onCreateReminder?: () => void;
  onCreateNote?: () => void;
  onSendLocation?: () => void;
}

const getReplyContent = (message?: ChatInputProps['replyingMessage']) => {
  if (!message) return '';
  const type = message.contentType || message.type;
  if (type === 'image' || message.file_url || message.attachments?.[0]?.url) return '[Ảnh/Tệp]';
  if (type === 'sticker') return '[Sticker]';
  if (type === 'emoji') return message.content || '[Emoji]';
  if (type === 'voice' || type === 'audio') return '[Tin nhắn thoại]';
  return message.content || '[Tin nhắn]';
};

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = 'Nhập tin nhắn...',
  onUploadSuccess,
  onVoiceRecord,
  conversationId,
  senderId,
  receiverId,
  onFocus,
  replyingMessage,
  onCancelReply,
  onJumpToReply,
  onCreatePoll,
  onCreateReminder,
  onCreateNote,
  onSendLocation,
}) => {
  const canSend = value.trim().length > 0;
  const [toolsOpen, setToolsOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const mentionMatch = value.match(/(^|\s)@([^\s@]*)$/u);
  const shouldShowBotMention = Boolean(mentionMatch);

  const handleInsertBotMention = () => {
    if (!mentionMatch) return;

    const matchText = mentionMatch[0];
    const replacementPrefix = matchText.startsWith(' ') ? ' ' : '';
    const nextValue = `${value.slice(0, value.length - matchText.length)}${replacementPrefix}${BOT_MENTION_INSERT}`;
    onChangeText(nextValue);
  };

  const handleToolPress = (label: string) => {
    if (label === 'Vị trí') {
      setToolsOpen(false);
      onSendLocation?.();
      return;
    }
    if (label === 'Bình chọn') {
      setToolsOpen(false);
      setPollModalOpen(true);
      return;
    }
    if (label === 'Nhắc hẹn') {
      setToolsOpen(false);
      onCreateReminder?.();
      return;
    }
    if (label === 'Tạo ghi chú') {
      setToolsOpen(false);
      onCreateNote?.();
      return;
    }
  };

  const toolItems = [
    { label: 'Vị trí', icon: 'location', color: '#FF7777' },
    { label: 'Tài liệu', icon: 'document-attach', color: '#3E4FE0' },
    { label: 'Nhắc hẹn', icon: 'alarm', color: '#DD3F62' },
    { label: 'Bình chọn', icon: 'bar-chart', color: '#16C879' },
    { label: 'Tạo ghi chú', icon: 'document-text', color: '#FF9800' },
    { label: 'Danh thiếp', icon: 'id-card', color: '#1497D5' },
    { label: 'My Documents', icon: 'folder', color: '#3384F0' },
    { label: 'Tin nhắn nhanh', icon: 'chatbubble', color: '#0768D8' },
    { label: 'Gửi số tài khoản', icon: 'card', color: '#8B3EF3' },
    { label: '@GIF', icon: 'image', color: '#39C877' },
    { label: 'Vẽ hình', icon: 'brush', color: '#D82BC8' },
    { label: 'Kiểu chữ', icon: 'text', color: '#D3A600' },
  ];

  return (
    <View style={styles.container}>
      {replyingMessage ? (
        <View style={styles.replyPreview}>
          <TouchableOpacity
            style={styles.replyCancelBtn}
            onPress={onCancelReply}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color="#00695C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.replyContent}
            activeOpacity={0.75}
            onPress={() => onJumpToReply?.(replyingMessage.id)}
          >
            <Text style={styles.replyLabel}>Trả lời</Text>
            <View style={styles.replyDivider} />
            <Text style={styles.replySender} numberOfLines={1}>
              {replyingMessage.senderDisplayName || replyingMessage.senderName || 'Người dùng'}:
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {getReplyContent(replyingMessage)}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {shouldShowBotMention ? (
        <View style={styles.mentionPopup}>
          <TouchableOpacity
            style={styles.mentionOption}
            activeOpacity={0.8}
            onPress={handleInsertBotMention}
          >
            <View style={styles.mentionAvatar}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.mentionMeta}>
              <Text style={styles.mentionName}>{BOT_MENTION_LABEL}</Text>
              <Text style={styles.mentionSubtext}>BotAI</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.inputBar}>
        {/* Left: File picker button */}
        <View style={styles.attachBtnContainer}>
          {onUploadSuccess ? (
            <FilePickerButton
              onUploadSuccess={(url, name, size, msgData) => onUploadSuccess(url, name, size, msgData)}
              conversationId={conversationId}
              senderId={senderId}
              receiverId={receiverId}
              iconSize={22}
            />
          ) : (
            <TouchableOpacity
              style={styles.attachBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.attachIconContainer}>
                {Icons.attach(IconSize.lg)}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Text input with background */}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.text.placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          multiline
          maxLength={2000}
          textAlignVertical="center"
        />

        {/* Right: Actions / Send button */}
        <View style={styles.rightActions}>
          {!canSend ? (
            <View style={styles.actionIconsRow}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => setToolsOpen((prev) => !prev)}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
              <VoiceRecorderButton
                onRecordingComplete={(audioUri) => {
                  onVoiceRecord?.(audioUri);
                }}
                iconSize={24}
              />
              {onUploadSuccess ? (
                <ImagePickerButton
                  onUploadSuccess={(url, name, size, msgData) => onUploadSuccess(url, name, size, msgData)}
                  conversationId={conversationId}
                  senderId={senderId}
                  receiverId={receiverId}
                  iconSize={24}
                />
              ) : (
                <TouchableOpacity style={styles.actionIconBtn}>
                  <Ionicons name="image-outline" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => {
                if (canSend) onSend(value.trim());
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.sendIconContainer}>
                {Icons.send(IconSize.lg, colors.text.inverse)}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {toolsOpen && !canSend ? (
        <View style={styles.toolsPanel}>
          {toolItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.toolItem}
              activeOpacity={0.75}
              onPress={() => handleToolPress(item.label)}
            >
              <View style={[styles.toolIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={2}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {onCreatePoll ? (
        <CreatePollModal
          visible={pollModalOpen}
          onClose={() => setPollModalOpen(false)}
          onSubmit={onCreatePoll}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingTop: spacing.sm,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#B2EBF2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mentionPopup: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mentionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  mentionMeta: {
    flex: 1,
  },
  mentionName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  mentionSubtext: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1,
  },
  replyCancelBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(178, 235, 242, 0.55)',
    marginRight: spacing.sm,
  },
  replyContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyLabel: {
    ...typography.caption,
    color: '#00695C',
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  replyDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    backgroundColor: 'rgba(0, 105, 92, 0.35)',
    marginRight: spacing.xs,
  },
  replySender: {
    ...typography.caption,
    color: '#00695C',
    fontWeight: '700',
    maxWidth: 110,
    marginRight: 3,
  },
  replyText: {
    ...typography.caption,
    color: '#00796B',
    flex: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    fontSize: 15,
    color: colors.text.primary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  actionIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  toolsPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  toolItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: 2,
  },
  toolIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  toolLabel: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 17,
    color: colors.text.primary,
    textAlign: 'center',
    minHeight: 34,
  },
});

export default ChatInput;
