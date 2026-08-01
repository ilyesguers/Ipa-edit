/**
 * 📳 Telegram Haptic Feedback — native tactile feedback for mobile.
 * Wraps Telegram.WebApp.HapticFeedback safely (no-ops outside Telegram).
 *
 * Usage:
 *   import { haptic } from '../utils/haptic';
 *   haptic.light();   // normal taps (tabs, opening items)
 *   haptic.medium();  // major actions (Buy, Submit)
 *   haptic.success(); // completed action
 *   haptic.error();   // failed validation
 */

const engine = () => window.Telegram?.WebApp?.HapticFeedback;

const safe = (fn) => {
  try { fn(); } catch (_) { /* haptics are optional */ }
};

export const haptic = {
  light: () => safe(() => engine()?.impactOccurred('light')),
  medium: () => safe(() => engine()?.impactOccurred('medium')),
  heavy: () => safe(() => engine()?.impactOccurred('heavy')),
  success: () => safe(() => engine()?.notificationOccurred('success')),
  error: () => safe(() => engine()?.notificationOccurred('error')),
  warning: () => safe(() => engine()?.notificationOccurred('warning')),
  selection: () => safe(() => engine()?.selectionChanged()),
};
