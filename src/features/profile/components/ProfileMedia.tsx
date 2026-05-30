import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Modal, Share } from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - spacing.screenPadding * 2 - spacing.xs * 2) / 3;

interface ProfileMediaProps {
  photos?: string[];
  totalPhotos?: number;
  onSeeAll?: () => void;
}

const ProfileMedia: React.FC<ProfileMediaProps> = ({ photos = [], totalPhotos = 0, onSeeAll }) => {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Render đúng số lượng ảnh thật của người dùng
  // Nếu thiếu để đủ 3 ô, ta render thêm ô nét đứt
  const renderItems = () => {
    const items = [];
    
    // Render ảnh thật
    photos.slice(0, 3).forEach((uri, index) => {
      items.push(
        <TouchableOpacity 
          key={`photo-${index}`} 
          style={styles.mediaItem}
          activeOpacity={0.8}
          onPress={() => setActivePhoto(uri)}
        >
          <Image source={{ uri }} style={styles.image} />
        </TouchableOpacity>
      );
    });
    
    // Đệm thêm các ô trống nét đứt cho đủ tối thiểu 3 cột
    const emptyCount = Math.max(0, 3 - photos.length);
    for (let i = 0; i < emptyCount; i++) {
      items.push(
        <View key={`empty-${i}`} style={styles.emptyItem}>
          <Ionicons name="image-outline" size={24} color="#cbd5e1" />
        </View>
      );
    }
    
    return items;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Ảnh</Text>
          <Text style={styles.count}>{photos.length}</Text>
        </View>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mediaGrid}>
        {renderItems()}
      </View>

      {/* ── Photo Lightbox Modal ── */}
      <Modal
        visible={!!activePhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePhoto(null)}
      >
        <View style={styles.lightboxContainer}>
          {/* Header */}
          <View style={styles.lightboxHeader}>
            <TouchableOpacity onPress={() => setActivePhoto(null)} style={styles.lightboxButton}>
              <Text style={styles.lightboxCloseText}>Đóng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (activePhoto) {
                  Share.share({ message: activePhoto });
                }
              }}
              style={styles.lightboxButton}
            >
              <Text style={styles.lightboxShareText}>Chia sẻ</Text>
            </TouchableOpacity>
          </View>

          {/* Image */}
          {activePhoto && (
            <Image
              source={{ uri: activePhoto }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  count: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  seeAll: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mediaItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
  },
  emptyItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxHeader: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  lightboxButton: {
    padding: 8,
  },
  lightboxCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lightboxShareText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
});

export default ProfileMedia;
