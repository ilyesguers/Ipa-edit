import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function OrderSuccessModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const keys = data?.keys || [];

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      toast.success('تم نسخ المفتاح!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(keys.join('\n')).then(() => {
      toast.success(`تم نسخ ${keys.length} مفتاح!`);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-sm bg-[#111] rounded-3xl overflow-hidden border border-neon/20"
        style={{ boxShadow: '0 0 60px rgba(0,255,136,0.15)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-b from-neon/10 to-transparent p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-6xl mb-3"
          >
            ✅
          </motion.div>
          <h2 className="text-2xl font-black text-white">تم الشراء بنجاح!</h2>
          <p className="text-neon text-sm mt-1">⚡ تم التسليم الفوري</p>
        </div>

        {/* Keys */}
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-muted">مفاتيحك 🔑</p>
            {keys.length > 1 && (
              <button onClick={handleCopyAll} className="text-xs text-neon-blue border border-neon-blue/30 px-3 py-1 rounded-lg">
                نسخ الكل
              </button>
            )}
          </div>

          {keys.map((key, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#1a1a1a] border border-border rounded-xl p-3 flex items-center gap-2"
            >
              <p className="flex-1 font-mono text-sm text-neon break-all">{key}</p>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => handleCopy(key)}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-neon/10 border border-neon/30 flex items-center justify-center text-neon text-sm"
              >
                📋
              </motion.button>
            </motion.div>
          ))}

          <p className="text-center text-xs text-muted">📦 {data?.order?.productName} - {data?.order?.durationName}</p>
          <p className="text-center text-xs text-muted">رقم الطلب: {data?.order?.orderNumber}</p>

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
