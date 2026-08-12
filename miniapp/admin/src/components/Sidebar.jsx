import React from 'react';
import { canViewPage } from '../utils/permissions';
import AdminIcon from './AdminIcon';

const NAV = [
  { id: 'dashboard', icon: 'dashboard', label: 'لوحة التحكم', desc: 'ملخص سريع' },
  { id: 'categories', icon: 'categories', label: 'الأقسام والألعاب', desc: 'تنظيم المسار' },
  { id: 'products', icon: 'product', label: 'المنتجات', desc: 'أسعار ومدد' },
  { id: 'inventory', icon: 'inventory', label: 'المخزون', desc: 'المفاتيح والتوفر' },
  { id: 'wheel', icon: 'gift', label: 'عجلة الحظ', desc: 'الجوائز والألعاب' },
  { id: 'orders', icon: 'orders', label: 'الطلبات', desc: 'الدفع والتسليم' },
  { id: 'users', icon: 'users', label: 'المستخدمون', desc: 'الحسابات والأرصدة' },
  { id: 'coupons', icon: 'coupon', label: 'الكوبونات', desc: 'الخصومات' },
  { id: 'broadcast', icon: 'broadcast', label: 'الإذاعة', desc: 'الرسائل' },
  { id: 'media', icon: 'media', label: 'الوسائط', desc: 'الصور والبنرات' },
  { id: 'settings', icon: 'settings', label: 'الإعدادات', desc: 'المتجر والبوت' }
];

export default function Sidebar({ activePage, setActivePage, setRouteQuery, user, sidebarOpen, setSidebarOpen, unreadOrders = 0 }) {
  const goTo = (page) => {
    setActivePage(page);
    setRouteQuery?.({});
    setSidebarOpen(false);
  };

  const visibleItems = NAV.filter((item) => canViewPage(user, item.id));
  const content = (
    <aside className="admin-sidebar" aria-label="التنقل الإداري">
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__brand-mark"><AdminIcon name="shield" size="1.25rem" /></span>
        <div className="min-w-0">
          <strong>لوحة الإدارة</strong>
          <small>إدارة المتجر بوضوح</small>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        <p className="admin-sidebar__section-label">الإدارة</p>
        {visibleItems.map((item) => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`admin-sidebar__item ${active ? 'is-active' : ''}`}
            >
              <span className="admin-sidebar__item-icon"><AdminIcon name={item.icon} /></span>
              <span className="admin-sidebar__item-copy">
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </span>
              {item.id === 'orders' && unreadOrders > 0 && <span className="admin-sidebar__badge">{unreadOrders > 99 ? '99+' : unreadOrders}</span>}
            </button>
          );
        })}
      </nav>

      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__user">
          <span className="admin-sidebar__avatar">{user?.firstName?.[0] || 'A'}</span>
          <div className="min-w-0">
            <strong>{user?.firstName || 'Admin'}</strong>
            <small>متصل الآن</small>
          </div>
        </div>
        <div className="admin-sidebar__footer-actions">
          <a href="/customer" target="_blank" rel="noreferrer" title="فتح المتجر"><AdminIcon name="store" /></a>
          <button type="button" onClick={() => goTo('settings')} title="الإعدادات"><AdminIcon name="settings" /></button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="admin-sidebar-desktop hidden lg:flex">{content}</div>
      {sidebarOpen && (
        <div className="admin-sidebar-mobile fixed inset-y-0 right-0 z-40 lg:hidden animate-sidebar-in">
          {content}
        </div>
      )}
    </>
  );
}
