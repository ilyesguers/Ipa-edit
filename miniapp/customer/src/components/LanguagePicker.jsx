import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import { LANGUAGES, t } from '../i18n';
import { haptic } from '../utils/haptic';

/**
 * 🌍 Language picker. Shown as a blocking overlay on the very first visit so the
 * user picks their language before exploring — and re-openable from the header.
 * Also the place where RTL/LTR is finalized for the whole app.
 */
export default function LanguagePicker({ blocking = false }) {
  const { locale, setLocale, closeLanguagePicker } = useStore();

  const choose = async (code) => {
    haptic.medium();
    await setLocale(code);
    closeLanguagePicker();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-5"
        style={{ background: 'rgba(5,6,10,0.88)', backdropFilter: 'blur(10px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="w-full max-w-sm rounded-[26px] border border-[#10b981]/25 bg-[#11141a] p-5 shadow-[0_0_60px_rgba(16,185,129,0.15)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#10b981] to-transparent" />
          <div className="text-center mb-4">
            <div className="text-4xl animate-float mb-1">🌍</div>
            <h2 className="text-white font-black text-lg font-[Orbitron] tracking-wide gradient-text">
              {t(locale, 'language')}
            </h2>
            <p className="text-muted text-[11px] mt-1">
              {blocking ? 'Welcome! Pick your language / اختر لغتك' : t(locale, 'switchLanguage')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto scrollbar-hide pr-1">
            {LANGUAGES.map((lang, index) => {
              const active = lang.code === locale;
              return (
                <motion.button
                  key={lang.code}
                  type="button"
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.03, type: 'spring', stiffness: 300 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => choose(lang.code)}
                  dir={lang.rtl ? 'rtl' : 'ltr'}
                  className={`relative flex items-center gap-2.5 rounded-2xl border px-3 py-3 transition-all ${active
                    ? 'border-[#10b981]/50 bg-gradient-to-br from-[#10b981]/20 to-[#3b82f6]/10 text-white shadow-lg shadow-[#10b981]/10'
                    : 'border-[#2d3748] bg-[#161922] text-white/80 hover:border-[#10b981]/30 hover:bg-[#1a1f2c]'}`}
                >
                  <span className="text-xl shrink-0">{lang.flag}</span>
                  <span className="text-[13px] font-black truncate flex-1 text-left">{lang.label}</span>
                  {active && (
                    <motion.span
                      layoutId="lang-active"
                      className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981] shrink-0"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
