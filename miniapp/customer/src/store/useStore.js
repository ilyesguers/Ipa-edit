import { create } from 'zustand';
import api from '../utils/api';
import { cachedFetch, invalidateCache } from '../utils/cache';
import { normalizeLocale } from '../i18n';

const LOCALE_KEY = 'locale';
const LANGUAGE_CHOSEN_KEY = 'language_selected';

const readStoredLocale = () => {
  try {
    const value = localStorage.getItem(LOCALE_KEY);
    return value ? normalizeLocale(value) : null;
  } catch (_) {
    return null;
  }
};

const persistLocale = (locale) => {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
    localStorage.setItem(LANGUAGE_CHOSEN_KEY, '1');
  } catch (_) {}
};

// A previous version only stored `locale`; treat it as a valid existing choice
// too, so returning users are never forced through onboarding again.
const SAVED_LOCALE = readStoredLocale();

const useStore = create((set, get) => ({
  // User
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  locale: SAVED_LOCALE || 'ar',

  // First visit deliberately stops at the language screen. The rest of the
  // mini app is not rendered until an explicit choice is available.
  needsLanguageSelect: !SAVED_LOCALE,
  showLanguagePicker: false,

  // Navigation
  activeTab: 'products',
  breadcrumb: [],

  // Public settings / branding
  publicSettings: {},

  // Shop state
  categories: [],
  selectedCategory: null,
  selectedGame: null,
  games: [],
  products: [],
  selectedProduct: null,
  showDurationSheet: false,

  // Cart / Checkout
  selectedDuration: null,
  quantity: 1,
  couponCode: '',
  couponDiscount: 0,
  showCheckout: false,
  showBinanceSheet: false,
  currentOrder: null,

  // Actions
  setUser: (user) => set({ user }),
  setToken: (token) => {
    try { localStorage.setItem('token', token); } catch (_) {}
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    set({ token });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  openLanguagePicker: () => set({ showLanguagePicker: true }),
  closeLanguagePicker: () => set({ showLanguagePicker: false, needsLanguageSelect: false }),
  setLocale: async (nextLocale) => {
    const locale = normalizeLocale(nextLocale);
    persistLocale(locale);
    set((state) => ({
      locale,
      needsLanguageSelect: false,
      showLanguagePicker: false,
      user: state.user ? { ...state.user, preferredLanguage: locale, languageSelected: true } : state.user
    }));

    // Before Telegram authentication finishes this request is intentionally
    // skipped; `login` below syncs the pending selection after it gets a token.
    if (!get().token) return locale;
    try {
      await api.put('/users/me', { preferredLanguage: locale });
    } catch (_) {}
    return locale;
  },
  toggleLocale: () => get().openLanguagePicker(),

  fetchPublicSettings: async () => {
    try {
      const res = await api.get('/settings/public');
      set({ publicSettings: res.data.data || {} });
      return res.data.data || {};
    } catch (_) {
      set({ publicSettings: {} });
      return {};
    }
  },

  // Auth
  login: async (initData) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/telegram', { initData });
      const { token, user } = res.data;
      get().setToken(token);

      const savedLocale = readStoredLocale();
      const hasLocalChoice = Boolean(savedLocale);
      const hasServerChoice = Boolean(user.languageSelected);
      const locale = hasLocalChoice
        ? savedLocale
        : normalizeLocale(user.preferredLanguage || window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || get().locale);
      const hasChoice = hasLocalChoice || hasServerChoice;

      if (!hasLocalChoice && hasServerChoice) persistLocale(locale);
      set({
        user: { ...user, preferredLanguage: locale, languageSelected: hasChoice },
        locale,
        needsLanguageSelect: !hasChoice,
        isAuthenticated: true,
        isLoading: false
      });

      // A language picked in the web gate can beat the authentication request.
      // Persist it after auth without making the UI wait for a second network call.
      if (hasLocalChoice && (!hasServerChoice || normalizeLocale(user.preferredLanguage) !== locale)) {
        api.put('/users/me', { preferredLanguage: locale }).catch(() => {});
      }
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // Categories (cached 60s — instant tab switching, no repeated network hits)
  fetchCategories: async (force = false) => {
    const data = force
      ? await (async () => { const res = await api.get('/shop/categories'); return res.data.data; })()
      : await cachedFetch('categories', async () => (await api.get('/shop/categories')).data.data);
    set({ categories: data });
    return data;
  },

  // Games (cached per category)
  selectCategory: async (category) => {
    set({ selectedCategory: category, selectedGame: null, products: [], breadcrumb: [category] });
    const data = await cachedFetch(`games:${category._id}`, async () => (await api.get(`/shop/categories/${category._id}/games`)).data.data);
    set({ games: data });
  },

  // Products (cached per game)
  selectGame: async (game) => {
    const { selectedCategory } = get();
    set({ selectedGame: game, breadcrumb: [selectedCategory, game] });
    const data = await cachedFetch(`products:${game._id}`, async () => (await api.get(`/shop/games/${game._id}/products`)).data.data);
    set({ products: data });
  },

  // Product detail (short TTL — prices/stock change often)
  selectProduct: async (product) => {
    set({ selectedProduct: null });
    const data = await cachedFetch(`product:${product._id}`, async () => (await api.get(`/shop/products/${product._id}`)).data.data, 15 * 1000);
    set({ selectedProduct: data, showDurationSheet: true });
  },

  selectDuration: (duration) => set({ selectedDuration: duration, showCheckout: true, showDurationSheet: false }),

  applyCoupon: async (code, amount) => {
    const res = await api.post('/orders/validate-coupon', { code, amount });
    set({ couponDiscount: res.data.data.discountAmount });
    return res.data.data;
  },

  purchaseWithWallet: async () => {
    const { selectedProduct, selectedDuration, quantity, couponCode } = get();
    const res = await api.post('/orders/wallet', {
      productId: selectedProduct._id,
      durationId: selectedDuration._id,
      quantity,
      couponCode: couponCode || undefined
    });
    const nextUser = res.data.data?.balance !== undefined
      ? { ...get().user, balance: res.data.data.balance }
      : get().user;
    invalidateCache('my-keys');
    invalidateCache('orders:1');
    if (selectedProduct) invalidateCache(`product:${selectedProduct._id}`);
    const gameId = selectedProduct?.game?._id || selectedProduct?.game;
    if (gameId) invalidateCache(`products:${gameId}`);
    set({ currentOrder: res.data.data, showCheckout: false, user: nextUser });
    return res.data.data;
  },

  purchaseWithBinance: async () => {
    const { selectedProduct, selectedDuration, quantity, couponCode } = get();
    const res = await api.post('/orders/binance', {
      productId: selectedProduct._id,
      durationId: selectedDuration._id,
      quantity,
      couponCode: couponCode || undefined
    });
    set({ currentOrder: res.data.data, showBinanceSheet: true, showCheckout: false });
    return res.data.data;
  },

  submitPaymentProof: async (txHash) => {
    const { currentOrder } = get();
    const res = await api.post('/orders/payment-proof', { orderId: currentOrder.order?._id, txHash });
    return res.data;
  },

  reset: () => set({
    selectedCategory: null, selectedGame: null, games: [], products: [],
    selectedProduct: null, showDurationSheet: false, selectedDuration: null,
    showCheckout: false, showBinanceSheet: false, currentOrder: null,
    couponCode: '', couponDiscount: 0, quantity: 1
  }),

  goBack: () => {
    const { selectedProduct, showDurationSheet, selectedGame, selectedCategory } = get();
    if (showDurationSheet) return set({ showDurationSheet: false });
    if (selectedProduct) return set({ selectedProduct: null });
    if (selectedGame) return set({ selectedGame: null, products: [], breadcrumb: [selectedCategory] });
    if (selectedCategory) return set({ selectedCategory: null, games: [], breadcrumb: [] });
  }
}));

export default useStore;
