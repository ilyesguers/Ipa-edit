import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import { localizedName, t, cleanMarkdown } from '../../i18n';
import ProductCard from '../ProductCard';
import PremiumIcon from '../PremiumIcon';
import api from '../../utils/api';
import { cachedFetch } from '../../utils/cache';

export default function ProductsTab() {
  const { categories, selectedCategory, selectedGame, games, products, fetchCategories, selectCategory, selectGame, selectProduct, publicSettings, user, locale } = useStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeProductType, setActiveProductType] = useState('panel');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories().catch(() => {});
    // Cached 60s — returning to the PLAY tab never re-fetches the featured row
    cachedFetch('featured', async () => (await api.get('/shop/featured')).data.data || [], 60 * 1000)
      .then(setFeaturedProducts)
      .catch(() => setFeaturedProducts([]));
  }, [fetchCategories]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      const q = search.trim();
      cachedFetch(`search:${q.toLowerCase()}`, async () => (await api.get(`/shop/search?q=${encodeURIComponent(q)}`)).data.data || [], 20 * 1000)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCategory = async (category) => {
    setLoading(true);
    try { await selectCategory(category); } finally { setLoading(false); }
  };
  const handleGame = async (game) => {
    setLoading(true);
    try { await selectGame(game); } finally { setLoading(false); }
  };

  if (selectedGame) {
    const visibleProducts = products.filter((product) => activeProductType === 'panel'
      ? !product.productType || product.productType === 'panel_key'
      : product.productType === 'service');
    return (
      <div className="p-4">
        <Breadcrumb locale={locale} />
        <div className="flex gap-2 bg-[#161922] border border-[#2d3748] rounded-2xl p-1.5 mt-4 shadow-lg">
          <TypeButton active={activeProductType === 'panel'} onClick={() => setActiveProductType('panel')} icon="gem" text={t(locale, 'panelKeys')} />
          <TypeButton active={activeProductType === 'service'} onClick={() => setActiveProductType('service')} icon="rocket" text={t(locale, 'services')} />
        </div>
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="grid gap-3 mt-4">
          {loading ? <SkeletonList /> : visibleProducts.map((product, index) => <ProductCard key={product._id} product={product} index={index} locale={locale} onSelect={() => selectProduct(product)} />)}
          {!loading && visibleProducts.length === 0 && <EmptyState icon="ghost" text={t(locale, 'noProducts')} subtext={t(locale, 'tryAnother')} />}
        </motion.div>
      </div>
    );
  }

  if (selectedCategory) {
    return (
      <div className="p-4">
        <Breadcrumb locale={locale} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 mb-3">
          <h2 className="text-white font-black text-lg flex items-center gap-2">
            <PremiumIcon name="fire" className="text-orange-400" /> {localizedName(selectedCategory, locale)} - Choose Your Game 🔥
          </h2>
          <p className="text-muted text-xs mt-1">{t(locale, 'levelUp')} - Pick & PLAY NOW 🚀</p>
        </motion.div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {loading ? <SkeletonGrid /> : games.map((game, index) => <GameCard key={game._id} game={game} index={index} locale={locale} onSelect={() => handleGame(game)} />)}
          {!loading && games.length === 0 && <EmptyState icon="ghost" text={t(locale, 'noGames')} subtext={t(locale, 'soon')} />}
        </div>
      </div>
    );
  }

  const supportUsername = publicSettings?.support_username || 'support';
  const channelUsername = publicSettings?.channel_username || '';
  const highlights = Array.isArray(publicSettings?.ui_home_highlights) ? publicSettings.ui_home_highlights : [];
  const themeKey = publicSettings?.ui_theme_preset || 'midnight';

  return (
    <div className="p-4 space-y-5">
      {/* COMPACT HERO — short so products stay above the fold */}
      <section className="rounded-[22px] border border-[#10b981]/20 overflow-hidden relative bg-gradient-to-br from-[#161922] to-[#1f2430]">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
        <div className="px-4 py-4 relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#10b981]/25 bg-[#10b981]/10 text-[10px] text-[#10b981] font-black tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              {locale === 'en' ? (publicSettings?.ui_welcome_badge_en || t(locale, 'welcomeBadge')) : (publicSettings?.ui_welcome_badge_ar || t(locale, 'welcomeBadge'))}
            </span>
          </div>
          <h2 className="text-white text-[19px] font-black leading-snug font-[Orbitron]">
            <span className="gradient-text">{cleanMarkdown(locale === 'en' ? (publicSettings?.ui_welcome_title_en || t(locale, 'welcomeTitle')) : (publicSettings?.ui_welcome_title_ar || t(locale, 'welcomeTitle')))}</span>
          </h2>
          <p className="text-[#9ca3af] text-[12px] mt-1.5 leading-6 line-clamp-2">
            {cleanMarkdown(locale === 'en' ? (publicSettings?.ui_welcome_subtitle_en || t(locale, 'welcomeSubtitle')) : (publicSettings?.ui_welcome_subtitle_ar || t(locale, 'welcomeSubtitle')))}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {highlights.slice(0, 3).map((item, index) => (
              <span key={item.id || index} className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full border border-[#2d3748] bg-[#0d0f12]/60 px-2.5 py-1 text-white">
                <PremiumIcon name={item.emojiKey || 'rocket'} className="text-[#10b981]" />
                {cleanMarkdown(locale === 'en' ? (item.textEn || item.textAr) : (item.textAr || item.textEn))}
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-3.5">
            <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#ef4444]/25 bg-[#ef4444]/10 px-3 py-2.5 text-[12px] font-black text-white hover:bg-[#ef4444]/20 transition-all">
              <PremiumIcon name="fire" /> {t(locale, 'support')}
            </a>
            {channelUsername ? (
              <a href={`https://t.me/${channelUsername}`} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#3b82f6]/25 bg-[#3b82f6]/10 px-3 py-2.5 text-[12px] font-black text-white hover:bg-[#3b82f6]/20 transition-all">
                <PremiumIcon name="explosion" /> {t(locale, 'channel')}
              </a>
            ) : (
              <button type="button" onClick={() => useStore.getState().setActiveTab('support')} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#2d3748] bg-[#161922] px-3 py-2.5 text-[12px] font-bold text-white">
                <PremiumIcon name="help" /> {t(locale, 'help')}
              </button>
            )}
          </div>
          {user?.role === 'admin' && (
            <a href="/admin#dashboard" target="_blank" rel="noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#fbbf24]/25 bg-[#fbbf24]/10 px-3 py-2 text-[11px] font-black text-[#fbbf24] hover:bg-[#fbbf24]/20 transition-all">
              <PremiumIcon name="crown" /> {t(locale, 'adminPanel')}
            </a>
          )}
        </div>
      </section>

      <div className="relative group">
        <PremiumIcon name="target" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#10b981]/60 group-focus-within:text-[#10b981] transition-colors text-lg" />
        <input type="search" inputMode="search" enterKeyHint="search" placeholder={t(locale, 'searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-[#161922]/80 border border-[#2d3748] rounded-2xl py-3.5 pr-11 pl-4 text-sm text-white placeholder-[#6b7280] outline-none focus:border-[#10b981]/50 focus:bg-[#161922] transition-all shadow-lg" />
      </div>

      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <p className="text-xs text-[#10b981] font-bold flex items-center gap-2"><PremiumIcon name="fire" /> {t(locale, 'searchResults')} ({searchResults.length}) 🔥</p>
            {searchResults.map((product, index) => <ProductCard key={product._id} product={product} index={index} locale={locale} compact onSelect={() => selectProduct(product)} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {!search && (
        <>
          {featuredProducts.length > 0 && (
            <section>
              <div className="section-heading"><PremiumIcon name="fire" /><h2>{t(locale, 'featured')} 🔥</h2><span className="ml-auto text-[10px] bg-[#ef4444]/20 text-[#ef4444] px-2 py-1 rounded-full font-black animate-pulse">HOT</span></div>
              <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
                {featuredProducts.map((product, index) => (
                  <div key={product._id} className="w-60 flex-shrink-0"><ProductCard product={product} index={index} locale={locale} onSelect={() => selectProduct(product)} /></div>
                ))}
              </div>
            </section>
          )}
          <section>
            <div className="section-heading"><PremiumIcon name="rocket" /><h2>{t(locale, 'chooseDevice')} 🎮</h2></div>
            {categories.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {categories.map((category, index) => <CategoryCard key={category._id} category={category} index={index} locale={locale} onSelect={() => handleCategory(category)} />)}
              </div>
            ) : (
              <EmptyState icon="gamepad" text={t(locale, 'noProducts')} subtext={t(locale, 'soon')} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function TypeButton({ active, onClick, icon, text }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onClick} className={`flex-1 inline-flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-[13px] font-black transition-all ${active ? 'bg-gradient-to-r from-[#10b981] to-[#3b82f6] text-black shadow-lg shadow-[#10b981]/20' : 'text-muted hover:text-white'}`}>
      <PremiumIcon name={icon} /> {text}
    </motion.button>
  );
}
function EmptyState({ icon, text, subtext }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 px-4">
      <motion.div animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="inline-block">
        <PremiumIcon name={icon} size="4rem" className="text-[#10b981] mb-4 drop-shadow-[0_0_20px_#10b981]" />
      </motion.div>
      <p className="text-white font-black text-[16px]">{text}</p>
      {subtext && <p className="text-muted text-sm mt-2">{subtext}</p>}
      <p className="text-[11px] text-[#10b981]/60 mt-3">🎮 {t('ar', 'soon')}... Stay tuned legend! 🔥</p>
    </motion.div>
  );
}
function Breadcrumb({ locale }) {
  const { breadcrumb, goBack } = useStore();
  return (
    <div className="flex items-center gap-2 mb-3">
      <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#161922] text-white border border-[#2d3748] hover:border-[#10b981]/30 transition-colors">
        <PremiumIcon name={locale === 'ar' ? 'right' : 'left'} />
      </motion.button>
      <div className="flex items-center gap-1.5 text-xs text-muted overflow-x-auto scrollbar-hide">
        {breadcrumb.map((item, index) => (
          <React.Fragment key={item._id || index}>
            {index > 0 && <span className="text-[#10b981] font-bold">/</span>}
            <span className={index === breadcrumb.length - 1 ? 'text-white font-black bg-[#161922] px-2.5 py-1 rounded-full border border-[#2d3748]' : 'text-muted'}>
              {localizedName(item, locale)}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
function CategoryCard({ category, index, locale, onSelect }) {
  return (
    <motion.button type="button" initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: index * 0.07, type: 'spring', stiffness: 200 }} whileTap={{ scale: 0.92 }} whileHover={{ y: -4, scale: 1.02 }} onClick={onSelect} className="aspect-square bg-gradient-to-br from-[#161922] to-[#1f2430] border border-[#2d3748] rounded-[22px] flex flex-col items-center justify-center gap-2.5 group hover:border-[#10b981]/40 transition-all relative overflow-hidden shadow-lg hover:shadow-xl hover:shadow-[#10b981]/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/0 to-[#10b981]/0 group-hover:from-[#10b981]/10 group-hover:to-transparent transition-all duration-500" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#10b981]/0 group-hover:via-[#10b981]/50 to-transparent transition-all" />
      <motion.div whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} transition={{ duration: 0.5 }} className="relative">
        <PremiumIcon name="rocket" size="2.4rem" className="text-[#10b981] drop-shadow-[0_0_10px_#10b981]" />
      </motion.div>
      <span className="text-[11px] font-black text-white relative tracking-wide text-center px-1">{localizedName(category, locale)}</span>
      <span className="text-[9px] text-[#10b981]/60 font-bold">PLAY NOW 🚀</span>
    </motion.button>
  );
}
function GameCard({ game, index, locale, onSelect }) {
  const hasImage = typeof game.icon === 'string' && /^(https?:\/\/|\/)/.test(game.icon);
  return (
    <motion.button type="button" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, type: 'spring' }} whileTap={{ scale: 0.93 }} whileHover={{ y: -3, scale: 1.02 }} onClick={onSelect} className="aspect-[4/3.2] bg-gradient-to-br from-[#161922] to-[#1f2430] border border-[#2d3748] rounded-[20px] flex flex-col items-center justify-center gap-2.5 group overflow-hidden relative shadow-lg hover:shadow-xl hover:border-purple/30 hover:shadow-purple/10 transition-all">
      <div className="absolute inset-0 bg-gradient-to-br from-purple/0 to-transparent group-hover:from-purple/10 transition-all" />
      {hasImage ? <img src={game.icon} alt={localizedName(game, locale)} className="w-14 h-14 object-cover rounded-2xl ring-2 ring-[#2d3748] group-hover:ring-purple/40 transition-all shadow-lg" /> : <motion.div whileHover={{ scale: 1.15, rotate: 10 }}><PremiumIcon name="gamepad" size="2.8rem" className="text-purple-300 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /></motion.div>}
      <p className="text-[11px] font-black text-white px-2 text-center leading-tight">{localizedName(game, locale)}</p>
      <span className="text-[8px] bg-[#10b981]/15 text-[#10b981] px-2 py-0.5 rounded-full font-black border border-[#10b981]/20">HOT 🔥</span>
    </motion.button>
  );
}
function SkeletonList() { return Array(4).fill(0).map((_, index) => <div key={index} className="h-28 rounded-[20px] skeleton animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />); }
function SkeletonGrid() { return Array(6).fill(0).map((_, index) => <div key={index} className="aspect-square rounded-[22px] skeleton" />); }
