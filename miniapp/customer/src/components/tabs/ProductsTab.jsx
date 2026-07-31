import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import { localizedName, t } from '../../i18n';
import ProductCard from '../ProductCard';
import PremiumIcon from '../PremiumIcon';
import api from '../../utils/api';

export default function ProductsTab() {
  const { categories, selectedCategory, selectedGame, games, products, fetchCategories, selectCategory, selectGame, selectProduct, publicSettings, user, locale } = useStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeProductType, setActiveProductType] = useState('panel');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories().catch(() => {});
    api.get('/shop/featured').then((res) => setFeaturedProducts(res.data.data || [])).catch(() => setFeaturedProducts([]));
  }, [fetchCategories]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      api.get(`/shop/search?q=${encodeURIComponent(search.trim())}`)
        .then((res) => setSearchResults(res.data.data || []))
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
        <div className="flex gap-2 bg-[#12121c] border border-[#2a2a45] rounded-2xl p-1.5 mt-4 shadow-lg">
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
      {/* HERO GAMER SECTION */}
      <section className="rounded-[28px] border border-[#00ff88]/20 overflow-hidden p-6 relative bg-gradient-to-br from-[#0a1a14] via-[#12121c] to-[#1a1030] shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,255,136,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.12),transparent_35%)]" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ff88]/50 to-transparent" />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 text-[11px] text-[#00ff88] font-black tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" /> 
              {publicSettings?.ui_welcome_badge_ar || t(locale, 'welcomeBadge')}
            </span>
            <motion.span animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-xl">🔥</motion.span>
          </div>
          <h2 className="text-white text-[26px] font-black mt-4 leading-tight font-[Orbitron]">
            <span className="gradient-text">{locale === 'en' ? (publicSettings?.ui_welcome_title_en || t(locale, 'welcomeTitle')) : (publicSettings?.ui_welcome_title_ar || t(locale, 'welcomeTitle'))}</span>
          </h2>
          <p className="text-[#b0b0cc] text-[13px] mt-3 leading-7 font-semibold">
            {locale === 'en' ? (publicSettings?.ui_welcome_subtitle_en || t(locale, 'welcomeSubtitle')) : (publicSettings?.ui_welcome_subtitle_ar || t(locale, 'welcomeSubtitle'))}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {highlights.slice(0, 4).map((item, index) => (
              <motion.span key={item.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full border border-[#2a2a45] bg-[#050508]/60 backdrop-blur px-3.5 py-2 text-white hover:border-[#00ff88]/30 transition-colors">
                <PremiumIcon name={item.emojiKey || 'rocket'} className="text-[#00ff88]" /> 
                {locale === 'en' ? (item.textEn || item.textAr) : (item.textAr || item.textEn)}
              </motion.span>
            ))}
          </div>
          <div className="flex gap-2.5 mt-6">
            <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#ff3b5c]/30 bg-gradient-to-br from-[#ff3b5c]/15 to-[#ff8a00]/10 px-4 py-3.5 text-[13px] font-black text-white hover:from-[#ff3b5c]/25 hover:to-[#ff8a00]/20 transition-all gamer-button">
              <PremiumIcon name="fire" /> {t(locale, 'support')}
            </a>
            {channelUsername ? (
              <a href={`https://t.me/${channelUsername}`} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-4 py-3.5 text-[13px] font-black text-white hover:bg-[#00d4ff]/20 transition-all">
                <PremiumIcon name="explosion" /> {t(locale, 'channel')}
              </a>
            ) : (
              <button type="button" onClick={() => useStore.getState().setActiveTab('support')} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-[#12121c] px-4 py-3.5 text-[13px] font-bold text-white">
                <PremiumIcon name="help" /> {t(locale, 'help')}
              </button>
            )}
          </div>
          {user?.role === 'admin' && (
            <a href="/admin#dashboard" target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ffd700]/30 bg-[#ffd700]/10 px-4 py-3.5 text-[13px] font-black text-[#ffd700] hover:bg-[#ffd700]/20 transition-all">
              <PremiumIcon name="crown" /> {t(locale, 'adminPanel')} 👑
            </a>
          )}
        </div>
      </section>

      <div className="relative group">
        <PremiumIcon name="target" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#00ff88]/60 group-focus-within:text-[#00ff88] transition-colors text-lg" />
        <input type="search" inputMode="search" enterKeyHint="search" placeholder={t(locale, 'searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-[#12121c]/80 backdrop-blur border border-[#2a2a45] rounded-2xl py-3.5 pr-11 pl-4 text-sm text-white placeholder-[#666] outline-none focus:border-[#00ff88]/50 focus:bg-[#12121c] transition-all shadow-lg" />
      </div>

      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <p className="text-xs text-[#00ff88] font-bold flex items-center gap-2"><PremiumIcon name="fire" /> {t(locale, 'searchResults')} ({searchResults.length}) 🔥</p>
            {searchResults.map((product, index) => <ProductCard key={product._id} product={product} index={index} locale={locale} compact onSelect={() => selectProduct(product)} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {!search && (
        <>
          {featuredProducts.length > 0 && (
            <section>
              <div className="section-heading"><PremiumIcon name="fire" /><h2>{t(locale, 'featured')} 🔥</h2><span className="ml-auto text-[10px] bg-[#ff3b5c]/20 text-[#ff3b5c] px-2 py-1 rounded-full font-black animate-pulse">HOT</span></div>
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
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onClick} className={`flex-1 inline-flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-[13px] font-black transition-all ${active ? 'bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black shadow-lg shadow-[#00ff88]/20' : 'text-muted hover:text-white'}`}>
      <PremiumIcon name={icon} /> {text}
    </motion.button>
  );
}
function EmptyState({ icon, text, subtext }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 px-4">
      <motion.div animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="inline-block">
        <PremiumIcon name={icon} size="4rem" className="text-[#00ff88] mb-4 drop-shadow-[0_0_20px_#00ff88]" />
      </motion.div>
      <p className="text-white font-black text-[16px]">{text}</p>
      {subtext && <p className="text-muted text-sm mt-2">{subtext}</p>}
      <p className="text-[11px] text-[#00ff88]/60 mt-3">🎮 {t('ar', 'soon')}... Stay tuned legend! 🔥</p>
    </motion.div>
  );
}
function Breadcrumb({ locale }) {
  const { breadcrumb, goBack } = useStore();
  return (
    <div className="flex items-center gap-2 mb-3">
      <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#12121c] text-white border border-[#2a2a45] hover:border-[#00ff88]/30 transition-colors">
        <PremiumIcon name={locale === 'ar' ? 'right' : 'left'} />
      </motion.button>
      <div className="flex items-center gap-1.5 text-xs text-muted overflow-x-auto scrollbar-hide">
        {breadcrumb.map((item, index) => (
          <React.Fragment key={item._id || index}>
            {index > 0 && <span className="text-[#00ff88] font-bold">/</span>}
            <span className={index === breadcrumb.length - 1 ? 'text-white font-black bg-[#12121c] px-2.5 py-1 rounded-full border border-[#2a2a45]' : 'text-muted'}>
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
    <motion.button type="button" initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: index * 0.07, type: 'spring', stiffness: 200 }} whileTap={{ scale: 0.92 }} whileHover={{ y: -4, scale: 1.02 }} onClick={onSelect} className="aspect-square bg-gradient-to-br from-[#12121c] to-[#1a1a2e] border border-[#2a2a45] rounded-[22px] flex flex-col items-center justify-center gap-2.5 group hover:border-[#00ff88]/40 transition-all relative overflow-hidden shadow-lg hover:shadow-xl hover:shadow-[#00ff88]/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/0 to-[#00ff88]/0 group-hover:from-[#00ff88]/10 group-hover:to-transparent transition-all duration-500" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ff88]/0 group-hover:via-[#00ff88]/50 to-transparent transition-all" />
      <motion.div whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} transition={{ duration: 0.5 }} className="relative">
        <PremiumIcon name="rocket" size="2.4rem" className="text-[#00ff88] drop-shadow-[0_0_10px_#00ff88]" />
      </motion.div>
      <span className="text-[11px] font-black text-white relative tracking-wide text-center px-1">{localizedName(category, locale)}</span>
      <span className="text-[9px] text-[#00ff88]/60 font-bold">PLAY NOW 🚀</span>
    </motion.button>
  );
}
function GameCard({ game, index, locale, onSelect }) {
  const hasImage = typeof game.icon === 'string' && /^(https?:\/\/|\/)/.test(game.icon);
  return (
    <motion.button type="button" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, type: 'spring' }} whileTap={{ scale: 0.93 }} whileHover={{ y: -3, scale: 1.02 }} onClick={onSelect} className="aspect-[4/3.2] bg-gradient-to-br from-[#12121c] to-[#1e1e32] border border-[#2a2a45] rounded-[20px] flex flex-col items-center justify-center gap-2.5 group overflow-hidden relative shadow-lg hover:shadow-xl hover:border-purple/30 hover:shadow-purple/10 transition-all">
      <div className="absolute inset-0 bg-gradient-to-br from-purple/0 to-transparent group-hover:from-purple/10 transition-all" />
      {hasImage ? <img src={game.icon} alt={localizedName(game, locale)} className="w-14 h-14 object-cover rounded-2xl ring-2 ring-[#2a2a45] group-hover:ring-purple/40 transition-all shadow-lg" /> : <motion.div whileHover={{ scale: 1.15, rotate: 10 }}><PremiumIcon name="gamepad" size="2.8rem" className="text-purple-300 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" /></motion.div>}
      <p className="text-[11px] font-black text-white px-2 text-center leading-tight">{localizedName(game, locale)}</p>
      <span className="text-[8px] bg-[#00ff88]/15 text-[#00ff88] px-2 py-0.5 rounded-full font-black border border-[#00ff88]/20">HOT 🔥</span>
    </motion.button>
  );
}
function SkeletonList() { return Array(4).fill(0).map((_, index) => <div key={index} className="h-28 rounded-[20px] skeleton animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />); }
function SkeletonGrid() { return Array(6).fill(0).map((_, index) => <div key={index} className="aspect-square rounded-[22px] skeleton" />); }
