import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Button } from '@components/common';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cài đặt tài khoản</Text>
      
      <View style={styles.section}>
        <Button
          title="Đổi mật khẩu"
          onPress={() => navigation.navigate('ChangePassword')}
          variant="outline"
          fullWidth
          style={styles.button}
        />
        <Button
          title="Đăng xuất"
          onPress={() => {}}
          variant="ghost"
          fullWidth
          style={styles.button}
        />
      </View>

      <Text style={styles.footerText}>Phiên bản 1.0.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.screenPadding,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xxl,
    marginTop: spacing.xl,
  },
  section: {
    flex: 1,
  },
  button: {
    marginBottom: spacing.md,
    justifyContent: 'flex-start',
  },
  footerText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});

export default SettingsScreen;
