import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme';
import type { PollData, PollOption } from '@/types';

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { content: string; pollData: PollData }) => Promise<void>;
}

const MAX_QUESTION_LENGTH = 200;
const MAX_OPTION_LENGTH = 100;

const CreatePollModal: React.FC<CreatePollModalProps> = ({ visible, onClose, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filledOptions = useMemo(
    () => options.map((opt) => opt.trim()).filter(Boolean),
    [options]
  );
  const canSubmit = question.trim().length > 0 && filledOptions.length >= 2 && !isSubmitting;

  const resetAndClose = () => {
    if (isSubmitting) return;
    setQuestion('');
    setOptions(['', '']);
    setMultipleChoice(false);
    onClose();
  };

  const handleAddOption = () => {
    if (options.length < 10) setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const pollOptions: PollOption[] = filledOptions.map((text, index) => ({
        id: `poll-option-${Date.now()}-${index}`,
        text,
        voterIds: [],
      }));

      await onSubmit({
        content: question.trim(),
        pollData: {
          pollOptions,
          pollSettings: {
            multipleChoice,
            allowAddOption: false,
          },
        },
      });
      setQuestion('');
      setOptions(['', '']);
      setMultipleChoice(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={resetAndClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={resetAndClose} style={styles.headerIcon} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Tạo bình chọn</Text>
            <View style={styles.headerIcon} />
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Chủ đề bình chọn</Text>
            <View style={styles.questionBox}>
              <TextInput
                value={question}
                onChangeText={(text) => setQuestion(text.slice(0, MAX_QUESTION_LENGTH))}
                placeholder="Đặt câu hỏi bình chọn"
                placeholderTextColor={colors.text.placeholder}
                style={styles.questionInput}
                multiline
                autoFocus
                maxLength={MAX_QUESTION_LENGTH}
              />
              <Text style={styles.counter}>{question.length}/{MAX_QUESTION_LENGTH}</Text>
            </View>

            <Text style={[styles.label, styles.optionsLabel]}>Các lựa chọn</Text>
            {options.map((option, index) => (
              <View key={index} style={styles.optionRow}>
                <TextInput
                  value={option}
                  onChangeText={(text) => {
                    const next = [...options];
                    next[index] = text.slice(0, MAX_OPTION_LENGTH);
                    setOptions(next);
                  }}
                  placeholder={`Lựa chọn ${index + 1}`}
                  placeholderTextColor={colors.text.placeholder}
                  style={styles.optionInput}
                  maxLength={MAX_OPTION_LENGTH}
                />
                {options.length > 2 ? (
                  <TouchableOpacity onPress={() => handleRemoveOption(index)} style={styles.removeOption}>
                    <Ionicons name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}

            {options.length < 10 ? (
              <TouchableOpacity onPress={handleAddOption} style={styles.addOption}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.addOptionText}>Thêm lựa chọn</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Cho phép chọn nhiều đáp án</Text>
                <Text style={styles.settingHint}>Người tham gia có thể chọn nhiều lựa chọn.</Text>
              </View>
              <Switch value={multipleChoice} onValueChange={setMultipleChoice} />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={resetAndClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            >
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Tạo bình chọn</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  label: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  questionBox: {
    minHeight: 104,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: 14,
    padding: spacing.md,
    backgroundColor: '#FAFAFA',
  },
  questionInput: {
    minHeight: 66,
    ...typography.body,
    fontSize: 15,
    color: colors.text.primary,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    ...typography.caption,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  optionsLabel: {
    marginTop: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  optionInput: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: 13,
    paddingHorizontal: spacing.md,
    ...typography.body,
    fontSize: 15,
    color: colors.text.primary,
    backgroundColor: '#FAFAFA',
  },
  removeOption: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  addOption: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  addOptionText: {
    marginLeft: 4,
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  settingRow: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  settingTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  settingHint: {
    ...typography.caption,
    marginTop: 2,
    color: colors.text.secondary,
    maxWidth: 230,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cancelText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 1.4,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitText: {
    ...typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CreatePollModal;
