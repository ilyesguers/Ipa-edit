import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';

const FAQ_KEYS = [['faqBuy', 'faqBuyA'], ['faqDelivery', 'faqDeliveryA'], ['faqPayment', 'faqPaymentA'], ['faqRefund', 'faqRefundA'], ['faqInvalid', 'faqInvalidA']];

export default function SupportTab() {
  const [openFaq, setOpenFaq] = useState(null);
  const { publicSettings, locale } = useStore();
  const supportUsername = publicSettings?.support_username || 'support';
  const supportTitle = publicSettings?.bot_name ? `${publicSettings.bot_name} - Fire Team` : t(locale, 'supportTeam');
  const supportSubtitle = locale === 'en' ? (publicSettings?.ui_footer_note_en || 'We\'re online 24/7 - Fast as rocket! 🚀🔥') : (publicSettings?.ui_footer_note_ar || 'اونلاين 24/7 - نرد بسرعة الصاروخ! 🚀🔥');

  return (
    <div className="p-4 space-y-5">
      <motion.div initial={{ opacity: 0, y: -15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="bg-gradient-to-br from-[#161922] via-[#1f2430] to-[#161922] rounded-[28px] p-6 border border-[#10b981]/20 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_50%)]" />
        <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }} className="text-[#10b981] mb-4 relative inline-block">
          <PremiumIcon name="fire" size="3.5rem" />
          <motion.div animate={{ scale: [0, 1.5, 0], opacity: [0, 0.8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-[#10b981]/20 rounded-full blur-xl" />
        </motion.div>
        <h2 className="text-[22px] font-black text-white relative font-[Orbitron]"><span className="gradient-text">{supportTitle}</span> 🔥</h2>
        <p className="text-[#9ca3af] text-[13px] mt-2 leading-6 relative font-bold">{supportSubtitle}</p>
        <span className="inline-flex items-center gap-2 mt-4 text-xs text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-4 py-2 rounded-full font-black">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" /> {t(locale, 'availableNow')} ⚡
        </span>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noreferrer" className="gamer-card rounded-[20px] p-5 flex flex-col items-center gap-3 text-center group hover:border-[#10b981]/40">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-[#3b82f6]/15 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PremiumIcon name="chat" size="2rem" className="text-[#10b981]" />
          </div>
          <div>
            <p className="text-[13px] font-black text-white flex items-center gap-1"><PremiumIcon name="fire" size="0.9em" className="text-orange-400" /> {t(locale, 'directContact')}</p>
            <p className="text-xs text-[#10b981] font-bold mt-1">@{supportUsername}</p>
          </div>
          <span className="text-[10px] bg-[#10b981]/10 text-[#10b981] px-2.5 py-1 rounded-full border border-[#10b981]/20">FAST ⚡</span>
        </a>
        <button type="button" onClick={() => setOpenFaq(openFaq === null ? 0 : null)} className="gamer-card rounded-[20px] p-5 flex flex-col items-center gap-3 text-center group hover:border-purple/40">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple/20 to-pink/15 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PremiumIcon name="help" size="2rem" className="text-purple-300" />
          </div>
          <div>
            <p className="text-[13px] font-black text-white">FAQ ❓</p>
            <p className="text-[11px] text-muted mt-1">EZ Answers</p>
          </div>
          <span className="text-[10px] bg-purple/10 text-purple-300 px-2.5 py-1 rounded-full border border-purple/20">HELP 💡</span>
        </button>
      </div>

      <div className="space-y-3">
        <div className="section-heading"><PremiumIcon name="explosion" /><h3>{t(locale, 'faqTitle')} 🔥</h3></div>
        {FAQ_KEYS.map(([question, answer], index) => (
          <motion.div key={question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="gamer-card rounded-[18px] overflow-hidden">
            <button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full flex items-center justify-between p-4.5 text-right group">
              <span className="font-black text-white text-[13px] flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981] text-xs">{index + 1}</span>
                {t(locale, question)}
              </span>
              <motion.span animate={{ rotate: openFaq === index ? 180 : 0 }} className="text-[#10b981]/60 group-hover:text-[#10b981] transition-colors">
                <PremiumIcon name="down" />
              </motion.span>
            </button>
            <motion.div initial={false} animate={{ height: openFaq === index ? 'auto' : 0, opacity: openFaq === index ? 1 : 0 }} className="overflow-hidden">
              <p className="px-4.5 pb-4.5 text-[13px] text-[#9ca3af] leading-7 bg-[#0d0f12]/50 mx-3 mb-3 rounded-xl p-3 border border-[#1f2430]">{t(locale, answer)}</p>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
