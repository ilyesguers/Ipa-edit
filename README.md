# 🔑 Digital Keys Store — Telegram Bot + Mini App

> نظام متجر مفاتيح رقمية متكامل لتلجرام مع بوت ذكي، تطبيق مصغر للعملاء، ولوحة تحكم إدارية شاملة.

---

## 🌟 المميزات

### 🤖 بوت التلجرام (Customer Bot)
- رسالة ترحيب مخصصة مع صورة
- قائمة أزرار تفاعلية (Shop, Keys, Profile, History, Balance)
- تصفح تسلسلي: قسم → لعبة → منتج → مدة
- عرض المخزون الحي (✅ متاح / ❌ نفذ)
- شراء بالمحفظة مع تسليم فوري للمفتاح
- دعم إثبات الدفع (TxHash)
- إحالة الأصدقاء مع مكافأة تلقائية
- دعم عربي وإنجليزي

### 📱 تطبيق العملاء (Customer Mini App)
- ثيم داكن فاخر (#000000)
- أنيميشن سلس بـ Framer Motion
- تصفح منتجات مع بحث فوري
- Bottom Sheet لاختيار المدة
- شاشة دفع بينانس مع QR كود و countdown
- كوبون خصم مدمج
- سجل مفاتيح ومشتريات
- ملف المستخدم مع إحصائيات

### ⚙️ لوحة الإدارة (Admin Panel)
- إحصائيات حية مع مخططات بيانية
- إدارة كاملة: أقسام، ألعاب، منتجات، مدد، أسعار
- مخزون المفاتيح: رفع بالجملة أو يدوي
- إدارة المستخدمين: رصيد، حظر، رسائل خاصة
- الكوبونات: نسبة % أو مبلغ ثابت مع تاريخ انتهاء
- إذاعة مستهدفة مع معاينة
- إعدادات شاملة: بوت، رسائل، بينانس، دفع
- تبديل وضع الصيانة من الهيدر

---

## 🚀 النشر على Railway

### 1. إعداد المتغيرات (Environment Variables)
```
BOT_TOKEN=your_telegram_bot_token
ADMIN_IDS=123456789,987654321
MONGODB_URI=mongodb+srv://...
BASE_URL=https://your-app.up.railway.app
JWT_SECRET=your_super_secret_key
WEBHOOK_DOMAIN=https://your-app.up.railway.app
```

### 2. خطوات النشر
1. ادفع الكود إلى GitHub
2. اربط Railway بالـ repository
3. أضف MongoDB كـ plugin في Railway
4. أضف المتغيرات أعلاه
5. Railway سيبني ويشغّل تلقائياً

### 3. إعداد البوت
- تأكد من إضافة معرّفك في `ADMIN_IDS`
- أرسل `/start` للبوت
- أرسل `/admin` لفتح لوحة الإدارة

---

## 📁 هيكل المشروع

```
digital-keys-store/
├── src/
│   ├── index.js              # نقطة الدخول الرئيسية
│   ├── bot/
│   │   ├── index.js          # إنشاء البوت
│   │   └── handlers/         # معالجات الأوامر
│   ├── api/
│   │   └── routes/           # API endpoints
│   ├── models/               # نماذج قاعدة البيانات
│   ├── services/             # المنطق الأساسي
│   ├── middlewares/          # Auth middleware
│   └── utils/                # أدوات مساعدة
├── miniapp/
│   ├── customer/             # تطبيق العملاء (React)
│   └── admin/                # لوحة الإدارة (React)
├── public/                   # ملفات ثابتة
├── uploads/                  # الصور المرفوعة
├── package.json
├── railway.toml
└── .env.example
```

---

## 🔧 تطوير محلي

```bash
# تثبيت الحزم
npm install

# بناء Mini Apps
cd miniapp/customer && npm install && npm run build
cd miniapp/admin && npm install && npm run build

# تشغيل الخادم
npm run dev

# أو للتطوير بدون build
cd miniapp/customer && npm run dev
cd miniapp/admin && npm run dev
```

---

## 💡 الإعدادات المتحكم بها من لوحة الإدارة

كل هذه القيم قابلة للتعديل من الإدارة بدون إعادة نشر:
- ✅ رسالة الترحيب
- ✅ رسالة الصيانة  
- ✅ تشغيل/إيقاف الصيانة
- ✅ مفاتيح بينانس API
- ✅ محفظة USDT
- ✅ الحد الأدنى للإيداع
- ✅ مكافأة الإحالة
- ✅ إشعارات الأدمن
- ✅ إجبار الانضمام للقناة
- ✅ جميع نصوص المتجر

---

Built with ❤️ | Node.js + Express + MongoDB + Telegraf + React + Tailwind
