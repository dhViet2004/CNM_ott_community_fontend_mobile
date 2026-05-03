import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import { FilePickerButton } from './FilePickerButton';

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
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = 'Nhập tin nhắn...',
  onUploadSuccess,
  conversationId,
  senderId,
  receiverId,
  onFocus,
}) => {
  const insets = useSafeAreaInsets();
  const canSend = value.trim().length > 0;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
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
          onFocus={onFocus}
          multiline
          maxLength={2000}
          textAlignVertical="center"
        />

        {/* Right: Send button */}
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={() => {
            if (canSend) onSend(value.trim());
          }}
          disabled={!canSend}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.sendIconContainer}>
            {Icons.send(
              IconSize.lg,
              canSend ? colors.text.inverse : colors.text.tertiary
            )}
          </View>
        </TouchableOpacity>
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
    marginLeft: spacing.sm,
  },
  sendBtnDisabled: {
    backgroundColor: colors.background.tertiary,
  },
  sendIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatInput;
