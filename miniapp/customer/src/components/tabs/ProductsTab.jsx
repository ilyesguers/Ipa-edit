import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import ProductCard from '../ProductCard';
import api from '../../utils/api';

export default function ProductsTab() {
  const { categories, selectedCategory, selectedGame, games, products, fetchCategories, selectCategory, selectGame, selectProduct, breadcrumb, publicSettings, user } = useStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeProductType, setActiveProductType] = useState('panel');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    // Fetch featured products
    api.get('/shop/featured').then(res => {
      setFeaturedProducts(res.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!search) return setSearchResults([]);
    const t = setTimeout(async () => {
      const res = await api.get(`/shop/search?q=${search}`);
      setSearchResults(res.data.data);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleCategory = async (cat) => {
    setLoading(true);
    await selectCategory(cat);
    setLoading(false);
  };

  const handleGame = async (game) => {
    setLoading(true);
    await selectGame(game);
    setLoading(false);
  };

  const stagger = { container: { animate: { transition: { staggerChildren: 0.07 } } } };

  // ── PRODUCT LIST VIEW ──
  if (selectedGame) {
    return (
      <div className="p-4">
        <Breadcrumb />
        <motion.div variants={stagger.container} initial="initial" animate="animate" className="grid gap-3 mt-3">
          {loading ? <SkeletonList /> : products.map((p, i) => (
            <ProductCard key={p._id} product={p} index={i} onSelect={() => selectProduct(p)} />
          ))}
          {!loading && products.length === 0 && <EmptyState icon="📦" text="لا توجد منتجات متاحة" subtext="جرب قسم آخر" />}
        </motion.div>
      </div>
    );
  }

  // ── GAMES VIEW ──
  if (selectedCategory) {
    return (
      <div className="p-4">
        <Breadcrumb />
        <div className="grid grid-cols-2 gap-3 mt-3">
          {loading ? <SkeletonGrid /> : games.map((game, i) => (
            <GameCard key={game._id} game={game} index={i} onSelect={() => handleGame(game)} />
          ))}
          {!loading && games.length === 0 && <EmptyState icon="🎮" text="لا توجد ألعاب" subtext="قريباً المزيد" />}
        </div>
      </div>
    );
  }

  // ── MAIN VIEW ──
  const highlights = Array.isArray(publicSettings?.ui_home_highlights) ? publicSettings.ui_home_highlights : [];
  const supportUsername = publicSettings?.support_username || 'support';
  const channelUsername = publicSettings?.channel_username || '';
  const themeKey = publicSettings?.ui_theme_preset || 'aurora';

  return (
    <div className="p-4 space-y-4">
      <div className={`rounded-3xl border overflow-hidden p-5 relative ${themeKey === 'midnight' ? 'border-purple/20 bg-gradient-to-br from-green-500/10 via-purple-500/5 to-[#0b0b12]' : 'border-neon/15 bg-gradient-to-br from-neon/10 via-[#12121c] to-[#0b0b12]'}`}>
        <div className={`absolute inset-0 pointer-events-none ${themeKey === 'midnight' ? 'bg-[radial-gradient(circle_at_top_right,rgba(0,255,136,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.08),transparent_30%)]' : 'bg-[radial-gradient(circle_at_top_right,rgba(0,255,136,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(0,207,255,0.08),transparent_30%)]'}`} />
        <div className="relative">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon/20 bg-neon/10 text-[10px] text-neon font-bold">
            🌟 {publicSettings?.ui_welcome_badge_ar || 'واجهة جديدة • بوت أذكى'}
          </span>
          <h2 className="text-white text-xl font-black mt-3">{publicSettings?.ui_welcome_title_ar || publicSettings?.bot_name || 'متجر رقمي منظم وسريع'}</h2>
          <p className="text-muted text-sm mt-2 leading-7">{publicSettings?.ui_welcome_subtitle_ar || publicSettings?.shop_description || 'تسوّق بسرعة، راقب طلباتك، وافتح المتجر أو لوحة التحكم من مكان واحد.'}</p>

          <div className="flex flex-wrap gap-2 mt-4">
            {highlights.slice(0, 3).map((item, i) => (
              <span key={item.id || i} className="text-[11px] rounded-full border border-border bg-black/30 px-3 py-1 text-white">
                {item.icon} {item.textAr}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-border bg-black/30 px-4 py-3 text-sm font-bold text-white text-center">
              💬 الدعم
            </a>
            {channelUsername ? (
              <a href={`https://t.me/${channelUsername}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-border bg-black/30 px-4 py-3 text-sm font-bold text-white text-center">
                📣 القناة
              </a>
            ) : (
              <button onClick={() => useStore.getState().setActiveTab('support')} className="rounded-2xl border border-border bg-black/30 px-4 py-3 text-sm font-bold text-white text-center">
                🆘 المساعدة
              </button>
            )}
            {user?.role === 'admin' && (
              <a href="/admin#dashboard" target="_blank" rel="noreferrer" className="col-span-2 rounded-2xl border border-neon/20 bg-neon/10 px-4 py-3 text-sm font-black text-neon text-center">
                👑 فتح لوحة التحكم
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 bg-card rounded-xl p-1">
        {[
          { id: 'panel', label: '🔑 مفاتيح الباندل', },
          { id: 'service', label: '☁️ خدمات', },
        ].map(t => (
          <motion.button
            key={t.id}
            onClick={() => setActiveProductType(t.id)}
            whileTap={{ scale: 0.95 }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${activeProductType === t.id ? 'bg-neon text-black shadow-lg' : 'text-muted'}`}
            style={activeProductType === t.id ? { boxShadow: '0 0 20px rgba(0,255,136,0.3)' } : {}}
          >
            {t.label}
          </motion.button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
        <input
          type="text"
          placeholder="ابحث عن منتج..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-border rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder-muted outline-none focus:border-neon/50 transition-colors"
        />
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
            <p className="text-xs text-muted">نتائج البحث ({searchResults.length})</p>
            {searchResults.map((p, i) => (
              <ProductCard key={p._id} product={p} index={i} onSelect={() => useStore.getState().selectProduct(p)} compact />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!search && (
        <>
          {/* Featured Products - Horizontal Scroll */}
          {featuredProducts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-gold rounded-full" style={{ boxShadow: '0 0 8px #f0b90b' }} />
                <h2 className="font-bold text-white text-sm">⭐ المنتجات المميزة</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                {featuredProducts.map((p, i) => (
                  <div key={p._id} className="w-48 flex-shrink-0 snap-start">
                    <ProductCard product={p} index={i} onSelect={() => selectProduct(p)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 bg-neon rounded-full" style={{ boxShadow: '0 0 8px #00ff88' }} />
              <h2 className="font-bold text-white text-sm">اختر الجهاز</h2>
            </div>
            {categories.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {categories.map((cat, i) => (
                  <CategoryCard key={cat._id} category={cat} index={i} onSelect={() => handleCategory(cat)} />
                ))}
              </div>
            ) : (
              <EmptyState icon="📂" text="لا توجد أقسام" subtext="قريباً" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Empty State Component ──
function EmptyState({ icon, text, subtext }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 px-4"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-5xl mb-4"
      >
        {icon}
      </motion.div>
      <p className="text-white font-bold text-base">{text}</p>
      {subtext && <p className="text-muted text-sm mt-1">{subtext}</p>}
    </motion.div>
  );
}

function Breadcrumb() {
  const { breadcrumb, selectedGame, selectedCategory, goBack } = useStore();
  return (
    <div className="flex items-center gap-2 mb-2">
      <motion.button whileTap={{ scale: 0.9 }} onClick={goBack} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a] text-white border border-border">
        ←
      </motion.button>
      <div className="flex items-center gap-1 text-xs text-muted overflow-x-auto">
        {breadcrumb.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-neon">/</span>}
            <span className={i === breadcrumb.length - 1 ? 'text-white font-semibold' : ''}>
              {item.nameAr || item.name}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ category, index, onSelect }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, type: 'spring' }}
      whileTap={{ scale: 0.92 }}
      onClick={onSelect}
      className="aspect-square bg-card border border-border rounded-2xl flex flex-col items-center justify-center gap-2 group hover:border-neon/40 transition-all relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="text-3xl">{category.icon}</span>
      <span className="text-xs font-bold text-white">{category.nameAr || category.name}</span>
    </motion.button>
  );
}

function GameCard({ game, index, onSelect }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileTap={{ scale: 0.93 }}
      onClick={onSelect}
      className="aspect-[4/3] bg-card border border-border rounded-2xl flex flex-col items-center justify-center gap-2 group overflow-hidden relative"
    >
      {game.icon ? (
        <img src={game.icon} alt={game.name} className="w-14 h-14 object-cover rounded-xl" />
      ) : (
        <div className="text-4xl">🎮</div>
      )}
      <p className="text-xs font-bold text-white px-2 text-center">{game.nameAr || game.name}</p>
    </motion.button>
  );
}

function SkeletonList() {
  return Array(4).fill(0).map((_, i) => (
    <div key={i} className="h-24 rounded-2xl skeleton" />
  ));
}

function SkeletonGrid() {
  return Array(6).fill(0).map((_, i) => (
    <div key={i} className="aspect-square rounded-2xl skeleton" />
  ));
}
