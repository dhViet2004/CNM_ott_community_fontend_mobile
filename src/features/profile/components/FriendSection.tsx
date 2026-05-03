import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { colors, spacing, typography } from '@theme';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - spacing.screenPadding * 2 - spacing.md * 2) / 3;

interface Friend {
  id: string;
  fullName: string;
  avatarUrl?: string;
}

interface FriendSectionProps {
  friends?: Friend[];
  totalFriends?: number;
  onSeeAll?: () => void;
}

const FriendSection: React.FC<FriendSectionProps> = ({ 
  friends = [], 
  totalFriends = 0,
  onSeeAll 
}) => {
  // Dữ liệu mẫu
  const displayFriends = friends.length > 0 ? friends.slice(0, 6) : [
    { id: '1', fullName: 'Minh Quân', avatarUrl: 'https://i.pravatar.cc/150?u=1' },
    { id: '2', fullName: 'Bảo Trân', avatarUrl: 'https://i.pravatar.cc/150?u=2' },
    { id: '3', fullName: 'Thành Nam', avatarUrl: 'https://i.pravatar.cc/150?u=3' },
    { id: '4', fullName: 'Phương Anh', avatarUrl: 'https://i.pravatar.cc/150?u=4' },
    { id: '5', fullName: 'Hoàng Long', avatarUrl: 'https://i.pravatar.cc/150?u=5' },
    { id: '6', fullName: 'Thúy Vy', avatarUrl: 'https://i.pravatar.cc/150?u=6' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Bạn bè</Text>
          <Text style={styles.count}>{totalFriends || 6}</Text>
        </View>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {displayFriends.map((friend) => (
          <TouchableOpacity key={friend.id} style={styles.item}>
            <Image 
              source={{ uri: friend.avatarUrl || 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
            />
            <Text style={styles.name} numberOfLines={1}>{friend.fullName}</Text>
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
  titleContainer: {
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  name: {
    ...typography.caption,
    color: colors.text.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default FriendSection;
