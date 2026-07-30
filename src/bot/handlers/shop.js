const { Markup } = require('telegraf');
const Category = require('../../models/Category');
const Game = require('../../models/Game');
const Product = require('../../models/Product');
const Key = require('../../models/Key');
const { buttonEmojiId, emojiHtml } = require('../../utils/customEmoji');

// ── Device icon map ──
const DEVICE_ICONS = {
  'android': '📱',
  'ios': '🍎',
  'windows': '💻',
  'mac': '🖥️',
  'smart-tv': '📺',
  'firestick': '🔥',
  'default': '📲'
};

const getDeviceIcon = (category) => {
  if (!category?.icon) return DEVICE_ICONS.default;
  return category.icon;
};

const shopHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const categories = await Category.find({ isActive: true, isHidden: false }).sort('order');

  if (!categories.length) {
    return ctx.reply(lang === 'en'
      ? `${emojiHtml('skull')} No categories available at the moment`
      : `${emojiHtml('skull')} لا توجد أقسام متاحة حالياً`
    );
  }

  const buttons = categories.map(cat => {
    const icon = getDeviceIcon(cat);
    const name = lang === 'en' ? (cat.name || cat.nameAr) : (cat.nameAr || cat.name);
    return [{ text: `${icon} ${name}`, callback_data: `cat_${cat._id}`, style: 'primary', icon_custom_emoji_id: buttonEmojiId('primary') }];
  });

  buttons.push([{ text: lang === 'en' ? '🔙 Home' : '🔙 الرئيسية', callback_data: 'main_menu', style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }]);

  const msg = lang === 'en'
    ? `${emojiHtml('shop')} <b>Choose the right section for your device:</b>`
    : `${emojiHtml('shop')} <b>اختر القسم المناسب لجهازك:</b>`;

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }));
};

const showGames = async (ctx, categoryId) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const category = await Category.findById(categoryId);
  const games = await Game.find({ category: categoryId, isActive: true, isHidden: false }).sort('order');

  if (!games.length) {
    return ctx.answerCbQuery(
      lang === 'en' ? `${emojiHtml('ghost')} No games in this section yet` : `${emojiHtml('ghost')} لا توجد ألعاب في هذا القسم حالياً`,
      { show_alert: true }
    );
  }

  const buttons = games.map(game => {
    const name = lang === 'en' ? (game.name || game.nameAr) : (game.nameAr || game.name);
    return [{ text: `${emojiHtml('controller')} ${name}`, callback_data: `game_${game._id}`, style: 'primary', icon_custom_emoji_id: buttonEmojiId('primary') }];
  });
  buttons.push([{ text: lang === 'en' ? '🔙 Back' : '🔙 رجوع', callback_data: 'shop', style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }]);

  const icon = getDeviceIcon(category);
  const catName = lang === 'en' ? (category.name || category.nameAr) : (category.nameAr || category.name);
  const msg = lang === 'en'
    ? `${icon} <b>${catName}</b>\n\n${emojiHtml('joystick')} Choose a game:`
    : `${icon} <b>${catName}</b>\n\n${emojiHtml('joystick')} اختر اللعبة:`;

  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(console.error);
};

const showProducts = async (ctx, gameId) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const game = await Game.findById(gameId).populate('category');
  const products = await Product.find({ game: gameId, isActive: true, isHidden: false }).sort('order');

  if (!products.length) {
    return ctx.answerCbQuery(
      lang === 'en' ? `${emojiHtml('ghost')} No products available` : `${emojiHtml('ghost')} لا توجد منتجات متاحة`,
      { show_alert: true }
    );
  }

  const buttons = products.map(p => {
    const name = lang === 'en' ? (p.name || p.nameAr) : (p.nameAr || p.name);
    return [{ text: `${emojiHtml('key')} ${name}`, callback_data: `product_${p._id}`, style: 'success', icon_custom_emoji_id: buttonEmojiId('success') }];
  });
  buttons.push([{ text: lang === 'en' ? '🔙 Back' : '🔙 رجوع', callback_data: `cat_${game.category._id}`, style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }]);

  const gameName = lang === 'en' ? (game.name || game.nameAr) : (game.nameAr || game.name);
  const msg = lang === 'en'
    ? `${emojiHtml('controller')} <b>${gameName}</b>\n\n${emojiHtml('key')} Choose a product:`
    : `${emojiHtml('controller')} <b>${gameName}</b>\n\n${emojiHtml('key')} اختر المنتج:`;

  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(console.error);
};

const showProduct = async (ctx, productId) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const product = await Product.findById(productId).populate('game');
  if (!product) return ctx.answerCbQuery(lang === 'en' ? 'Product not found' : 'المنتج غير موجود', { show_alert: true });

  // Build features text (bilingual)
  const featuresText = product.features.length > 0
    ? product.features.map(f => `${f.icon} ${f.text}`).join('\n')
    : '';

  // Build duration buttons with stock count in each button
  const durationButtons = [];
  for (const dur of product.durations) {
    if (!dur.isActive) continue;
    const stockCount = await Key.countDocuments({
      product: productId,
      durationId: dur._id,
      status: 'available'
    });
    const hasStock = stockCount > 0;
    const durName = lang === 'en' ? (dur.name || dur.nameAr) : (dur.nameAr || dur.name);
    const stockLabel = hasStock ? `${emojiHtml('checkmark')}${stockCount}` : `${emojiHtml('skull')}`;

    const label = hasStock
      ? `${stockLabel} ${durName} - $${dur.price.toFixed(2)}`
      : `${stockLabel} ${durName} - $${dur.price.toFixed(2)} (${lang === 'en' ? 'Out of stock' : 'نفذ المخزون'})`;

    durationButtons.push([{ text: label, callback_data: hasStock ? `buy_${productId}_${dur._id}` : `oos_${durName}`, style: hasStock ? 'success' : 'danger', icon_custom_emoji_id: buttonEmojiId(hasStock ? 'success' : 'danger') }]);
  }

  durationButtons.push([{ text: lang === 'en' ? '🔙 Back' : '🔙 رجوع', callback_data: `game_${product.game._id}`, style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }]);

  const prodName = lang === 'en' ? (product.name || product.nameAr) : (product.nameAr || product.name);

  let msg = `${emojiHtml('key')} <b>${prodName}</b>\n\n`;
  if (featuresText) {
    msg += lang === 'en'
      ? `${emojiHtml('orders')} <b>Features:</b>\n${featuresText}\n\n`
      : `${emojiHtml('orders')} <b>المميزات:</b>\n${featuresText}\n\n`;
  }
  msg += lang === 'en' ? `${emojiHtml('coin')} <b>Choose duration:</b>` : `${emojiHtml('coin')} <b>اختر المدة:</b>`;

  // Smart image↔text toggle: try photo first, fallback to text
  if (product.logo) {
    try {
      await ctx.editMessageMedia(
        { type: 'photo', media: product.logo, caption: msg, parse_mode: 'HTML' },
        Markup.inlineKeyboard(durationButtons)
      );
    } catch {
      // If media edit fails, try text
      await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(durationButtons) }).catch(async () => {
        // Last resort: send new message
        await ctx.replyWithPhoto(
          { url: product.logo },
          { caption: msg, parse_mode: 'HTML', ...Markup.inlineKeyboard(durationButtons) }
        ).catch(async () => {
          await ctx.reply(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(durationButtons) }).catch(console.error);
        });
      });
    }
  } else {
    await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(durationButtons) }).catch(console.error);
  }
};

module.exports = { shopHandler, showGames, showProducts, showProduct };
