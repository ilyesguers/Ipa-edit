const WalletTopup = require('../models/WalletTopup');
const User = require('../models/User');

/**
 * Credit a top-up exactly once. Claiming the top-up with a conditional update
 * prevents two admin clicks or Telegram retries from adding balance twice.
 */
const creditTopup = async (topupId, { verifiedBy = null, chargeId = null, providerChargeId = null, paidByTelegramId = null } = {}) => {
  const topup = await WalletTopup.findOneAndUpdate(
    { _id: topupId, status: { $in: ['pending', 'processing'] } },
    {
      $set: {
        status: 'completed',
        verifiedBy,
        verifiedAt: new Date(),
        creditedAt: new Date(),
        ...(chargeId ? { telegramPaymentChargeId: chargeId } : {}),
        ...(providerChargeId ? { providerPaymentChargeId: providerChargeId } : {}),
        ...(paidByTelegramId ? { paidByTelegramId } : {})
      }
    },
    { new: true }
  );

  if (!topup) {
    const existing = await WalletTopup.findById(topupId);
    if (existing?.status === 'completed') return { topup: existing, alreadyCompleted: true };
    throw new Error('Top-up is not available for approval');
  }

  try {
    const user = await User.findOneAndUpdate(
      { telegramId: topup.user, isBanned: false },
      {
        $inc: { balance: topup.amount, totalDeposited: topup.amount },
        $push: {
          balanceHistory: {
            type: 'credit',
            amount: topup.amount,
            description: `شحن المحفظة ${topup.topupNumber} (${topup.method})`,
            adminId: verifiedBy,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    if (!user) throw new Error('User not found or banned');
    return { topup, user, alreadyCompleted: false };
  } catch (error) {
    // Allow a safe retry if the balance update itself failed.
    await WalletTopup.updateOne({ _id: topup._id, status: 'completed' }, { $set: { status: 'processing', creditedAt: null } }).catch(() => {});
    throw error;
  }
};

module.exports = { creditTopup };
