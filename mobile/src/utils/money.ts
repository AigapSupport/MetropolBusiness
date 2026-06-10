/**
 * Para biçimleme — MoneyString ("500.00", "-300.00") üzerinde SALT string işlemi.
 * float'a çevrilmez (CLAUDE.md §2.5 — yuvarlama hatası kabul edilemez).
 * Çıktı Türkçe gösterim: "30.824,00".
 */
import type { MoneyString } from '@shared/common';

export function formatMoney(money: MoneyString): string {
  const negative = money.startsWith('-');
  const unsigned = negative ? money.slice(1) : money;
  const [intRaw = '', fracRaw = ''] = unsigned.split('.');
  const intDigits = intRaw.replace(/\D/g, '');
  const intPart = intDigits === '' ? '0' : intDigits;
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const frac = fracRaw.replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
  return `${negative ? '−' : ''}${grouped},${frac}`;
}

/** Tutar negatif mi — "-300.00" gider, "300.00" gelir (API_CONTRACT §6). */
export function isNegativeMoney(money: MoneyString): boolean {
  return money.startsWith('-');
}

/** İşaretsiz değer — fiş/satır gösteriminde +/− ayrıca verilir. */
export function absMoney(money: MoneyString): MoneyString {
  return money.startsWith('-') ? money.slice(1) : money;
}

/** Tam TL girişini MoneyString'e çevirir: "500" → "500.00" (kuruş girişi engellenir). */
export function wholeLiraToMoney(wholeLira: string): MoneyString {
  const digits = wholeLira.replace(/\D/g, '');
  return `${digits === '' ? '0' : digits}.00`;
}
