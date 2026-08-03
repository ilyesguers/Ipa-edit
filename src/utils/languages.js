/**
 * Languages shared by the Telegram bot, API and customer mini app.
 * Keep this module dependency-free so it can safely be used by Mongoose schemas.
 */
const SUPPORTED_LANGUAGES = [
  'ar', 'en', 'fr', 'es', 'de', 'tr', 'ru', 'ur', 'hi', 'id', 'pt', 'zh'
];

const LANGUAGE_NAMES = {
  ar: 'العربية',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  tr: 'Türkçe',
  ru: 'Русский',
  ur: 'اردو',
  hi: 'हिन्दी',
  id: 'Bahasa Indonesia',
  pt: 'Português',
  zh: '中文'
};

const LANGUAGE_FLAGS = {
  ar: '🇸🇦',
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  tr: '🇹🇷',
  ru: '🇷🇺',
  ur: '🇵🇰',
  hi: '🇮🇳',
  id: '🇮🇩',
  pt: '🇧🇷',
  zh: '🇨🇳'
};

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  label: LANGUAGE_NAMES[code],
  flag: LANGUAGE_FLAGS[code]
}));

const normalizeLanguage = (value, fallback = 'ar') => {
  const code = String(value || '').toLowerCase().split('-')[0].trim();
  return SUPPORTED_LANGUAGES.includes(code) ? code : fallback;
};

const isSupportedLanguage = (code) =>
  SUPPORTED_LANGUAGES.includes(String(code || '').toLowerCase().split('-')[0].trim());

module.exports = {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  isSupportedLanguage
};
