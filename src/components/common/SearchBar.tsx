import React, { useCallback, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing } from '@theme';
import { Icons, IconSize } from './Icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  inputStyle?: ViewStyle;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm...',
  style,
  inputStyle,
  autoFocus = false,
}) => {
  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchIconContainer}>
        {Icons.search(IconSize.sm)}
      </View>
      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={colors.text.placeholder}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.clearButton}
        >
          {Icons.close(IconSize.sm)}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 38,
  },
  searchIconContainer: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchBar;
