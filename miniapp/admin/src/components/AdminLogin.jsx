import React, { useState } from 'react';
import api from '../utils/api';
import AdminIcon from './AdminIcon';

const COPY = {
  ar: {
    dir: 'rtl', badge: 'منطقة الإدارة المحمية', title: 'تسجيل دخول الإدارة',
    subtitle: 'وصول مخصص للمشرفين المصرح لهم فقط. جميع المحاولات محمية ومراقبة.',
    username: 'اسم دخول الأدمن', password: 'كلمة المرور', submit: 'فتح لوحة التحكم',
    loading: 'جاري التحقق الآمن…', invalid: 'البيانات غير صحيحة، الحساب معطّل، أو لا يملك صلاحية الإدارة.',
    telegram: 'الدخول الآمن عبر تيليجرام', or: 'أو استخدم حساب الإدارة',
    note: 'ينشئ المالك بيانات دخول الأدمن من: المستخدمون ← إدارة Login.',
    secure: 'تشفير قوي · قفل المحاولات · إبطال فوري للجلسات'
  },
  en: {
    dir: 'ltr', badge: 'Protected administration area', title: 'Administrator sign in',
    subtitle: 'Restricted to authorized administrators. Every access attempt is protected and monitored.',
    username: 'Admin username', password: 'Password', submit: 'Open control panel',
    loading: 'Securely verifying…', invalid: 'Invalid details, disabled account, or no administrator permission.',
    telegram: 'Secure sign in with Telegram', or: 'or use admin credentials',
    note: 'The owner creates admin credentials under Users → Manage Login.',
    secure: 'Strong encryption · Attempt lockout · Instant session revocation'
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
    setBusy(true); setError('');
    try {
      const response = await api.post('/auth/admin-login', { username, password });
      localStorage.setItem('admin_token', response.data.token);
      onAuthenticated(response.data.user);
    } catch (_) { setError(text.invalid); }
    finally { setBusy(false); }
  };

  return (
    <main className="admin-login" dir={text.dir}>
      <div className="admin-login__mesh" aria-hidden="true" />
      <div className="admin-login__glow admin-login__glow--one" aria-hidden="true" />
      <div className="admin-login__glow admin-login__glow--two" aria-hidden="true" />
      <section className="admin-login__card" aria-labelledby="admin-login-title">
        <header className="admin-login__brand">
          <span><i /> GAMER STORE</span>
          <button type="button" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>{language === 'ar' ? 'EN' : 'عربي'}</button>
        </header>
        <div className="admin-login__crest"><AdminIcon name="shield" size="2rem" /><b>ADMIN</b></div>
        <p className="admin-login__badge">{text.badge}</p>
        <h1 id="admin-login-title">{text.title}</h1>
        <p className="admin-login__subtitle">{text.subtitle}</p>

        {hasTelegram && <button type="button" className="admin-login__telegram" onClick={onTelegramLogin} disabled={busy}><AdminIcon name="shield" />{text.telegram}</button>}
        {hasTelegram && <div className="admin-login__or"><span>{text.or}</span></div>}

        <form className="admin-login__form" onSubmit={submit}>
          <label><span>{text.username}</span><div><AdminIcon name="users" /><input dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" maxLength="32" placeholder="admin.username" /></div></label>
          <label><span>{text.password}</span><div><AdminIcon name="shield" /><input dir="ltr" type={visible ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" maxLength="128" placeholder="••••••••••••" /><button type="button" onClick={() => setVisible(!visible)}>{visible ? '◉' : '○'}</button></div></label>
          {error && <p className="admin-login__error" role="alert"><b>!</b>{error}</p>}
          <button className="admin-login__submit" disabled={busy} type="submit"><AdminIcon name={busy ? 'refresh' : 'shield'} />{busy ? text.loading : text.submit}</button>
        </form>
        <p className="admin-login__note">{text.note}</p>
        <footer><AdminIcon name="check" />{text.secure}</footer>
      </section>
    </main>
  );
}
