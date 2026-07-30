import React from 'react';
import { motion } from 'framer-motion';

export default function ProductCard({ product, index, onSelect, compact = false }) {
  const minPrice = product.durations?.filter(d => d.isActive).reduce((min, d) => d.price < min ? d.price : min, Infinity);
  const hasStock = product.durations?.some(d => d.isActive && (d.stockCount > 0 || d.inStock));

  if (compact) {
    return (
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileTap={{ scale: 0.97 }}
        onClick={onSelect}
        className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 text-right"
      >
        {product.logo && <img src={product.logo} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{product.nameAr || product.name}</p>
          <p className="text-xs text-neon-blue font-semibold">من ${isFinite(minPrice) ? minPrice.toFixed(2) : '—'}</p>
        </div>
        <span className="text-muted">←</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="relative"
    >
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onSelect}
        className="w-full bg-card border border-border rounded-2xl p-4 text-right group overflow-hidden relative transition-all hover:border-neon-blue/30"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-l from-neon-blue/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex items-start gap-3">
          {/* Logo */}
          {product.logo ? (
            <img src={product.logo} alt={product.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 ring-1 ring-border" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-2xl flex-shrink-0">🔑</div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-black text-white text-base leading-tight">{product.nameAr || product.name}</h3>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {/* Stock badge */}
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${hasStock ? 'bg-neon/10 text-neon' : 'bg-red/10 text-red'}`}>
                  {hasStock ? '✅ متاح' : '❌ نفذ'}
                </span>
              </div>
            </div>

            {/* Features preview */}
            {product.features?.slice(0, 2).map((f, i) => (
              <p key={i} className="text-[10px] text-muted mt-0.5">{f.icon} {f.text}</p>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex gap-2">
            {/* Share button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={e => { e.stopPropagation(); }}
              className="w-7 h-7 rounded-lg bg-red/10 border border-red/20 flex items-center justify-center text-sm"
            >
              🔗
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-muted">من</p>
              <p className="text-neon-blue font-black text-lg leading-none glow-blue">
                ${isFinite(minPrice) ? minPrice.toFixed(2) : '—'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue font-bold">
              ←
            </div>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}
