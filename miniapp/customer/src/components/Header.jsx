import React from 'react';
import useStore from '../store/useStore';
import { cleanMarkdown, t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';

export default function Header() {
  const { user, publicSettings, setActiveTab, locale } = useStore();
  const tg = window.Telegram?.WebApp;
  const avatar = tg?.initDataUnsafe?.user?.photo_url;
  const brand = cleanMarkdown(publicSettings?.bot_name) || t(locale, 'brand');
  const balance = Number(user?.balance || 0).toFixed(2);

  return (
    <header className="store-header">
      <button
        type="button"
        onClick={() => setActiveTab('profile')}
        className="store-header__identity"
        aria-label={t(locale, 'navProfile')}
      >
        {avatar ? (
          <img src={avatar} alt="" className="store-header__avatar" />
        ) : (
          <span className="store-header__avatar store-header__avatar--fallback" aria-hidden="true">
            {user?.firstName?.[0] || 'G'}
          </span>
        )}
        <span className="store-header__copy">
          <strong>{brand}</strong>
          <small>{user?.firstName || t(locale, 'user')}</small>
        </span>
      </button>

      <div className="store-header__actions">
        <button
          type="button"
          onClick={() => {
            haptic.light();
            useStore.getState().openLanguagePicker();
          }}
          className="store-header__icon-button"
          aria-label={t(locale, 'language')}
          title={t(locale, 'language')}
        >
          <PremiumIcon name="globe" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className="store-header__balance"
          aria-label={t(locale, 'balance')}
        >
          <PremiumIcon name="wallet" size="1em" />
          <span>${balance}</span>
        </button>
      </div>
    </header>
  );
}
