import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const STEPS = [
  'جاري التحقق من الصلاحيات...',
  'تحميل البيانات...',
  'جاري إعداد اللوحة...',
  'اكتمل التحميل ✓',
];

export default function LoadingScreen() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep(prev => {
        if (prev < STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 600);

    // Smooth progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 3 + Math.random() * 5;
      });
    }, 80);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
        className="flex flex-col items-center gap-6 w-full max-w-xs px-4"
      >
        {/* Spinning icon */}
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full border-2 border-neon/20 border-t-neon"
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">⚙️</div>
        </div>

        {/* Title */}
        <div className="text-center">
          <p className="font-black text-white text-lg">Admin Panel</p>
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-neon text-sm mt-1"
          >
            {STEPS[step]}
          </motion.p>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full h-2 bg-[#1f2430] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-neon to-neon-blue"
              style={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[10px] text-muted text-center mt-2">
            {Math.min(Math.round(progress), 100)}%
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: i === step ? 1.3 : 1,
                backgroundColor: i <= step ? '#10b981' : '#1f2430',
              }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-2 h-2 rounded-full"
              style={{ boxShadow: i === step ? '0 0 8px #10b981' : 'none' }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
