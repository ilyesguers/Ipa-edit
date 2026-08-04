import React from 'react';
import useStore from '../store/useStore';
import { cleanMarkdown, t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import VolumeControl from './VolumeControl';
import { haptic } from '../utils/haptic';
import { playSound } from '../utils/sound';

export default function Header() {
  const { user, publicSettings, setActiveTab, locale } = useStore();
  const tg = window.Telegram?.WebApp;
  const avatar = tg?.initDataUnsafe?.user?.photo_url;
  const brand = cleanMarkdown(publicSettings?.bot_name) || t(locale, 'brand');
  const balance = Number(user?.balance || 0).toFixed(2);

  return (
    <header className="store-header halo-container interactive-glow glass-card-pro" style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(13,15,18,.92)' }}>
      <button
        type="button"
        onClick={() => setActiveTab('profile')}
        className="store-header__identity"
        aria-label={t(locale, 'navProfile')}
        style={{ background: 'transparent', border: 'none' }}
      >
        {avatar ? (
          <img src={avatar} alt="" className="store-header__avatar" style={{ borderColor: 'rgba(16,185,129,.5)' }} />
        ) : (
          <span className="store-header__avatar store-header__avatar--fallback" aria-hidden="true"
            style={{ borderColor: 'rgba(16,185,129,.5)', color: '#10b981', background: 'rgba(16,185,129,.15)' }}>
            {user?.firstName?.[0] || 'G'}
          </span>
        )}
        <span className="store-header__copy">
          <strong className="text-glow-pro" style={{ fontWeight: 800 }}>{brand}</strong>
          <small>{user?.firstName || t(locale, 'user')}</small>
        </span>
      </button>

      <div className="store-header__actions" style={{ gap: '8px' }}>
        <VolumeControl />
        <button
          type="button"
          onClick={() => {
            haptic.light();
            playSound('tap');
            useStore.getState().openLanguagePicker();
          }}
          className="store-header__icon-button interactive-glow halo-btn"
          aria-label={t(locale, 'language')}
          title={t(locale, 'language')}
        >
          <PremiumIcon name="globe" />
        </button>
        <button
          type="button"
          onClick={() => { playSound('tap'); setActiveTab('profile'); }}
          className="store-header__balance interactive-glow halo-btn"
          aria-label={t(locale, 'balance')}
        >
          <PremiumIcon name="wallet" size="1em" />
          <span style={{ fontWeight: 900 }}>${balance}</span>
        </button>
      </div>
    </header>
  );
}
