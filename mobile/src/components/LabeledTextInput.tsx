/** Etiketli metin girişi — prototip Field + Input karşılığı; renkler tema token'larından. */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface LabeledTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Girdi önünde sabit ön ek (örn. "+90"). */
  prefix?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
}

export function LabeledTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  keyboardType,
  maxLength,
  autoCapitalize,
  autoFocus,
}: LabeledTextInputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text
        style={{
          fontSize: theme.fontSize.sm,
          fontWeight: '600',
          color: theme.colors.ink2,
          marginBottom: theme.spacing.sm - 1,
          marginLeft: theme.spacing.xs,
        }}
      >
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.sm,
            borderColor: focused ? theme.colors.brand : theme.colors.line,
            paddingHorizontal: theme.spacing.md + 4,
          },
        ]}
      >
        {prefix !== undefined ? (
          <Text
            style={{
              fontSize: theme.fontSize.md + 1,
              fontWeight: '700',
              color: theme.colors.ink2,
              marginRight: theme.spacing.sm,
            }}
          >
            {prefix}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.ink3}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { fontSize: theme.fontSize.md + 1, color: theme.colors.ink }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1.5 },
  input: { flex: 1, paddingVertical: 0, fontWeight: '500' },
});
