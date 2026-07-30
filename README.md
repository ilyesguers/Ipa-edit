# 🎮 Digital Keys Store — Telegram Bot + Game Mini Apps
> متجر مفاتيح وألعاب رقمية لتلجرام مع بوت، متجر عميل، ولوحة تحكم إدارية.

## ما تم إصلاحه وإضافته

### 1) لوحة أزرار واحدة فقط
- البوت يستخدم **Inline Keyboard واحدة** فقط؛ لا توجد `Markup.keyboard` أو Reply Keyboard ثانية فوقها.
- عند الضغط على زر ينتقل البوت بتعديل الرسالة الحالية (للرسائل النصية والصور) بدل إنشاء رسالة جديدة.
- عند تعذر التعديل، تُرسل رسالة بديلة ثم تُحذف القائمة القديمة تلقائياً.
- تكرار `/start` لا يكدس قوائم قديمة؛ تُحفظ آخر قائمة في الجلسة وتُحذف قبل فتح القائمة الجديدة.
- روابط القائمة تُنظف وتُزال التكرارات تلقائياً، ويُضاف زر اللغة حتى لقواعد البيانات القديمة.
- القائمة الرئيسية مرتبة في صفوف واضحة: الألعاب، مفاتيحي، الطلبات، الحساب، الرصيد، الدعم، المتجر، واللغة.

### 2) Premium Game Emoji آمنة
كل إيموجي البوت يمر من `src/utils/customEmoji.js`:

| الاستخدام | المجموعة | fallback |
|---|---|---|
| الإجراءات والألعاب | gamepad | 🎮 |
| نجاح الشراء والمخزون | trophy | 🏆 |
| التنبيه والخطر | skull | 💀 |
| المنتجات والدفع | loot | 💎 |
| التحقق والتأكيد | shield | 🛡️ |

- أزرار Telegram تستعمل `icon_custom_emoji_id`، والنص لا يحتوي HTML أو إيموجي مزدوج.
- الرسائل تستعمل `<tg-emoji>` عند `parse_mode: HTML`.
- `safeSend` يعيد الطلب بدون الحقول premium إذا كان المعرّف غير متاح، أو كانت نسخة Bot API لا تفهم لون الزر؛ بالتالي لا تختفي لوحة الأزرار.
- يمكن تغيير IDs من `.env` بدون تعديل الملفات.
- تنبيهات `answerCbQuery` تستخدم fallback نصياً لأن Telegram لا يفسر HTML داخل التنبيه.

> ملاحظة: يجب أن يكون الـ bot owner قادراً على إرسال custom emoji وأن تكون IDs متاحة له. في حال الرفض سيظهر fallback تلقائياً، ولن يتعطل البوت.

### 3) ترجمة صحيحة ومتزامنة
- متجر العميل أصبح ثنائي اللغة عربي/إنجليزي من خلال `miniapp/customer/src/i18n.js`.
- يوجد زر لغة واضح في رأس المتجر وداخل الملف الشخصي.
- يتغير `dir` و`lang` تلقائياً (`rtl` للعربية و`ltr` للإنجليزية).
- لغة Telegram الجديدة تُحفظ عند إنشاء الحساب، وتبديل اللغة يُحفظ في المستخدم عبر `PUT /api/users/me`.
- النصوص المترجمة تشمل القائمة السفلية، الصفحة الرئيسية، البحث، المنتجات، المدد، الدفع، Binance، المفاتيح، الطلبات، الملف الشخصي، والدعم والأسئلة الشائعة.
- زر `language` يُضاف تلقائياً في البوت حتى للمستخدمين الذين لديهم إعدادات قديمة في MongoDB.

### 4) شريط الهاتف في الصفحة الرئيسية
- شريط التنقل السفلي موجود دائماً في `App` وليس داخل تبويب واحد.
- أضيفت مساحة safe-area و`100dvh` و`padding-bottom` حتى لا يختفي في Telegram WebApp أو خلف لوحة المفاتيح الأصلية.
- أزيل سكربت blur العام الذي كان يغلق لوحة الهاتف عند لمس أي مكان؛ لوحة الهاتف تظهر فقط عند التركيز على حقل إدخال، والتنقل يبقى مرئياً على الصفحة الرئيسية.
- استُبدلت رموز واجهة العميل بأيقونات Game Icons vector موحدة عبر `PremiumIcon`؛ Telegram custom emoji خاصة برسائل البوت، أما WebApp فيستخدم SVG/React Icons لأن HTML العادي لا يرسم Telegram custom emoji.

## التشغيل

```bash
npm install
npm run start
```

للتطوير وبناء الواجهات:

```bash
cd miniapp/customer && npm install && npm run dev
cd miniapp/admin && npm install && npm run dev
npm run build:customer
npm run build:admin
```

## متغيرات البيئة المهمة

```env
BOT_TOKEN=your_telegram_bot_token
ADMIN_IDS=123456789
MONGODB_URI=mongodb+srv://...
BASE_URL=https://your-app.up.railway.app
JWT_SECRET=change_this_secret
USE_PREMIUM_EMOJI=true
```

يمكن تخصيص IDs من خلال:

```env
PREMIUM_EMOJI_GAMEPAD=5285430309720966085
PREMIUM_EMOJI_TROPHY=5310076249404621168
PREMIUM_EMOJI_SKULL=5310169226856644648
PREMIUM_EMOJI_LOOT=5388790256772331442
PREMIUM_EMOJI_SHIELD=5368324170671202286
PREMIUM_EMOJI_SETTINGS=5285032475490273112
```

## الهيكل

```
src/
  bot/handlers/       # القوائم، المتجر، الدفع، اللغة
  utils/customEmoji.js# مجموعة premium موحدة + fallback
  utils/menuMessage.js# تعديل القائمة الحالية ومنع التكرار
  utils/safeSend.js   # حماية Telegram من IDs غير المتاحة
  api/routes/users.js  # حفظ اللغة والتفضيلات
miniapp/customer/
  src/i18n.js
  src/components/PremiumIcon.jsx
  src/components/BottomNav.jsx
  src/components/tabs/...
miniapp/admin/
```

## فحوصات البناء

تم التحقق من:

```bash
npm run build              # customer
npm run build              # admin
node --check src/**/*.js
```

## النشر على Railway

1. اربط المستودع في Railway.
2. أضف `BOT_TOKEN`, `ADMIN_IDS`, `MONGODB_URI`, `BASE_URL`, و`JWT_SECRET`.
3. أضف `WEBHOOK_DOMAIN` في الإنتاج إذا كان webhook مطلوباً.
4. شغّل البناء؛ الخادم يخدم `/customer` و`/admin` عند وجود مجلدات `dist`.

Built with Node.js, Express, MongoDB, Telegraf, React, Tailwind, Framer Motion, and React Icons.
