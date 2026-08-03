import React, { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';
import { playSound, useSoundStore } from '../utils/sound';

/**
 * 🎚️ Sound control — lives in the header.
 * Tap the speaker to open a small panel with:
 *   · mute / unmute toggle
 *   · smooth volume slider (with live % and quick presets)
 * Everything persists across visits.
 */
export default function VolumeControl() {
  const { locale } = useStore();
  const { volume, muted, setVolume, setMuted } = useSoundStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const effective = muted ? 0 : volume;
  const iconName = muted || effective === 0 ? 'volumeOff' : 'volume';

  const handleSlider = (event) => {
    const next = Number(event.target.value) / 100;
    setVolume(next);
    if (next > 0 && muted) setMuted(false);
  };

  const releaseSlider = () => playSound('tap');

  return (
    <div className="volume-control">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { haptic.light(); playSound('toggle'); setOpen((v) => !v); }}
        className="store-header__icon-button"
        aria-label={t(locale, 'sound')}
        title={t(locale, 'sound')}
        aria-expanded={open}
      >
        <PremiumIcon name={iconName} />
      </button>

      {open && (
        <div ref={panelRef} className="volume-panel" role="group" aria-label={t(locale, 'soundEffects')}>
          <div className="volume-panel__head">
            <span className="volume-panel__title">
              <PremiumIcon name={iconName} size="1rem" /> {t(locale, 'soundEffects')}
            </span>
            <strong>{Math.round(effective * 100)}%</strong>
          </div>

          <label className="volume-panel__slider">
            <span className="sr-only">{t(locale, 'volume')}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(volume * 100)}
              onChange={handleSlider}
              onPointerUp={releaseSlider}
              onKeyUp={releaseSlider}
              dir="ltr"
              style={{ '--fill': `${Math.round(volume * 100)}%` }}
            />
          </label>

          <div className="volume-panel__footer">
            <button
              type="button"
              className={`volume-panel__toggle ${muted ? 'is-off' : ''}`}
              onClick={() => {
                haptic.light();
                setMuted(!muted);
                if (muted) playSound('toggle');
              }}
            >
              <PremiumIcon name={muted ? 'volumeOff' : 'volume'} size="0.95rem" />
              <span>{muted ? t(locale, 'muted') : t(locale, 'sound')}</span>
            </button>
            <div className="volume-panel__presets" dir="ltr">
              {[25, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={Math.round(volume * 100) === preset ? 'is-active' : ''}
                  onClick={() => { haptic.light(); setVolume(preset / 100); if (muted) setMuted(false); playSound('tap'); }}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
