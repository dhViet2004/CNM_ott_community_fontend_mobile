export interface MockConversation {
  id: string;
  type: 'single' | 'group';
  name?: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isOnline?: boolean;
  participants: MockParticipant[];
}

export interface MockParticipant {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: '1',
    type: 'single',
    name: 'Nguyễn Văn A',
    lastMessage: 'Chiều nay đi cafe không em?',
    time: '14:32',
    unreadCount: 3,
    isOnline: true,
    participants: [{ id: '1', name: 'Nguyễn Văn A', isOnline: true }],
  },
  {
    id: '2',
    type: 'single',
    name: 'Trần Thị B',
    lastMessage: 'Cảm ơn anh nhiều ạ!',
    time: '13:45',
    unreadCount: 0,
    isOnline: false,
    participants: [{ id: '2', name: 'Trần Thị B', isOnline: false }],
  },
  {
    id: '3',
    type: 'group',
    name: 'Nhóm bạn thân',
    lastMessage: 'Lê Hoàng C: Điện ảnh lúc mấy giờ vậy?',
    time: '12:20',
    unreadCount: 12,
    isPinned: true,
    participants: [
      { id: '1', name: 'Nguyễn Văn A' },
      { id: '2', name: 'Trần Thị B' },
      { id: '4', name: 'Lê Hoàng C' },
    ],
  },
  {
    id: '4',
    type: 'single',
    name: 'Phạm Minh D',
    lastMessage: 'File đã gửi xong, check giúp mình nhé',
    time: '11:05',
    unreadCount: 1,
    isOnline: true,
    participants: [{ id: '4', name: 'Phạm Minh D', isOnline: true }],
  },
  {
    id: '5',
    type: 'single',
    name: 'Vũ Thị E',
    lastMessage: 'Hẹn gặp lại bạn tuần sau nhé',
    time: 'Hôm qua',
    unreadCount: 0,
    isOnline: false,
    participants: [{ id: '5', name: 'Vũ Thị E', isOnline: false }],
  },
  {
    id: '6',
    type: 'group',
    name: 'Công việc - Dự án A',
    lastMessage: 'Hoàng: Báo cáo cập nhật lúc 5h chiều',
    time: 'Hôm qua',
    unreadCount: 5,
    isMuted: true,
    participants: [
      { id: '1', name: 'Nguyễn Văn A' },
      { id: '4', name: 'Phạm Minh D' },
      { id: '6', name: 'Hoàng' },
    ],
  },
  {
    id: '7',
    type: 'single',
    name: 'Đặng Gia H',
    lastMessage: 'Chúc mừng sinh nhật em nha!',
    time: '02/04',
    unreadCount: 0,
    isOnline: false,
    participants: [{ id: '7', name: 'Đặng Gia H', isOnline: false }],
  },
];
