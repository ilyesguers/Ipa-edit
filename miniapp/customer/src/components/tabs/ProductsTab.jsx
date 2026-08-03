import React, { useEffect, useState } from 'react';
import useStore from '../../store/useStore';
import { cleanMarkdown, localizedName, t } from '../../i18n';
import ProductCard from '../ProductCard';
import PremiumIcon from '../PremiumIcon';
import api from '../../utils/api';
import { cachedFetch } from '../../utils/cache';
import { haptic } from '../../utils/haptic';
import { playSound } from '../../utils/sound';

const isImageUrl = (value) => typeof value === 'string' && /^(https?:\/\/|\/)/.test(value);

export default function ProductsTab() {
  const {
    categories,
    selectedCategory,
    selectedGame,
    games,
    products,
    fetchCategories,
    selectCategory,
    selectGame,
    selectProduct,
    publicSettings,
    locale
  } = useStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeProductType, setActiveProductType] = useState('panel');
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchCategories(),
      cachedFetch('featured', async () => (await api.get('/shop/featured')).data.data || [], 60 * 1000)
    ]).then(([_, featured]) => {
      if (mounted) setFeaturedProducts(featured);
    }).catch(() => {
      if (mounted) setFeaturedProducts([]);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [fetchCategories]);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      cachedFetch(
        `search:${query.toLowerCase()}`,
        async () => (await api.get(`/shop/search?q=${encodeURIComponent(query)}`)).data.data || [],
        20 * 1000
      ).then(setSearchResults).catch(() => setSearchResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const handleCategory = async (category) => {
    haptic.light();
    playSound('select');
    setLoading(true);
    try {
      await selectCategory(category);
    } finally {
      setLoading(false);
    }
  };

  const handleGame = async (game) => {
    haptic.light();
    playSound('select');
    setLoading(true);
    try {
      await selectGame(game);
    } finally {
      setLoading(false);
    }
  };

  const openProduct = (product) => {
    haptic.light();
    playSound('open');
    selectProduct(product).catch(() => {});
  };

  if (selectedGame) {
    const visibleProducts = products.filter((product) => activeProductType === 'panel'
      ? !product.productType || product.productType === 'panel_key'
      : product.productType === 'service');
    return (
      <div className="store-page drill-view" key={`game-${selectedGame._id}`}>
        <Breadcrumb locale={locale} />
        <div className="product-type-switch" role="tablist" aria-label="Product type">
          <button type="button" role="tab" aria-selected={activeProductType === 'panel'} onClick={() => { playSound('toggle'); setActiveProductType('panel'); }} className={activeProductType === 'panel' ? 'is-active' : ''}>
            <PremiumIcon name="key" /> {t(locale, 'panelKeys')}
          </button>
          <button type="button" role="tab" aria-selected={activeProductType === 'service'} onClick={() => { playSound('toggle'); setActiveProductType('service'); }} className={activeProductType === 'service' ? 'is-active' : ''}>
            <PremiumIcon name="rocket" /> {t(locale, 'services')}
          </button>
        </div>
        <div className="space-y-3 mt-4">
          {loading ? <SkeletonList /> : visibleProducts.map((product) => (
            <ProductCard key={product._id} product={product} locale={locale} onSelect={() => openProduct(product)} />
          ))}
          {!loading && !visibleProducts.length && <EmptyState icon="box" text={t(locale, 'noProducts')} subtext={t(locale, 'tryAnother')} />}
        </div>
      </div>
    );
  }

  if (selectedCategory) {
    return (
      <div className="store-page drill-view" key={`cat-${selectedCategory._id}`}>
        <Breadcrumb locale={locale} />
        <div className="page-heading">
          <div>
            <h1>{localizedName(selectedCategory, locale)}</h1>
            <p>{t(locale, 'browseGames')}</p>
          </div>
        </div>
        {loading ? <SkeletonGrid /> : games.length ? (
          <div className="game-grid">
            {games.map((game) => <GameCard key={game._id} game={game} locale={locale} onSelect={() => handleGame(game)} />)}
          </div>
        ) : <EmptyState icon="gamepad" text={t(locale, 'noGames')} subtext={t(locale, 'soon')} />}
      </div>
    );
  }

  const supportUsername = publicSettings?.support_username || 'support';
  const title = cleanMarkdown(locale === 'ar'
    ? (publicSettings?.ui_welcome_title_ar || t(locale, 'welcomeTitle'))
    : (publicSettings?.ui_welcome_title_en || t(locale, 'welcomeTitle')));
  const subtitle = cleanMarkdown(locale === 'ar'
    ? (publicSettings?.ui_welcome_subtitle_ar || t(locale, 'welcomeSubtitle'))
    : (publicSettings?.ui_welcome_subtitle_en || t(locale, 'welcomeSubtitle')));
  const badge = cleanMarkdown(locale === 'ar'
    ? (publicSettings?.ui_welcome_badge_ar || t(locale, 'welcomeBadge'))
    : (publicSettings?.ui_welcome_badge_en || t(locale, 'welcomeBadge')));
  const guide = [
    { icon: 'gamepad', title: t(locale, 'guideStep1Title'), text: t(locale, 'guideStep1Text') },
    { icon: 'key', title: t(locale, 'guideStep2Title'), text: t(locale, 'guideStep2Text') },
    { icon: 'wallet', title: t(locale, 'guideStep3Title'), text: t(locale, 'guideStep3Text') }
  ];

  return (
    <div className="store-page space-y-5" key="store-home">
      <section className="store-intro">
        <div>
          <p className="store-intro__eyebrow">{badge}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noreferrer" className="store-intro__support">
          <PremiumIcon name="support" />
          <span>{t(locale, 'support')}</span>
        </a>
      </section>

      <div className="store-guide">
        <button
          type="button"
          className="store-guide__trigger"
          onClick={() => { haptic.light(); playSound('toggle'); setGuideOpen((v) => !v); }}
          aria-expanded={guideOpen}
        >
          <span><PremiumIcon name="help" /> {t(locale, 'quickGuide')}</span>
          <PremiumIcon name="down" className={`collapsible__chevron ${guideOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`collapsible ${guideOpen ? 'is-open' : ''}`}>
          <div className="collapsible__inner">
            <div className="store-guide__steps">
              {guide.map((step, index) => <div key={step.title}>
                <span><b>{index + 1}</b><PremiumIcon name={step.icon} /></span>
                <strong>{step.title}</strong>
                <small>{step.text}</small>
              </div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="store-search">
        <PremiumIcon name="target" />
        <input aria-label={t(locale, 'searchPlaceholder')}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder={t(locale, 'searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && <button type="button" onClick={() => setSearch('')} aria-label={locale === 'ar' ? 'مسح البحث' : 'Clear search'}>×</button>}
      </div>

      {search.trim().length >= 2 && (
        <section className="space-y-3">
          <div className="section-heading"><PremiumIcon name="target" /><h2>{t(locale, 'searchResults')}</h2></div>
          {searchResults.length ? searchResults.map((product) => (
            <ProductCard key={product._id} product={product} locale={locale} compact onSelect={() => openProduct(product)} />
          )) : <EmptyState icon="box" text={t(locale, 'noProducts')} />}
        </section>
      )}

      {!search && (
        <>
          {featuredProducts.length > 0 && (
            <section>
              <div className="section-heading"><PremiumIcon name="star" /><h2>{t(locale, 'featured')}</h2></div>
              <div className="featured-row">
                {featuredProducts.map((product) => (
                  <div key={product._id} className="featured-row__item">
                    <ProductCard product={product} locale={locale} onSelect={() => openProduct(product)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="section-heading"><PremiumIcon name="gamepad" /><h2>{t(locale, 'chooseDevice')}</h2></div>
            {loading ? <SkeletonGrid /> : categories.length ? (
              <div className="category-grid">
                {categories.map((category) => <CategoryCard key={category._id} category={category} locale={locale} onSelect={() => handleCategory(category)} />)}
              </div>
            ) : <EmptyState icon="box" text={t(locale, 'noProducts')} subtext={t(locale, 'soon')} />}
          </section>
        </>
      )}
    </div>
  );
}

function Breadcrumb({ locale }) {
  const { breadcrumb, goBack } = useStore();
  return (
    <div className="breadcrumb">
      <button type="button" onClick={() => { haptic.light(); playSound('close'); goBack(); }} aria-label={t(locale, 'back')}>
        <PremiumIcon name={locale === 'ar' ? 'right' : 'left'} />
      </button>
      <div>
        {breadcrumb.map((item, index) => <span key={item._id || index}>{localizedName(item, locale)}</span>)}
      </div>
    </div>
  );
}

function CategoryCard({ category, locale, onSelect }) {
  const showImage = isImageUrl(category.image);
  const description = cleanMarkdown(category.description || '');
  return (
    <button type="button" onClick={onSelect} className={`category-card ${showImage ? 'category-card--with-image' : ''}`}>
      <span className="category-card__visual">
        {showImage ? (
          <img src={category.image} alt="" className="category-card__img" loading="lazy" />
        ) : (
          <span className="category-card__icon">{category.icon && !isImageUrl(category.icon) ? <span aria-hidden="true">{category.icon}</span> : <PremiumIcon name="gamepad" />}</span>
        )}
      </span>
      <span className="category-card__content">
        <strong>{localizedName(category, locale)}</strong>
        {description && <small>{description}</small>}
      </span>
      <PremiumIcon name={locale === 'ar' ? 'left' : 'right'} className="category-card__arrow" />
    </button>
  );
}

function GameCard({ game, locale, onSelect }) {
  const image = isImageUrl(game.icon) ? game.icon : (isImageUrl(game.image) ? game.image : null);
  const description = cleanMarkdown(game.description || '');
  return (
    <button type="button" onClick={onSelect} className={`game-card ${image ? 'game-card--with-image' : ''}`}>
      <span className="game-card__visual">
        {image ? <img src={image} alt="" loading="lazy" /> : <PremiumIcon name="gamepad" size="1.8rem" />}
      </span>
      <span className="game-card__content">
        <strong>{localizedName(game, locale)}</strong>
        {description && <small>{description}</small>}
      </span>
    </button>
  );
}

function EmptyState({ icon, text, subtext }) {
  return (
    <div className="empty-state">
      <PremiumIcon name={icon} size="2rem" />
      <strong>{text}</strong>
      {subtext && <p>{subtext}</p>}
    </div>
  );
}

function SkeletonCard() {
  return <div className="skeleton h-24 rounded-2xl" />;
}
function SkeletonList() {
  return <>{[1, 2, 3].map((item) => <SkeletonCard key={item} />)}</>;
}
function SkeletonGrid() {
  return <div className="category-grid">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="skeleton h-28 rounded-2xl" />)}</div>;
}
