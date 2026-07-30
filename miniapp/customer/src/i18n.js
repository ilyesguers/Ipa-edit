// Small, dependency-free translation layer shared by every customer screen.
// Keeping keys here prevents Arabic/English strings from drifting between sheets.
export const TRANSLATIONS = {
  ar: {
    brand: 'متجر المفاتيح',
    customer: 'عميل', admin: 'مدير',
    navProducts: 'الألعاب', navKeys: 'مفاتيحي', navHistory: 'طلباتي', navProfile: 'حسابي', navSupport: 'الدعم',
    balance: 'الرصيد', user: 'مستخدم',
    welcomeBadge: 'واجهة ألعاب سريعة', welcomeTitle: 'كل ألعابك في مكان واحد',
    welcomeSubtitle: 'اختر جهازك ولعبتك، ثم استلم مفتاحك فور تأكيد الدفع.',
    support: 'الدعم', channel: 'القناة', help: 'المساعدة', adminPanel: 'لوحة التحكم',
    browseGames: 'تصفح الألعاب', featured: 'منتجات مميزة', chooseDevice: 'اختر جهازك',
    searchPlaceholder: 'ابحث عن لعبة أو منتج...', searchResults: 'نتائج البحث',
    panelKeys: 'مفاتيح الألعاب', services: 'خدمات', available: 'متاح', noProducts: 'لا توجد منتجات متاحة', tryAnother: 'جرب قسماً آخر',
    noGames: 'لا توجد ألعاب', soon: 'المزيد قريباً', back: 'رجوع',
    myKeys: 'مفاتيحي', noKeys: 'لا توجد مفاتيح بعد', buyFirst: 'اشترِ أول منتج الآن!',
    orderHistory: 'سجل الطلبات', noOrders: 'لا يوجد سجل طلبات بعد', loadMore: 'تحميل المزيد', loading: 'جارٍ التحميل...',
    completed: 'مكتمل', pending: 'قيد الانتظار', processing: 'معالجة', failed: 'فاشل', cancelled: 'ملغي',
    profile: 'الملف الشخصي', name: 'الاسم', id: 'المعرف', phone: 'الهاتف', notVerified: 'غير محقق',
    currency: 'العملة', joined: 'تاريخ الانضمام', totalOrders: 'إجمالي الطلبات', totalSpent: 'إجمالي الإنفاق',
    totalDeposited: 'إجمالي الشحن', balanceHistory: 'سجل الرصيد',
    supportTeam: 'فريق الدعم', availableNow: 'متصل الآن', directContact: 'تواصل مباشر', faq: 'الأسئلة الشائعة',
    faqTitle: 'أسئلة شائعة', faqBuy: 'كيف أشتري مفتاحاً؟', faqBuyA: 'افتح الألعاب، اختر جهازك ثم اللعبة والمنتج وأكمل الدفع.',
    faqDelivery: 'متى أتلقى مفتاحي؟', faqDeliveryA: 'يتم التسليم فورياً بعد تأكيد الدفع.',
    faqPayment: 'ما طرق الدفع المتاحة؟', faqPaymentA: 'محفظة الرصيد أو الدفع عبر Binance Pay وUSDT.',
    faqRefund: 'هل يمكن استرداد الأموال؟', faqRefundA: 'تتم مراجعة طلبات الاسترداد حسب سياسة المتجر. تواصل مع الدعم.',
    faqInvalid: 'المفتاح لم يعمل، ماذا أفعل؟', faqInvalidA: 'تواصل مع الدعم وأرفق صورة للمشكلة ورقم طلبك.',
    checkout: 'إتمام الشراء', product: 'المنتج', duration: 'المدة', quantity: 'الكمية', subtotal: 'المجموع',
    coupon: 'رمز القسيمة (اختياري)', apply: 'تطبيق', applied: 'تم التطبيق', couponError: 'كوبون غير صالح',
    discount: 'خصم الكوبون', total: 'الإجمالي', payWallet: 'الدفع من المحفظة', payBinance: 'الدفع عبر Binance Pay',
    insufficient: 'رصيد غير كافٍ', purchaseSuccess: 'تم الشراء بنجاح!', instantDelivery: 'تم التسليم فوراً',
    yourKeys: 'مفاتيحك', copyAll: 'نسخ الكل', copied: 'تم النسخ', thankYou: 'شكراً!', orderNumber: 'رقم الطلب',
    binance: 'دفع Binance Pay', txHash: 'TxHash / رقم المعاملة', submit: 'إرسال للتحقق', submitted: 'تم إرسال إثبات الدفع', cancel: 'إلغاء',
    language: 'اللغة', switchLanguage: 'English', toastCopied: 'تم نسخ المفتاح!',
    emptyBalance: 'لا توجد حركات رصيد بعد', dateLocale: 'ar-SA'
  },
  en: {
    brand: 'Game Keys', customer: 'Customer', admin: 'Admin',
    navProducts: 'Games', navKeys: 'My Keys', navHistory: 'Orders', navProfile: 'Profile', navSupport: 'Support',
    balance: 'Balance', user: 'User', welcomeBadge: 'Fast gaming storefront', welcomeTitle: 'All your games in one place',
    welcomeSubtitle: 'Pick your device and game, then receive your key right after payment confirmation.',
    support: 'Support', channel: 'Channel', help: 'Help', adminPanel: 'Admin Panel', browseGames: 'Browse Games',
    featured: 'Featured products', chooseDevice: 'Choose your device', searchPlaceholder: 'Search games or products...',
    searchResults: 'Search results', panelKeys: 'Game keys', services: 'Services', available: 'Available', noProducts: 'No products available',
    tryAnother: 'Try another section', noGames: 'No games yet', soon: 'More coming soon', back: 'Back',
    myKeys: 'My Keys', noKeys: 'No keys yet', buyFirst: 'Buy your first product now!', orderHistory: 'Order history',
    noOrders: 'No order history yet', loadMore: 'Load more', loading: 'Loading...', completed: 'Completed',
    pending: 'Pending', processing: 'Processing', failed: 'Failed', cancelled: 'Cancelled', profile: 'Profile',
    name: 'Name', id: 'ID', phone: 'Phone', notVerified: 'Not verified', currency: 'Currency', joined: 'Joined',
    totalOrders: 'Total orders', totalSpent: 'Total spent', totalDeposited: 'Total top-ups', balanceHistory: 'Balance history',
    supportTeam: 'Support team', availableNow: 'Online now', directContact: 'Contact us', faq: 'FAQ', faqTitle: 'Frequently asked questions',
    faqBuy: 'How do I buy a key?', faqBuyA: 'Open Games, choose your device, then game and product, and complete payment.',
    faqDelivery: 'When do I receive my key?', faqDeliveryA: 'It is delivered instantly after payment confirmation.',
    faqPayment: 'Which payment methods are available?', faqPaymentA: 'Wallet balance, Binance Pay, and USDT.',
    faqRefund: 'Can I request a refund?', faqRefundA: 'Refunds are reviewed according to the store policy. Contact support.',
    faqInvalid: 'The key does not work. What should I do?', faqInvalidA: 'Contact support with a screenshot and your order number.',
    checkout: 'Checkout', product: 'Product', duration: 'Duration', quantity: 'Quantity', subtotal: 'Subtotal',
    coupon: 'Coupon code (optional)', apply: 'Apply', applied: 'Applied', couponError: 'Invalid coupon', discount: 'Coupon discount',
    total: 'Total', payWallet: 'Pay from wallet', payBinance: 'Pay with Binance Pay', insufficient: 'Insufficient balance',
    purchaseSuccess: 'Purchase successful!', instantDelivery: 'Delivered instantly', yourKeys: 'Your keys', copyAll: 'Copy all',
    copied: 'Copied', thankYou: 'Thank you!', orderNumber: 'Order number', binance: 'Binance Pay', txHash: 'TxHash / transaction ID',
    submit: 'Submit for verification', submitted: 'Payment proof submitted', cancel: 'Cancel', language: 'Language', switchLanguage: 'العربية', toastCopied: 'Key copied!',
    emptyBalance: 'No balance activity yet', dateLocale: 'en-US'
  }
};

export const normalizeLocale = (value) => String(value || '').toLowerCase().startsWith('en') ? 'en' : 'ar';

export const t = (locale, key, vars = {}) => {
  const dictionary = TRANSLATIONS[normalizeLocale(locale)] || TRANSLATIONS.ar;
  let value = dictionary[key] ?? TRANSLATIONS.ar[key] ?? key;
  Object.entries(vars).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });
  return value;
};

export const localizedName = (item, locale) => {
  if (!item) return '';
  return normalizeLocale(locale) === 'en'
    ? (item.name || item.nameAr || '')
    : (item.nameAr || item.name || '');
};
