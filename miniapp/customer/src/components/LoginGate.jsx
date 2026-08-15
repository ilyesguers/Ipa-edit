import React, { useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { LANGUAGES, isRTL } from '../i18n';
import PremiumIcon from './PremiumIcon';

const COPY = {
  ar: { eyebrow: 'بوابة الدخول الآمنة', title: 'أهلاً بعودتك', sub: 'أدخل بيانات الدخول التي استلمتها من الإدارة للوصول إلى المتجر.', user: 'اسم المستخدم', pass: 'كلمة المرور', login: 'دخول إلى المتجر', wait: 'جاري التحقق…', request: 'ليس لديك حساب؟ اطلب بيانات دخول', support: 'طلب Login من الدعم', invalid: 'بيانات الدخول غير صحيحة أو الحساب غير مفعل.', secure: 'اتصال مشفّر · حماية من المحاولات · جلسة آمنة', language: 'تغيير اللغة' },
  en: { eyebrow: 'Secure access portal', title: 'Welcome back', sub: 'Enter the login details issued to you by the administrator.', user: 'Username', pass: 'Password', login: 'Enter the store', wait: 'Verifying…', request: 'No account yet? Request your access details', support: 'Request login from support', invalid: 'Invalid credentials or inactive account.', secure: 'Encrypted connection · Attempt protection · Secure session', language: 'Change language' },
  fr: { eyebrow: 'Portail sécurisé', title: 'Bon retour', sub: 'Saisissez les identifiants fournis par l’administrateur.', user: 'Nom d’utilisateur', pass: 'Mot de passe', login: 'Entrer dans la boutique', wait: 'Vérification…', request: 'Pas encore de compte ?', support: 'Demander un accès au support', invalid: 'Identifiants invalides ou compte inactif.', secure: 'Connexion chiffrée · Session sécurisée', language: 'Changer de langue' },
  es: { eyebrow: 'Portal de acceso seguro', title: 'Bienvenido de nuevo', sub: 'Introduce los datos proporcionados por el administrador.', user: 'Usuario', pass: 'Contraseña', login: 'Entrar a la tienda', wait: 'Verificando…', request: '¿Aún no tienes cuenta?', support: 'Solicitar acceso a soporte', invalid: 'Datos incorrectos o cuenta inactiva.', secure: 'Conexión cifrada · Sesión segura', language: 'Cambiar idioma' },
  de: { eyebrow: 'Sicheres Zugangsportal', title: 'Willkommen zurück', sub: 'Gib die vom Administrator erhaltenen Zugangsdaten ein.', user: 'Benutzername', pass: 'Passwort', login: 'Shop betreten', wait: 'Wird geprüft…', request: 'Noch kein Konto?', support: 'Zugang beim Support anfragen', invalid: 'Ungültige Daten oder inaktives Konto.', secure: 'Verschlüsselte Verbindung · Sichere Sitzung', language: 'Sprache ändern' },
  tr: { eyebrow: 'Güvenli giriş portalı', title: 'Tekrar hoş geldin', sub: 'Yönetici tarafından verilen giriş bilgilerini gir.', user: 'Kullanıcı adı', pass: 'Şifre', login: 'Mağazaya gir', wait: 'Doğrulanıyor…', request: 'Henüz hesabın yok mu?', support: 'Destekten giriş iste', invalid: 'Bilgiler hatalı veya hesap etkin değil.', secure: 'Şifreli bağlantı · Güvenli oturum', language: 'Dili değiştir' },
  ru: { eyebrow: 'Защищённый вход', title: 'С возвращением', sub: 'Введите данные, выданные администратором.', user: 'Имя пользователя', pass: 'Пароль', login: 'Войти в магазин', wait: 'Проверка…', request: 'Ещё нет аккаунта?', support: 'Запросить доступ у поддержки', invalid: 'Неверные данные или аккаунт неактивен.', secure: 'Шифрование · Защищённая сессия', language: 'Сменить язык' },
  ur: { eyebrow: 'محفوظ رسائی', title: 'خوش آمدید', sub: 'ایڈمن کی فراہم کردہ لاگ اِن تفصیلات درج کریں۔', user: 'صارف نام', pass: 'پاس ورڈ', login: 'اسٹور میں داخل ہوں', wait: 'تصدیق ہو رہی ہے…', request: 'اکاؤنٹ نہیں ہے؟', support: 'سپورٹ سے لاگ اِن لیں', invalid: 'تفصیلات غلط ہیں یا اکاؤنٹ غیر فعال ہے۔', secure: 'محفوظ کنکشن · محفوظ سیشن', language: 'زبان تبدیل کریں' },
  hi: { eyebrow: 'सुरक्षित प्रवेश', title: 'वापसी पर स्वागत है', sub: 'एडमिन द्वारा दिए गए लॉगिन विवरण दर्ज करें।', user: 'यूज़रनेम', pass: 'पासवर्ड', login: 'स्टोर में प्रवेश करें', wait: 'जाँच हो रही है…', request: 'खाता नहीं है?', support: 'सपोर्ट से लॉगिन माँगें', invalid: 'विवरण गलत है या खाता निष्क्रिय है।', secure: 'एन्क्रिप्टेड कनेक्शन · सुरक्षित सत्र', language: 'भाषा बदलें' },
  id: { eyebrow: 'Portal akses aman', title: 'Selamat datang kembali', sub: 'Masukkan detail login yang diberikan admin.', user: 'Nama pengguna', pass: 'Kata sandi', login: 'Masuk ke toko', wait: 'Memverifikasi…', request: 'Belum punya akun?', support: 'Minta login ke dukungan', invalid: 'Detail salah atau akun tidak aktif.', secure: 'Koneksi terenkripsi · Sesi aman', language: 'Ganti bahasa' },
  pt: { eyebrow: 'Portal de acesso seguro', title: 'Bem-vindo de volta', sub: 'Insira os dados fornecidos pelo administrador.', user: 'Usuário', pass: 'Senha', login: 'Entrar na loja', wait: 'Verificando…', request: 'Ainda não tem conta?', support: 'Solicitar acesso ao suporte', invalid: 'Dados inválidos ou conta inativa.', secure: 'Conexão criptografada · Sessão segura', language: 'Mudar idioma' },
  zh: { eyebrow: '安全访问门户', title: '欢迎回来', sub: '请输入管理员提供的登录信息。', user: '用户名', pass: '密码', login: '进入商店', wait: '正在验证…', request: '还没有账户？', support: '向客服申请登录', invalid: '登录信息无效或账户未启用。', secure: '加密连接 · 安全会话', language: '切换语言' }
};

export default function LoginGate() {
  const { locale, credentialLogin, publicSettings, openLanguagePicker } = useStore();
  const text = COPY[locale] || COPY.en;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const language = LANGUAGES.find((item) => item.code === locale);
  const supportUrl = useMemo(() => {
    const raw = String(publicSettings?.support_username || 'support').trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://t.me/${raw.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '') || 'support'}`;
  }, [publicSettings]);

  const submit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) return setError(text.invalid);
    setBusy(true);
    setError('');
    try { await credentialLogin(username, password); }
    catch (_) { setError(text.invalid); }
    finally { setBusy(false); }
  };

  return (
    <main className="login-gate" dir={isRTL(locale) ? 'rtl' : 'ltr'}>
      <div className="login-gate__aurora login-gate__aurora--one" />
      <div className="login-gate__aurora login-gate__aurora--two" />
      <div className="login-gate__grid" />
      <div className="login-gate__orbits" aria-hidden="true"><i /><i /><i /></div>

      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__topline">
          <span className="login-card__live"><i /> GAMER STORE</span>
          <button type="button" className="login-card__language" onClick={openLanguagePicker} aria-label={text.language}>{language?.flag} {language?.label}</button>
        </div>

        <div className="login-card__shield"><PremiumIcon name="shield" size="1.7rem" /><span /></div>
        <p className="login-card__eyebrow">{text.eyebrow}</p>
        <h1 id="login-title">{text.title}</h1>
        <p className="login-card__subtitle">{text.sub}</p>

        <form onSubmit={submit} className="login-form">
          <label>
            <span>{text.user}</span>
            <div className="login-field"><PremiumIcon name="user" size="1.05rem" /><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={32} placeholder={text.user} dir="ltr" /></div>
          </label>
          <label>
            <span>{text.pass}</span>
            <div className="login-field"><PremiumIcon name="key" size="1.05rem" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={128} placeholder="••••••••••" dir="ltr" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Show password">{showPassword ? '◉' : '○'}</button></div>
          </label>
          {error && <div className="login-form__error" role="alert"><span>!</span>{error}</div>}
          <button type="submit" className="login-form__submit" disabled={busy}><span>{busy ? text.wait : text.login}</span><b>→</b></button>
        </form>

        <div className="login-card__divider"><span>{text.request}</span></div>
        <a className="login-card__support" href={supportUrl} target="_blank" rel="noreferrer"><PremiumIcon name="chat" size="1.1rem" />{text.support}</a>
        <p className="login-card__security"><PremiumIcon name="shield" size=".85rem" />{text.secure}</p>
      </section>
    </main>
  );
}
