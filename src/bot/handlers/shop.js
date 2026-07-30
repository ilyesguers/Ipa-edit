const { Markup } = require('telegraf');
const Category = require('../../models/Category');
const Game = require('../../models/Game');
const Product = require('../../models/Product');
const Key = require('../../models/Key');
const { buttonEmojiId, emojiHtml, emojiChar, buttonLabel } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const gameButton = (emojiKey, text, callbackData, style = 'primary') => {
  const emojiId = buttonEmojiId(emojiKey) || buttonEmojiId(style);
  return {
    text: buttonLabel(emojiKey, text, { emojiId, hasIcon: Boolean(emojiId) }),
    callback_data: callbackData,
    style,
    ...(emojiId ? { icon_custom_emoji_id: emojiId } : {})
  };
};

// Device icons are rendered through the same premium game icon family as the
// rest of the bot. Never put a second, unrelated unicode icon in a button.
const getDeviceIcon = (category) => {
  const key = category?.slug === 'android' || category?.slug === 'iphone' ? 'mobile' : 'gamepad';
  return emojiHtml(key);
};

const shopHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const categories = await Category.find({ isActive: true, isHidden: false }).sort('order');

  if (!categories.length) {
    return ctx.reply(lang === 'en'
      ? `${emojiChar('skull')} No categories available at the moment`
      : `${emojiChar('skull')} لا توجد أقسام متاحة حالياً`
    );
  }

  const buttons = categories.map(cat => {
    const icon = getDeviceIcon(cat);
    const name = lang === 'en' ? (cat.name || cat.nameAr) : (cat.nameAr || cat.name);
    return [gameButton('gamepad', name, `cat_${cat._id}`, 'primary')];
  });

  buttons.push([gameButton('back', lang === 'en' ? 'Home' : 'الرئيسية', 'main_menu', 'danger')]);

  const msg = lang === 'en'
    ? `${emojiHtml('shop')} <b>Choose the right section for your device:</b>`
    : `${emojiHtml('shop')} <b>اختر القسم المناسب لجهازك:</b>`;

  await editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
};

const showGames = async (ctx, categoryId) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const category = await Category.findById(categoryId);
  const games = await Game.find({ category: categoryId, isActive: true, isHidden: false }).sort('order');

  if (!games.length) {
    return ctx.answerCbQuery(
      lang === 'en' ? `${emojiChar('ghost')} No games in this section yet` : `${emojiChar('ghost')} لا توجد ألعاب في هذا القسم حالياً`,
      { show_alert: true }
    );
  }

  const buttons = games.map(game => {
    const name = lang === 'en' ? (game.name || game.nameAr) : (game.nameAr || game.name);
    return [gameButton('controller', name, `game_${game._id}`, 'primary')];
  });
  buttons.push([gameButton('back', lang === 'en' ? 'Back' : 'رجوع', 'shop', 'danger')]);

  const icon = getDeviceIcon(category);
  const catName = lang === 'en' ? (category.name || category.nameAr) : (category.nameAr || category.name);
  const msg = lang === 'en'
    ? `${icon} <b>${catName}</b>\n\n${emojiHtml('joystick')} Choose a game:`
    : `${icon} <b>${catName}</b>\n\n${emojiHtml('joystick')} اختر اللعبة:`;

  await editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
};

const showProducts = async (ctx, gameId) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const game = await Game.findById(gameId).populate('category');
  const products = await Product.find({ game: gameId, isActive: true, isHidden: false }).sort('order');

  if (!products.length) {
    return ctx.answerCbQuery(
      lang === 'en' ? `${emojiChar('ghost')} No products available` : `${emojiChar('ghost')} لا توجد منتجات متاحة`,
      { show_alert: true }
    );
  }

  const buttons = products.map(p => {
    const name = lang === 'en' ? (p.name || p.nameAr) : (p.nameAr || p.name);
    return [gameButton('key', name, `product_${p._id}`, 'success')];
  });
  buttons.push([gameButton('back', lang === 'en' ? 'Back' : 'رجوع', `cat_${game.category._id}`, 'danger')]);

  const gameName = lang === 'en' ? (game.name || game.nameAr) : (game.nameAr || game.name);
  const msg = lang === 'en'
    ? `${emojiHtml('controller')} <b>${gameName}</b>\n\n${emojiHtml('key')} Choose a product:`
    : `${emojiHtml('controller')} <b>${gameName}</b>\n\n${emojiHtml('key')} اختر المنتج:`;

  await editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
};

const showProduct = async (ctx, productId) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const product = await Product.findById(productId).populate('game');
  if (!product) return ctx.answerCbQuery(lang === 'en' ? 'Product not found' : 'المنتج غير موجود', { show_alert: true });

  // Build features text (bilingual)
  const featuresText = product.features.length > 0
    ? product.features.map(f => f.text).join('\n')
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
    // Plain-text label only — button text never renders HTML. Stock count uses a
    // plain unicode glyph; the animated style emoji is applied via icon_custom_emoji_id.
    const stockLabel = hasStock ? `${stockCount}` : '';

    const label = hasStock
      ? `${stockLabel} ${durName} - $${dur.price.toFixed(2)}`
      : `${durName} - $${dur.price.toFixed(2)} (${lang === 'en' ? 'Out of stock' : 'نفد المخزون'})`;

    durationButtons.push([gameButton(
      hasStock ? 'trophy' : 'skull',
      label,
      hasStock ? `buy_${productId}_${dur._id}` : `oos_${durName}`,
      hasStock ? 'success' : 'danger'
    )]);
  }

  durationButtons.push([gameButton('back', lang === 'en' ? 'Back' : 'رجوع', `game_${product.game._id}`, 'danger')]);

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
      // A text menu is still better than creating another keyboard message.
      await editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(durationButtons) });
    }
  } else {
    await editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(durationButtons) });
  }
};

module.exports = { shopHandler, showGames, showProducts, showProduct };
