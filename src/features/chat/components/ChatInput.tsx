import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import { FilePickerButton } from './FilePickerButton';
import { VoiceRecorderButton } from './VoiceRecorderButton';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  placeholder?: string;
  /**
   * Callback khi upload file thành công
   * Nhận (url, name, size) sau khi file được upload
   */
  onUploadSuccess?: (url: string, name: string, size: number) => void;
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
}

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
}) => {
  const canSend = value.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputBar}>
        {/* Left: File picker button */}
        <View style={styles.attachBtnContainer}>
          {onUploadSuccess ? (
            <FilePickerButton
              onUploadSuccess={onUploadSuccess}
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
          multiline
          maxLength={2000}
          textAlignVertical="center"
        />

        {/* Right: Actions / Send button */}
        <View style={styles.rightActions}>
          {!canSend ? (
            <View style={styles.actionIconsRow}>
              <TouchableOpacity style={styles.actionIconBtn}>
                <Ionicons name="ellipsis-horizontal" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
              <VoiceRecorderButton
                onRecordingComplete={(audioUri) => {
                  onVoiceRecord?.(audioUri);
                }}
                iconSize={24}
              />
              <TouchableOpacity style={styles.actionIconBtn}>
                <Ionicons name="image-outline" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingTop: spacing.sm,
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
});

export default ChatInput;
