/**
 * 6 haneli OTP kod kutuları — prototip CodeInput karşılığı (theme.jsx).
 * Görünmez tek TextInput tüm kodu tutar; kutulara basınca klavye açılır.
 */
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface OtpCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  /** Kilit (OTP_LOCKED) durumunda giriş kapatılır. */
  disabled?: boolean;
}

export function OtpCodeInput({ value, onChange, length = 6, disabled = false }: OtpCodeInputProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    onChange(text.replace(/\D/g, '').slice(0, length));
  };

  // İmlecin durduğu kutu — dolu hanelerden sonraki ilk boş kutu.
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} disabled={disabled}>
      <View style={styles.row}>
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] ?? '';
          const highlighted = digit !== '' || (focused && index === activeIndex && !disabled);
          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: highlighted ? theme.colors.brand : theme.colors.line,
                  borderRadius: theme.radius.sm,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: theme.fontSize.xl,
                  fontWeight: '800',
                  color: theme.colors.navy,
                }}
              >
                {digit}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        editable={!disabled}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  box: { width: 48, height: 58, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  // Görünmez ama odaklanabilir input (ekran dışına taşınmaz; erişilebilirlik için var).
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
