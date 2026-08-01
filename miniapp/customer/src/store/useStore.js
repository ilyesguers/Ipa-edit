import { create } from 'zustand';
import api from '../utils/api';
import { normalizeLocale } from '../i18n';

const useStore = create((set, get) => ({
  // User
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  locale: normalizeLocale(localStorage.getItem('locale') || 'ar'),

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
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ token });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLocale: async (nextLocale) => {
    const locale = normalizeLocale(nextLocale);
    localStorage.setItem('locale', locale);
    set({ locale });
    // Keep bot and mini-app language in sync. This is intentionally best effort
    // so the UI still switches when the API is temporarily unavailable.
    try {
      await api.put('/users/me', { preferredLanguage: locale });
      set((state) => ({ user: state.user ? { ...state.user, preferredLanguage: locale } : state.user }));
    } catch (_) {}
    return locale;
  },
  toggleLocale: () => get().setLocale(get().locale === 'ar' ? 'en' : 'ar'),

  fetchPublicSettings: async () => {
    try {
      const res = await api.get('/settings/public');
      set({ publicSettings: res.data.data || {} });
      return res.data.data || {};
    } catch (err) {
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
      const locale = normalizeLocale(user.preferredLanguage || window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || get().locale);
      localStorage.setItem('locale', locale);
      set({ user, locale, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // Categories
  fetchCategories: async () => {
    const res = await api.get('/shop/categories');
    set({ categories: res.data.data });
  },

  // Games
  selectCategory: async (category) => {
    set({ selectedCategory: category, selectedGame: null, products: [], breadcrumb: [category] });
    const res = await api.get(`/shop/categories/${category._id}/games`);
    set({ games: res.data.data });
  },

  // Products
  selectGame: async (game) => {
    const { selectedCategory } = get();
    set({ selectedGame: game, breadcrumb: [selectedCategory, game] });
    const res = await api.get(`/shop/games/${game._id}/products`);
    set({ products: res.data.data });
  },

  // Product detail
  selectProduct: async (product) => {
    set({ selectedProduct: null });
    const res = await api.get(`/shop/products/${product._id}`);
    set({ selectedProduct: res.data.data, showDurationSheet: true });
  },

  selectDuration: (duration) => set({ selectedDuration: duration, showCheckout: true, showDurationSheet: false }),

  // Coupon
  applyCoupon: async (code, amount) => {
    try {
      const res = await api.post('/orders/validate-coupon', { code, amount });
      set({ couponDiscount: res.data.data.discountAmount });
      return res.data.data;
    } catch (err) {
      throw err;
    }
  },

  // Purchase
  purchaseWithWallet: async () => {
    const { selectedProduct, selectedDuration, quantity, couponCode } = get();
    const res = await api.post('/orders/wallet', {
      productId: selectedProduct._id,
      durationId: selectedDuration._id,
      quantity,
      couponCode: couponCode || undefined
    });
    // Refresh the balance from the server response so the header updates instantly
    const nextUser = res.data.data?.balance !== undefined
      ? { ...get().user, balance: res.data.data.balance }
      : get().user;
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

  // Reset
  reset: () => set({
    selectedCategory: null, selectedGame: null, games: [], products: [],
    selectedProduct: null, showDurationSheet: false, selectedDuration: null,
    showCheckout: false, showBinanceSheet: false, currentOrder: null,
    couponCode: '', couponDiscount: 0, quantity: 1
  }),

  goBack: () => {
    const { selectedDuration, selectedProduct, showDurationSheet, selectedGame, selectedCategory } = get();
    if (showDurationSheet) return set({ showDurationSheet: false });
    if (selectedProduct) return set({ selectedProduct: null });
    if (selectedGame) return set({ selectedGame: null, products: [], breadcrumb: [selectedCategory] });
    if (selectedCategory) return set({ selectedCategory: null, games: [], breadcrumb: [] });
  }
}));

export default useStore;
