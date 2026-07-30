import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="flex flex-col items-center gap-6">
        <div className="relative">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full border-2 border-neon/20 border-t-neon" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">⚙️</div>
        </div>
        <div className="text-center">
          <p className="font-black text-white text-lg">Admin Panel</p>
          <p className="text-neon text-sm">جاري التحقق من الصلاحيات...</p>
        </div>
      </motion.div>
    </div>
  );
}
