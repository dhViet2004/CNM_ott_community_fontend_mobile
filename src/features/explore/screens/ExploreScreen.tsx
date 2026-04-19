import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import type { MainTabScreenProps } from '@navigation/types';

type Props = MainTabScreenProps<'ExploreTab'>;

const ExploreScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Khám phá</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.icon}>🌐</Text>
        <Text style={styles.title}>Khám phá</Text>
        <Text style={styles.subtitle}>Tính năng đang phát triển</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    height: 56,
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.inverse,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 64, marginBottom: spacing.lg },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.tertiary,
  },
});

export default ExploreScreen;