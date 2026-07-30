const logger = require('./logger');

/**
 * Edit the current bot menu instead of replying with another menu.  Telegram
 * sends the home screen as a photo, while the shop screens are usually text;
 * trying only editMessageText makes Telegram create a second message whenever
 * the previous screen is a photo.  This helper supports both and removes the
 * old message only as a last resort.
 */
const editOrReplyMenu = async (ctx, text, extra = {}) => {
  const editExtra = { ...extra };

  try {
    if (typeof ctx.editMessageCaption === 'function') {
      return await ctx.editMessageCaption(text, editExtra);
    }
  } catch (_) {
    // The current message is likely text. Continue with the text edit below.
  }

  try {
    if (typeof ctx.editMessageText === 'function') {
      return await ctx.editMessageText(text, editExtra);
    }
  } catch (_) {
    // The message may be too old or belong to a different bot message.
  }

  // Reply only after both edit paths failed, then remove the stale menu. This
  // keeps one visible menu rather than accumulating duplicate keyboards.
  const oldMessageId = ctx.callbackQuery?.message?.message_id || ctx.session?.menuMessageId;
  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id || ctx.from?.id;
  const message = await ctx.reply(text, extra);
  if (oldMessageId && chatId && oldMessageId !== message?.message_id) {
    await ctx.telegram.deleteMessage(chatId, oldMessageId).catch(() => {});
  }
  rememberMenu(ctx, message);
  return message;
};

const rememberMenu = (ctx, message) => {
  if (ctx.session && message?.message_id) ctx.session.menuMessageId = message.message_id;
  return message;
};

const removeRememberedMenu = async (ctx) => {
  const messageId = ctx.session?.menuMessageId;
  const chatId = ctx.chat?.id || ctx.from?.id;
  if (messageId && chatId) {
    await ctx.telegram.deleteMessage(chatId, messageId).catch((err) => {
      logger.debug?.(`Could not remove previous menu: ${err.message}`);
    });
  }
  if (ctx.session) delete ctx.session.menuMessageId;
};

module.exports = { editOrReplyMenu, rememberMenu, removeRememberedMenu };
