import React from 'react';
import { canViewPage } from '../utils/permissions';
import AdminIcon from './AdminIcon';

const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [{ id: 'dashboard', icon: 'dashboard', label: 'نظرة عامة' }]
  },
  {
    label: 'المتجر',
    items: [
      { id: 'products', icon: 'product', label: 'المنتجات والأكواد' },
      { id: 'categories', icon: 'categories', label: 'الأقسام والألعاب' },
      { id: 'inventory', icon: 'inventory', label: 'المخزون المتقدم' }
    ]
  },
  {
    label: 'المبيعات',
    items: [
      { id: 'orders', icon: 'orders', label: 'الطلبات' },
      { id: 'users', icon: 'users', label: 'المستخدمون' }
    ]
  },
  {
    label: 'التسويق',
    items: [
      { id: 'coupons', icon: 'coupon', label: 'الكوبونات' },
      { id: 'broadcast', icon: 'broadcast', label: 'الإذاعة' },
      { id: 'wheel', icon: 'gift', label: 'عجلة الحظ' }
    ]
  },
  {
    label: 'النظام',
    items: [
      { id: 'media', icon: 'media', label: 'الصور والوسائط' },
      { id: 'settings', icon: 'settings', label: 'الإعدادات' }
    ]
  }
];

export default function Sidebar({ activePage, setActivePage, setRouteQuery, user, sidebarOpen, setSidebarOpen, unreadOrders = 0 }) {
  const goTo = (page) => {
    setActivePage(page);
    setRouteQuery?.({});
    setSidebarOpen(false);
  };

  const content = (
    <aside className="admin-sidebar" aria-label="التنقل الإداري">
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__brand-mark"><AdminIcon name="shield" size="1.25rem" /></span>
        <div className="min-w-0">
          <strong>GAMER STORE</strong>
          <small>لوحة الإدارة</small>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => canViewPage(user, item.id));
          if (!items.length) return null;
          return (
            <section key={group.label} className="admin-sidebar__group">
              <p className="admin-sidebar__section-label">{group.label}</p>
              {items.map((item) => {
                const active = activePage === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => goTo(item.id)} aria-current={active ? 'page' : undefined} className={`admin-sidebar__item ${active ? 'is-active' : ''}`}>
                    <span className="admin-sidebar__item-icon"><AdminIcon name={item.icon} /></span>
                    <span className="admin-sidebar__item-copy"><strong>{item.label}</strong></span>
                    {item.id === 'orders' && unreadOrders > 0 && <span className="admin-sidebar__badge">{unreadOrders > 99 ? '99+' : unreadOrders}</span>}
                  </button>
                );
              })}
            </section>
          );
        })}
      </nav>

      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__user">
          <span className="admin-sidebar__avatar">{user?.firstName?.[0] || 'A'}</span>
          <div className="min-w-0">
            <strong>{user?.firstName || 'Admin'}</strong>
            <small><i /> متصل الآن</small>
          </div>
        </div>
        <a href="/customer" target="_blank" rel="noreferrer" className="admin-sidebar__store-button"><AdminIcon name="store" /> فتح المتجر</a>
      </div>
    </aside>
  );

  return (
    <>
      <div className="admin-sidebar-desktop hidden lg:flex">{content}</div>
      {sidebarOpen && <div className="admin-sidebar-mobile fixed inset-y-0 right-0 z-40 lg:hidden animate-sidebar-in">{content}</div>}
    </>
  );
}
