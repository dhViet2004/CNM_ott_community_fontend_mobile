import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveUrl } from '@/utils/url';
import { storiesApi, type StoryItem } from '@api/endpoints';

interface Props {
  story: StoryItem | null;
  currentUserId?: string;
  onClose: () => void;
  onHighlightChanged?: (story: StoryItem) => void;
}

export const formatStoryAge = (createdAt: string) => {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / (60 * 1000));
  if (minutes <= 0) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  return `${Math.floor(minutes / 60)}h trước`;
};

const StoryViewerModal: React.FC<Props> = ({ story, currentUserId, onClose, onHighlightChanged }) => {
  const [resolvedMedia, setResolvedMedia] = useState<string>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    setResolvedMedia(undefined);
    if (story?.mediaUrl) {
      resolveUrl(story.mediaUrl).then((url) => {
        if (mounted) setResolvedMedia(url);
      });
    }
    return () => {
      mounted = false;
    };
  }, [story?.mediaUrl]);

  const toggleHighlight = async () => {
    if (!story || isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await storiesApi.toggleHighlight(story.storyId);
      onHighlightChanged?.(updated);
      Alert.alert(
        updated.isHighlighted ? 'Đã lưu vào bộ sưu tập' : 'Đã bỏ khỏi bộ sưu tập',
        updated.isHighlighted
          ? 'Bạn có thể xem lại story trong mục Tin nổi bật trên trang cá nhân.'
          : 'Story đã được bỏ khỏi mục Tin nổi bật trên trang cá nhân.'
      );
    } catch (error: any) {
      Alert.alert('Không thể lưu story', error.message || 'Vui lòng thử lại');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleLike = async () => {
    if (!story || isUpdating) return;
    setIsUpdating(true);
    try {
      onHighlightChanged?.(await storiesApi.toggleLike(story.storyId));
    } catch (error: any) {
      Alert.alert('Không thể thả tim', error.message || 'Vui lòng thử lại');
    } finally {
      setIsUpdating(false);
    }
  };

  const sendReply = async () => {
    if (!story || !replyText.trim() || isSendingReply) return;
    setIsSendingReply(true);
    try {
      await storiesApi.reply(story.storyId, replyText.trim());
      setReplyText('');
      Alert.alert('Đã gửi', 'Tin nhắn phản hồi story đã được gửi.');
    } catch (error: any) {
      Alert.alert('Không thể gửi', error.message || 'Vui lòng thử lại');
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!story) return null;
  const isMine = String(story.userId) === String(currentUserId);
  const isLiked = (story.likes || []).some((id) => String(id) === String(currentUserId));

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { backgroundColor: story.backgroundColor || '#111827' }]}>
          {story.type === 'image' && (
            resolvedMedia
              ? <Image source={{ uri: resolvedMedia }} style={styles.image} resizeMode="contain" />
              : <ActivityIndicator size="large" color="#FFF" />
          )}
          {!!story.text && (
            <Text style={[styles.storyText, {
              transform: [
                { translateX: story.textX || 0 },
                { translateY: story.textY || 0 },
                { scale: story.textScale || 1 },
                { rotate: `${story.textRotation || 0}deg` },
              ],
            }]}>{story.text}</Text>
          )}
          <View style={styles.header}>
            <View>
              <Text style={styles.author}>{story.authorName}</Text>
              <Text style={styles.time}>{formatStoryAge(story.createdAt)}</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={onClose}>
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.bottomBar}>
            {!isMine && (
              <View style={styles.replyBox}>
                <TextInput
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Gửi tin nhắn..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  style={styles.replyInput}
                  returnKeyType="send"
                  onSubmitEditing={sendReply}
                />
                {!!replyText.trim() && (
                  <TouchableOpacity onPress={sendReply} disabled={isSendingReply}>
                    <Ionicons name="send" size={23} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TouchableOpacity style={styles.actionButton} onPress={toggleLike} disabled={isUpdating}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={30} color={isLiked ? '#FF375F' : '#FFF'} />
              {!!story.likeCount && <Text style={styles.actionCount}>{story.likeCount}</Text>}
            </TouchableOpacity>
            {isMine && (
              <TouchableOpacity style={styles.actionButton} onPress={toggleHighlight} disabled={isUpdating}>
                <Ionicons name={story.isHighlighted ? 'bookmark' : 'bookmark-outline'} size={28} color="#FFF" />
                <Text style={styles.actionLabel}>{story.isHighlighted ? 'Đã lưu' : 'Bộ sưu tập'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  storyText: { paddingHorizontal: 28, color: '#FFF', fontSize: 28, lineHeight: 36, fontWeight: '800', textAlign: 'center' },
  header: { position: 'absolute', top: 48, left: 18, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  author: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  time: { marginTop: 3, color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  iconButton: { padding: 8 },
  bottomBar: { position: 'absolute', left: 16, right: 16, bottom: 28, flexDirection: 'row', alignItems: 'center', gap: 10 },
  replyBox: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 24, paddingHorizontal: 16, gap: 8 },
  replyInput: { flex: 1, color: '#FFF', fontSize: 15 },
  actionButton: { minWidth: 44, alignItems: 'center', justifyContent: 'center', padding: 4 },
  actionCount: { marginTop: 2, color: '#FFF', fontSize: 11 },
  actionLabel: { marginTop: 3, color: '#FFF', fontSize: 10 },
});

export default StoryViewerModal;
