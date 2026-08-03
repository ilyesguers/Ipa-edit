import React, { useEffect, useState } from 'react';
import useStore from '../../store/useStore';
import { t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';
import api from '../../utils/api';
import { cachedFetch } from '../../utils/cache';
import { haptic } from '../../utils/haptic';

export default function ProfileTab() {
  const { user, locale, toggleLocale, setActiveTab } = useStore();
  const [balanceHistory, setBalanceHistory] = useState([]);
  const dateLocale = t(locale, 'dateLocale');

  useEffect(() => {
    cachedFetch('balance-history', async () => (await api.get('/users/me/balance-history')).data.data?.history || [], 45 * 1000)
      .then(setBalanceHistory)
      .catch(() => {});
  }, []);

  const stats = [
    { label: t(locale, 'totalOrders'), value: user?.totalOrders || 0, icon: 'orders' },
    { label: t(locale, 'totalSpent'), value: `$${Number(user?.totalSpent || 0).toFixed(2)}`, icon: 'wallet' },
    { label: t(locale, 'totalDeposited'), value: `$${Number(user?.totalDeposited || 0).toFixed(2)}`, icon: 'coin' }
  ];

  return (
    <div className="store-page space-y-4">
      <section className="profile-summary">
        <span className="profile-summary__avatar"><PremiumIcon name="user" size="1.8rem" /></span>
        <div className="min-w-0 flex-1">
          <h1>{user?.firstName || t(locale, 'user')}</h1>
          <p>@{user?.username || 'guest'}</p>
        </div>
        <div className="profile-summary__balance">
          <small>{t(locale, 'balance')}</small>
          <strong>${Number(user?.balance || 0).toFixed(2)}</strong>
        </div>
      </section>

      <section className="profile-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <PremiumIcon name={stat.icon} />
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
          </div>
        ))}
      </section>

      <section className="settings-list" aria-label={t(locale, 'profile')}>
        <div className="settings-list__row">
          <span><PremiumIcon name="target" /> {t(locale, 'id')}</span>
          <strong>{user?.telegramId || '—'}</strong>
        </div>
        <div className="settings-list__row">
          <span><PremiumIcon name="calendar" /> {t(locale, 'joined')}</span>
          <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString(dateLocale) : '—'}</strong>
        </div>
        <button type="button" onClick={() => { haptic.light(); toggleLocale(); }} className="settings-list__row settings-list__button">
          <span><PremiumIcon name="globe" /> {t(locale, 'language')}</span>
          <PremiumIcon name={locale === 'ar' ? 'left' : 'right'} />
        </button>
        <button type="button" onClick={() => setActiveTab('support')} className="settings-list__row settings-list__button">
          <span><PremiumIcon name="support" /> {t(locale, 'support')}</span>
          <PremiumIcon name={locale === 'ar' ? 'left' : 'right'} />
        </button>
      </section>

      {user?.role === 'admin' && (
        <a href="/admin#dashboard" target="_blank" rel="noreferrer" className="profile-admin-link">
          <PremiumIcon name="admin" /> {t(locale, 'adminPanel')}
        </a>
      )}

      {balanceHistory.length > 0 && (
        <section>
          <div className="section-heading"><PremiumIcon name="wallet" /><h2>{t(locale, 'balanceHistory')}</h2></div>
          <div className="transaction-list">
            {balanceHistory.slice(0, 5).map((transaction, index) => (
              <div key={`${transaction.createdAt}-${index}`} className="transaction-list__row">
                <span className={transaction.type === 'credit' ? 'is-credit' : 'is-debit'}>
                  <PremiumIcon name={transaction.type === 'credit' ? 'checkmark' : 'orders'} />
                </span>
                <div className="min-w-0 flex-1">
                  <strong>{transaction.description || transaction.type}</strong>
                  <small>{new Date(transaction.createdAt).toLocaleDateString(dateLocale)}</small>
                </div>
                <b className={transaction.type === 'credit' ? 'is-credit-text' : 'is-debit-text'}>
                  {transaction.type === 'credit' ? '+' : '-'}${Number(transaction.amount || 0).toFixed(2)}
                </b>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
