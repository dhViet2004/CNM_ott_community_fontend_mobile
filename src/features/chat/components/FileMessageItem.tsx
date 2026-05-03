import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { FileText, Download, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react-native';
import { colors, spacing, typography } from '@theme';

/**
 * Props cho FileMessageItem
 */
export interface FileMessageItemProps {
  /**
   * URL của file đã upload
   */
  fileUrl: string;

  /**
   * Tên file hiển thị
   */
  fileName: string;

  /**
   * Kích thước file (bytes)
   * @default 0
   */
  fileSize?: number;

  /**
   * MIME type của file (để xác định icon)
   */
  mimeType?: string;

  /**
   * Callback khi mở file thành công
   */
  onFileOpen?: (localUri: string) => void;

  /**
   * Callback khi có lỗi
   */
  onError?: (error: string) => void;

  /**
   * Custom style cho container
   */
  style?: object;

  /**
   * Màu nền tùy chỉnh
   * @default colors.background.secondary
   */
  backgroundColor?: string;

  /**
   * Icon size
   * @default 24
   */
  iconSize?: number;
}

/**
 * Trạng thái download
 */
type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'error';

/**
 * FileMessageItem - Component hiển thị và mở file đính kèm
 *
 * Cách sử dụng:
 *
 * 1. Import vào MessageBubble:
 * ```tsx
 * import FileMessageItem from './FileMessageItem';
 *
 * // Trong MessageBubble, thêm điều kiện cho type='file':
 * if (type === 'file' && file_url) {
 *   return (
 *     <FileMessageItem
 *       fileUrl={file_url}
 *       fileName={content || 'Tệp đính kèm'}
 *       fileSize={/* size từ attachment *\/}
 *     />
 *   );
 * }
 * ```
 *
 * 2. Import trực tiếp vào ChatScreen:
 * ```tsx
 * <FileMessageItem
 *   fileUrl="https://..."
 *   fileName="document.pdf"
 *   fileSize={1024000}
 *   onFileOpen={(uri) => console.log('Opened:', uri)}
 * />
 * ```
 */
export const FileMessageItem: React.FC<FileMessageItemProps> = ({
  fileUrl,
  fileName,
  fileSize = 0,
  mimeType,
  onFileOpen,
  onError,
  style,
  backgroundColor = colors.background.secondary,
  iconSize = 24,
}) => {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);

  /**
   * Format kích thước file
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Cắt ngắn tên file nếu quá dài
   */
  const truncateFileName = (name: string, maxLength: number = 25): string => {
    if (name.length <= maxLength) return name;

    const extension = name.split('.').pop() || '';
    const nameWithoutExt = name.slice(0, -(extension.length + 1));
    const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4);

    return `${truncatedName}...${extension}`;
  };

  /**
   * Lấy icon phù hợp với loại file
   */
  const getFileIcon = () => {
    // Nếu có mimeType, xác định icon dựa trên loại
    if (mimeType) {
      if (mimeType.includes('pdf')) return '📄';
      if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
      if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    }

    // Fallback: xác định theo extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      ppt: '📋',
      pptx: '📋',
      zip: '📦',
      rar: '📦',
      txt: '📃',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️',
    };

    return iconMap[ext] || '📎';
  };

  /**
   * Mở file đã tải
   */
  const openDownloadedFile = async (uri: string) => {
    try {
      // Kiểm tra xem có thể share được không
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        // iOS: Dùng Sharing để mở file
        await Sharing.shareAsync(uri, {
          mimeType: mimeType || 'application/octet-stream',
          dialogTitle: fileName,
        });
      } else {
        // Android: Dùng IntentLauncher
        const contentUri = FileSystem.documentDirectory
          ? uri.replace(FileSystem.documentDirectory, '')
          : uri;

        await IntentLauncher.startActivityAsync(
          IntentLauncher.ACTION_VIEW,
          {
            data: uri,
            flags: {
              NEW_TASK: true,
            },
          }
        );
      }

      onFileOpen?.(uri);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Không thể mở file';
      console.error('Open file error:', error);
      Alert.alert('Lỗi', errorMessage);
      onError?.(errorMessage);
    }
  };

  /**
   * Download và mở file
   */
  const handlePress = async () => {
    try {
      // Nếu đã tải rồi, mở trực tiếp
      if (localFileUri && downloadStatus === 'completed') {
        await openDownloadedFile(localFileUri);
        return;
      }

      setDownloadStatus('downloading');
      setDownloadProgress(0);

      // Tạo tên file tạm trong cache
      const fileExtension = fileName.split('.').pop() || '';
      const tempFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const cacheDir = FileSystem.cacheDirectory || '';
      const localUri = `${cacheDir}${tempFileName}`;

      // Download file
      const downloadResult = await FileSystem.downloadAsync(
        fileUrl,
        localUri,
        {
          md5: false,
        }
      );

      // Kiểm tra kết quả
      if (downloadResult.status !== 200) {
        throw new Error('Download thất bại');
      }

      setDownloadStatus('completed');
      setLocalFileUri(downloadResult.uri);

      // Mở file sau khi tải xong
      await openDownloadedFile(downloadResult.uri);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadStatus('error');

      const errorMessage =
        error instanceof Error ? error.message : 'Không thể tải file';
      Alert.alert('Lỗi', errorMessage);
      onError?.(errorMessage);

      // Reset sau 2 giây để user có thể thử lại
      setTimeout(() => {
        setDownloadStatus('idle');
      }, 2000);
    }
  };

  /**
   * Render icon trạng thái
   */
  const renderStatusIcon = () => {
    switch (downloadStatus) {
      case 'downloading':
        return <ActivityIndicator size="small" color={colors.primary} />;
      case 'completed':
        return <CheckCircle size={iconSize} color={colors.status.success} />;
      case 'error':
        return <AlertCircle size={iconSize} color={colors.status.error} />;
      default:
        return <Download size={iconSize} color={colors.primary} />;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={downloadStatus === 'downloading'}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        {downloadStatus === 'downloading' ? (
          renderStatusIcon()
        ) : (
          <Text style={styles.fileIcon}>{getFileIcon()}</Text>
        )}
      </View>

      {/* Thông tin file */}
      <View style={styles.infoContainer}>
        <Text style={styles.fileName} numberOfLines={1}>
          {truncateFileName(fileName)}
        </Text>
        <View style={styles.metaRow}>
          {fileSize > 0 && (
            <Text style={styles.fileSize}>{formatFileSize(fileSize)}</Text>
          )}
          {downloadStatus === 'downloading' && (
            <Text style={styles.downloadingText}>Đang tải...</Text>
          )}
          {downloadStatus === 'completed' && (
            <Text style={styles.completedText}>Đã tải xong</Text>
          )}
        </View>
      </View>

      {/* Nút mở file */}
      {downloadStatus !== 'downloading' && (
        <View style={styles.actionContainer}>
          <ExternalLink size={18} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    minWidth: 200,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  fileIcon: {
    fontSize: 20,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSize: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  downloadingText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
    marginLeft: spacing.xs,
  },
  completedText: {
    ...typography.caption,
    color: colors.status.success,
    fontSize: 11,
    marginLeft: spacing.xs,
  },
  actionContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
});

export default FileMessageItem;
