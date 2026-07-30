const { Markup } = require('telegraf');
const Category = require('../../models/Category');
const Game = require('../../models/Game');
const Product = require('../../models/Product');
const Key = require('../../models/Key');

const shopHandler = async (ctx) => {
  const categories = await Category.find({ isActive: true, isHidden: false }).sort('order');
  if (!categories.length) return ctx.reply('😔 لا توجد أقسام متاحة حالياً');

  const buttons = categories.map(cat =>
    [Markup.button.callback(`${cat.icon} ${cat.nameAr || cat.name}`, `cat_${cat._id}`)]
  );

  buttons.push([Markup.button.callback('🔙 الرئيسية', 'main_menu')]);

  const msg = '🛍️ <b>اختر القسم المناسب لجهازك:</b>\n\n';

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }));
};

const showGames = async (ctx, categoryId) => {
  const category = await Category.findById(categoryId);
  const games = await Game.find({ category: categoryId, isActive: true, isHidden: false }).sort('order');

  if (!games.length) return ctx.answerCbQuery('😔 لا توجد ألعاب في هذا القسم حالياً', { show_alert: true });

  const buttons = games.map(game =>
    [Markup.button.callback(`🎮 ${game.nameAr || game.name}`, `game_${game._id}`)]
  );
  buttons.push([Markup.button.callback(`🔙 رجوع`, 'shop')]);

  const msg = `${category.icon} <b>${category.nameAr || category.name}</b>\n\n🎮 اختر اللعبة:`;
  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(console.error);
};

const showProducts = async (ctx, gameId) => {
  const game = await Game.findById(gameId).populate('category');
  const products = await Product.find({ game: gameId, isActive: true, isHidden: false }).sort('order');

  if (!products.length) return ctx.answerCbQuery('😔 لا توجد منتجات متاحة', { show_alert: true });

  const buttons = products.map(p =>
    [Markup.button.callback(`🔑 ${p.nameAr || p.name}`, `product_${p._id}`)]
  );
  buttons.push([Markup.button.callback(`🔙 رجوع`, `cat_${game.category._id}`)]);

  const msg = `🎮 <b>${game.nameAr || game.name}</b>\n\n🔑 اختر المنتج:`;
  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(console.error);
};

const showProduct = async (ctx, productId) => {
  const product = await Product.findById(productId).populate('game');
  if (!product) return ctx.answerCbQuery('المنتج غير موجود', { show_alert: true });

  // Build features text
  const featuresText = product.features.length > 0
    ? product.features.map(f => `${f.icon} ${f.text}`).join('\n')
    : '';

  // Build duration buttons with stock info
  const durationButtons = [];
  for (const dur of product.durations) {
    if (!dur.isActive) continue;
    const stockCount = await Key.countDocuments({
      product: productId,
      durationId: dur._id,
      status: 'available'
    });
    const hasStock = stockCount > 0;
    const label = hasStock
      ? `✅ ${dur.nameAr || dur.name} - $${dur.price.toFixed(2)}`
      : `❌ ${dur.nameAr || dur.name} - $${dur.price.toFixed(2)} (نفذ المخزون)`;
    durationButtons.push([Markup.button.callback(label, hasStock ? `buy_${productId}_${dur._id}` : `oos_${dur.name}`)]);
  }

  durationButtons.push([Markup.button.callback(`🔙 رجوع`, `game_${product.game._id}`)]);

  let msg = `🔑 <b>${product.nameAr || product.name}</b>\n\n`;
  if (featuresText) msg += `📋 <b>المميزات:</b>\n${featuresText}\n\n`;
  msg += `💰 <b>اختر المدة:</b>`;

  if (product.logo) {
    await ctx.editMessageMedia(
      { type: 'photo', media: product.logo, caption: msg, parse_mode: 'HTML' },
      Markup.inlineKeyboard(durationButtons)
    ).catch(async () => {
      await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(durationButtons) }).catch(console.error);
    });
  } else {
    await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(durationButtons) }).catch(console.error);
  }
};

module.exports = { shopHandler, showGames, showProducts, showProduct };
