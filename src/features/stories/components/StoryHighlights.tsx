import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { storiesApi, type StoryItem } from '@api/endpoints';
import { resolveUrl } from '@/utils/url';
import StoryViewerModal from './StoryViewerModal';

const HighlightCard: React.FC<{ story: StoryItem; onPress: () => void }> = ({ story, onPress }) => {
  const [resolvedMedia, setResolvedMedia] = useState<string>();
  useEffect(() => {
    let mounted = true;
    if (story.mediaUrl) resolveUrl(story.mediaUrl).then((url) => mounted && setResolvedMedia(url));
    return () => {
      mounted = false;
    };
  }, [story.mediaUrl]);

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: story.backgroundColor || '#111827' }]} onPress={onPress}>
      {resolvedMedia && <Image source={{ uri: resolvedMedia }} style={styles.image} />}
      {!!story.text && <Text style={styles.cardText} numberOfLines={3}>{story.text}</Text>}
    </TouchableOpacity>
  );
};

interface Props {
  userId: string;
  currentUserId?: string;
}

const StoryHighlights: React.FC<Props> = ({ userId, currentUserId }) => {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);

  const load = useCallback(() => {
    storiesApi.getHighlights(userId).then((result) => setStories(result.stories || [])).catch(() => setStories([]));
  }, [userId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const isMine = String(userId) === String(currentUserId);
  if (!stories.length && !isMine) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Tin nổi bật</Text>
      {stories.length ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={stories}
          keyExtractor={(item) => item.storyId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <HighlightCard story={item} onPress={() => setActiveStory(item)} />}
        />
      ) : (
        <Text style={styles.emptyText}>Story đã lưu vào bộ sưu tập sẽ hiển thị tại đây.</Text>
      )}
      <StoryViewerModal
        story={activeStory}
        currentUserId={currentUserId}
        onClose={() => setActiveStory(null)}
        onHighlightChanged={(updated) => {
          setActiveStory(updated);
          setStories((current) => updated.isHighlighted ? current.map((item) => item.storyId === updated.storyId ? updated : item) : current.filter((item) => item.storyId !== updated.storyId));
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 14, paddingVertical: 14, backgroundColor: '#FFF' },
  title: { marginBottom: 12, paddingHorizontal: 16, color: '#111827', fontSize: 18, fontWeight: '800' },
  emptyText: { paddingHorizontal: 16, color: '#6B7280', fontSize: 13 },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { width: 116, height: 170, overflow: 'hidden', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardText: { paddingHorizontal: 10, color: '#FFF', textAlign: 'center', fontSize: 15, fontWeight: '800' },
});

export default StoryHighlights;
