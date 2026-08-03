/**
 * 🔊 WebStore sound engine — tiny synthesized SFX, zero asset files.
 *
 * Every effect is generated with the Web Audio API (oscillators + filtered
 * noise), so the bundle ships no mp3/ogg at all. The engine:
 *   · lazily creates the AudioContext on the FIRST user gesture
 *     (Telegram WebView autoplay policy is respected this way)
 *   · keeps one master GainNode for instant volume control
 *   · persists volume + mute in localStorage
 */
import { create } from 'zustand';

const VOLUME_KEY = 'sound_volume';
const MUTED_KEY = 'sound_muted';

const readVolume = () => {
  try {
    const raw = parseFloat(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 1) : 0.55;
  } catch (_) { return 0.55; }
};
const readMuted = () => {
  try { return localStorage.getItem(MUTED_KEY) === '1'; } catch (_) { return false; }
};

let audioCtx = null;
let masterGain = null;

const ensureContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
};

const applyMasterVolume = (volume, muted) => {
  if (!masterGain || !audioCtx) return;
  const target = muted ? 0 : volume * 0.5; // 0..0.5 keeps effects soft, never harsh
  masterGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.03);
};

/** Zustand store so every control stays in sync (header button + profile). */
export const useSoundStore = create((set, get) => ({
  volume: readVolume(),
  muted: readMuted(),
  enabled: true, // AudioContext unsupported → engine no-ops but UI stays honest
  setVolume: (value) => {
    const volume = Math.min(Math.max(Number(value), 0), 1);
    try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch (_) {}
    applyMasterVolume(volume, get().muted);
    set({ volume });
  },
  setMuted: (muted) => {
    try { localStorage.setItem(MUTED_KEY, muted ? '1' : '0'); } catch (_) {}
    applyMasterVolume(get().volume, muted);
    set({ muted });
  },
  toggleMuted: () => get().setMuted(!get().muted)
}));

// ─── Primitive builders ────────────────────────────────────────────────────

/** One soft sine/triangle blip. */
const tone = ({ freq = 440, freqEnd = null, type = 'sine', start = 0, dur = 0.12, gain = 0.3 }) => {
  const ctx = ensureContext();
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
};

/** Short filtered noise burst — used for whooshes. */
const swoosh = ({ start = 0, dur = 0.22, from = 400, to = 2400, gain = 0.22 }) => {
  const ctx = ensureContext();
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime + start;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(env).connect(masterGain);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
};

// ─── Public effect library ─────────────────────────────────────────────────

const FX = {
  tap: () => tone({ freq: 620, freqEnd: 520, type: 'triangle', dur: 0.07, gain: 0.22 }),
  select: () => { tone({ freq: 520, type: 'sine', dur: 0.08, gain: 0.2 }); tone({ freq: 780, start: 0.05, dur: 0.1, gain: 0.2 }); },
  tab: () => swoosh({ dur: 0.16, from: 500, to: 1600, gain: 0.14 }),
  open: () => { swoosh({ dur: 0.22, from: 300, to: 2000, gain: 0.18 }); tone({ freq: 660, start: 0.06, dur: 0.12, gain: 0.14 }); },
  close: () => swoosh({ dur: 0.2, from: 2000, to: 400, gain: 0.14 }),
  success: () => { tone({ freq: 523.25, dur: 0.12, gain: 0.24 }); tone({ freq: 659.25, start: 0.09, dur: 0.12, gain: 0.24 }); tone({ freq: 783.99, start: 0.18, dur: 0.22, gain: 0.26 }); },
  error: () => { tone({ freq: 220, freqEnd: 180, type: 'sawtooth', dur: 0.16, gain: 0.16 }); tone({ freq: 164, freqEnd: 140, type: 'sawtooth', start: 0.12, dur: 0.2, gain: 0.14 }); },
  coin: () => { tone({ freq: 987.77, type: 'square', dur: 0.09, gain: 0.12 }); tone({ freq: 1318.5, start: 0.08, type: 'square', dur: 0.18, gain: 0.12 }); },
  toggle: () => tone({ freq: 440, freqEnd: 660, type: 'triangle', dur: 0.09, gain: 0.18 }),
  star: () => { tone({ freq: 1174.7, dur: 0.1, gain: 0.16 }); tone({ freq: 1568, start: 0.07, dur: 0.26, gain: 0.18 }); },
  // ✨ New effects — same synthesized approach, still zero asset files.
  sparkle: () => { tone({ freq: 1568, dur: 0.07, gain: 0.14 }); tone({ freq: 2093, start: 0.05, dur: 0.08, gain: 0.12 }); tone({ freq: 2637, start: 0.11, dur: 0.14, gain: 0.12 }); },
  pop: () => tone({ freq: 330, freqEnd: 760, type: 'sine', dur: 0.06, gain: 0.2 }),
  whoosh: () => swoosh({ dur: 0.28, from: 240, to: 2600, gain: 0.16 }),
  levelup: () => { tone({ freq: 392, dur: 0.1, gain: 0.2 }); tone({ freq: 523.25, start: 0.08, dur: 0.1, gain: 0.2 }); tone({ freq: 659.25, start: 0.16, dur: 0.1, gain: 0.2 }); tone({ freq: 783.99, start: 0.24, dur: 0.24, gain: 0.24 }); },
  notification: () => { tone({ freq: 880, dur: 0.08, gain: 0.16 }); tone({ freq: 1108.7, start: 0.09, dur: 0.12, gain: 0.16 }); }
};

export const playSound = (name) => {
  const { muted } = useSoundStore.getState();
  if (muted) return;
  const fx = FX[name];
  if (!fx) return;
  try { fx(); } catch (_) { /* audio is best-effort */ }
};

/** Attach once at app start so the AudioContext unlocks on the first tap. */
export const initSoundUnlock = () => {
  const unlock = () => {
    ensureContext();
    const { volume, muted } = useSoundStore.getState();
    applyMasterVolume(volume, muted);
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
};
