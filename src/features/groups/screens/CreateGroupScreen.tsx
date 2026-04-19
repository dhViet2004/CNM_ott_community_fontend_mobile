import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch } from '@store/hooks';
import { addGroup } from '@store/slices/groupsSlice';
import { groupsApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';
import { Button, Input } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'CreateGroup'>;

const CreateGroupScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhóm');
      return;
    }
    if (name.trim().length < 3) {
      setError('Tên nhóm phải có ít nhất 3 ký tự');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const group = await groupsApi.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        is_private: isPrivate,
      });
      dispatch(addGroup(group));
      Alert.alert('Thành công', `Nhóm "${group.name}" đã được tạo!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tạo nhóm');
    } finally {
      setLoading(false);
    }
  }, [name, description, isPrivate, dispatch, navigation]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Tạo nhóm mới</Text>

      <View style={styles.formSection}>
        <Input
          label="Tên nhóm *"
          placeholder="VD: Cộng đồng OTT"
          value={name}
          onChangeText={(text) => { setName(text); setError(''); }}
          size="lg"
          containerStyle={styles.inputContainer}
          error={error}
        />

        <Input
          label="Mô tả (tùy chọn)"
          placeholder="Giới thiệu ngắn về nhóm"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          size="lg"
          containerStyle={styles.inputContainer}
        />

        <Button
          title="Tạo nhóm"
          onPress={handleCreate}
          loading={loading}
          size="lg"
          fullWidth
          style={styles.createButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { paddingHorizontal: spacing.screenPadding },
  title: { ...typography.h1, color: colors.text.primary, marginBottom: spacing.xxl },
  formSection: { marginBottom: spacing.xxl },
  inputContainer: { marginBottom: spacing.lg },
  createButton: { marginTop: spacing.md },
});

export default CreateGroupScreen;
