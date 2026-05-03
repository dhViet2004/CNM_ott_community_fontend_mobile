import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, X } from 'lucide-react-native';
import { colors, spacing, typography } from '@theme';
import apiClient from '../../../api/client';

export interface ImagePickerButtonProps {
  /**
   * Callback khi upload thành công
   * Nhận url, tên file, kích thước và messageData từ backend
   */
  onUploadSuccess: (url: string, name: string, size: number, messageData?: any) => void;
  onUploadError?: (error: string) => void;
  conversationId?: string;
  senderId?: string;
  receiverId?: string;
  channelId?: string;
  groupId?: string;
  style?: object;
  iconSize?: number;
}

export const ImagePickerButton: React.FC<ImagePickerButtonProps> = ({
  onUploadSuccess,
  onUploadError,
  conversationId,
  senderId,
  receiverId,
  channelId,
  groupId,
  style,
  iconSize = 24,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Cấp quyền', 'Bạn cần cấp quyền truy cập thư viện ảnh để gửi hình ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.7, // Tối ưu dung lượng
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uriParts = asset.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      const fileName = asset.fileName || `image_${Date.now()}.${fileType}`;
      const fileSize = asset.fileSize || 0;
      const mimeType = asset.mimeType || `image/${fileType}`;

      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      } as any);

      if (senderId) formData.append('sender_id', senderId);
      if (receiverId) formData.append('receiver_id', receiverId);
      if (channelId) formData.append('channel_id', channelId);
      if (conversationId) formData.append('conversationId', conversationId);
      if (groupId) formData.append('group_id', groupId);

      const response = await apiClient.post('/messages/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseData = response.data;
      const messageData = responseData.data || responseData;

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

      onUploadSuccess(fileUrl, fileName, fileSize, messageData);
    } catch (error) {
      console.error('[ImagePicker] Upload FAILED:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload ảnh thất bại';
      onUploadError?.(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.button, isUploading && styles.buttonDisabled]}
        onPress={handlePickImage}
        disabled={isUploading}
        activeOpacity={0.7}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <ImageIcon size={iconSize} color={colors.text.secondary} />
        )}
      </TouchableOpacity>
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
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
