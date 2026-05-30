import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  TextInput, RefreshControl, Alert, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions, SafeAreaView, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '@theme';
import { Avatar } from '@components/common';
import { postsApi, uploadApi, friendsApi } from '@api/endpoints';
import type { PostItem, CommentItem, PostMedia, ReactionUser } from '@api/endpoints';
import { useAppSelector } from '@store/hooks';
import { resolveUrl } from '@/utils/url';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatPostTime } from '@/utils/postTime';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLUE = '#008AF3';

const reactionSummary = (users: ReactionUser[], currentUserId?: string) => {
  if (!users.length) return '';
  const includesMe = users.some((item) => String(item.userId) === String(currentUserId));
  if (includesMe) return users.length === 1 ? 'Bạn' : `Bạn và ${users.length - 1} người khác`;
  return users.length === 1 ? users[0].displayName : `${users[0].displayName} và ${users.length - 1} người khác`;
};

export const TimelineScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const currentUser = useAppSelector((s) => s.auth.user);
  
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modals
  const [showCompose, setShowCompose] = useState(false);
  const [showPostManager, setShowPostManager] = useState(false);
  const [reactionUsers, setReactionUsers] = useState<ReactionUser[] | null>(null);
  
  // Edit post
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Tải danh sách bài đăng từ API + Fallback AsyncStorage cho Dòng thời gian chung đồng bộ với Web
  const loadFeed = useCallback(async () => {
    try {
      // Load bạn bè trước để mapping likes
      let friendsList: any[] = [];
      try {
        friendsList = await friendsApi.getFriends();
        setFriends(friendsList);
      } catch (err) {
        console.warn('[Timeline] getFriends error:', err);
      }

      // 1. Cố gắng lấy từ API Backend thật
      const res = await postsApi.getFeedPosts(50);
      if (res.posts && res.posts.length > 0) {
        const mappedPosts: PostItem[] = res.posts.map((p: any) => {
          const likedBy = Array.isArray(p.likes) ? p.likes.map((id: string) => {
            if (id === currentUser?.userId) {
              return {
                userId: id,
                displayName: currentUser?.display_name || currentUser?.username || 'Tôi',
                avatarUrl: currentUser?.avatar_url || null
              };
            }
            const foundFriend = friendsList.find((f: any) => 
              String(f.friend_id) === String(id) || 
              String(f.userId || f.friendId) === String(id)
            );
            return {
              userId: id,
              displayName: foundFriend ? (foundFriend.friend_display_name || foundFriend.display_name) : 'Một người bạn',
              avatarUrl: foundFriend ? (foundFriend.friend_avatar_url || foundFriend.avatarUrl) : null
            };
          }) : [];

          return {
            postId: p.postId || p.id,
            userId: p.userId,
            authorName: p.authorName || 'Người dùng',
            authorAvatar: p.authorAvatar || null,
            content: p.content || '',
            createdAt: p.createdAt,
            updatedAt: p.updatedAt || p.createdAt,
            likeCount: p.likeCount || p.likes?.length || 0,
            commentCount: p.commentCount || p.comments?.length || 0,
            likes: p.likes || [],
            likeUsers: p.likeUsers || likedBy,
            media: p.media || [],
            likedBy,
            comments: p.comments || []
          };
        });

        setPosts(mappedPosts);
        return;
      }
      
      // 2. Fallback AsyncStorage dòng thời gian chung nếu API trống
      const saved = await AsyncStorage.getItem('app_timeline_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Map cấu trúc bài đăng sang PostItem của mobile
        const mapped: PostItem[] = parsed.map((p: any) => ({
          postId: p.id,
          userId: p.userId,
          authorName: p.authorName,
          authorAvatar: p.authorAvatar,
          content: p.content,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt || p.createdAt,
          likeCount: p.likedBy?.length || 0,
          commentCount: p.comments?.length || 0,
          likes: p.likedBy?.map((l: any) => l.userId) || [],
          media: p.imageUrl ? [{ url: p.imageUrl, type: 'image', name: 'attachment' }] : [],
          likedBy: p.likedBy || [],
          comments: p.comments || []
        }));
        setPosts(mapped);
      } else {
        setPosts([]);
      }
    } catch (e: any) {
      console.warn('[Timeline] load feed error:', e.message);
      // Fallback
      const saved = await AsyncStorage.getItem('app_timeline_posts');
      if (saved) {
        setPosts(JSON.parse(saved));
      }
    }
  }, [currentUser]);

  useEffect(() => {
    setIsLoading(true);
    loadFeed().finally(() => setIsLoading(false));
  }, [loadFeed]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadFeed();
    setIsRefreshing(false);
  }, [loadFeed]);

  // Thả tim bài viết
  const handleLike = useCallback(async (postId: string) => {
    try {
      // 1. Thả tim backend API
      try {
        const res = await postsApi.toggleLike(postId);
        setPosts((prev) =>
          prev.map((p) =>
            p.postId === postId
              ? { ...p, likes: res.likes, likeCount: res.likeCount, likeUsers: res.likeUsers, likedBy: res.likeUsers }
              : p
          )
        );
      } catch {
        // 2. Thả tim Local Storage
        const saved = await AsyncStorage.getItem('app_timeline_posts');
        if (saved) {
          const parsed = JSON.parse(saved);
          const updated = parsed.map((p: any) => {
            if (p.id === postId) {
              const alreadyLiked = p.likedBy?.some((l: any) => l.userId === currentUser?.userId);
              let nextLikes = p.likedBy ? [...p.likedBy] : [];
              if (alreadyLiked) {
                nextLikes = nextLikes.filter((l: any) => l.userId !== currentUser?.userId);
              } else {
                nextLikes.push({
                  userId: currentUser?.userId,
                  displayName: currentUser?.display_name || currentUser?.username,
                  avatarUrl: currentUser?.avatar_url
                });
              }
              return { ...p, likedBy: nextLikes };
            }
            return p;
          });
          await AsyncStorage.setItem('app_timeline_posts', JSON.stringify(updated));
          // Reload
          loadFeed();
        }
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể thả tim');
    }
  }, [currentUser, loadFeed]);

  // Sửa bài viết (< 7 ngày)
  const handleStartEdit = useCallback((post: PostItem) => {
    const timeDiff = Date.now() - new Date(post.createdAt).getTime();
    const isUnder7Days = timeDiff < 7 * 24 * 60 * 60 * 1000;
    
    if (!isUnder7Days) {
      Alert.alert('Không thể chỉnh sửa', 'Bài viết đăng đã quá 7 ngày nên không được phép chỉnh sửa nữa!');
      return;
    }
    
    setEditingPost(post);
    setEditingContent(post.content || '');
  }, []);

  const handleSaveEdit = async () => {
    if (!editingPost || !editingContent.trim()) return;
    try {
      const saved = await AsyncStorage.getItem('app_timeline_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        const updated = parsed.map((p: any) => {
          if (p.id === editingPost.postId) {
            return { ...p, content: editingContent.trim() };
          }
          return p;
        });
        await AsyncStorage.setItem('app_timeline_posts', JSON.stringify(updated));
        Alert.alert('Thành công', 'Đã cập nhật bài viết');
        setEditingPost(null);
        loadFeed();
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu bài viết');
    }
  };

  // Xóa bài viết
  const handleDelete = useCallback(async (postId: string) => {
    Alert.alert('Xóa bài viết', 'Bạn có chắc chắn muốn xóa bài viết này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            // Xóa backend
            try {
              await postsApi.deletePost(postId);
            } catch {}
            
            // Xóa local
            const saved = await AsyncStorage.getItem('app_timeline_posts');
            if (saved) {
              const parsed = JSON.parse(saved);
              const updated = parsed.filter((p: any) => p.id !== postId);
              await AsyncStorage.setItem('app_timeline_posts', JSON.stringify(updated));
            }
            
            setPosts((prev) => prev.filter((p) => p.postId !== postId));
            Alert.alert('Đã xóa', 'Bài viết đã được xóa thành công!');
          } catch (e: any) {
            Alert.alert('Lỗi', e.message);
          }
        },
      },
    ]);
  }, []);

  // Xem lượt tim đến từ ai
  const handleShowLikeDetails = useCallback((post: PostItem) => {
    setReactionUsers(post.likeUsers || (post as any).likedBy || []);
  }, []);

  const handlePostCreated = useCallback(async (newPost: PostItem) => {
    // Đồng bộ vào AsyncStorage
    try {
      const saved = await AsyncStorage.getItem('app_timeline_posts');
      const currentArr = saved ? JSON.parse(saved) : [];
      const newLocalPost = {
        id: newPost.postId,
        userId: currentUser?.userId,
        authorName: currentUser?.display_name || currentUser?.username,
        authorAvatar: currentUser?.avatar_url,
        content: newPost.content,
        imageUrl: newPost.media?.[0]?.url || '',
        createdAt: newPost.createdAt,
        likedBy: [],
        comments: []
      };
      await AsyncStorage.setItem('app_timeline_posts', JSON.stringify([newLocalPost, ...currentArr]));
    } catch {}

    setPosts((prev) => [newPost, ...prev]);
    setShowCompose(false);
    loadFeed();
  }, [currentUser, loadFeed]);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Cần quyền truy cập thư viện ảnh'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setShowCompose(true);
    }
  };

  const renderPost = useCallback(({ item }: { item: PostItem }) => (
    <PostCard
      post={item}
      currentUserId={currentUser?.userId || ''}
      onLike={handleLike}
      onDelete={handleDelete}
      onEdit={handleStartEdit}
      onShowLikes={handleShowLikeDetails}
    />
  ), [currentUser, handleLike, handleDelete, handleStartEdit, handleShowLikeDetails]);

  const myPosts = posts.filter(p => String(p.userId) === String(currentUser?.userId));

  const renderHeader = () => {
    const stories = [
      { id: 'create', name: 'Tạo mới', isCreate: true, avatar: currentUser?.avatar_url },
      { id: '1', name: 'Phước Nguyện', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
      { id: '2', name: 'Phạm Dương', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
      { id: '3', name: 'Quế Anh', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
    ];

    return (
      <View style={headerStyles.container}>
        {/* Khung đăng nhanh */}
        <View style={headerStyles.quickPost}>
          <View style={headerStyles.quickPostInputRow}>
            <Avatar uri={currentUser?.avatar_url || undefined} name={currentUser?.display_name || ''} size="md" />
            <TouchableOpacity style={headerStyles.quickPostInput} onPress={() => setShowCompose(true)}>
              <Text style={headerStyles.quickPostPlaceholder}>Hôm nay bạn thế nào?</Text>
            </TouchableOpacity>
          </View>
          <View style={headerStyles.quickPostActions}>
            <TouchableOpacity style={headerStyles.quickPostBtn} onPress={pickMedia}>
              <Ionicons name="image" size={18} color="#4CAF50" />
              <Text style={headerStyles.quickPostBtnText}>Ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={headerStyles.quickPostBtn} onPress={pickMedia}>
              <Ionicons name="videocam" size={18} color="#FF9800" />
              <Text style={headerStyles.quickPostBtnText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={headerStyles.quickPostBtn} onPress={pickMedia}>
              <Ionicons name="images" size={18} color="#2196F3" />
              <Text style={headerStyles.quickPostBtnText}>Album</Text>
            </TouchableOpacity>
            <TouchableOpacity style={headerStyles.quickPostBtn}>
              <Ionicons name="color-palette-outline" size={18} color="#9C27B0" />
              <Text style={headerStyles.quickPostBtnText}>Nền chữ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Khung Trạng thái 24h (Story) */}
        <View style={headerStyles.storySection}>
          <View style={headerStyles.storyHeader}>
            <View style={headerStyles.storyTitleContainer}>
              <Text style={headerStyles.storyTitle}>Cập nhật trạng thái 24 giờ</Text>
            </View>
            <View style={headerStyles.storyCounter}>
              <Ionicons name="flame" size={14} color="#FF9800" />
              <Text style={headerStyles.storyCounterText}>Video Mới</Text>
              <Ionicons name="chevron-down" size={12} color={colors.text.tertiary} />
            </View>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={stories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={headerStyles.storyList}
            renderItem={({ item }) => (
              <View style={headerStyles.storyCard}>
                {item.isCreate ? (
                  <View style={headerStyles.createStoryContainer}>
                    <Image source={{ uri: item.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }} style={headerStyles.storyAvatar} />
                    <View style={headerStyles.createStoryOverlay}>
                      <View style={headerStyles.createStoryCircle}>
                        <Ionicons name="videocam" size={14} color="#FFF" />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={headerStyles.friendStoryContainer}>
                    <Image source={{ uri: item.avatar || undefined }} style={headerStyles.storyAvatar} />
                    <View style={headerStyles.friendStoryOverlay}>
                      <View style={headerStyles.friendStoryBadge}>
                        <Image source={{ uri: item.avatar || undefined }} style={headerStyles.friendStoryBadgeAvatar} />
                      </View>
                    </View>
                  </View>
                )}
                <Text style={headerStyles.storyName} numberOfLines={1}>{item.name}</Text>
              </View>
            )}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header chính */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="search" size={22} color="#FFF" />
          <Text style={styles.headerSearchText}>Tìm kiếm</Text>
        </View>
        <View style={styles.headerRightButtons}>
          <TouchableOpacity onPress={() => setShowPostManager(true)} style={styles.headerIconBtn}>
            <Ionicons name="list-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCompose(true)} style={styles.headerIconBtn}>
            <Ionicons name="create-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.postId}
        renderItem={renderPost}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[BLUE]} tintColor={BLUE} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color={BLUE} />
            ) : (
              <>
                <Ionicons name="newspaper-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
                <Text style={styles.emptySubtext}>Hãy đăng bài viết đầu tiên nhé!</Text>
              </>
            )}
          </View>
        }
      />

      <ComposeModal
        visible={showCompose}
        onClose={() => setShowCompose(false)}
        onPostCreated={handlePostCreated}
        currentUser={currentUser}
      />
      <ReactionListModal users={reactionUsers} onClose={() => setReactionUsers(null)} />

      {/* Modal chỉnh sửa bài viết */}
      <Modal visible={editingPost !== null} animationType="slide">
        <SafeAreaView style={composeStyles.container}>
          <View style={composeStyles.header}>
            <TouchableOpacity onPress={() => setEditingPost(null)} style={composeStyles.headerCloseBtn}>
              <Ionicons name="close-outline" size={28} color="#555" />
            </TouchableOpacity>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>Chỉnh sửa bài viết</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={!editingContent.trim()}>
              <Ionicons name="checkmark-circle" size={28} color={editingContent.trim() ? BLUE : '#CCC'} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={composeStyles.input}
            value={editingContent}
            onChangeText={setEditingContent}
            multiline
            autoFocus
            placeholder="Nội dung chỉnh sửa..."
          />
        </SafeAreaView>
      </Modal>

      {/* Modal Quản lý bài viết */}
      <Modal visible={showPostManager} animationType="slide" onRequestClose={() => setShowPostManager(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f5fa' }}>
          <View style={[composeStyles.header, { backgroundColor: '#FFF' }]}>
            <TouchableOpacity onPress={() => setShowPostManager(false)}>
              <Ionicons name="close-outline" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700' }}>Kho quản lý bài viết</Text>
            <View style={{ width: 28 }} />
          </View>
          <FlatList
            data={myPosts}
            keyExtractor={(item) => item.postId}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const timeDiff = Date.now() - new Date(item.createdAt).getTime();
              const isUnder7Days = timeDiff < 7 * 24 * 60 * 60 * 1000;
              return (
                <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E4E6EB' }}>
                  <Text style={{ fontSize: 11, color: '#888', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 6 }}>
                    {new Date(item.createdAt).toLocaleString('en-US')}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }} numberOfLines={2}>{item.content}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                    {isUnder7Days && (
                      <TouchableOpacity
                        onPress={() => {
                          setShowPostManager(false);
                          handleStartEdit(item);
                        }}
                        style={{ backgroundColor: '#E0F0FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                      >
                        <Text style={{ color: BLUE, fontSize: 12, fontWeight: '700' }}>Sửa</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setShowPostManager(false);
                        handleDelete(item.postId);
                      }}
                      style={{ backgroundColor: '#FFEBEB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                    >
                      <Text style={{ color: '#FF3B5C', fontSize: 12, fontWeight: '700' }}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
                <Ionicons name="file-tray-outline" size={48} color="#CCC" />
                <Text style={{ color: '#999', marginTop: 10 }}>Bạn chưa có bài viết nào</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// ─── Post Card ───────────────────────────────────────────────────────────────
interface PostCardProps {
  post: PostItem;
  currentUserId: string;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onEdit: (post: PostItem) => void;
  onShowLikes: (post: PostItem) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onLike, onDelete, onEdit, onShowLikes }) => {
  const [showComments, setShowComments] = useState(false);
  const [resolvedAvatar, setResolvedAvatar] = useState<string | undefined>(undefined);
  const [resolvedMedia, setResolvedMedia] = useState<string[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [, setClock] = useState(Date.now());
  
  const isLiked = post.likes?.includes(currentUserId);
  const isOwner = String(post.userId) === String(currentUserId);
  
  const timeDiff = Date.now() - new Date(post.createdAt).getTime();
  const isUnder7Days = timeDiff < 7 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    resolveUrl(post.authorAvatar).then(setResolvedAvatar);
    Promise.all((post.media || []).map((m) => resolveUrl(m.url))).then((urls) =>
      setResolvedMedia(urls.filter(Boolean) as string[])
    );
  }, [post.authorAvatar, post.media]);

  useEffect(() => {
    setCommentCount(post.commentCount || 0);
  }, [post.commentCount]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const postReactionUsers = post.likeUsers || (post as any).likedBy || [];

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.authorRow}>
        <Avatar uri={resolvedAvatar} name={post.authorName} size="md" />
        <View style={cardStyles.authorInfo}>
          <Text style={cardStyles.authorName}>{post.authorName}</Text>
          <Text style={cardStyles.time}>{formatPostTime(post.createdAt)}</Text>
        </View>
        
        {isOwner && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isUnder7Days && (
              <TouchableOpacity onPress={() => onEdit(post)} style={{ padding: 4 }}>
                <Ionicons name="create-outline" size={20} color={BLUE} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => onDelete(post.postId)} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={20} color="#FF3B5C" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {post.content ? <Text style={cardStyles.content}>{post.content}</Text> : null}

      {resolvedMedia.length > 0 && (
        <View style={cardStyles.mediaGrid}>
          {resolvedMedia.slice(0, 4).map((url, i) => (
            <Image
              key={i}
              source={{ uri: url }}
              style={[
                cardStyles.mediaImage,
                resolvedMedia.length === 1
                  ? { width: '100%', height: 250 }
                  : { width: '48%', height: 150 },
              ]}
              resizeMode="cover"
            />
          ))}
        </View>
      )}

      {/* Link preview card */}
      {post.content && (post.content.includes('http://') || post.content.includes('https://')) && (
        <View style={cardStyles.linkCard}>
          <Text style={cardStyles.linkDomain}>facebook.com</Text>
          <Text style={cardStyles.linkUrl} numberOfLines={1}>
            {post.content.match(/https?:\/\/[^\s]+/)?.[0] || post.content}
          </Text>
        </View>
      )}

      <View style={cardStyles.statsRow}>
        <TouchableOpacity style={cardStyles.statsLeft} onPress={() => onShowLikes(post)}>
          <Ionicons name="heart" size={14} color="#FF3B5C" />
          <Text style={cardStyles.statText}> {reactionSummary(postReactionUsers, currentUserId)}</Text>
        </TouchableOpacity>
        {commentCount > 0 && (
          <TouchableOpacity onPress={() => setShowComments(true)}>
            <Text style={cardStyles.statText}>{commentCount} bình luận</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={cardStyles.actionRow}>
        <TouchableOpacity style={cardStyles.actionBtn} onPress={() => onLike(post.postId)}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? '#FF3B5C' : '#555'} />
          <Text style={[cardStyles.actionText, isLiked && { color: '#FF3B5C' }]}>Thích</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cardStyles.actionBtn} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-outline" size={18} color="#555" />
          <Text style={cardStyles.actionText}>Bình luận</Text>
        </TouchableOpacity>
      </View>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={post.postId}
        currentUserId={currentUserId}
        onCommentAdded={() => setCommentCount((current) => current + 1)}
        onCommentsDeleted={(count) => setCommentCount((current) => Math.max(0, current - count))}
      />
    </View>
  );
};

const ReactionListModal: React.FC<{ users: ReactionUser[] | null; onClose: () => void }> = ({ users, onClose }) => (
  <Modal visible={users !== null} animationType="slide" transparent onRequestClose={onClose}>
    <View style={commentStyles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <View style={commentStyles.container}>
        <View style={commentStyles.header}>
          <Text style={commentStyles.title}>Lượt thả tim ({users?.length || 0})</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text.primary} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          {(users || []).map((user) => (
            <View key={user.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar uri={user.avatarUrl || undefined} name={user.displayName} size="sm" />
              <Text style={{ flex: 1, fontWeight: '600', color: colors.text.primary }}>{user.displayName}</Text>
              <Ionicons name="heart" size={16} color="#FF3B5C" />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

type CommentNode = CommentItem & { children: CommentNode[] };

const buildCommentTree = (comments: CommentItem[]) => {
  const nodes = new Map<string, CommentNode>();
  comments.forEach((comment) => nodes.set(comment.commentId, { ...comment, children: [] }));
  const roots: CommentNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentCommentId ? nodes.get(node.parentCommentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
};

// ─── Comments Modal (Cây phản hồi + reaction lưu backend) ────────────────────
const CommentsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  postId: string;
  currentUserId: string;
  onCommentAdded: () => void;
  onCommentsDeleted: (count: number) => void;
}> = ({ visible, onClose, postId, currentUserId, onCommentAdded, onCommentsDeleted }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTarget, setReplyTarget] = useState<CommentItem | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reactionUsers, setReactionUsers] = useState<ReactionUser[] | null>(null);
  const [editingComment, setEditingComment] = useState<CommentItem | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const roots = buildCommentTree(comments);

  const loadComments = useCallback(async () => {
    try {
      const r = await postsApi.getComments(postId);
      setComments(r.comments || []);
    } catch {}
  }, [postId]);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, loadComments]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const comment = await postsApi.createComment(postId, text.trim(), replyTarget?.commentId);
      setComments((prev) => [...prev, comment]);
      if (replyTarget) {
        setExpanded((current) => new Set(current).add(replyTarget.commentId));
      }
      setText('');
      setReplyTarget(null);
      onCommentAdded();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const result = await postsApi.toggleCommentLike(commentId);
      setComments((prev) =>
      prev.map((c) =>
        c.commentId === commentId
          ? { ...c, likes: result.likes, likeCount: result.likeCount, likeUsers: result.likeUsers }
          : c
      )
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể thả tim bình luận');
    }
  };

  const handleEditComment = (comment: CommentItem) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Chỉnh sửa bình luận',
        undefined,
        async (value) => {
          if (!value?.trim()) return;
          try {
            const updated = await postsApi.updateComment(comment.commentId, value.trim());
            setComments((current) => current.map((item) => item.commentId === updated.commentId ? { ...item, ...updated } : item));
          } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không thể chỉnh sửa bình luận');
          }
        },
        'plain-text',
        comment.content
      );
      return;
    }
    setReplyTarget(null);
    setEditingComment(comment);
    setEditingCommentText(comment.content);
  };

  const handleSaveCommentEdit = async () => {
    if (!editingComment || !editingCommentText.trim()) return;
    try {
      const updated = await postsApi.updateComment(editingComment.commentId, editingCommentText.trim());
      setComments((current) => current.map((item) => item.commentId === updated.commentId ? { ...item, ...updated } : item));
      setEditingComment(null);
      setEditingCommentText('');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể chỉnh sửa bình luận');
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Xóa bình luận', 'Xóa bình luận này và toàn bộ phản hồi bên dưới?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await postsApi.deleteComment(commentId);
            const ids = new Set(result.deletedCommentIds || [commentId]);
            setComments((current) => current.filter((item) => !ids.has(item.commentId)));
            onCommentsDeleted(ids.size);
          } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không thể xóa bình luận');
          }
        },
      },
    ]);
  };

  const renderComment = (item: CommentNode, depth = 0): React.ReactNode => {
    const isExpanded = expanded.has(item.commentId);
    return (
      <View key={item.commentId} style={[depth > 0 && commentStyles.nestedItem]}>
        <View style={commentStyles.item}>
          <Avatar uri={item.authorAvatar || undefined} name={item.authorName} size="sm" />
          <View style={{ flex: 1 }}>
            <View style={commentStyles.bubble}>
              <Text style={commentStyles.cAuthor}>{item.authorName}</Text>
              {editingComment?.commentId === item.commentId ? (
                <View style={{ gap: 8 }}>
                  <TextInput
                    value={editingCommentText}
                    onChangeText={setEditingCommentText}
                    style={commentStyles.editInput}
                    multiline
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                    <TouchableOpacity onPress={() => setEditingComment(null)}>
                      <Text style={commentStyles.actionLabel}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveCommentEdit}>
                      <Text style={[commentStyles.actionLabel, { color: BLUE }]}>Lưu</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={commentStyles.cContent}>{item.content}</Text>
              )}
            </View>
            <View style={commentStyles.actionLine}>
              <Text style={commentStyles.cTime}>{formatPostTime(item.createdAt)}</Text>
              <TouchableOpacity onPress={() => handleLikeComment(item.commentId)}>
                <Text style={[commentStyles.actionLabel, item.likes?.includes(currentUserId) && { color: '#FF3B5C' }]}>Thích</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReplyTarget(item)}>
                <Text style={commentStyles.actionLabel}>Trả lời</Text>
              </TouchableOpacity>
              {String(item.userId) === String(currentUserId) && (
                <>
                  <TouchableOpacity onPress={() => handleEditComment(item)}>
                    <Ionicons name="create-outline" size={14} color={BLUE} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteComment(item.commentId)}>
                    <Ionicons name="trash-outline" size={14} color="#FF3B5C" />
                  </TouchableOpacity>
                </>
              )}
              {(item.likeCount || 0) > 0 && (
                <TouchableOpacity onPress={() => setReactionUsers(item.likeUsers || [])} style={commentStyles.commentReaction}>
                  <Ionicons name="heart" size={12} color="#FF3B5C" />
                  <Text style={{ fontSize: 11, color: '#FF3B5C' }}>{item.likeCount}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        {item.children.length > 0 && !isExpanded && (
          <TouchableOpacity onPress={() => setExpanded((current) => new Set(current).add(item.commentId))} style={commentStyles.replyToggle}>
            <Text style={commentStyles.replyToggleText}>Xem {item.children.length} phản hồi</Text>
          </TouchableOpacity>
        )}
        {isExpanded && (
          <View>
            {item.children.map((child) => renderComment(child, depth + 1))}
            <TouchableOpacity onPress={() => setExpanded((current) => { const next = new Set(current); next.delete(item.commentId); return next; })} style={commentStyles.replyToggle}>
              <Text style={commentStyles.replyToggleText}>Ẩn phản hồi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <KeyboardAvoidingView style={commentStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={commentStyles.container}>
          <View style={commentStyles.header}>
            <Text style={commentStyles.title}>Bình luận</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text.primary} /></TouchableOpacity>
          </View>
          
            <ScrollView style={{ flex: 1 }}>
              {roots.length ? roots.map((item) => renderComment(item)) : <Text style={commentStyles.empty}>Chưa có bình luận</Text>}
            </ScrollView>
          
          {replyTarget && (
            <View style={{ backgroundColor: '#F0F2F5', paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#666' }}>Đang trả lời bình luận của <Text style={{ fontWeight: 'bold' }}>{replyTarget.authorName}</Text></Text>
              <TouchableOpacity onPress={() => {
                setReplyTarget(null);
              }}>
                <Ionicons name="close-circle" size={16} color="#999" />
              </TouchableOpacity>
            </View>
          )}

          <View style={commentStyles.inputRow}>
            <TextInput
              style={commentStyles.input}
              placeholder="Viết bình luận..."
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity onPress={handleSend} disabled={sending}>
              <Ionicons name="send" size={24} color={text.trim() ? BLUE : '#CCC'} />
            </TouchableOpacity>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ReactionListModal users={reactionUsers} onClose={() => setReactionUsers(null)} />
    </>
  );
};

// ─── Compose Modal (Tạo Bài Viết) ────────────────────────────────────────────
const ComposeModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onPostCreated: (post: PostItem) => void;
  currentUser: any;
}> = ({ visible, onClose, onPostCreated, currentUser }) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [posting, setPosting] = useState(false);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Cần quyền truy cập thư viện ảnh'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setMedia((prev) => [
        ...prev,
        ...result.assets.map((a) => ({ uri: a.uri, type: (a.type === 'video' ? 'video' : 'image') as 'image' | 'video' })),
      ]);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && media.length === 0) return;
    setPosting(true);
    try {
      const uploadedMedia: PostMedia[] = [];
      for (const m of media) {
        const name = m.uri.split('/').pop() || 'media.jpg';
        const res = await uploadApi.uploadDirect({ uri: m.uri, name, type: m.type === 'video' ? 'video/mp4' : 'image/jpeg' }, 'media');
        uploadedMedia.push({ url: res.url, type: m.type, name });
      }
      
      const post = await postsApi.createPost({ content: content.trim(), media: uploadedMedia });
      onPostCreated(post);
      setContent('');
      setMedia([]);
    } catch (e: any) {
      // Fallback post online
      const newPostFallback: PostItem = {
        postId: `post-${Date.now()}`,
        userId: currentUser?.userId,
        authorName: currentUser?.display_name || currentUser?.username || 'User',
        authorAvatar: currentUser?.avatar_url,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        likes: [],
        media: media.length > 0 ? [{ url: media[0].uri, type: 'image', name: 'attachment' }] : []
      };
      onPostCreated(newPostFallback);
      setContent('');
      setMedia([]);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={composeStyles.container}>
        <View style={composeStyles.header}>
          <TouchableOpacity onPress={onClose} style={composeStyles.headerCloseBtn}>
            <Ionicons name="close-outline" size={28} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={composeStyles.headerDropdown}>
            <Ionicons name="people" size={16} color="#444" />
            <Text style={composeStyles.headerDropdownText}>Bạn bè</Text>
            <Ionicons name="chevron-down" size={14} color="#666" />
          </TouchableOpacity>

          <View style={composeStyles.headerRight}>
            <TouchableOpacity style={composeStyles.headerIconBtn}>
              <Text style={composeStyles.headerIconText}>Aa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={composeStyles.headerIconBtn}>
              <Ionicons name="color-palette-outline" size={18} color="#008AF3" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePost} disabled={posting || (!content.trim() && media.length === 0)}>
              {posting ? <ActivityIndicator size="small" color={BLUE} /> : (
                <Ionicons name="send" size={22} color={(!content.trim() && media.length === 0) ? '#CCC' : BLUE} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={composeStyles.input}
          placeholder="Bạn đang nghĩ gì?"
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          textAlignVertical="top"
          placeholderTextColor="#999"
        />

        {media.length > 0 && (
          <View style={composeStyles.mediaRow}>
            {media.map((m, i) => (
              <View key={i} style={composeStyles.mediaThumb}>
                <Image source={{ uri: m.uri }} style={composeStyles.mediaImg} />
                <TouchableOpacity style={composeStyles.removeMedia} onPress={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close-circle" size={22} color="#FF3B5C" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={composeStyles.quickActionsRow}>
          <TouchableOpacity style={composeStyles.quickActionBtn}>
            <Ionicons name="musical-notes-outline" size={16} color="#555" />
            <Text style={composeStyles.quickActionText}>Nhạc</Text>
          </TouchableOpacity>
          <TouchableOpacity style={composeStyles.quickActionBtn} onPress={pickMedia}>
            <Ionicons name="images-outline" size={16} color="#555" />
            <Text style={composeStyles.quickActionText}>Album</Text>
          </TouchableOpacity>
          <TouchableOpacity style={composeStyles.quickActionBtn}>
            <Ionicons name="pricetag-outline" size={16} color="#555" />
            <Text style={composeStyles.quickActionText}>Với bạn bè</Text>
          </TouchableOpacity>
        </View>

        <View style={composeStyles.bottomToolbar}>
          <TouchableOpacity style={composeStyles.bottomToolBtn}>
            <Ionicons name="happy-outline" size={24} color="#777" />
          </TouchableOpacity>
          <TouchableOpacity style={composeStyles.bottomToolBtn} onPress={pickMedia}>
            <Ionicons name="image-outline" size={24} color="#777" />
          </TouchableOpacity>
          <TouchableOpacity style={composeStyles.bottomToolBtn}>
            <Ionicons name="play-circle-outline" size={24} color="#777" />
          </TouchableOpacity>
          <TouchableOpacity style={composeStyles.bottomToolBtn}>
            <Ionicons name="link-outline" size={24} color="#777" />
          </TouchableOpacity>
          <TouchableOpacity style={composeStyles.bottomToolBtn}>
            <Ionicons name="location-outline" size={24} color="#777" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E4E6EB' },
  header: {
    backgroundColor: BLUE,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerSearchText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500'
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  headerIconBtn: {
    padding: 4
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { ...typography.h3, color: colors.text.tertiary, marginTop: 16 },
  emptySubtext: { ...typography.body, color: colors.text.tertiary, marginTop: 4 },
});

const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#E4E6EB',
    width: '100%'
  },
  quickPost: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8
  },
  quickPostInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  quickPostInput: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingLeft: 4
  },
  quickPostPlaceholder: {
    color: '#8e8e93',
    fontSize: 15
  },
  quickPostActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E6EB',
    marginTop: 12,
    paddingTop: 10,
    justifyContent: 'space-between'
  },
  quickPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  quickPostBtnText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500'
  },
  storySection: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    marginBottom: 8
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 10
  },
  storyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  storyTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#333'
  },
  storyCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  storyCounterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9800'
  },
  storyList: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingTop: 4
  },
  storyCard: {
    alignItems: 'center',
    marginRight: 14,
    width: 68
  },
  createStoryContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    position: 'relative'
  },
  storyAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#FFF'
  },
  createStoryOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 2
  },
  createStoryCircle: {
    backgroundColor: BLUE,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  friendStoryContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: '#008AF3',
    padding: 1.5
  },
  friendStoryOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 2
  },
  friendStoryBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden'
  },
  friendStoryBadgeAvatar: {
    width: '100%',
    height: '100%'
  },
  storyName: {
    fontSize: 11,
    color: '#444',
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center'
  }
});

const cardStyles = StyleSheet.create({
  container: { backgroundColor: '#FFF', marginTop: 8, paddingVertical: 12, paddingHorizontal: 16 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  authorInfo: { flex: 1, marginLeft: 10 },
  authorName: { fontWeight: '700', fontSize: 15, color: colors.text.primary },
  time: { fontSize: 12, color: colors.text.tertiary, marginTop: 2, fontWeight: 'bold', fontFamily: 'monospace' },
  moreBtn: { padding: 4 },
  content: { fontSize: 15, color: colors.text.primary, lineHeight: 22, marginBottom: 10 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  mediaImage: { borderRadius: 8 },
  linkCard: {
    backgroundColor: '#F2F3F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E4E6EB'
  },
  linkDomain: {
    fontSize: 12,
    color: BLUE,
    fontWeight: '600',
    marginBottom: 2
  },
  linkUrl: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E6EB'
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statText: { fontSize: 13, color: '#555', fontWeight: '500' },
  actionRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E6EB', paddingTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  actionText: { fontSize: 14, color: '#555', fontWeight: '600' },
});

const commentStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  container: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%', minHeight: '50%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4E6EB' },
  title: { fontWeight: '700', fontSize: 16 },
  item: { flexDirection: 'row', padding: 12, gap: 8 },
  bubble: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 12, padding: 10 },
  cAuthor: { fontWeight: '700', fontSize: 13, marginBottom: 2 },
  cContent: { fontSize: 14, color: colors.text.primary },
  cTime: { fontSize: 11, color: colors.text.tertiary, marginTop: 4 },
  empty: { textAlign: 'center', padding: 32, color: colors.text.tertiary },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E6EB', gap: 8 },
  input: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 80, fontSize: 14 },
  nestedItem: { marginLeft: 28, borderLeftWidth: 1, borderLeftColor: '#D5D9DE' },
  actionLine: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 5, paddingHorizontal: 8 },
  actionLabel: { fontSize: 11, color: '#666', fontWeight: '700' },
  commentReaction: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 2 },
  replyToggle: { marginLeft: 52, paddingBottom: 6 },
  replyToggleText: { fontSize: 12, color: '#666', fontWeight: '700' },
  editInput: { borderWidth: 1, borderColor: '#D5D9DE', borderRadius: 8, backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 6, fontSize: 14 },
});

const composeStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E6EB'
  },
  headerCloseBtn: {
    padding: 4
  },
  headerDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F2F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20
  },
  headerDropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  headerIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555'
  },
  input: { flex: 1, paddingHorizontal: 16, fontSize: 16, lineHeight: 24, paddingTop: 16 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  mediaThumb: { position: 'relative' },
  mediaImg: { width: 80, height: 80, borderRadius: 8 },
  removeMedia: { position: 'absolute', top: -6, right: -6 },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E6EB'
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F2F5',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20
  },
  quickActionText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600'
  },
  bottomToolbar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E6EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    backgroundColor: '#FFF'
  },
  bottomToolBtn: {
    padding: 6
  }
});

export default TimelineScreen;
