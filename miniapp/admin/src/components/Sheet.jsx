import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '../utils/haptic';

/**
 * 📱 Sheet — mobile-first modal for the admin panel.
 *
 * The old modals were centered boxes with `overflow-y-auto` on the same node
 * as the content: inside Telegram's WebView on phones the save button ended
 * up below the fold and could not be scrolled into view (see the reported
 * screenshot). Sheet follows a strict layout instead:
 *
 *   ┌─────────────────────────┐
 *   │ grabber / header        │  ← always visible
 *   ├─────────────────────────┤
 *   │ scrollable body         │  ← the only scrollable area
 *   ├─────────────────────────┤
 *   │ sticky action footer    │  ← the save button is ALWAYS reachable
 *   └─────────────────────────┘
 *
 * Bottom sheet on phones, centered dialog on >= sm screens. Body scroll is
 * locked while open, ESC / backdrop / swipe-down all close it, and it
 * respects the device safe areas (notch + Telegram WebView chrome).
 *
 * Props:
 *   open        — boolean
 *   onClose     — close handler
 *   title       — header text (string or node)
 *   icon        — optional leading node
 *   footer      — footer node (usually the action buttons). Keep the save
 *                 button here so it can never be scrolled away.
 *   wide        — widen the sheet (grid layouts)
 *   children    — body content
 */
export default function Sheet({ open, onClose, title, icon, footer, wide = false, children }) {
  const bodyRef = useRef(null);

  // Lock the page behind the sheet while it is open.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // When the sheet opens, make sure its own scroll position starts at top.
  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { haptic.light(); onClose?.(); }}
            className="admin-sheet__backdrop"
          />
          {/* Alignment wrapper (not transformed) so framer-motion can freely
              animate the card translate without fighting CSS centering. */}
          <div className="admin-sheet__wrap">
            <motion.div
              role="dialog" aria-modal="true"
              initial={{ y: 96, opacity: 0.4, scale: 0.985 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 96, opacity: 0.4, scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className={`admin-sheet ${wide ? 'admin-sheet--wide' : ''}`}
            >
              <div className="admin-sheet__grabber" aria-hidden="true"><span /></div>
              {(title || icon) && (
                <div className="admin-sheet__header">
                  <h3>{icon}{title}</h3>
                  <button type="button" onClick={() => { haptic.light(); onClose?.(); }} className="admin-sheet__close" aria-label="إغلاق">✕</button>
                </div>
              )}
              <div ref={bodyRef} className="admin-sheet__body">
                {children}
              </div>
              {footer && (
                <div className="admin-sheet__footer">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Standard action pair for the footer: save + cancel. */
export function SheetActions({ saveLabel = '💾 حفظ', cancelLabel = 'إلغاء', onSave, onCancel, saving = false, danger = false, saveDisabled = false }) {
  return (
    <div className="admin-sheet__actions">
      <motion.button
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={() => { haptic.medium(); onSave?.(); }}
        disabled={saving || saveDisabled}
        className={`${danger ? 'danger-btn' : 'neon-btn'} admin-sheet__save`}
      >
        {saving ? '⏳ جاري الحفظ…' : saveLabel}
      </motion.button>
      <button type="button" onClick={() => { haptic.light(); onCancel?.(); }} className="admin-sheet__cancel">
        {cancelLabel}
      </button>
    </div>
  );
}
