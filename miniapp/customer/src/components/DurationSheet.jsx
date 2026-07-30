import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';

export default function DurationSheet() {
  const { selectedProduct, selectDuration } = useStore();

  if (!selectedProduct) return null;

  const durations = selectedProduct.durations?.filter(d => d.isActive) || [];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => useStore.setState({ showDurationSheet: false })}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Product Header */}
        <div className="px-4 pb-3 border-b border-[#1a1a1a]">
          <div className="flex gap-3 items-start">
            {selectedProduct.logo && (
              <img src={selectedProduct.logo} alt={selectedProduct.name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-border" />
            )}
            <div>
              <h2 className="font-black text-white text-lg">{selectedProduct.nameAr || selectedProduct.name}</h2>
              {selectedProduct.features?.slice(0, 3).map((f, i) => (
                <p key={i} className="text-xs text-muted">{f.icon} {f.text}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Durations */}
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs text-muted mb-3 font-semibold">اختر المدة المناسبة:</p>
          <div className="space-y-3">
            {durations.map((dur, i) => {
              const inStock = dur.stockCount > 0 || dur.inStock;
              return (
                <motion.button
                  key={dur._id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => inStock && selectDuration(dur)}
                  disabled={!inStock}
                  className={`w-full rounded-2xl p-4 flex items-center justify-between border transition-all
                    ${inStock
                      ? 'bg-[#1a1a1a] border-border hover:border-red/40 cursor-pointer group'
                      : 'bg-[#111] border-border/50 cursor-not-allowed opacity-60'
                    }`}
                >
                  <div className="text-right">
                    <p className="font-bold text-white text-base">{dur.nameAr || dur.name}</p>
                    {dur.originalPrice && (
                      <p className="text-xs text-muted line-through">${dur.originalPrice.toFixed(2)}</p>
                    )}
                    <p className="text-neon-blue font-black text-xl glow-blue">${dur.price.toFixed(2)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {inStock ? (
                      <>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neon/10 text-neon border border-neon/20">
                          {dur.stockCount} متاح
                        </span>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="bg-red text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1"
                          style={{ boxShadow: '0 0 15px rgba(255,59,92,0.3)' }}
                        >
                          يشتري 🛒
                        </motion.div>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-[#2a2a2a] text-muted">
                        غير متوفر
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}
