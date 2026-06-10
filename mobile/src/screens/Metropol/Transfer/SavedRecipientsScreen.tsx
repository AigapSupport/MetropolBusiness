/**
 * Kayıtlı Alıcılar (PRD §8.7) — GET /metropol/saved-recipients listesi.
 * Satıra dokunma → transfer formu (mode 'fixed', receiver.type='saved');
 * silme ikonu → onay diyaloğu → DELETE → liste invalidate.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SavedRecipient } from '@shared/metropol';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useDeleteSavedRecipient, useSavedRecipients } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MetropolStackParamList, 'SavedRecipients'>;

export function SavedRecipientsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const recipientsQuery = useSavedRecipients();
  const deleteRecipient = useDeleteSavedRecipient();

  const items = recipientsQuery.data?.items ?? [];

  const handleSelect = (recipient: SavedRecipient) => {
    navigation.navigate('TransferForm', {
      mode: 'fixed',
      receiver: {
        type: 'saved',
        value: recipient.id,
        maskedName: recipient.label,
        maskedCardNo: recipient.maskedCardNo,
      },
    });
  };

  const handleDelete = (recipient: SavedRecipient) => {
    Alert.alert(
      t('metropol.transfer.deleteRecipientTitle'),
      t('metropol.transfer.deleteRecipientMessage', { label: recipient.label }),
      [
        { text: t('metropol.deleteCard.cancel'), style: 'cancel' },
        {
          text: t('metropol.transfer.deleteRecipientConfirm'),
          style: 'destructive',
          onPress: () => deleteRecipient.mutate(recipient.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.transfer.savedRecipient')} onBack={() => navigation.goBack()} />
      {recipientsQuery.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : recipientsQuery.isError ? (
        <View style={[styles.centered, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
            {t('common.genericError')}
          </Text>
          <Pressable onPress={() => void recipientsQuery.refetch()} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.centered, { padding: theme.spacing.xl }]}>
          <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.md, textAlign: 'center' }}>
            {t('metropol.transfer.noSavedRecipients')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelect(item)}
              accessibilityRole="button"
              style={[
                styles.row,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radius.md,
                  gap: theme.spacing.md,
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: theme.colors.brandSoft, borderRadius: 999 },
                ]}
              >
                <Text style={{ color: theme.colors.brand, fontSize: theme.fontSize.lg }}>◉</Text>
              </View>
              <View style={styles.info}>
                <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.ink }}>
                  {item.label}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.ink2,
                    marginTop: theme.spacing.xs / 2,
                  }}
                >
                  {item.maskedCardNo}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDelete(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('metropol.transfer.deleteRecipientConfirm')}
              >
                <Text style={{ fontSize: theme.fontSize.lg, color: theme.colors.danger }}>🗑</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  centered: { alignItems: 'center', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
});
