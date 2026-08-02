/**
 * 🌍 GAMER STORE — Supported Languages
 * Single source of truth for the languages available across the store & API.
 * The web store is fully translated; the bot falls back to ar/en for any other.
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
  ar: '🇸🇦', en: '🇬🇧', fr: '🇫🇷', es: '🇪🇸', de: '🇩🇪', tr: '🇹🇷',
  ru: '🇷🇺', ur: '🇵🇰', hi: '🇮🇳', id: '🇮🇩', pt: '🇧🇷', zh: '🇨🇳'
};

const normalizeLanguage = (value) => {
  const code = String(value || '').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(code) ? code : (code === 'pt' ? 'pt' : (SUPPORTED_LANGUAGES.includes(code) ? code : 'ar'));
};

const isSupportedLanguage = (code) =>
  SUPPORTED_LANGUAGES.includes(String(code || '').toLowerCase());

module.exports = {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
  normalizeLanguage,
  isSupportedLanguage
};
