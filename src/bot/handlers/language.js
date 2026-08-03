const { Markup } = require('telegraf');
const { LANGUAGE_OPTIONS, normalizeLanguage } = require('../../utils/languages');
const { buttonLabel } = require('../../utils/customEmoji');
const { editOrReplyMenu, rememberMenu } = require('../../utils/menuMessage');

const BOT_LANGUAGE_CALLBACK_PREFIX = 'language_select_';

// The mini app has complete translations for all supported languages. The bot
// currently has Arabic and English copy, so non-Arabic users get the clear
// English fallback instead of mixed Arabic UI.
const botLocale = (language) => normalizeLanguage(language) === 'ar' ? 'ar' : 'en';

const languagePickerCopy = (language, firstRun = false) => {
  const isArabic = botLocale(language) === 'ar';
  if (firstRun) {
    return isArabic
      ? '<b>اختر لغتك أولاً</b>\nاختر اللغة التي تريد استخدامها في البوت والمتجر.'
      : '<b>Choose your language first</b>\nChoose the language you want to use in the bot and store.';
  }
  return isArabic
    ? '<b>تغيير اللغة</b>\nاختر اللغة المناسبة لك.'
    : '<b>Change language</b>\nChoose the language that suits you.';
};

const buildLanguageKeyboard = (language, { showBack = false } = {}) => {
  const rows = [];
  for (let index = 0; index < LANGUAGE_OPTIONS.length; index += 2) {
    rows.push(
      LANGUAGE_OPTIONS.slice(index, index + 2).map((item) => ({
        text: `${item.flag} ${item.label}`,
        callback_data: `${BOT_LANGUAGE_CALLBACK_PREFIX}${item.code}`
      }))
    );
  }

  if (showBack) {
    const isArabic = botLocale(language) === 'ar';
    rows.push([{
      text: buttonLabel('back', isArabic ? 'الرئيسية' : 'Home'),
      callback_data: 'main_menu'
    }]);
  }

  return Markup.inlineKeyboard(rows);
};

const showLanguagePicker = async (ctx, { firstRun = false, edit = false } = {}) => {
  const language = ctx.dbUser?.preferredLanguage || 'ar';
  const extra = {
    parse_mode: 'HTML',
    ...buildLanguageKeyboard(language, { showBack: !firstRun })
  };
  const text = languagePickerCopy(language, firstRun);

  if (edit) return editOrReplyMenu(ctx, text, extra);
  const message = await ctx.reply(text, extra);
  rememberMenu(ctx, message);
  return message;
};

const saveLanguageChoice = async (user, code) => {
  const language = normalizeLanguage(code, null);
  if (!language || !user) return null;
  user.preferredLanguage = language;
  user.languageSelected = true;
  await user.save();
  return language;
};

const isLanguageChoiceCallback = (data = '') =>
  String(data).startsWith(BOT_LANGUAGE_CALLBACK_PREFIX);

const languageFromCallback = (data = '') =>
  normalizeLanguage(String(data).slice(BOT_LANGUAGE_CALLBACK_PREFIX.length), null);

module.exports = {
  BOT_LANGUAGE_CALLBACK_PREFIX,
  botLocale,
  buildLanguageKeyboard,
  showLanguagePicker,
  saveLanguageChoice,
  isLanguageChoiceCallback,
  languageFromCallback
};
