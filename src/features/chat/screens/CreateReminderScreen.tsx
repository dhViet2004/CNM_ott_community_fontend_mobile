import React, { useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { reminderApi } from '@api/endpoints';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { addMessage } from '@store/slices/chatSlice';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'CreateReminder'>;
type RepeatValue = 'none' | 'daily' | 'weekly' | 'monthly';

const repeatLabels: Record<RepeatValue, string> = {
  none: 'Chọn kiểu lặp lại (Vd: Hằng tuần)',
  daily: 'Lặp lại hằng ngày',
  weekly: 'Lặp lại hằng tuần',
  monthly: 'Lặp lại hằng tháng',
};

const pad = (value: number) => String(value).padStart(2, '0');

const formatReminderTime = (date: Date) => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (sameDay) return `Hôm nay lúc ${time}`;
  if (isTomorrow) return `Ngày mai lúc ${time}`;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} lúc ${time}`;
};

const addMinutes = (minutes: number) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  date.setSeconds(0, 0);
  return date;
};

const CreateReminderScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId } = route.params;
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState<Date>(() => addMinutes(60));
  const [repeat, setRepeat] = useState<RepeatValue>('none');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && !submitting;
  const timeLabel = useMemo(() => formatReminderTime(remindAt), [remindAt]);

  const openTimePicker = () => {
    Keyboard.dismiss();
    Alert.alert('Chọn thời gian', undefined, [
      { text: '15 phút nữa', onPress: () => setRemindAt(addMinutes(15)) },
      { text: '30 phút nữa', onPress: () => setRemindAt(addMinutes(30)) },
      {
        text: '9:00 ngày mai',
        onPress: () => {
          const date = new Date();
          date.setDate(date.getDate() + 1);
          date.setHours(9, 0, 0, 0);
          setRemindAt(date);
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const openRepeatPicker = () => {
    Keyboard.dismiss();
    Alert.alert('Chọn kiểu lặp lại', undefined, [
      { text: 'Không lặp lại', onPress: () => setRepeat('none') },
      { text: 'Hằng ngày', onPress: () => setRepeat('daily') },
      { text: 'Hằng tuần', onPress: () => setRepeat('weekly') },
      { text: 'Hằng tháng', onPress: () => setRepeat('monthly') },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await reminderApi.createReminder({
        conversationId,
        content: title.trim(),
        remindAt: remindAt.toISOString(),
        repeat,
      });

      const message = result.message;
      dispatch(addMessage({
        id: String(message.id ?? message.messageId ?? Date.now()),
        conversationId: message.conversationId || conversationId,
        senderId: String(message.senderId || currentUser?.userId || ''),
        senderName: currentUser?.display_name || currentUser?.username || 'Bạn',
        sender_name: currentUser?.display_name || currentUser?.username || 'Bạn',
        sender_avatar: currentUser?.avatar_url || null,
        type: 'reminder',
        content: message.content || `[Nhắc hẹn]\n${title.trim()}`,
        timestamp: message.createdAt || message.created_at || new Date().toISOString(),
        createdAt: message.createdAt || message.created_at,
        status: 'sent',
      }));

      navigation.goBack();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Không thể tạo nhắc hẹn. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-outline" size={38} color="#60636A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo nhắc hẹn mới</Text>
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

      <View style={styles.form}>
        <View style={styles.titleRow}>
          <Pressable style={styles.alarmPicker} onPress={Keyboard.dismiss}>
            <Text style={styles.alarmEmoji}>⏰</Text>
            <Ionicons name="caret-down" size={16} color="#777A80" />
          </Pressable>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Nhập tiêu đề nhắc hẹn..."
            placeholderTextColor="#A8ADB5"
            autoFocus
            maxLength={120}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        <TouchableOpacity style={styles.optionRow} onPress={openTimePicker} activeOpacity={0.75}>
          <Ionicons name="time-outline" size={30} color="#73777F" />
          <Text style={styles.optionText}>{timeLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow} onPress={openRepeatPicker} activeOpacity={0.75}>
          <Ionicons name="repeat-outline" size={30} color={repeat === 'none' ? '#B9BDC4' : '#73777F'} />
          <Text style={[styles.optionText, repeat === 'none' && styles.optionPlaceholder]}>
            {repeatLabels[repeat]}
          </Text>
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
  titleRow: {
    minHeight: 102,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1E3E7',
  },
  alarmPicker: {
    width: 88,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmEmoji: {
    fontSize: 30,
    marginRight: 8,
    ...Platform.select({
      android: { lineHeight: 36 },
    }),
  },
  titleInput: {
    flex: 1,
    fontSize: 27,
    lineHeight: 34,
    color: '#111111',
    paddingVertical: 0,
  },
  optionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1E3E7',
  },
  optionText: {
    flex: 1,
    marginLeft: 28,
    fontSize: 21,
    lineHeight: 28,
    color: '#2B2D33',
  },
  optionPlaceholder: {
    color: '#9298A1',
  },
});

export default CreateReminderScreen;
