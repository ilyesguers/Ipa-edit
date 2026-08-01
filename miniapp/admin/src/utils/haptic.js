/**
 * 📳 Telegram Haptic Feedback (admin panel) — safe wrapper, no-ops outside Telegram.
 */

const engine = () => window.Telegram?.WebApp?.HapticFeedback;
const safe = (fn) => { try { fn(); } catch (_) {} };

export const haptic = {
  light: () => safe(() => engine()?.impactOccurred('light')),
  medium: () => safe(() => engine()?.impactOccurred('medium')),
  heavy: () => safe(() => engine()?.impactOccurred('heavy')),
  success: () => safe(() => engine()?.notificationOccurred('success')),
  error: () => safe(() => engine()?.notificationOccurred('error')),
  warning: () => safe(() => engine()?.notificationOccurred('warning')),
  selection: () => safe(() => engine()?.selectionChanged()),
};
