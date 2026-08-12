import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import PremiumIcon from '../PremiumIcon';
import api from '../../utils/api';
import { cachedFetch } from '../../utils/cache';
import { haptic } from '../../utils/haptic';
import { playSound } from '../../utils/sound';

const ITEM_W = 168;
const GAP = 14;
const TOTAL_W = ITEM_W + GAP;
const STRIP_COUNT = 250;
const SPIN_MS = 6000;

export default function WheelTab() {
  const { user, locale, setUser } = useStore();
  const [wheels, setWheels] = useState([]);
  const [wheel, setWheel] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [particles, setParticles] = useState([]);
  const viewRef = useRef(null);
  const isAr = locale === 'ar';

  useEffect(() => {
    cachedFetch('wheels-active', async () => (await api.get('/wheel/active')).data.data || [], 60_000)
      .then(setWheels).catch(() => setWheels([])).finally(() => setLoading(false));
  }, []);

  const prizes = wheel?.prizes?.filter(p => p.isActive !== false) || [];
  const cost = wheel?.costPerSpin || 0;

  /* build repeating strip */
  const strip = useCallback(() => {
    if (!prizes.length) return [];
    const arr = [];
    for (let i = 0; i < STRIP_COUNT; i++) arr.push({ ...prizes[i % prizes.length], _key: i });
    return arr;
  }, [prizes])();

  /* spin */
  const spin = async () => {
    if (spinning || !wheel) return;
    const balance = Number(user?.balance || 0);
    if (balance < cost) {
      haptic.error();
      toast.error(isAr ? `رصيدك $${balance.toFixed(2)} — تحتاج $${cost.toFixed(2)}` : `Balance $${balance.toFixed(2)} — need $${cost.toFixed(2)}`);
      return;
    }
    setSpinning(true); setResult(null); setShowResult(false); setParticles([]);
    haptic.heavy(); playSound('whoosh');

    try {
      const r = await api.post(`/wheel/${wheel._id}/spin`);
      const d = r.data.data;
      const pIdx = Math.max(0, Number(d.prizeIndex) || 0);
      const cw = viewRef.current?.offsetWidth || 360;
      const center = cw / 2;
      const loops = 6 + Math.floor(Math.random() * 4);
      const tgt = loops * prizes.length + pIdx;
      setOffset(tgt * TOTAL_W + ITEM_W / 2 - center);

      /* mid-spin haptics */
      const h1 = setTimeout(() => haptic.light(), 1500);
      const h2 = setTimeout(() => haptic.light(), 3000);
      const h3 = setTimeout(() => haptic.medium(), 4500);

      await new Promise(r => setTimeout(r, SPIN_MS + 300));
      clearTimeout(h1); clearTimeout(h2); clearTimeout(h3);

      playSound('levelup'); haptic.notificationOccurred('success');

      /* confetti */
      const colors = ['#10b981', '#f59e0b', '#ec4899', '#6366f1', '#06b6d4', '#f97316', '#a855f7', '#e11d48'];
      setParticles(Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 300,
        y: -80 - Math.random() * 200,
        r: Math.random() * 360,
        d: 0.6 + Math.random() * 0.8,
        c: colors[i % colors.length],
        s: 6 + Math.random() * 8
      })));

      setResult(d); setShowResult(true);
      if (user && typeof d.newBalance === 'number') setUser({ ...user, balance: d.newBalance });
    } catch (err) {
      haptic.error();
      const msg = err.response?.status === 401
        ? (isAr ? 'افتح المتجر من داخل تيليجرام للدوران' : 'Open the store from Telegram to spin')
        : (err.response?.data?.error || (isAr ? 'فشل الدوران' : 'Spin failed'));
      toast.error(msg);
    } finally { setSpinning(false); }
  };

  /* ── Wheel select screen ── */
  if (!wheel) {
    return (
      <div className="store-page space-y-5">
        <section className="store-intro">
          <div>
            <p className="store-intro__eyebrow">{isAr ? 'العاب الحظ' : 'Luck Games'}</p>
            <h1>{isAr ? 'عجلة الحظ' : 'Lucky Wheel'}</h1>
            <p>{isAr ? 'ادفع ودور واربح جوائز فورية' : 'Pay, spin & win instant prizes'}</p>
          </div>
        </section>

        {loading ? <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 rounded-2xl skeleton" />)}</div>
        : wheels.length ? <div className="space-y-3">{wheels.map(w => (
            <button key={w._id} type="button" className="wheel-select-card"
              style={{ '--accent': w.prizes?.[0]?.color || '#10b981' }}
              onClick={() => { haptic.light(); playSound('tap'); setWheel(w); setResult(null); setShowResult(false); setOffset(0); }}>
              <div className="wheel-select-card__row">
                <div><strong>{w.nameAr || w.name}</strong><small>{w.prizes?.filter(p => p.isActive !== false).length || 0} {isAr ? 'جائزة' : 'prizes'}</small></div>
                <span className="wheel-select-card__badge">${w.costPerSpin}</span>
              </div>
              <div className="wheel-select-card__prizes">
                {w.prizes?.filter(p => p.isActive !== false).slice(0, 8).map((p, i) => (
                  <span key={i} style={{ background: `${p.color}18`, color: p.color, borderColor: `${p.color}40` }}>
                    {p.icon || '✨'} {p.labelAr || p.label} {p.value > 0 ? `$${p.value}` : ''}
                  </span>
                ))}
              </div>
            </button>
          ))}</div>
        : <div className="empty-state"><PremiumIcon name="gift" size="2rem" /><strong>{isAr ? 'لا توجد عجلات حالياً' : 'No wheels yet'}</strong></div>}
      </div>
    );
  }

  /* ── Spin screen ── */
  return (
    <div className="wheel-screen">
      {/* Cosmic background */}
      <div className="wheel-bg" aria-hidden="true">
        <div className="wheel-bg__stars" />
        <div className="wheel-bg__glow wheel-bg__glow--1" />
        <div className="wheel-bg__glow wheel-bg__glow--2" />
        <div className="wheel-bg__glow wheel-bg__glow--3" />
      </div>

      {/* Header */}
      <div className="wheel-top">
        <button type="button" onClick={() => { haptic.light(); setWheel(null); setResult(null); }}
          className="wheel-top__back"><PremiumIcon name="left" /></button>
        <div className="wheel-top__info">
          <strong>{wheel.nameAr || wheel.name}</strong>
          <small>{isAr ? 'رصيدك' : 'Balance'}: <b>${Number(user?.balance || 0).toFixed(2)}</b></small>
        </div>
        <span className="wheel-top__cost">${cost}</span>
      </div>

      {/* Title */}
      <div className="wheel-title">
        <span className="wheel-title__icon">🎡</span>
        <h2>{isAr ? 'ادور واربح!' : 'Spin & Win!'}</h2>
        <p>{isAr ? 'اضغط الزر وشوف وين بيقف السهم' : 'Press the button and see where the arrow lands'}</p>
      </div>

      {/* Wheel viewport */}
      <div className="wheel-viewport" ref={viewRef} dir="ltr">
        <div className="wheel-viewport__glow" />
        <div className="wheel-fade wheel-fade--l" />
        <div className="wheel-fade wheel-fade--r" />

        <div className={`wheel-strip ${spinning ? 'wheel-strip--go' : ''}`}
          style={{ transform: `translateX(-${offset}px)`, transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(.12,.8,.25,1)` : 'none' }}>
          {strip.map((item) => (
            <div key={item._key} className="wheel-card" style={{ '--c': item.color, width: ITEM_W, marginInlineEnd: GAP }}>
              <span className="wheel-card__icon">{item.icon || (item.value > 0 ? '💰' : '🎯')}</span>
              <span className="wheel-card__name">{item.labelAr || item.label}</span>
              {item.value > 0 && <span className="wheel-card__val">${item.value}</span>}
            </div>
          ))}
        </div>

        {/* Small pointer at the top, tip facing down onto the winning card */}
        <div className="wheel-pointer" aria-hidden="true">
          <svg viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ptrGrad" x1="12" y1="0" x2="12" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6ee7b7" /><stop offset="1" stopColor="#059669" />
              </linearGradient>
              <filter id="ptrGlow"><feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor="#10b981" floodOpacity="0.7" /></filter>
            </defs>
            <path d="M12 26L3 14H8V3H16V14H21L12 26Z" fill="url(#ptrGrad)" filter="url(#ptrGlow)" />
          </svg>
        </div>
        <div className="wheel-pointer-ring" />
      </div>

      {/* Spin button */}
      <motion.button type="button" onClick={spin} disabled={spinning || Number(user?.balance || 0) < cost}
        whileTap={{ scale: 0.94 }} className={`wheel-spin ${spinning ? 'wheel-spin--go' : ''} ${Number(user?.balance || 0) < cost ? 'wheel-spin--no' : ''}`}>
        {spinning
          ? <span className="wheel-spin__loader" />
          : <><span className="wheel-spin__txt">{isAr ? '  دور الآن' : '  SPIN'}</span><span className="wheel-spin__price">${cost}</span></>}
      </motion.button>

      {/* Prize list (compact) */}
      <div className="wheel-prizes-row">
        {prizes.map((p, i) => (
          <span key={i} className="wheel-prizes-row__tag" style={{ background: `${p.color}15`, color: p.color, borderColor: `${p.color}30` }}>
            {p.icon || '✨'} {p.labelAr || p.label}{p.value > 0 ? ` $${p.value}` : ''}
          </span>
        ))}
      </div>

      {/* Result modal */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div className="wheel-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowResult(false)}>
            <motion.div className="wheel-modal__card" initial={{ scale: 0.2, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              onClick={e => e.stopPropagation()}>

              {/* Confetti */}
              <div className="wheel-confetti" aria-hidden="true">
                {particles.map(p => <span key={p.id} className="wheel-confetti__p"
                  style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`, '--d': `${p.d}s`, '--c': p.c, '--s': `${p.s}px` }} />)}
              </div>

              <div className="wheel-modal__halo" style={{ '--pc': result.prize?.color || '#10b981' }} />

              <span className="wheel-modal__icon">{result.prize?.icon || (result.prize?.value > 0 ? '🎉' : '🎯')}</span>
              <h3>{isAr ? ' مبروك!' : ' Congratulations!'}</h3>
              <strong className="wheel-modal__prize" style={{ color: result.prize?.color || '#10b981' }}>
                {result.prize?.labelAr || result.prize?.label}
              </strong>
              {result.prize?.value > 0 && <span className="wheel-modal__amount" style={{ color: result.prize?.color }}>+${result.prize.value.toFixed(2)}</span>}
              <p className="wheel-modal__bal">{isAr ? 'رصيدك' : 'Balance'}: <b>${result.newBalance?.toFixed(2)}</b></p>

              <div className="wheel-modal__btns">
                <button type="button" onClick={() => { setShowResult(false); spin(); }}
                  disabled={spinning || user.balance < cost} className="wheel-modal__again">
                  {isAr ? '  دور مرة ثانية' : '  Spin Again'} — ${cost}
                </button>
                <button type="button" onClick={() => setShowResult(false)} className="wheel-modal__close">
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
