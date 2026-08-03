import React from 'react';
import { cleanDisplayText, localizedName, t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';

export default function ProductCard({ product, locale = 'ar', onSelect, compact = false }) {
  const activeDurations = product.durations?.filter((duration) => duration.isActive) || [];
  const minPrice = activeDurations.reduce((min, duration) => Math.min(min, Number(duration.price)), Infinity);
  const hasStock = activeDurations.some((duration) => duration.stockCount > 0 || duration.inStock);
  const select = () => {
    haptic.light();
    onSelect?.();
  };

  if (compact) {
    return (
      <button type="button" onClick={select} className="product-card product-card--compact">
        <ProductVisual product={product} locale={locale} />
        <span className="product-card__copy">
          <strong>{localizedName(product, locale)}</strong>
          <small>{formatPrice(minPrice)}</small>
        </span>
        <PremiumIcon name={locale === 'ar' ? 'left' : 'right'} />
      </button>
    );
  }

  return (
    <button type="button" onClick={select} className="product-card">
      <ProductVisual product={product} locale={locale} />
      <span className="product-card__copy">
        <span className="product-card__topline">
          <strong>{localizedName(product, locale)}</strong>
          <span className={`product-card__stock ${hasStock ? 'is-available' : 'is-unavailable'}`}>
            {hasStock ? t(locale, 'available') : t(locale, 'unavailable')}
          </span>
        </span>
        {product.features?.[0]?.text && <small>{cleanDisplayText(product.features[0].text)}</small>}
        <span className="product-card__footer">
          <span><small>{t(locale, 'from')}</small><b>{formatPrice(minPrice)}</b></span>
          <span className="product-card__select"><PremiumIcon name={locale === 'ar' ? 'left' : 'right'} /></span>
        </span>
      </span>
    </button>
  );
}

function ProductVisual({ product, locale }) {
  return product.logo ? (
    <img src={product.logo} alt={localizedName(product, locale)} className="product-card__image" />
  ) : (
    <span className="product-card__image product-card__image--fallback" aria-hidden="true"><PremiumIcon name="key" size="1.5rem" /></span>
  );
}

function formatPrice(value) {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : '—';
}
