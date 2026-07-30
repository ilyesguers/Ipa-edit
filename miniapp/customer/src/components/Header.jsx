import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';

export default function Header() {
  const { user, setActiveTab } = useStore();
  const tg = window.Telegram?.WebApp;
  const avatar = tg?.initDataUnsafe?.user?.photo_url;

  // Click header → open profile tab
  const handleAvatarClick = () => {
    setActiveTab('profile');
  };

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-[#1a1a1a]"
    >
      {/* Shimmer gloss bar */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
          className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-12"
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3 relative">
        {/* Left: Avatar + Info */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleAvatarClick}
          className="flex items-center gap-3"
        >
          <div className="relative">
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-neon/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon/20 to-neon-blue/20 flex items-center justify-center text-lg font-bold text-neon ring-2 ring-neon/30">
                {user?.firstName?.[0] || '?'}
              </div>
            )}
            {/* Pulsing online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-neon rounded-full border-2 border-black">
              <span className="absolute inset-0 bg-neon rounded-full animate-ping opacity-75" />
            </span>
          </div>
          <div className="text-right">
            <p className="font-bold text-white text-sm leading-none">{user?.firstName || 'مستخدم'}</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block bg-neon/10 text-neon border border-neon/20">
              CUSTOMER
            </span>
          </div>
        </motion.button>

        {/* Right: Balance */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('profile')}
          className="bg-neon/10 border border-neon/30 rounded-xl px-4 py-2 cursor-pointer group relative overflow-hidden"
          style={{ boxShadow: '0 0 15px rgba(0,255,136,0.1)' }}
        >
          {/* Inner shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-[10px] text-neon/70 text-right">الرصيد</p>
          <p className="text-neon font-black text-lg leading-none glow-green">
            ${(user?.balance || 0).toFixed(2)}
          </p>
        </motion.div>
      </div>
    </motion.header>
  );
}
