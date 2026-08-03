import React from 'react';
import { normalizeLocale, t } from '../i18n';
import PremiumIcon from './PremiumIcon';

export default function LoadingScreen() {
  const locale = normalizeLocale(localStorage.getItem('locale') || 'ar');
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <span className="loading-screen__icon"><PremiumIcon name="gamepad" size="2rem" /></span>
      <strong>{t(locale, 'brand')}</strong>
      <span className="loading-screen__bar"><i /></span>
      <small>{t(locale, 'loading')}</small>
    </div>
  );
}
