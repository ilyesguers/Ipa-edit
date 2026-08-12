/**
 * 🎛️ Granular admin permissions for the control panel.
 * Empty permissions array = full access (legacy admin / fresh promotion).
 * superadmin (owner) always sees everything.
 */

export const PERMISSION_LABELS = {
  dashboard: { label: 'الإحصائيات', icon: '📊' },
  products: { label: 'المنتجات والأقسام', icon: '🔑' },
  inventory: { label: 'المخزون والمفاتيح', icon: '📦' },
  wheel: { label: 'عجلة الحظ', icon: '🎡' },
  orders: { label: 'الطلبات', icon: '🛒' },
  users: { label: 'المستخدمون', icon: '👥' },
  coupons: { label: 'الكوبونات', icon: '🎟️' },
  broadcast: { label: 'الإذاعة', icon: '📢' },
  settings: { label: 'الإعدادات', icon: '🎛️' },
};

// Which permission each admin page requires
export const PAGE_PERMISSIONS = {
  dashboard: 'dashboard',
  categories: 'products',
  products: 'products',
  inventory: 'inventory',
  wheel: 'wheel',
  orders: 'orders',
  users: 'users',
  coupons: 'coupons',
  broadcast: 'broadcast',
  media: 'settings',
  settings: 'settings',
};

export const canViewPage = (user, page) => {
  if (!user || !user.isAdmin) return false;
  if (user.role === 'superadmin') return true;
  const perms = user.permissions || [];
  if (!perms.length) return true; // full-access admin
  return perms.includes(PAGE_PERMISSIONS[page] || page);
};

export const hasPermission = (user, perm) => {
  if (!user || !user.isAdmin) return false;
  if (user.role === 'superadmin') return true;
  const perms = user.permissions || [];
  if (!perms.length) return true;
  return perms.includes(perm);
};
