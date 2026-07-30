import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    api.get('/settings').then(r => { setSettings(r.data.data || {}); setLoading(false); });
  }, []);

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async (keys) => {
    setSaving(true);
    try {
      const payload = {};
      keys.forEach(k => { payload[k] = settings[k]; });
      await api.put('/settings', payload);
      toast.success('✅ تم الحفظ');
    } catch (err) { toast.error('فشل في الحفظ'); }
    setSaving(false);
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>;

  const sections = [
    {
      title: '🤖 إعدادات البوت',
      keys: ['bot_name', 'bot_username', 'support_username', 'channel_id'],
      fields: [
        { key: 'bot_name', label: 'اسم البوت', placeholder: 'Digital Keys Store' },
        { key: 'bot_username', label: 'يوزر البوت', placeholder: 'your_bot' },
        { key: 'support_username', label: 'يوزر الدعم', placeholder: 'support' },
        { key: 'channel_id', label: 'معرف القناة', placeholder: '-1001234567890' },
      ]
    },
    {
      title: '💬 الرسائل',
      keys: ['welcome_message', 'maintenance_message', 'shop_title', 'shop_description', 'footer_text'],
      fields: [
        { key: 'welcome_message', label: 'رسالة الترحيب', type: 'textarea', placeholder: '👋 أهلاً {name}!' },
        { key: 'maintenance_message', label: 'رسالة الصيانة', type: 'textarea' },
        { key: 'shop_title', label: 'عنوان المتجر', placeholder: '🔑 متجر المفاتيح' },
        { key: 'shop_description', label: 'وصف المتجر', placeholder: 'أفضل الأسعار' },
        { key: 'footer_text', label: 'نص التذييل', placeholder: '💎 شكراً لثقتكم' },
      ]
    },
    {
      title: '💳 إعدادات الدفع',
      keys: ['binance_api_key', 'binance_secret_key', 'binance_merchant_id', 'usdt_wallet_trc20', 'min_deposit', 'payment_timeout_minutes'],
      fields: [
        { key: 'binance_api_key', label: 'Binance API Key', type: 'password', secret: true },
        { key: 'binance_secret_key', label: 'Binance Secret Key', type: 'password', secret: true },
        { key: 'binance_merchant_id', label: 'Binance Merchant ID' },
        { key: 'usdt_wallet_trc20', label: 'محفظة USDT TRC20', placeholder: 'TRxxxxxxxxxx' },
        { key: 'min_deposit', label: 'الحد الأدنى للإيداع ($)', type: 'number', placeholder: '1' },
        { key: 'payment_timeout_minutes', label: 'مهلة الدفع (دقائق)', type: 'number', placeholder: '15' },
      ]
    },
    {
      title: '⚙️ إعدادات عامة',
      keys: ['referral_bonus', 'auto_verify_payments', 'admin_notification_on_order', 'admin_notification_on_payment', 'force_join_channel'],
      fields: [
        { key: 'referral_bonus', label: 'مكافأة الإحالة ($)', type: 'number', placeholder: '0.5' },
        { key: 'auto_verify_payments', label: 'التحقق التلقائي من بينانس', type: 'toggle' },
        { key: 'admin_notification_on_order', label: 'إشعار الطلبات الجديدة', type: 'toggle' },
        { key: 'admin_notification_on_payment', label: 'إشعار إثباتات الدفع', type: 'toggle' },
        { key: 'force_join_channel', label: 'إجبار الانضمام للقناة', type: 'toggle' },
      ]
    }
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black text-white">⚙️ الإعدادات</h2>

      {sections.map((section, si) => (
        <motion.div key={si} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.1 }} className="admin-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white text-sm">{section.title}</h3>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleSave(section.keys)} disabled={saving}
              className="neon-btn text-xs px-3 py-1.5">{saving ? '⏳...' : '💾 حفظ'}</motion.button>
          </div>

          <div className="space-y-3">
            {section.fields.map(field => (
              <div key={field.key}>
                <label className="text-xs text-muted font-semibold block mb-1">{field.label}</label>
                {field.type === 'toggle' ? (
                  <div className="flex items-center gap-3">
                    <div onClick={() => update(field.key, !settings[field.key])}
                      className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${settings[field.key] ? 'bg-neon' : 'bg-border'}`}>
                      <motion.div animate={{ x: settings[field.key] ? 24 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                    <span className="text-sm text-white">{settings[field.key] ? 'مفعّل' : 'معطّل'}</span>
                  </div>
                ) : field.type === 'textarea' ? (
                  <textarea value={settings[field.key] || ''} onChange={e => update(field.key, e.target.value)}
                    placeholder={field.placeholder} rows={3} className="input-admin resize-none text-xs" />
                ) : (
                  <div className="relative">
                    <input
                      type={field.type === 'password' && !showSecrets[field.key] ? 'password' : field.type === 'number' ? 'number' : 'text'}
                      value={settings[field.key] === '***hidden***' ? '' : (settings[field.key] || '')}
                      onChange={e => update(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                      placeholder={field.placeholder || field.label}
                      className="input-admin"
                    />
                    {field.type === 'password' && (
                      <button onClick={() => setShowSecrets(s => ({ ...s, [field.key]: !s[field.key] }))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">
                        {showSecrets[field.key] ? '🙈' : '👁'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
