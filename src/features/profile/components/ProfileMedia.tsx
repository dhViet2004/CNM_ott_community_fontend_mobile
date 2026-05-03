import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - spacing.screenPadding * 2 - spacing.xs * 2) / 3;

interface ProfileMediaProps {
  photos?: string[];
  totalPhotos?: number;
}

const ProfileMedia: React.FC<ProfileMediaProps> = ({ photos = [], totalPhotos = 0 }) => {
  // Dữ liệu mẫu nếu chưa có ảnh thực tế
  const displayPhotos = photos.length > 0 
    ? photos.slice(0, 3) 
    : [
        'https://picsum.photos/seed/1/400/400',
        'https://picsum.photos/seed/2/400/400',
        'https://picsum.photos/seed/3/400/400'
      ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Ảnh</Text>
          <Text style={styles.count}>{totalPhotos || 3}</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.seeAll}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mediaGrid}>
        {displayPhotos.map((uri, index) => (
          <TouchableOpacity key={index} style={styles.mediaItem}>
            <Image source={{ uri }} style={styles.image} />
          </TouchableOpacity>
        ))}
      </View>
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
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ProfileMedia;
