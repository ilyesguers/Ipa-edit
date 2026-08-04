import React, { useEffect, useRef } from 'react';

/**
 * 🌌 InteractiveHalo — Professional interactive visual halo effect
 * Uses CSS animations with GPU-accelerated transforms for 60fps performance.
 */
export default function InteractiveHalo({ active = true, size = 280, intensity = 0.7 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const el = containerRef.current;
    el.style.animationDelay = `${Math.random() * 2}s`;
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="halo-container"
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        pointerEvents: 'none',
        opacity: intensity,
        zIndex: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        filter: 'blur(40px)',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `radial-gradient(circle at 30% 30%, rgba(16,185,129,0.35) 0%, rgba(96,165,250,0.25) 40%, rgba(168,85,247,0.2) 70%, transparent 100%)`,
          animation: 'halo-pulse 5s ease-in-out infinite alternate',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '-30%',
          background: `radial-gradient(circle at 70% 60%, rgba(96,165,250,0.2) 0%, transparent 55%), radial-gradient(circle at 40% 80%, rgba(168,85,247,0.15) 0%, transparent 50%)`,
          animation: 'halo-drift 8s ease-in-out infinite alternate',
          filter: 'blur(30px)',
        }}
      />
    </div>
  );
}
