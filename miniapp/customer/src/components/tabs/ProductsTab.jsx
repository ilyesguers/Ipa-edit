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
        <div className="flex gap-2 bg-card border border-border rounded-xl p-1 mt-3">
          <TypeButton active={activeProductType === 'panel'} onClick={() => setActiveProductType('panel')} icon="key" text={t(locale, 'panelKeys')} />
          <TypeButton active={activeProductType === 'service'} onClick={() => setActiveProductType('service')} icon="gem" text={t(locale, 'services')} />
        </div>
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="grid gap-3 mt-3">
          {loading ? <SkeletonList /> : visibleProducts.map((product, index) => <ProductCard key={product._id} product={product} index={index} locale={locale} onSelect={() => selectProduct(product)} />)}
          {!loading && visibleProducts.length === 0 && <EmptyState icon="box" text={t(locale, 'noProducts')} subtext={t(locale, 'tryAnother')} />}
        </motion.div>
      </div>
    );
  }

  if (selectedCategory) {
    return (
      <div className="p-4">
        <Breadcrumb locale={locale} />
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
  const themeKey = publicSettings?.ui_theme_preset || 'aurora';

  return (
    <div className="p-4 space-y-4">
      <section className={`rounded-3xl border overflow-hidden p-5 relative ${themeKey === 'midnight' ? 'border-purple/20 bg-gradient-to-br from-green-500/10 via-purple-500/5 to-[#0b0b12]' : 'border-neon/15 bg-gradient-to-br from-neon/10 via-[#12121c] to-[#0b0b12]'}`}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(0,255,136,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(0,207,255,0.08),transparent_30%)]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon/20 bg-neon/10 text-[10px] text-neon font-bold"><PremiumIcon name="trophy" /> {publicSettings?.ui_welcome_badge_ar || t(locale, 'welcomeBadge')}</span>
          <h2 className="text-white text-xl font-black mt-3">{locale === 'en' ? (publicSettings?.ui_welcome_title_en || t(locale, 'welcomeTitle')) : (publicSettings?.ui_welcome_title_ar || t(locale, 'welcomeTitle'))}</h2>
          <p className="text-muted text-sm mt-2 leading-7">{locale === 'en' ? (publicSettings?.ui_welcome_subtitle_en || t(locale, 'welcomeSubtitle')) : (publicSettings?.ui_welcome_subtitle_ar || t(locale, 'welcomeSubtitle'))}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {highlights.slice(0, 3).map((item, index) => <span key={item.id || index} className="inline-flex items-center gap-1 text-[11px] rounded-full border border-border bg-black/30 px-3 py-1 text-white"><PremiumIcon name={item.emojiKey || 'sparkle'} /> {locale === 'en' ? (item.textEn || item.textAr) : (item.textAr || item.textEn)}</span>)}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noreferrer" className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-black/30 px-4 py-3 text-sm font-bold text-white"><PremiumIcon name="chat" /> {t(locale, 'support')}</a>
            {channelUsername ? <a href={`https://t.me/${channelUsername}`} target="_blank" rel="noreferrer" className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-black/30 px-4 py-3 text-sm font-bold text-white"><PremiumIcon name="megaphone" /> {t(locale, 'channel')}</a> : <button type="button" onClick={() => useStore.getState().setActiveTab('support')} className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-black/30 px-4 py-3 text-sm font-bold text-white"><PremiumIcon name="support" /> {t(locale, 'help')}</button>}
          </div>
          {user?.role === 'admin' && <a href="/admin#dashboard" target="_blank" rel="noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-neon/20 bg-neon/10 px-4 py-3 text-sm font-black text-neon"><PremiumIcon name="trophy" /> {t(locale, 'adminPanel')}</a>}
        </div>
      </section>

      <div className="relative">
        <PremiumIcon name="target" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="search" inputMode="search" enterKeyHint="search" placeholder={t(locale, 'searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-[#1a1a1a] border border-border rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder-muted outline-none focus:border-neon/50 transition-colors" />
      </div>
      <AnimatePresence>
        {searchResults.length > 0 && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2"><p className="text-xs text-muted">{t(locale, 'searchResults')} ({searchResults.length})</p>{searchResults.map((product, index) => <ProductCard key={product._id} product={product} index={index} locale={locale} compact onSelect={() => selectProduct(product)} />)}</motion.div>}
      </AnimatePresence>

      {!search && <>
        {featuredProducts.length > 0 && <section><div className="section-heading"><PremiumIcon name="trophy" /><h2>{t(locale, 'featured')}</h2></div><div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">{featuredProducts.map((product, index) => <div key={product._id} className="w-56 flex-shrink-0"><ProductCard product={product} index={index} locale={locale} onSelect={() => selectProduct(product)} /></div>)}</div></section>}
        <section><div className="section-heading"><PremiumIcon name="gamepad" /><h2>{t(locale, 'chooseDevice')}</h2></div>{categories.length > 0 ? <div className="grid grid-cols-3 gap-3">{categories.map((category, index) => <CategoryCard key={category._id} category={category} index={index} locale={locale} onSelect={() => handleCategory(category)} />)}</div> : <EmptyState icon="box" text={t(locale, 'noProducts')} subtext={t(locale, 'soon')} />}</section>
      </>}
    </div>
  );
}

function TypeButton({ active, onClick, icon, text }) { return <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onClick} className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-neon text-black shadow-lg' : 'text-muted'}`}><PremiumIcon name={icon} /> {text}</motion.button>; }
function EmptyState({ icon, text, subtext }) { return <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-14 px-4"><PremiumIcon name={icon} size="3.4rem" className="text-neon mb-4 animate-float" /><p className="text-white font-bold text-base">{text}</p>{subtext && <p className="text-muted text-sm mt-1">{subtext}</p>}</motion.div>; }
function Breadcrumb({ locale }) { const { breadcrumb, goBack } = useStore(); return <div className="flex items-center gap-2 mb-2"><motion.button type="button" whileTap={{ scale: 0.9 }} onClick={goBack} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a] text-white border border-border"><PremiumIcon name="right" /></motion.button><div className="flex items-center gap-1 text-xs text-muted overflow-x-auto">{breadcrumb.map((item, index) => <React.Fragment key={item._id || index}>{index > 0 && <span className="text-neon">/</span>}<span className={index === breadcrumb.length - 1 ? 'text-white font-semibold' : ''}>{localizedName(item, locale)}</span></React.Fragment>)}</div></div>; }
function CategoryCard({ category, index, locale, onSelect }) { return <motion.button type="button" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.06, type: 'spring' }} whileTap={{ scale: 0.92 }} onClick={onSelect} className="aspect-square bg-card border border-border rounded-2xl flex flex-col items-center justify-center gap-2 group hover:border-neon/40 transition-all relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-transparent opacity-0 group-hover:opacity-100" /><PremiumIcon name="gamepad" size="2.2rem" className="text-neon relative" /><span className="text-xs font-bold text-white relative">{localizedName(category, locale)}</span></motion.button>; }
function GameCard({ game, index, locale, onSelect }) { const hasImage = typeof game.icon === 'string' && /^(https?:\/\/|\/)/.test(game.icon); return <motion.button type="button" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} whileTap={{ scale: 0.93 }} onClick={onSelect} className="aspect-[4/3] bg-card border border-border rounded-2xl flex flex-col items-center justify-center gap-2 group overflow-hidden relative">{hasImage ? <img src={game.icon} alt={localizedName(game, locale)} className="w-14 h-14 object-cover rounded-xl" /> : <PremiumIcon name="gamepad" size="2.5rem" className="text-purple-300" />}<p className="text-xs font-bold text-white px-2 text-center">{localizedName(game, locale)}</p></motion.button>; }
function SkeletonList() { return Array(4).fill(0).map((_, index) => <div key={index} className="h-24 rounded-2xl skeleton" />); }
function SkeletonGrid() { return Array(6).fill(0).map((_, index) => <div key={index} className="aspect-square rounded-2xl skeleton" />); }
