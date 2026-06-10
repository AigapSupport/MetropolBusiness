/**
 * Anket doldurma (PRD §6.2, prototip screens-home.jsx > Survey).
 * Prototipteki gibi tek soru/sayfa: ilerleme çubuğu + soru + yanıt alanı + alt buton.
 * Soru tipleri: single (radyo), multi (çoklu seçim), text (açık metin), rating (1-5).
 * Gönderimde 409 SURVEY_ALREADY_ANSWERED özel mesajla gösterilir (PRD §6.5);
 * başarıda geri dönülür, anket listesi useSubmitSurvey içinde yenilenir.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SurveyQuestion, SurveyResponseRequest } from '@shared/home';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { isSurveyAlreadyAnsweredError, useSubmitSurvey, useSurveyDetail } from '@/hooks/useHome';
import type { HomeStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<HomeStackParamList, 'SurveyFill'>;

/** Soru bazlı yanıt: single/text/rating → string, multi → string[] (@shared SurveyAnswer.value). */
type AnswerValue = string | string[];

const RATING_VALUES = ['1', '2', '3', '4', '5'] as const;

/** Tekli/çoklu seçim satırı — radyo (daire) veya çoklu (kare) işaretleyiciyle. */
function ChoiceOptionRow({
  label,
  selected,
  round,
  onPress,
}: {
  label: string;
  selected: boolean;
  round: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={round ? 'radio' : 'checkbox'}
      accessibilityState={{ selected }}
      style={[
        styles.optionRow,
        {
          padding: theme.spacing.md + 4,
          gap: theme.spacing.md,
          borderRadius: theme.radius.sm,
          borderColor: selected ? theme.colors.brand : theme.colors.line,
          backgroundColor: selected ? theme.colors.brandSoft : theme.colors.card,
        },
      ]}
    >
      <View
        style={[
          styles.optionMark,
          {
            borderRadius: round ? 999 : 6,
            borderColor: selected ? theme.colors.brand : theme.colors.line,
            backgroundColor: selected ? theme.colors.brand : 'transparent',
          },
        ]}
      >
        {selected ? (
          <Text style={{ color: theme.colors.card, fontSize: theme.fontSize.xs, fontWeight: '800' }}>
            ✓
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.flex1,
          { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** 1-5 derecelendirme — kare numara butonları + uç etiketleri (prototip scale). */
function RatingScale({ value, onSelect }: { value: string; onSelect: (next: string) => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View>
      <View style={[styles.ratingRow, { gap: theme.spacing.sm }]}>
        {RATING_VALUES.map((rating) => {
          const selected = value === rating;
          return (
            <Pressable
              key={rating}
              onPress={() => onSelect(rating)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.ratingButton,
                {
                  borderRadius: theme.radius.sm,
                  borderColor: selected ? theme.colors.brand : theme.colors.line,
                  backgroundColor: selected ? theme.colors.brand : theme.colors.card,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: theme.fontSize.xl,
                  fontWeight: '800',
                  color: selected ? theme.colors.card : theme.colors.ink,
                }}
              >
                {rating}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.ratingLabels, { marginTop: theme.spacing.sm }]}>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.ink3, fontWeight: '600' }}>
          {t('survey.ratingLow')}
        </Text>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.ink3, fontWeight: '600' }}>
          {t('survey.ratingHigh')}
        </Text>
      </View>
    </View>
  );
}

/** Soru tipine göre yanıt alanını çizer. */
function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: AnswerValue | undefined;
  onChange: (next: AnswerValue) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const options = question.options ?? [];

  if (question.type === 'rating') {
    return <RatingScale value={typeof value === 'string' ? value : ''} onSelect={onChange} />;
  }

  if (question.type === 'text') {
    return (
      <TextInput
        value={typeof value === 'string' ? value : ''}
        onChangeText={onChange}
        placeholder={t('survey.textPlaceholder')}
        placeholderTextColor={theme.colors.ink3}
        multiline
        textAlignVertical="top"
        style={[
          styles.textArea,
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.sm,
            borderColor: theme.colors.line,
            padding: theme.spacing.md + 4,
            fontSize: theme.fontSize.md,
            color: theme.colors.ink,
          },
        ]}
      />
    );
  }

  if (question.type === 'multi') {
    const selectedOptions = Array.isArray(value) ? value : [];
    const toggleOption = (option: string) =>
      onChange(
        selectedOptions.includes(option)
          ? selectedOptions.filter((item) => item !== option)
          : [...selectedOptions, option],
      );
    return (
      <View style={{ gap: theme.spacing.sm + 2 }}>
        {options.map((option) => (
          <ChoiceOptionRow
            key={option}
            label={option}
            round={false}
            selected={selectedOptions.includes(option)}
            onPress={() => toggleOption(option)}
          />
        ))}
      </View>
    );
  }

  // single — tekli seçim (radyo)
  return (
    <View style={{ gap: theme.spacing.sm + 2 }}>
      {options.map((option) => (
        <ChoiceOptionRow
          key={option}
          label={option}
          round
          selected={value === option}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
}

export function SurveyFillScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const detail = useSurveyDetail(id);
  const submitSurvey = useSubmitSurvey(id);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  // Sorular her zaman order alanına göre sıralı gösterilir.
  const questions = useMemo(
    () => (detail.data === undefined ? [] : [...detail.data.questions].sort((a, b) => a.order - b.order)),
    [detail.data],
  );

  const question: SurveyQuestion | undefined = questions[index];
  const isLast = index === questions.length - 1;
  const currentValue = question === undefined ? undefined : answers[question.id];
  const isAnswered = Array.isArray(currentValue)
    ? currentValue.length > 0
    : (currentValue ?? '').trim().length > 0;

  const alreadyAnswered = isSurveyAlreadyAnsweredError(submitSurvey.error);
  const errorKey = submitSurvey.isError
    ? alreadyAnswered
      ? 'survey.alreadyAnswered'
      : 'survey.submitError'
    : null;

  // Prototip davranışı: ilk soruda geri = ekrandan çık, diğerlerinde önceki soru.
  const handleBack = () => {
    if (index === 0) {
      navigation.goBack();
      return;
    }
    setIndex(index - 1);
  };

  const handleNext = () => {
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    // Her soru "Sonraki" ile geçildiğinden buraya gelindiğinde tüm yanıtlar dolu.
    const request: SurveyResponseRequest = {
      answers: questions.map((item) => ({ questionId: item.id, value: answers[item.id] ?? '' })),
    };
    submitSurvey.mutate(request, {
      onSuccess: () => {
        // Liste invalidation'ı hook'ta; ekran yalnızca geri döner (completed rozeti görünür).
        navigation.goBack();
      },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('survey.title')} onBack={handleBack} />

      {detail.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : detail.isError ? (
        <View style={[styles.statusBox, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.md }}>
            {t('home.sectionError')}
          </Text>
          <Pressable
            onPress={() => {
              void detail.refetch();
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text
              style={{ color: theme.colors.brand, fontWeight: '700', fontSize: theme.fontSize.md }}
            >
              {t('home.retry')}
            </Text>
          </Pressable>
        </View>
      ) : question === undefined ? (
        <View style={[styles.statusBox, { padding: theme.spacing.lg }]}>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.md }}>
            {t('survey.empty')}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { padding: theme.spacing.lg }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* İlerleme çubuğu + sayaç (prototip: (i+1)/toplam) */}
            <View style={[styles.progressRow, { gap: theme.spacing.md }]}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.colors.brandSoft, borderRadius: 999 },
                ]}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${((index + 1) / questions.length) * 100}%`,
                    backgroundColor: theme.colors.brand,
                    borderRadius: 999,
                  }}
                />
              </View>
              <Text
                style={{ fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.ink2 }}
              >
                {t('survey.progress', { current: index + 1, total: questions.length })}
              </Text>
            </View>

            <Text
              style={{
                fontSize: theme.fontSize.xl,
                fontWeight: '800',
                color: theme.colors.ink,
                lineHeight: 28,
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
              }}
            >
              {question.text}
            </Text>

            <QuestionInput
              question={question}
              value={currentValue}
              onChange={(next) => setAnswers({ ...answers, [question.id]: next })}
            />

            {errorKey !== null ? (
              <Text
                style={{
                  marginTop: theme.spacing.md,
                  textAlign: 'center',
                  color: theme.colors.danger,
                  fontSize: theme.fontSize.sm,
                }}
              >
                {t(errorKey)}
              </Text>
            ) : null}

            <View style={styles.flex1} />

            <View style={{ marginTop: theme.spacing.lg }}>
              <PrimaryButton
                label={isLast ? t('survey.finish') : t('survey.next')}
                onPress={handleNext}
                disabled={!isAnswered || alreadyAnswered}
                loading={submitSurvey.isPending}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { flexGrow: 1 },
  statusBox: { alignItems: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressTrack: { flex: 1, height: 7, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2 },
  optionMark: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: { flexDirection: 'row' },
  ratingButton: { flex: 1, aspectRatio: 1, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ratingLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  textArea: { minHeight: 140, borderWidth: 1.5 },
});
