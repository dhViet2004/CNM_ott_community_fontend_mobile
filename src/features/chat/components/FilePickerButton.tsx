import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Upload, X } from 'lucide-react-native';
import { colors, spacing, typography } from '@theme';
import apiClient from '../../../api/client';

/**
 * Props cho FilePickerButton
 */
export interface FilePickerButtonProps {
  /**
   * Callback khi upload thành công
   * @param url - URL của file đã upload (từ backend trả về)
   * @param name - Tên file gốc
   * @param size - Kích thước file (bytes)
   */
  onUploadSuccess: (url: string, name: string, size: number) => void;

  /**
   * Callback khi upload thất bại
   * @param error - Thông báo lỗi
   */
  onUploadError?: (error: string) => void;

  /**
   * Conversation ID để gửi message
   */
  conversationId?: string;

  /**
   * Sender ID (user hiện tại) - backend cần để tạo message
   */
  senderId?: string;

  /**
   * Receiver ID (người nhận) - cho DM
   */
  receiverId?: string;

  /**
   * Channel/Group ID - cho group chat
   */
  channelId?: string;

  /**
   * Custom style cho nút
   */
  style?: object;

  /**
   * Icon size
   * @default 24
   */
  iconSize?: number;
}

/**
 * FilePickerButton - Component để chọn và upload file
 *
 * Cách sử dụng:
 * ```tsx
 * import FilePickerButton from './components/FilePickerButton';
 *
 * const [messageText, setMessageText] = useState('');
 *
 * const handleUploadSuccess = (url, name, size) => {
 *   // Gửi message kèm URL file qua Socket
 *   socket.emit('send_message', {
 *     conversationId: 'channel:1',
 *     contentType: 'file',
 *     content: name,
 *     attachments: [{ url, name, size, type: 'file' }]
 *   });
 * };
 *
 * <FilePickerButton onUploadSuccess={handleUploadSuccess} />
 * ```
 */
export const FilePickerButton: React.FC<FilePickerButtonProps> = ({
  onUploadSuccess,
  onUploadError,
  conversationId,
  senderId,
  receiverId,
  channelId,
  style,
  iconSize = 24,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<{
    name: string;
    size: number;
  } | null>(null);

  /**
   * Format kích thước file sang KB/MB
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Xử lý chọn file
   */
  const handlePickFile = async () => {
    console.log('[FilePicker] handlePickFile called, channelId:', channelId, 'senderId:', senderId);
    try {
      // Mở document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      // User hủy
      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      const fileInfo = {
        name: file.name,
        size: file.size || 0,
        mimeType: file.mimeType || 'application/octet-stream',
        uri: file.uri,
      };

      setCurrentFile(fileInfo);
      setIsUploading(true);

      // Tạo FormData để upload - giống web
      const formData = new FormData();
      formData.append('file', {
        uri: fileInfo.uri,
        name: fileInfo.name,
        type: fileInfo.mimeType,
      } as any);

      // Backend cần sender_id + receiver_id (DM) hoặc sender_id + channel_id (Group)
      if (senderId) {
        formData.append('sender_id', senderId);
      }
      if (receiverId) {
        formData.append('receiver_id', receiverId);
      }
      if (channelId) {
        formData.append('channel_id', channelId);
      }

      console.log('[FilePicker] Uploading with channelId:', channelId, 'senderId:', senderId);

      // Upload lên backend
      const response = await apiClient.post('/messages/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseData = response.data;
      const messageData = responseData.data || responseData;

      // Lấy URL file từ attachments hoặc content
      let fileUrl = '';
      if (messageData.attachments && messageData.attachments.length > 0) {
        fileUrl = messageData.attachments[0].url;
      } else if (messageData.url) {
        fileUrl = messageData.url;
      } else if (messageData.file_url) {
        fileUrl = messageData.file_url;
      } else {
        fileUrl = messageData.content || '';
      }

      // Thành công - callback với URL, tên file, kích thước
      console.log('[FilePicker] Upload SUCCESS, URL:', fileUrl);
      setCurrentFile(null);
      onUploadSuccess(fileUrl, fileInfo.name, fileInfo.size);
    } catch (error) {
      console.error('[FilePicker] Upload FAILED:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Upload thất bại';
      setCurrentFile(null);
      onUploadError?.(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Hủy upload đang thực hiện
   */
  const handleCancel = () => {
    setCurrentFile(null);
    setIsUploading(false);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.button, isUploading && styles.buttonDisabled]}
        onPress={handlePickFile}
        disabled={isUploading}
        activeOpacity={0.7}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <FileText size={iconSize} color={colors.text.secondary} />
        )}
      </TouchableOpacity>

      {/* Hiển thị trạng thái đang upload */}
      {currentFile && isUploading && (
        <View style={styles.uploadingContainer}>
          <View style={styles.uploadingInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {currentFile.name}
            </Text>
            <Text style={styles.fileSize}>
              {formatFileSize(currentFile.size)}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <X size={16} color={colors.status.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.borderRadius.full,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  uploadingContainer: {
    position: 'absolute',
    bottom: 45,
    left: -80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 150,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadingInfo: {
    flex: 1,
    marginRight: spacing.xs,
  },
  fileName: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '500',
  },
  fileSize: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.tertiary,
  },
  cancelButton: {
    padding: spacing.xs,
  },
});

export default FilePickerButton;
