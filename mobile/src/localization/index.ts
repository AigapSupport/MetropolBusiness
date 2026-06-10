/**
 * i18next kurulumu — TR varsayılan, EN yedek dil.
 * Tüm UI metinleri bu katmandan gelir; ekranlarda string hardcode edilmez (CLAUDE.md §7).
 * TODO(Faz 1): cihaz dili algılama + kullanıcı tercihi (/me/preferences) entegrasyonu.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { config } from '@/utils/config';

import en from './en.json';
import tr from './tr.json';

void i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: config.defaultLocale,
  fallbackLng: 'tr',
  // Hermes'te Intl.PluralRules eksik olabilir; v3 JSON formatı ile uyumlu kalıyoruz.
  compatibilityJSON: 'v3',
  interpolation: {
    // React zaten XSS'e karşı escape eder.
    escapeValue: false,
  },
});

export default i18n;
