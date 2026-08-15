import React, { useState } from 'react';
import api from '../utils/api';
import AdminIcon from './AdminIcon';

const COPY = {
  ar: {
    dir: 'rtl', langButton: 'EN', eyebrow: 'بوابة الإدارة الآمنة', title: 'أهلاً بعودتك',
    subtitle: 'سجّل الدخول لإدارة المتجر والطلبات والمخزون من مكان واحد.',
    username: 'اسم دخول الأدمن', password: 'كلمة المرور', submit: 'دخول لوحة التحكم',
    loading: 'جاري التحقق…', invalid: 'بيانات الدخول غير صحيحة أو الحساب لا يملك صلاحية الإدارة.',
    telegram: 'الدخول عبر تيليجرام', or: 'أو ببيانات الإدارة',
    imageTitle: 'إدارة أبسط. عمل أسرع.',
    imageText: 'كل ما يحتاجه الأدمن في لوحة واضحة وآمنة، من المنتج حتى تسليم الكود.',
    features: ['المنتجات والمدد والأكواد معًا', 'الطلبات والمدفوعات لحظة بلحظة', 'حسابات وصلاحيات محمية'],
    note: 'بيانات الدخول ينشئها المالك من صفحة المستخدمين.',
    secure: 'اتصال آمن وجلسة محمية'
  },
  en: {
    dir: 'ltr', langButton: 'عربي', eyebrow: 'Secure admin portal', title: 'Welcome back',
    subtitle: 'Sign in to manage your store, orders and inventory in one place.',
    username: 'Admin username', password: 'Password', submit: 'Open dashboard',
    loading: 'Verifying…', invalid: 'Invalid credentials or this account has no administrator access.',
    telegram: 'Continue with Telegram', or: 'or use admin credentials',
    imageTitle: 'Simpler management. Faster work.',
    imageText: 'Everything an administrator needs in one clear and secure workspace, from product to key delivery.',
    features: ['Products, durations and keys together', 'Live orders and payment management', 'Protected accounts and permissions'],
    note: 'The owner creates credentials from the Users page.',
    secure: 'Secure connection and protected session'
  }
};

export default function AdminLogin({ onAuthenticated, onTelegramLogin }) {
  const [language, setLanguage] = useState('ar');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const text = COPY[language];
  const hasTelegram = Boolean(window.Telegram?.WebApp?.initData);

  const submit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) return setError(text.invalid);
    setBusy(true);
    setError('');
    try {
      const response = await api.post('/auth/admin-login', { username, password });
      localStorage.setItem('admin_token', response.data.token);
      onAuthenticated(response.data.user);
    } catch (_) {
      setError(text.invalid);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-login" dir={text.dir}>
      <section className="admin-login__visual" aria-label={text.imageTitle}>
        <img src="/public/banner.png" alt="" className="admin-login__visual-image" />
        <div className="admin-login__visual-shade" aria-hidden="true" />
        <div className="admin-login__visual-content">
          <span className="admin-login__visual-badge"><AdminIcon name="sparkles" /> GAMER STORE</span>
          <h2>{text.imageTitle}</h2>
          <p>{text.imageText}</p>
          <div className="admin-login__features">
            {text.features.map((feature, index) => (
              <div key={feature}><span><AdminIcon name={['product', 'orders', 'shield'][index]} /></span><b>{feature}</b></div>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-login__panel">
        <header className="admin-login__brand">
          <a href="/customer" aria-label="Gamer Store"><span><AdminIcon name="shield" /></span><b>GAMER STORE</b></a>
          <button type="button" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>{text.langButton}</button>
        </header>

        <div className="admin-login__card">
          <span className="admin-login__eyebrow"><i />{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p className="admin-login__subtitle">{text.subtitle}</p>

          {hasTelegram && (
            <button type="button" className="admin-login__telegram" onClick={onTelegramLogin} disabled={busy}>
              <AdminIcon name="shield" />{text.telegram}
            </button>
          )}
          {hasTelegram && <div className="admin-login__or"><span>{text.or}</span></div>}

          <form className="admin-login__form" onSubmit={submit}>
            <label>
              <span>{text.username}</span>
              <div><AdminIcon name="users" /><input dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" maxLength="32" placeholder="admin.username" autoFocus /></div>
            </label>
            <label>
              <span>{text.password}</span>
              <div>
                <AdminIcon name="lock" />
                <input dir="ltr" type={visible ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" maxLength="128" placeholder="••••••••••••" />
                <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}><AdminIcon name={visible ? 'eyeOff' : 'eye'} /></button>
              </div>
            </label>
            {error && <p className="admin-login__error" role="alert"><AdminIcon name="warning" />{error}</p>}
            <button className="admin-login__submit" disabled={busy} type="submit">
              <AdminIcon name={busy ? 'refresh' : 'lock'} />{busy ? text.loading : text.submit}
            </button>
          </form>

          <p className="admin-login__note"><AdminIcon name="users" />{text.note}</p>
          <footer><AdminIcon name="check" />{text.secure}</footer>
        </div>
      </section>
    </main>
  );
}
