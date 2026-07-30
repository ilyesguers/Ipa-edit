import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { fireConfetti } from './confetti';

export default function OrderSuccessModal({ data, onClose }) {
  const [copied, setCopied] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const canvasRef = useRef(null);
  const keys = data?.keys || [];

  // ── Trigger confetti on mount ──
  useEffect(() => {
    // Canvas confetti
    fireConfetti(canvasRef.current);

    // Vibrate API for haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }, []);

  // ── Copy single key ──
  const handleCopy = (key, index) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(index);
      toast.success('تم نسخ المفتاح!');
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── Copy all keys ──
  const handleCopyAll = useCallback(() => {
    navigator.clipboard.writeText(keys.join('\n')).then(() => {
      setCopiedAll(true);
      toast.success(`تم نسخ ${keys.length} مفتاح!`);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      setTimeout(() => setCopiedAll(false), 3000);
    });
  }, [keys]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
    >
      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[101]"
        style={{ width: '100%', height: '100%' }}
      />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-sm bg-[#111] rounded-3xl overflow-hidden border border-neon/20 relative z-[102]"
        style={{ boxShadow: '0 0 60px rgba(0,255,136,0.15)' }}
      >
        {/* Header with celebration */}
        <div className="bg-gradient-to-b from-neon/10 to-transparent p-6 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-6xl mb-3"
          >
            🎊
          </motion.div>
          <h2 className="text-2xl font-black text-white">تم الشراء بنجاح!</h2>
          <p className="text-neon text-sm mt-1">⚡ تم التسليم الفوري</p>
        </div>

        {/* Keys */}
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-muted">مفاتيحك 🔑 ({keys.length})</p>
            {keys.length > 1 && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCopyAll}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all
                  ${copiedAll
                    ? 'bg-neon/20 text-neon border border-neon/30'
                    : 'text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/10'
                  }`}
              >
                {copiedAll ? '✓ تم النسخ' : '📋 نسخ الكل'}
              </motion.button>
            )}
          </div>

          {keys.map((key, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-[#1a1a1a] border border-border rounded-xl p-3 flex items-center gap-2"
            >
              <p className="flex-1 font-mono text-sm text-neon break-all">{key}</p>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => handleCopy(key, i)}
                className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-all
                  ${copied === i
                    ? 'bg-neon/20 border-neon/30 text-neon'
                    : 'bg-neon/10 border-neon/30 text-neon'
                  }`}
              >
                {copied === i ? '✓' : '📋'}
              </motion.button>
            </motion.div>
          ))}

          <div className="text-center space-y-1 pt-2">
            <p className="text-xs text-muted">📦 {data?.order?.productName} - {data?.order?.durationName}</p>
            <p className="text-xs text-muted">رقم الطلب: <code className="text-white/70">{data?.order?.orderNumber}</code></p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-black text-black bg-neon mt-2"
            style={{ boxShadow: '0 0 20px rgba(0,255,136,0.3)' }}
          >
            شكراً! 🎉
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
