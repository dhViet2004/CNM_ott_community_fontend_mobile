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
   * API endpoint để upload file
   * @default '/api/uploads/presigned-url'
   */
  uploadEndpoint?: string;

  /**
   * Loại file được phép chọn
   * @default '*/*' (tất cả các loại)
   */
  fileType?: DocumentPicker.UnsupportedMimeType | '*/*';

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
 * Response từ API upload
 */
interface UploadResponse {
  url: string;
  key: string;
  bucket: string;
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
  uploadEndpoint = '/api/uploads/presigned-url',
  fileType = '*/*',
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
   * Upload file lên backend API
   * @param formData - FormData chứa file
   * @returns Promise với URL của file đã upload
   */
  const uploadFileToExistingApi = async (
    formData: FormData
  ): Promise<UploadResponse> => {
    // Lấy base URL từ env hoặc hardcode tạm
    const BASE_URL = 'http://localhost:4000';

    // Bước 1: Lấy presigned URL từ backend
    const presignedResponse = await fetch(`${BASE_URL}${uploadEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyPrefix: 'messages',
        contentType: formData.getAll('file')[0]?.type || 'application/octet-stream',
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error('Không thể lấy presigned URL');
    }

    const presignedData: UploadResponse = await presignedResponse.json();

    // Bước 2: Upload file trực tiếp lên S3 qua presigned URL
    const file = formData.getAll('file')[0] as File;
    const uploadResponse = await fetch(presignedData.url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('Upload thất bại');
    }

    // Bước 3: Trả về URL công khai của file
    const fileUrl = `https://${presignedData.bucket}.s3.ap-southeast-1.amazonaws.com/${presignedData.key}`;

    return {
      url: fileUrl,
      key: presignedData.key,
      bucket: presignedData.bucket,
    };
  };

  /**
   * Xử lý chọn file
   */
  const handlePickFile = async () => {
    try {
      // Mở document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: fileType,
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

      // Tạo FormData
      const formData = new FormData();
      formData.append('file', {
        uri: fileInfo.uri,
        name: fileInfo.name,
        type: fileInfo.mimeType,
      } as any);

      // Upload
      const uploadResult = await uploadFileToExistingApi(formData);

      // Thành công
      setCurrentFile(null);
      onUploadSuccess(uploadResult.url, fileInfo.name, fileInfo.size);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload thất bại';
      console.error('File upload error:', error);
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
