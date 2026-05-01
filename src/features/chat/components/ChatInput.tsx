import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = 'Nhập tin nhắn...',
}) => {
  const hasText = value.trim().length > 0;

  const handleSend = () => {
    if (hasText) {
      onSend(value.trim());
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.attachBtn}>
        <View style={styles.attachIconContainer}>
          {Icons.attach(IconSize.lg)}
        </View>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.text.placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline
      />
      <TouchableOpacity
        style={[styles.sendBtn, !hasText && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!hasText}
      >
        <View style={styles.sendIconContainer}>
          {Icons.send(
            IconSize.lg,
            hasText ? colors.text.inverse : colors.text.tertiary
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
  },
  attachBtn: {
    width: 36,
    height: 36,
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
