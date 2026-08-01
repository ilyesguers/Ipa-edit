import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';
import api from '../../utils/api';
import { cachedFetch } from '../../utils/cache';

export default function ProfileTab() {
  const { user, locale, toggleLocale } = useStore();
  const [balanceHistory, setBalanceHistory] = useState([]);
  useEffect(() => {
    cachedFetch('balance-history', async () => (await api.get('/users/me/balance-history')).data.data?.history || [], 45 * 1000)
      .then(setBalanceHistory)
      .catch(() => {});
  }, []);
  const stats = [
    { label: t(locale, 'totalOrders'), value: user?.totalOrders || 0, icon: 'crown', color: '#fbbf24' }, 
    { label: t(locale, 'totalSpent'), value: `$${Number(user?.totalSpent || 0).toFixed(2)}`, icon: 'coin', color: '#3b82f6' }, 
    { label: t(locale, 'totalDeposited'), value: `$${Number(user?.totalDeposited || 0).toFixed(2)}`, icon: 'wallet', color: '#10b981' }
  ];
  const dateLocale = t(locale, 'dateLocale');

  const level = (user?.totalOrders || 0) > 15 ? { name: 'LEGEND 👑', color: '#fbbf24' } : (user?.totalOrders || 0) > 8 ? { name: 'PRO 🔥', color: '#f97316' } : (user?.totalOrders || 0) > 3 ? { name: 'GAMER 🎮', color: '#10b981' } : { name: 'NOOB 🌱', color: '#9ca3af' };

  return (
    <div className="p-4 space-y-5">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-[28px] p-6 border border-[#10b981]/20 overflow-hidden shadow-2xl bg-gradient-to-br from-[#161922] via-[#1f2430] to-[#161922]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.12),transparent_40%)]" />
        <div className="flex items-start gap-4 relative">
          <div className="relative">
            <div className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-[#10b981]/30 to-[#3b82f6]/30 flex items-center justify-center text-[#10b981] border-2 border-[#10b981]/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <PremiumIcon name="crown" size="2.5rem" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#fbbf24] to-[#f97316] text-black text-[9px] font-black px-2 py-1 rounded-full border-2 border-[#161922] shadow-lg">{level.name}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-black text-white flex items-center gap-2 font-[Orbitron]">{user?.firstName} {user?.lastName || ''} <span className="text-sm">👑</span></h2>
            <p className="text-[#9ca3af] text-sm font-bold">@{user?.username || 'gamer'} • {user?.role === 'admin' ? 'Legend 👑' : 'Pro Gamer 😎'}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-3 py-1 rounded-full border" style={{ background: `${level.color}15`, color: level.color, borderColor: `${level.color}30` }}>
                <PremiumIcon name="fire" size="0.9em" /> {level.name}
              </span>
              <span className="text-[11px] bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2.5 py-1 rounded-full font-black">LVL {Math.min(99, (user?.totalOrders || 0) + 1)}</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#10b981]/15 to-[#3b82f6]/10 border border-[#10b981]/30 rounded-2xl px-4 py-3 text-center shadow-lg shadow-[#10b981]/10">
            <p className="text-[10px] text-[#10b981]/70 font-black tracking-wider">{t(locale, 'balance')} 💰</p>
            <p className="text-[#10b981] font-black text-[20px] glow-green font-[Orbitron] mt-1">${Number(user?.balance || 0).toFixed(2)}</p>
            <p className="text-[9px] text-[#9ca3af] mt-1 font-bold">READY TO PLAY 🚀</p>
          </div>
        </div>
      </motion.div>

      <div className="gamer-card rounded-[20px] p-5 space-y-3">
        <h3 className="font-black text-white flex items-center gap-2 text-sm"><PremiumIcon name="target" className="text-[#10b981]" /> Info - أسطورة البيانات 👑</h3>
        {[
          [t(locale, 'id'), user?.telegramId, 'target'],
          [t(locale, 'phone'), t(locale, 'notVerified'), 'fire'],
          [t(locale, 'currency'), 'USD 💵', 'wallet'],
          [t(locale, 'joined'), user?.createdAt ? new Date(user.createdAt).toLocaleDateString(dateLocale) : '—', 'bolt']
        ].map(([label, value, icon]) => (
          <div key={label} className="flex justify-between items-center text-[13px] border-b border-[#1f2430]/50 pb-3 last:border-0 last:pb-0">
            <span className="text-[#9ca3af] font-bold flex items-center gap-2"><PremiumIcon name={icon} size="0.9em" className="text-[#10b981]/60" />{label}</span>
            <span className="font-black text-white bg-[#0d0f12]/50 px-3 py-1 rounded-full border border-[#1f2430] text-xs">{value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: index * 0.08, type: 'spring' }} whileHover={{ y: -3, scale: 1.02 }} className="gamer-card rounded-[20px] p-4 text-center group hover:shadow-xl">
            <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}30`, color: stat.color }}>
              <PremiumIcon name={stat.icon} size="1.4rem" />
            </div>
            <p className="text-[16px] font-black text-white font-[Orbitron]">{stat.value}</p>
            <p className="text-[10px] text-[#9ca3af] mt-1 font-black tracking-wide">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <button type="button" onClick={() => toggleLocale()} className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl border border-purple/30 bg-gradient-to-r from-purple/10 to-pink/10 p-4 text-purple-200 font-black hover:from-purple/20 hover:to-pink/20 transition-all">
        <PremiumIcon name="globe" /> {t(locale, 'language')}: {t(locale, 'switchLanguage')} 🌍
      </button>

      {user?.role === 'admin' && (
        <a href="/admin#dashboard" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2.5 text-center bg-gradient-to-r from-[#fbbf24]/15 to-[#f97316]/15 border border-[#fbbf24]/30 rounded-2xl p-4 text-[#fbbf24] font-black hover:from-[#fbbf24]/25 hover:to-[#f97316]/25 transition-all shadow-lg shadow-[#fbbf24]/10">
          <PremiumIcon name="crown" /> {t(locale, 'adminPanel')} 👑 LEGEND ZONE
        </a>
      )}

      {balanceHistory.length > 0 && (
        <div className="space-y-3">
          <div className="section-heading"><PremiumIcon name="wallet" /><h3>{t(locale, 'balanceHistory')} 💰</h3></div>
          <div className="space-y-2.5">
            {balanceHistory.slice(0, 5).map((transaction, index) => (
              <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex items-center justify-between text-sm gamer-card rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${transaction.type === 'credit' ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20' : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/20'}`}>
                    <PremiumIcon name={transaction.type === 'credit' ? 'rocket' : 'fire'} size="0.9em" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-black">{transaction.description || transaction.type} {transaction.type === 'credit' ? '🚀' : '💸'}</p>
                    <p className="text-[#6b7280] text-[10px] font-bold">{new Date(transaction.createdAt).toLocaleDateString(dateLocale)}</p>
                  </div>
                </div>
                <p className={`font-black text-[14px] px-3 py-1 rounded-full border ${transaction.type === 'credit' ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20' : 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20'}`}>
                  {transaction.type === 'credit' ? '+' : '-'}${Number(transaction.amount || 0).toFixed(2)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
