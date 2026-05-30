import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  Modal, Dimensions, Alert, ActivityIndicator, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { colors, spacing, typography } from '@theme';
import { messageApi } from '@api/endpoints';
import { resolveUrl } from '@/utils/url';
import type { RootStackScreenProps } from '@navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLUE = '#008AF3';
const TABS = ['Ảnh', 'File', 'Link'] as const;
type TabType = typeof TABS[number];

type Props = RootStackScreenProps<'MediaGallery'>;

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'file' | 'link';
  url?: string;
  name: string;
  size?: string;
  senderName?: string;
  createdAt?: string;
  messageId?: string;
  linkDomain?: string;
}

const MediaGalleryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, title, initialTab } = route.params;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'Ảnh');
  const [images, setImages] = useState<MediaItem[]>([]);
  const [files, setFiles] = useState<MediaItem[]>([]);
  const [links, setLinks] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerImage, setViewerImage] = useState<MediaItem | null>(null);

  useEffect(() => {
    loadMedia();
  }, [conversationId]);

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      const res = await messageApi.getConversationMessages(conversationId, 200);
      const msgs = res.messages || [];

      const imgItems: MediaItem[] = [];
      const fileItems: MediaItem[] = [];
      const linkItems: MediaItem[] = [];

      for (const m of msgs) {
        const type = m.contentType || m.type;
        const senderName = m.sender_name || 'Unknown';
        const createdAt = m.createdAt || m.created_at;

        // Images/Videos
        if (type === 'image' || type === 'video') {
          const att = m.attachments?.[0];
          const rawUrl = att?.url || m.file_url || '';
          const resolved = rawUrl ? await resolveUrl(rawUrl) : undefined;
          imgItems.push({
            id: String(m.id),
            type: type === 'video' ? 'video' : 'image',
            url: resolved,
            name: att?.name || m.content || 'Ảnh',
            senderName,
            createdAt,
            messageId: String(m.id),
          });
        }

        // Files
        if (type === 'file') {
          const att = m.attachments?.[0];
          const rawUrl = att?.url || m.file_url || '';
          const resolved = rawUrl ? await resolveUrl(rawUrl) : undefined;
          fileItems.push({
            id: String(m.id),
            type: 'file',
            url: resolved,
            name: att?.name || m.file_name || m.content || 'Tệp',
            size: att?.size ? `${(att.size / 1024).toFixed(0)} KB` : m.file_size ? `${(m.file_size / 1024).toFixed(0)} KB` : '',
            senderName,
            createdAt,
            messageId: String(m.id),
          });
        }

        // Links
        if (type === 'text' && m.content) {
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const match = m.content.match(urlRegex);
          if (match) {
            for (const url of match) {
              try {
                const domain = new URL(url).hostname.toUpperCase();
                linkItems.push({
                  id: `${m.id}-${url}`,
                  type: 'link',
                  url,
                  name: m.content.length > 60 ? m.content.substring(0, 60) + '...' : m.content,
                  senderName,
                  createdAt,
                  messageId: String(m.id),
                  linkDomain: domain,
                });
              } catch {}
            }
          }
        }
      }

      setImages(imgItems);
      setFiles(fileItems);
      setLinks(linkItems);
    } catch (e: any) {
      console.error('Failed to load media gallery:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (item: MediaItem) => {
    if (!item.url) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Cần quyền truy cập bộ nhớ'); return; }
      const fileUri = FileSystem.documentDirectory + (item.name || 'download');
      const { uri } = await FileSystem.downloadAsync(item.url, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Thành công', 'Đã lưu về máy');
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể tải xuống');
    }
  };

  const handleImageOptions = (item: MediaItem) => {
    Alert.alert('Tùy chọn', undefined, [
      { text: 'Xem tin nhắn gốc', onPress: () => {
        navigation.navigate('Chat', { conversationId, title, focusedMessageId: item.messageId });
      }},
      { text: 'Lưu về máy', onPress: () => handleDownload(item) },
      { text: 'Chia sẻ', onPress: () => item.url && Share.share({ url: item.url, message: item.url }) },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const getData = () => {
    switch (activeTab) {
      case 'Ảnh': return images;
      case 'File': return files;
      case 'Link': return links;
    }
  };

  const groupByDate = (items: MediaItem[]) => {
    const groups: { title: string; data: MediaItem[] }[] = [];
    const map = new Map<string, MediaItem[]>();
    for (const item of items) {
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Không rõ';
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(item);
    }
    map.forEach((data, title) => groups.push({ title, data }));
    return groups;
  };

  const renderImageGrid = () => {
    const groups = groupByDate(images);
    return (
      <FlatList
        data={groups}
        keyExtractor={(g) => g.title}
        renderItem={({ item: group }) => (
          <View>
            <Text style={galStyles.dateHeader}>{group.title}</Text>
            <View style={galStyles.grid}>
              {group.data.map((item) => (
                <TouchableOpacity key={item.id} style={galStyles.gridItem} onPress={() => setViewerImage(item)} onLongPress={() => handleImageOptions(item)}>
                  {item.url ? <Image source={{ uri: item.url }} style={galStyles.gridImg} /> : <View style={[galStyles.gridImg, { backgroundColor: '#E4E6EB', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="image-outline" size={24} color="#999" /></View>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={galStyles.empty}>Chưa có ảnh/video nào</Text>}
      />
    );
  };

  const renderFileList = () => (
    <FlatList
      data={files}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={galStyles.fileItem} onPress={() => item.url && Share.share({ message: item.url })}>
          <View style={galStyles.fileIcon}><Ionicons name="document-outline" size={28} color={BLUE} /></View>
          <View style={galStyles.fileInfo}>
            <Text style={galStyles.fileName} numberOfLines={1}>{item.name}</Text>
            <Text style={galStyles.fileMeta}>{item.size} • {item.senderName}</Text>
          </View>
          <TouchableOpacity onPress={() => handleImageOptions(item)}><Ionicons name="ellipsis-horizontal" size={20} color="#999" /></TouchableOpacity>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={galStyles.empty}>Chưa có tệp nào</Text>}
    />
  );

  const renderLinkList = () => (
    <FlatList
      data={links}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={galStyles.fileItem} onPress={() => item.url && Share.share({ message: item.url })}>
          <View style={[galStyles.fileIcon, { backgroundColor: '#EBF5FF' }]}><Ionicons name="link-outline" size={24} color={BLUE} /></View>
          <View style={galStyles.fileInfo}>
            {item.linkDomain && <Text style={galStyles.linkDomain}>{item.linkDomain}</Text>}
            <Text style={galStyles.fileName} numberOfLines={2}>{item.name}</Text>
            <Text style={galStyles.fileMeta}>{item.senderName}</Text>
          </View>
          <TouchableOpacity onPress={() => handleImageOptions(item)}><Ionicons name="ellipsis-horizontal" size={20} color="#999" /></TouchableOpacity>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={galStyles.empty}>Chưa có liên kết nào</Text>}
    />
  );

  return (
    <View style={galStyles.container}>
      <View style={[galStyles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={galStyles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={galStyles.headerTitle}>Ảnh, file, link</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={galStyles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab} style={[galStyles.tab, activeTab === tab && galStyles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[galStyles.tabText, activeTab === tab && galStyles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={galStyles.loadingContainer}><ActivityIndicator size="large" color={BLUE} /></View>
      ) : (
        activeTab === 'Ảnh' ? renderImageGrid() : activeTab === 'File' ? renderFileList() : renderLinkList()
      )}

      {/* Image Viewer Modal */}
      <Modal visible={!!viewerImage} transparent animationType="fade" onRequestClose={() => setViewerImage(null)}>
        <View style={galStyles.viewerBg}>
          <TouchableOpacity style={[galStyles.viewerClose, { top: insets.top + 10 }]} onPress={() => setViewerImage(null)}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[galStyles.viewerMore, { top: insets.top + 10 }]} onPress={() => { if (viewerImage) handleImageOptions(viewerImage); }}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
          </TouchableOpacity>
          {viewerImage?.url && <Image source={{ uri: viewerImage.url }} style={galStyles.viewerImg} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
};

const COL = 3;
const GAP = 2;
const IMG_SIZE = (SCREEN_WIDTH - GAP * (COL + 1)) / COL;

const galStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10, height: 56 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  backBtn: { padding: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4E6EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: BLUE },
  tabText: { fontSize: 15, color: colors.text.tertiary, fontWeight: '500' },
  tabTextActive: { color: BLUE, fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dateHeader: { fontSize: 13, fontWeight: '600', color: colors.text.tertiary, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: GAP },
  gridItem: { width: IMG_SIZE, height: IMG_SIZE },
  gridImg: { width: '100%', height: '100%' },
  empty: { textAlign: 'center', padding: 40, color: colors.text.tertiary, fontSize: 14 },
  fileItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4E6EB', gap: 12 },
  fileIcon: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  fileMeta: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  linkDomain: { fontSize: 12, fontWeight: '700', color: BLUE, marginBottom: 2 },
  viewerBg: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  viewerClose: { position: 'absolute', left: 16, zIndex: 10 },
  viewerMore: { position: 'absolute', right: 16, zIndex: 10 },
  viewerImg: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
});

export default MediaGalleryScreen;
