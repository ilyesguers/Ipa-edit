# 🔥 GAMER STORE — LEGENDARY EDITION 🎮👑
> متجر أسطوري للجيمرز والمرهقين - بوت تلجرام + متجر ويب فخم + لوحة تحكم
> Legendary store for pro gamers & teens - Telegram Bot + Web Store + Admin

## 🚀 ما الجديد في الإصدار 3.0 - Gamer Edition؟

### 1) 🎮 بوت يركز على الموقع 100% (Web-Focused)
- **تم مسح جميع الكيبوردات القديمة المتكررة** - البوت الآن minimal ويركز على متجر الويب
- الكيبورد الجديد فيه بس:
  - 🚀 **PLAY NOW - فتح المتجر** (WebApp - زر أساسي كبير)
  - 🔥 الدعم السريع
  - 💥 قناة العروض
  - 🌍 تبديل اللغة
- كل منطق الشراء انتقل داخل المتجر الإلكتروني - أسرع، أسلس، وأكثر احترافية للمراهقين
- أي ضغطة قديمة مثل `shop` أو `cat_` تعيد توجيه تلقائي للمتجر: "NEW UPDATE! Everything moved to web store 🔥"

### 2) 🔥 إيموجيات بريميوم جديدة - 16 إيموجي مميز للجيمرز (بدل 4 متكررة)
كل إيموجي له ID مميز خاص فيه - لا تكرار!

| الإيموجي | الاستخدام | ID افتراضي | Unicode |
|---|---|---|---|
| 🚀 Rocket | زر أساسي PLAY NOW | `PREMIUM_EMOJI_ROCKET` | 🚀 |
| 🔥 Fire | دعم وحماس | `PREMIUM_EMOJI_FIRE` | 🔥 |
| 👑 Crown | أسطورة وملك | `PREMIUM_EMOJI_CROWN` | 👑 |
| 🏆 Trophy | فوز وطلبات | `PREMIUM_EMOJI_TROPHY` | 🏆 |
| 💎 Gem | مفاتيح وجواهر | `PREMIUM_EMOJI_GEM` | 💎 |
| ⚡ Lightning | سرعة وطاقة | `PREMIUM_EMOJI_LIGHTNING` | ⚡ |
| 💥 Explosion | عروض وقناة | `PREMIUM_EMOJI_EXPLOSION` | 💥 |
| 🎯 Target | تركيز ولغة | `PREMIUM_EMOJI_TARGET` | 🎯 |
| 👻 Ghost | رجوع ومرح | `PREMIUM_EMOJI_GHOST` | 👻 |
| 🛡️ Shield | آمان وتحقق | `PREMIUM_EMOJI_SHIELD` | 🛡️ |

**20 إيموجي** قابل للتخصيص عبر `.env` والـ fallback تلقائي إلى Unicode لو فشل ID - البوت ما يتعطل أبداً!

### 3) 💜 واجهة المتجر الجديدة - ستايل جيمر مراهق
- **ألوان نيون**: `#00ff88` + `#00d4ff` + `#a855f7` مع خلفيات داكنة `#050508`
- **تأثيرات**: glow، floating، rocket animations، glassmorphism
- **خطوط**: Orbitron للعناوين + Cairo للعربي
- **ترجمات شبابية**: "PLAY NOW 🚀"، "NO CAP 🔥"، "GG WP 👑"، "LEVEL UP!"، "كن أسطورة"
- **تصميم**: 
  - Hero section مع gradient نيون و highlight chips
  - Product cards مع LIVE badges و hover effects
  - Bottom nav مع ألوان مميزة لكل تاب + glow
  - Header مع avatar و balance بستايل أسطوري
  - Loading screen مع rocket و fire flicker

### 4) 🚂 جاهز 100% لـ Railway
- `railway.toml` محسن: healthcheck 60s, restart 10 retries, watch patterns
- `nixpacks.toml` جديد: يبني customer و admin تلقائياً مع فحص dist
- `src/index.js` معاد كتابته:
  - يربط `0.0.0.0` لـ Railway
  - health check قبل كل شيء: `/health` يرد حتى لو DB فشل
  - webhook يدعم `RAILWAY_PUBLIC_DOMAIN` تلقائياً
  - لو BOT_TOKEN مو موجود، السيرفر يستمر (لا يطيح)
  - صمود ضد 3 محاولات اتصال DB مع retry

## 🎮 البوت - رسائل جديدة

**قبل (ممل):**
> مرحباً عزيزي العميل
> متجر رقمي منظم وسريع

**الآن (حماسي للمراهقين):**
> 🔥 للجيمرز المحترفين فقط
> هلا والله يا أسطورة 👑
> متجر الجيمرز الأسطوري 🎮
> أسرع متجر للألعاب والشحنات والبوستات - كل شي في مكان واحد مع تسليم فوري 🚀

## 🌍 استهداف المراهقين والألعاب

- **ألعاب**: Free Fire, PUBG, Roblox, Valorant, Fortnite - البحث يدعمها
- **لغة**: مزيج عربي + إنجليزي شبابي (NO NOOBS, EZ WIN, GG)
- **إيموجيات**: 🔥🚀💥⚡👑🎮 - كلها حماسية
- **عروض**: HOT badges, LIVE indicators, rocket speed claims
- **تفاعل**: Haptic feedback على تلجرام، motion animations، glow effects

## 🚀 التشغيل المحلي

```bash
npm install
npm run build
npm start
```

للتطوير:

```bash
cd miniapp/customer && npm install && npm run dev
cd miniapp/admin && npm install && npm run dev
npm run dev
```

## 🌐 النشر على Railway

1. اربط المستودع في Railway
2. أضف المتغيرات:
   ```
   BOT_TOKEN=...
   ADMIN_IDS=123...
   MONGODB_URI=mongodb+srv://...
   BASE_URL=https://xxx.up.railway.app
   JWT_SECRET=random_secret
   USE_PREMIUM_EMOJI=true
   ```
3. (اختياري) أضف 20 إيموجي بريميوم مخصص في `PREMIUM_EMOJI_*`
4. Railway سيبني تلقائياً `customer` و `admin` dist
5. البوت سيستخدم webhook تلقائياً لو `RAILWAY_PUBLIC_DOMAIN` موجود
6. تأكد من `/health` يرد 200

## 📁 الهيكل الجديد

```
src/
  bot/
    handlers/  # كلها web-focused الآن
    index.js   # يدعم Railway webhook + fallback polling
  utils/
    customEmoji.js  # 20 ID مميز + gaming teen unicode
    uiConfig.js     # مينيمال كيبورد: PLAY NOW فقط
  index.js     # Railway-ready server
miniapp/customer/
  src/
    components/
      PremiumIcon.jsx  # 40+ gaming icons
      Header.jsx       # gaming legend header
      BottomNav.jsx    # colorful neon nav
      tabs/ProductsTab.jsx # rocket hero + HOT badges
    i18n.js    # teen slang ar/en
    index.css  # neon gaming theme
    App.jsx    # background effects
railway.toml   # محسن
nixpacks.toml  # بناء موثوق
```

## 🔧 إصلاحات

- مسح الكيبوردات المكررة (reply + inline)
- 16 إيموجي بريميوم بدل 4 - كل واحد ID مختلف
- البوت يركز على الموقع 100%
- Railway healthcheck يشتغل حتى لو DB فشل
- Sharp و dependencies متوافقة مع Nixpacks

## 🎯 TODO للمالك

- غير IDs في `.env` لإيموجياتك الخاصة من حزمة تلجرام بريميوم
- ارفع `public/banner.png` بصورة جيمر حماسية
- أضف منتجات Free Fire / PUBG / Roblox للترجيت
- فعّل قناة العروض اليومية لجذب المراهقين

Built for legends with 🔥🚀👑 - Node.js, Express, MongoDB, Telegraf, React, Tailwind, Framer Motion
