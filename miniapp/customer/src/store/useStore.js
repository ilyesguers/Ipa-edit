import { create } from 'zustand';
import api from '../utils/api';

const useStore = create((set, get) => ({
  // User
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

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
      set({ user, isAuthenticated: true, isLoading: false });
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
    set({ currentOrder: res.data.data, showCheckout: false });
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
