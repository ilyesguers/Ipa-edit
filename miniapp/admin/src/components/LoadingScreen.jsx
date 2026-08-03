import React from 'react';
import AdminIcon from './AdminIcon';

export default function LoadingScreen() {
  return (
    <main className="admin-loading" role="status" aria-live="polite">
      <span className="admin-loading__icon"><AdminIcon name="shield" size="1.75rem" /></span>
      <strong>لوحة الإدارة</strong>
      <span className="admin-loading__bar"><i /></span>
      <small>جاري التحقق من الصلاحيات</small>
    </main>
  );
}
