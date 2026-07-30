import React, { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';

const faqs = [
  { q: 'كيف أشتري مفتاحاً؟', a: 'اذهب إلى تبويب "المنتجات"، اختر جهازك ثم اللعبة ثم المنتج وأكمل عملية الدفع.' },
  { q: 'متى أتلقى مفتاحي؟', a: 'يتم التسليم فورياً بعد تأكيد الدفع.' },
  { q: 'ما هي طرق الدفع المتاحة؟', a: 'محفظة الرصيد الداخلية، أو الدفع عبر بينانس (USDT TRC20).' },
  { q: 'هل يمكن استرداد الأموال؟', a: 'يتم البت في طلبات الاسترداد حسب سياسة المتجر. تواصل مع الدعم.' },
  { q: 'المفتاح لم يعمل ماذا أفعل؟', a: 'تواصل مع سارة (فريق الدعم) فوراً وأرفق صورة للمشكلة.' },
];

export default function SupportTab() {
  const [openFaq, setOpenFaq] = useState(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const supportUsername = 'support';

  return (
    <div className="p-4 space-y-4">
      {/* Support Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-3xl p-5 border border-[#2a2a2a] text-center"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="text-5xl mb-3"
        >
          👩‍💼
        </motion.div>
        <h2 className="text-xl font-black text-white">سارة - فريق الدعم</h2>
        <p className="text-muted text-sm mt-1">متاحة 24/7 لمساعدتك</p>
        <div className="flex gap-2 mt-3 justify-center">
          <span className="flex items-center gap-1 text-xs text-neon">
            <span className="w-2 h-2 rounded-full bg-neon animate-pulse" /> متصلة الآن
          </span>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`https://t.me/${supportUsername}`}
          target="_blank"
          rel="noreferrer"
          className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
        >
          <span className="text-3xl">💬</span>
          <p className="text-sm font-bold text-white">تواصل مباشر</p>
          <p className="text-xs text-muted">تلجرام</p>
        </a>
        <button
          onClick={() => setOpenFaq(openFaq !== null ? null : 0)}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
        >
          <span className="text-3xl">❓</span>
          <p className="text-sm font-bold text-white">الأسئلة الشائعة</p>
          <p className="text-xs text-muted">FAQ</p>
        </button>
      </div>

      {/* FAQs */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-[#f0b90b] rounded-full" />
          <h3 className="font-bold text-white text-sm">أسئلة شائعة</h3>
        </div>
        {faqs.map((faq, i) => (
          <motion.div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-right"
            >
              <span className="font-semibold text-white text-sm">{faq.q}</span>
              <motion.span
                animate={{ rotate: openFaq === i ? 180 : 0 }}
                className="text-muted text-xs flex-shrink-0"
              >
                ▼
              </motion.span>
            </button>
            <motion.div
              initial={false}
              animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
              className="overflow-hidden"
            >
              <p className="px-4 pb-4 text-sm text-muted leading-relaxed">{faq.a}</p>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
