import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';

/**
 * 🌟 Enhanced Professional Showcase Component
 * Demonstrates all new professional visual effects:
 * - Interactive halos
 * - Glass cards
 * - Gradient borders
 * - Interactive glows
 * - Professional animations
 */
export default function ProfessionalShowcase() {
  const { locale } = useStore();
  const [hovered, setHovered] = useState(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let raf;
    const tick = () => {
      setTime(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const isAr = locale === 'ar';

  return (
    <div className="store-page" style={{ paddingTop: '8px' }}>
      <section className="halo-container gradient-border-card" style={{ borderRadius: '24px', marginBottom: '16px', overflow: 'visible' }}>
        <div className="card-inner" style={{ padding: '22px 20px', position: 'relative' }}>
          <InteractiveHalo active={true} size={320} intensity={0.6} />
          <h2 className="text-glow-pro" style={{ fontSize: '22px', fontWeight: 900, marginBottom: '8px', position: 'relative', zIndex: 2 }}>
            {isAr ? '🌟 تحديث احترافي متكامل' : '🌟 Professional Complete Update'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.7, position: 'relative', zIndex: 2 }}>
            {isAr
              ? 'تم تطبيق مؤثرات بصرية احترافية، هالات تفاعلية، بطاقات زجاجية، وتأثيرات ضوئية متقدمة مع الحفاظ الكامل على جميع البيانات والمحتوى الحالي.'
              : 'Professional visual effects, interactive halos, glass cards, glow effects, with complete data preservation.'}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', position: 'relative', zIndex: 2 }}>
            {['halo', 'glass', 'glow', 'gradient', 'animation', 'performance'].map((feature) => (
              <span
                key={feature}
                className="interactive-glow halo-btn shimmer-overlay"
                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#10b981', borderColor: 'rgba(16,185,129,.35)' }}
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function InteractiveHalo({ active, size, intensity }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: intensity,
        borderRadius: '50%',
        overflow: 'hidden',
      }}
    >
      <div style={{
        width: '100%', height: '100%',
        background: 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.35) 0%, rgba(96,165,250,0.25) 40%, rgba(168,85,247,0.2) 70%, transparent 100%)',
        animation: 'halo-pulse 5s ease-in-out infinite alternate',
      }} />
    </div>
  );
}
