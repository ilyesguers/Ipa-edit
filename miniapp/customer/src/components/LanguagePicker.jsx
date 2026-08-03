import React, { useState } from 'react';
import useStore from '../store/useStore';
import { LANGUAGES } from '../i18n';
import { haptic } from '../utils/haptic';
import PremiumIcon from './PremiumIcon';

/**
 * A deliberately quiet first-run screen. It is rendered on its own before the
 * store mounts, so users cannot see, tap, or be distracted by the rest of the
 * interface before selecting a language.
 */
export default function LanguagePicker({ blocking = false }) {
  const { locale, setLocale, closeLanguagePicker } = useStore();
  const [saving, setSaving] = useState(false);

  const choose = async (code) => {
    if (saving) return;
    setSaving(true);
    haptic.light();
    try {
      await setLocale(code);
      closeLanguagePicker();
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={`language-gate ${blocking ? 'language-gate--blocking' : ''}`} role="dialog" aria-modal="true" aria-labelledby="language-title">
      <section className="language-gate__card">
        <div className="language-gate__mark" aria-hidden="true"><PremiumIcon name="globe" size="1.4rem" /></div>
        <h1 id="language-title">اختر لغتك</h1>
        <p>Choose your language</p>

        <div className="language-gate__list" aria-label="Language options">
          {LANGUAGES.map((lang) => {
            const active = lang.code === locale;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => choose(lang.code)}
                disabled={saving}
                dir={lang.rtl ? 'rtl' : 'ltr'}
                className={`language-gate__option ${active ? 'is-active' : ''}`}
              >
                <span className="language-gate__flag" aria-hidden="true">{lang.flag}</span>
                <span className="language-gate__label">{lang.label}</span>
                {active && <span className="language-gate__check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>

        {saving && <p className="language-gate__status" aria-live="polite">Saving…</p>}
      </section>
    </main>
  );
}
