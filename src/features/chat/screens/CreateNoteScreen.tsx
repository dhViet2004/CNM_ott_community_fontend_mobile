import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notesApi } from '@api/endpoints';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { addMessage } from '@store/slices/chatSlice';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'CreateNote'>;

const CreateNoteScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId } = route.params;
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [content, setContent] = useState('');
  const [pinToTop, setPinToTop] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = content.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await notesApi.createNote({
        conversationId,
        content: content.trim(),
        pinToTop,
      });

      const message = result.message;
      dispatch(addMessage({
        id: String(message.id ?? message.messageId ?? Date.now()),
        conversationId: message.conversationId || conversationId,
        senderId: String(message.senderId || currentUser?.userId || ''),
        senderName: currentUser?.display_name || currentUser?.username || 'Bạn',
        sender_name: currentUser?.display_name || currentUser?.username || 'Bạn',
        sender_avatar: currentUser?.avatar_url || null,
        type: 'note',
        content: message.content || content.trim(),
        timestamp: message.createdAt || message.created_at || new Date().toISOString(),
        createdAt: message.createdAt || message.created_at,
        status: 'sent',
      }));

      if (result.pinError) {
        Alert.alert('Thông báo', `Ghi chú đã tạo thành công, nhưng không thể ghim: ${result.pinError}`, [
          { text: 'Đồng ý', onPress: () => navigation.goBack() }
        ]);
      } else {
        navigation.goBack();
      }
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Không thể tạo ghi chú. Vui lòng thử lại.';
      Alert.alert('Lỗi', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-outline" size={38} color="#60636A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo ghi chú mới</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.doneText, !canSubmit && styles.doneTextDisabled]}>
            Xong
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Title/Content input */}
        <View style={styles.contentRow}>
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="Nhập nội dung ghi chú..."
            placeholderTextColor="#A8ADB5"
            multiline
            autoFocus
            maxLength={1000}
            textAlignVertical="top"
          />
        </View>

        {/* Pin option */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => setPinToTop(!pinToTop)}
          activeOpacity={0.75}
        >
          <Ionicons
            name={pinToTop ? 'pin' : 'pin-outline'}
            size={30}
            color={pinToTop ? '#1A8CFF' : '#73777F'}
          />
          <Text style={styles.optionText}>Ghim lên đầu trò chuyện</Text>
          <Ionicons
            name={pinToTop ? 'checkbox' : 'square-outline'}
            size={24}
            color={pinToTop ? '#1A8CFF' : '#B9BDC4'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D8DADF',
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#111111',
  },
  doneText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#1A8CFF',
  },
  doneTextDisabled: {
    color: '#9DCCF8',
  },
  form: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentRow: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1E3E7',
  },
  contentInput: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    color: '#111111',
    paddingVertical: 0,
  },
  optionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1E3E7',
  },
  optionText: {
    flex: 1,
    marginLeft: 20,
    fontSize: 18,
    color: '#2B2D33',
  },
});

export default CreateNoteScreen;
