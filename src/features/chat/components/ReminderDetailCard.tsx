import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@components/common/Avatar';

const padDatePart = (value: number) => String(value).padStart(2, '0');

const parseReminderContent = (content: string) => {
  const lines = String(content || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const title =
    lines.find(
      (line) =>
        !line.startsWith('[') &&
        !line.startsWith('Thời gian:') &&
        !line.startsWith('Thá»i gian:') &&
        !line.startsWith('Lặp lại:') &&
        !line.startsWith('Láº·p láº¡i:')
    ) || 'Nhắc hẹn';
  const timeLine = lines.find(
    (line) => line.startsWith('Thời gian:') || line.startsWith('Thá»i gian:')
  );
  const repeatLine = lines.find(
    (line) => line.startsWith('Lặp lại:') || line.startsWith('Láº·p láº¡i:')
  );
  const timeText = timeLine?.replace('Thời gian:', '').replace('Thá»i gian:', '').trim();
  const repeatText =
    repeatLine?.replace('Lặp lại:', '').replace('Láº·p láº¡i:', '').trim() || 'Nhắc 1 lần';
  const match = timeText?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  const date = match
    ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]))
    : new Date();

  return { title, date, repeatText };
};

const formatReminderCardTime = (date: Date) => {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
  if (sameDay) return `Hôm nay lúc ${time}`;
  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)} lúc ${time}`;
};

const formatReminderCreatedLabel = () => {
  const now = new Date();
  return `${padDatePart(now.getHours())}:${padDatePart(now.getMinutes())} Hôm nay`;
};

interface ReminderDetailCardProps {
  content: string;
  isMe: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  onLongPress?: () => void;
}

const ReminderDetailCard: React.FC<ReminderDetailCardProps> = ({
  content,
  isMe,
  senderName,
  senderAvatar,
  onLongPress,
}) => {
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const reminder = parseReminderContent(content);
  const actor = isMe ? 'Bạn' : senderName || 'Người dùng';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        delayLongPress={500}
        onLongPress={onLongPress}
        onPress={() => setIsDetailVisible(true)}
      >
        <View style={styles.header}>
          <Avatar uri={senderAvatar ?? undefined} name={actor} size="xs" />
          <Text style={styles.headerText} numberOfLines={1}>
            {actor} đã tạo một nhắc hẹn
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.body}>
          <View style={styles.dateBlock}>
            <Text style={styles.month}>THG {reminder.date.getMonth() + 1}</Text>
            <Text style={styles.day}>{reminder.date.getDate()}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {reminder.title}
            </Text>
            <Text style={styles.time} numberOfLines={1}>
              {formatReminderCardTime(reminder.date)}
            </Text>
          </View>
        </View>
        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>Xem chi tiết</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isDetailVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDetailVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsDetailVisible(false)}>
          <Pressable style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết nhắc hẹn</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsDetailVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-outline" size={32} color="#14213D" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailBody}>
              <View style={styles.detailDateCard}>
                <View style={styles.detailDateHeader}>
                  <Text style={styles.weekday}>
                    {reminder.date.toLocaleDateString('vi-VN', { weekday: 'long' }).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailDateContent}>
                  <Text style={styles.detailDay}>{reminder.date.getDate()}</Text>
                  <Text style={styles.detailMonth}>THÁNG {reminder.date.getMonth() + 1}</Text>
                </View>
              </View>

              <View style={styles.detailInfo}>
                <Text style={styles.detailName} numberOfLines={1}>
                  {reminder.title}
                </Text>
                <Text style={styles.creator} numberOfLines={1}>
                  Tạo bởi {actor} - {formatReminderCreatedLabel()}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={16} color="#4D5A6D" />
                  <Text style={styles.metaText}>{formatReminderCardTime(reminder.date)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="repeat-outline" size={16} color="#4D5A6D" />
                  <Text style={styles.metaText}>{reminder.repeatText}</Text>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.settingsButton} activeOpacity={0.75}>
                <Ionicons name="options-outline" size={22} color="#26374F" />
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.closeAction}
                  activeOpacity={0.75}
                  onPress={() => setIsDetailVisible(false)}
                >
                  <Text style={styles.closeActionText}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editAction} activeOpacity={0.75}>
                  <Text style={styles.editActionText}>Chỉnh sửa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  card: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E8EF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateBlock: {
    width: 54,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  month: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '800',
  },
  day: {
    marginTop: 2,
    fontSize: 24,
    lineHeight: 28,
    color: '#111827',
    fontWeight: '800',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  time: {
    marginTop: 5,
    fontSize: 13,
    color: '#4B5563',
  },
  viewButton: {
    height: 36,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1A8CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A8CFF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modal: {
    width: '100%',
    maxWidth: 442,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D7DAE0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2A44',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: '#E9EAEE',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  detailDateCard: {
    width: 86,
    height: 108,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  detailDateHeader: {
    height: 32,
    backgroundColor: '#1668F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  weekday: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailDateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDay: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    color: '#14213D',
  },
  detailMonth: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '800',
    color: '#26374F',
  },
  detailInfo: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  creator: {
    marginTop: 12,
    fontSize: 12,
    color: '#667085',
  },
  metaRow: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#26374F',
  },
  footer: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#EEF1F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  closeAction: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 4,
    backgroundColor: '#E1E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#26374F',
  },
  editAction: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 4,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B63CE',
  },
});

export default ReminderDetailCard;
