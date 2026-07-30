import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Tips carousel data ──
const TIPS = [
  { icon: '⚡', text: 'تسليم فوري لجميع المنتجات' },
  { icon: '🔥', text: 'أفضل الأسعار في السوق' },
  { icon: '🛡️', text: 'ضمان على جميع المفاتيح' },
  { icon: '💎', text: 'دفع آمن عبر بينانس' },
  { icon: '🎁', text: 'ادعُ أصدقاءك واحصل على مكافآت' },
];

export default function LoadingScreen() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'backOut' }}
        className="flex flex-col items-center gap-6"
      >
        {/* Spinning ring with gradient */}
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #00ff88, #00cfff, transparent, #00ff88)',
              padding: '3px',
            }}
          >
            <div className="w-full h-full rounded-full bg-black" />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🔑</div>
        </div>

        {/* Title */}
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-black text-white"
          >
            Digital Keys Store
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-neon text-sm mt-1"
          >
            ⚡ تسليم فوري • 🔥 مخزون حي
          </motion.p>
        </div>

        {/* Tips Carousel */}
        <div className="h-12 flex items-center justify-center w-64">
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-center"
            >
              <span className="text-lg">{TIPS[tipIndex].icon}</span>
              <p className="text-xs text-muted">{TIPS[tipIndex].text}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Gradient loading dots */}
        <div className="flex gap-3">
          {[0, 1, 2, 3, 4].map(i => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.2, 1, 0.2],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut'
              }}
              className="w-2 h-2 rounded-full"
              style={{
                background: `linear-gradient(135deg, #00ff88, #00cfff)`,
                boxShadow: '0 0 6px rgba(0,255,136,0.4)',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
