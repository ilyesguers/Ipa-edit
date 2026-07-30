import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';

export default function Header() {
  const { user } = useStore();
  const tg = window.Telegram?.WebApp;
  const avatar = tg?.initDataUnsafe?.user?.photo_url;

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-[#1a1a1a]"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-neon/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon/20 to-neon-blue/20 flex items-center justify-center text-lg font-bold text-neon ring-2 ring-neon/30">
                {user?.firstName?.[0] || '?'}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-neon rounded-full border-2 border-black animate-pulse" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">{user?.firstName || 'مستخدم'}</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block bg-neon/10 text-neon border border-neon/20">
              CUSTOMER
            </span>
          </div>
        </div>

        {/* Right: Balance */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          className="bg-neon/10 border border-neon/30 rounded-xl px-4 py-2 cursor-pointer group"
          style={{ boxShadow: '0 0 15px rgba(0,255,136,0.1)' }}
        >
          <p className="text-[10px] text-neon/70 text-right">الرصيد</p>
          <p className="text-neon font-black text-lg leading-none glow-green">
            ${(user?.balance || 0).toFixed(2)}
          </p>
        </motion.div>
      </div>
    </motion.header>
  );
}
