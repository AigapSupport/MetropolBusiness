/**
 * Transfer formu (PRD §8.7, screens-metropol-transfer.jsx > TransferBetween).
 * Modlar: self (Kartlarım Arası — gönderen/alıcı kart seçimi), phone (Cep Numarasına),
 * fixed (Kayıtlı Alıcı / QR'dan çözülmüş alıcı — alıcı satırı sabit).
 * Hızlı tutar 500/1000/2500/5000; tutar TAM TL (kuruş girişi engellenir — Metropol
 * BalanceTransfer.Amount int, TODO 1.7 notu); açıklama opsiyonel.
 *
 * NOT (sözleşme boşluğu): self modunda receiver.type='card' + value=cardId gönderilir;
 * backend bu türü şimdilik reddeder (TODO.md 1.7 [!]) ve Türkçe mesaj döner — backend
 * kendi kartları arası çözümlemeyi açtığında bu ekran değişmeden çalışacaktır.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { WalletId } from '@shared/metropol';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useBalance, useCards } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatMoney } from '@/utils/money';

import { CardPickRow } from '../components/CardPickRow';
import { RESTAURANT_WALLET_ID, SELECTABLE_WALLET_IDS, walletAccent, walletLabelKey } from '../wallets';

type Props = NativeStackScreenProps<MetropolStackParamList, 'TransferForm'>;

const QUICK_AMOUNTS = ['500', '1000', '2500', '5000'];
const PHONE_LENGTH = 10;

type SheetKind = 'sender' | 'receiver' | null;

export function TransferFormScreen({ navigation, route }: Props) {
  const { mode, receiver } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardsQuery = useCards();
  const cards = cardsQuery.data?.items ?? [];

  const [senderCardId, setSenderCardId] = useState<string | null>(null);
  const [receiverCardId, setReceiverCardId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [walletId, setWalletId] = useState<WalletId>(RESTAURANT_WALLET_ID);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState<SheetKind>(null);

  const senderCard = cards.find((card) => card.id === senderCardId) ?? cards[0] ?? null;
  const receiverCard =
    cards.find((card) => card.id === receiverCardId) ??
    cards.find((card) => card.id !== senderCard?.id) ??
    null;

  const balanceQuery = useBalance(senderCard?.id ?? null);
  const walletBalance =
    balanceQuery.data?.wallets.find((wallet) => wallet.walletId === walletId)?.balance ?? null;

  const amountValid = amount !== '' && Number(amount) > 0;
  const receiverValid =
    mode === 'self'
      ? receiverCard !== null && senderCard !== null && receiverCard.id !== senderCard.id
      : mode === 'phone'
        ? phone.length === PHONE_LENGTH
        : receiver !== undefined;
  const valid = senderCard !== null && amountValid && receiverValid;

  const titleKey =
    mode === 'self'
      ? 'metropol.transfer.betweenMyCards'
      : mode === 'phone'
        ? 'metropol.transfer.toPhone'
        : 'metropol.transfer.toRecipient';

  const handleSubmit = () => {
    if (senderCard === null) {
      return;
    }
    if (mode === 'self' && receiverCard !== null) {
      navigation.navigate('TransferConfirm', {
        senderCardId: senderCard.id,
        senderHolderName: senderCard.holderName,
        senderMaskedCardNo: senderCard.maskedCardNo,
        receiverType: 'card',
        receiverValue: receiverCard.id,
        receiverDisplayName: receiverCard.holderName,
        receiverDisplayCardNo: receiverCard.maskedCardNo,
        walletId,
        amountWholeLira: amount,
        note,
        allowSaveRecipient: false, // kendi kartı — kayıtlı alıcıya gerek yok
      });
      return;
    }
    if (mode === 'phone') {
      navigation.navigate('TransferConfirm', {
        senderCardId: senderCard.id,
        senderHolderName: senderCard.holderName,
        senderMaskedCardNo: senderCard.maskedCardNo,
        receiverType: 'phone',
        receiverValue: phone,
        receiverDisplayName: `+90 ${phone}`,
        receiverDisplayCardNo: '',
        walletId,
        amountWholeLira: amount,
        note,
        allowSaveRecipient: true,
      });
      return;
    }
    if (receiver !== undefined) {
      navigation.navigate('TransferConfirm', {
        senderCardId: senderCard.id,
        senderHolderName: senderCard.holderName,
        senderMaskedCardNo: senderCard.maskedCardNo,
        receiverType: receiver.type,
        receiverValue: receiver.value,
        receiverDisplayName: receiver.maskedName ?? '',
        receiverDisplayCardNo: receiver.maskedCardNo ?? '',
        walletId,
        amountWholeLira: amount,
        note,
        // Zaten kayıtlı alıcıysa tekrar kaydetme seçeneği sunulmaz.
        allowSaveRecipient: receiver.type !== 'saved',
      });
    }
  };

  const fieldLabel = (label: string) => (
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
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t(titleKey)} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* gönderen kart */}
        <View>
          {fieldLabel(t('metropol.transfer.senderCard'))}
          {senderCard !== null ? (
            <CardPickRow
              holderName={senderCard.holderName}
              maskedCardNo={senderCard.maskedCardNo}
              index={cards.findIndex((card) => card.id === senderCard.id)}
              selected
              onPress={() => setSheet('sender')}
            />
          ) : (
            <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.sm }}>
              {t('metropol.emptySubtitle')}
            </Text>
          )}
        </View>

        {/* alıcı */}
        {mode === 'self' ? (
          <View>
            {fieldLabel(t('metropol.transfer.receiverCard'))}
            {receiverCard !== null ? (
              <CardPickRow
                holderName={receiverCard.holderName}
                maskedCardNo={receiverCard.maskedCardNo}
                index={cards.findIndex((card) => card.id === receiverCard.id)}
                selected
                onPress={() => setSheet('receiver')}
              />
            ) : (
              <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.sm }}>
                {t('metropol.transfer.needSecondCard')}
              </Text>
            )}
          </View>
        ) : mode === 'phone' ? (
          <LabeledTextInput
            label={t('metropol.transfer.receiverPhone')}
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, PHONE_LENGTH))}
            placeholder={t('auth.phonePlaceholder')}
            prefix="+90"
            keyboardType="phone-pad"
            maxLength={PHONE_LENGTH}
          />
        ) : (
          <View>
            {fieldLabel(t('metropol.transfer.receiver'))}
            <View
              style={[
                styles.fixedReceiver,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.line,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.ink }}>
                {receiver?.maskedName ?? ''}
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.ink2,
                  marginTop: theme.spacing.xs / 2,
                }}
              >
                {receiver?.maskedCardNo ?? ''}
              </Text>
            </View>
          </View>
        )}

        {/* cüzdan seçimi */}
        <View>
          {fieldLabel(t('metropol.transfer.wallet'))}
          <View style={[styles.walletRow, { gap: theme.spacing.sm + 2 }]}>
            {SELECTABLE_WALLET_IDS.map((id) => {
              const accent = walletAccent(id, theme);
              const active = walletId === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setWalletId(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.walletChip,
                    {
                      backgroundColor: active ? theme.colors.brandSoft : theme.colors.card,
                      borderColor: active ? accent : theme.colors.line,
                      borderRadius: theme.radius.sm,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: '700',
                      color: active ? accent : theme.colors.ink,
                    }}
                  >
                    {t(walletLabelKey(id))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.ink2,
              marginTop: theme.spacing.sm,
              marginLeft: theme.spacing.xs,
            }}
          >
            {walletBalance !== null
              ? t('metropol.pay.walletAvailable', { amount: formatMoney(walletBalance) })
              : ''}
          </Text>
        </View>

        {/* tutar — hızlı seçim + tam TL girişi */}
        <View>
          {fieldLabel(t('metropol.transfer.amount'))}
          <View style={[styles.quickRow, { gap: theme.spacing.sm }]}>
            {QUICK_AMOUNTS.map((quick) => {
              const active = amount === quick;
              return (
                <Pressable
                  key={quick}
                  onPress={() => setAmount(quick)}
                  accessibilityRole="button"
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: active ? theme.colors.successSoft : theme.colors.card,
                      borderColor: active ? theme.colors.success : theme.colors.line,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: '700',
                      color: active ? theme.colors.success : theme.colors.ink,
                    }}
                  >
                    {quick} ₺
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: theme.spacing.md }}>
            <LabeledTextInput
              label={t('metropol.transfer.amountWhole')}
              value={amount}
              // TAM TL: rakam dışı (nokta/virgül dahil) her şey atılır — kuruş girilemez.
              onChangeText={(text) => setAmount(text.replace(/\D/g, '').slice(0, 6))}
              placeholder="0"
              prefix="₺"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <LabeledTextInput
          label={t('metropol.transfer.noteLabel')}
          value={note}
          onChangeText={setNote}
          placeholder={t('metropol.transfer.notePlaceholder')}
        />

        <PrimaryButton label={t('metropol.transfer.send')} onPress={handleSubmit} disabled={!valid} />
      </ScrollView>

      {/* kart seçim sayfası (bottom sheet) */}
      <Modal
        visible={sheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        {/* scrim: ink token'ı + hex-alpha ("80" ≈ %50) — hardcode renk yok */}
        <View style={[styles.sheetBackdrop, { backgroundColor: `${theme.colors.ink}80` }]}>
          <Pressable style={styles.flex1} onPress={() => setSheet(null)} />
          <View
            style={[
              styles.sheetBody,
              { backgroundColor: theme.colors.bg, padding: theme.spacing.lg, gap: theme.spacing.md },
            ]}
          >
            <Text
              style={{
                fontSize: theme.fontSize.lg,
                fontWeight: '800',
                color: theme.colors.ink,
                textAlign: 'center',
              }}
            >
              {t('metropol.transfer.pickCard')}
            </Text>
            {cards.map((card, index) => {
              const current = sheet === 'sender' ? senderCard?.id : receiverCard?.id;
              return (
                <CardPickRow
                  key={card.id}
                  holderName={card.holderName}
                  maskedCardNo={card.maskedCardNo}
                  index={index}
                  selected={current === card.id}
                  onPress={() => {
                    if (sheet === 'sender') {
                      setSenderCardId(card.id);
                    } else {
                      setReceiverCardId(card.id);
                    }
                    setSheet(null);
                  }}
                />
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fixedReceiver: { padding: 14, borderWidth: 1.5 },
  walletRow: { flexDirection: 'row' },
  walletChip: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 2 },
  quickRow: { flexDirection: 'row' },
  quickChip: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheetBody: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 32 },
});
