import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { haptic } from '../utils/haptic';

const THEME_PRESETS = [
  { id: 'aurora', icon: '🫧', title: 'Aurora', desc: 'سماوي + بنفسجي', gradient: 'from-cyan-500/20 to-violet-500/10' },
  { id: 'emerald', icon: '💚', title: 'Emerald', desc: 'أخضر + أزرق', gradient: 'from-emerald-500/20 to-sky-500/10' },
  { id: 'velvet', icon: '🪻', title: 'Velvet', desc: 'بنفسجي + وردي', gradient: 'from-fuchsia-500/20 to-purple-500/10' },
  { id: 'sunset', icon: '🌇', title: 'Sunset', desc: 'برتقالي + أحمر', gradient: 'from-orange-500/20 to-rose-500/10' },
  { id: 'midnight', icon: '🌙', title: 'Midnight 🌙', desc: 'أخضر + بنفسجي', gradient: 'from-emerald-500/20 to-violet-500/10' },
];

const EMPTY_LINK = { id: '', icon: '✨', textAr: '', textEn: '', type: 'callback', value: '', row: 1, visibility: 'all', style: '' };
const EMPTY_HIGHLIGHT = { id: '', icon: '⚡', textAr: '', textEn: '' };

const TABS = [
  { id: 'branding', label: 'الهوية', icon: '🎨' },
  { id: 'navigation', label: 'الأزرار والتنقل', icon: '🧭' },
  { id: 'messages', label: 'الرسائل', icon: '💬' },
  { id: 'payments', label: 'الدفع', icon: '💳' },
  { id: 'premium', label: 'إيموجي بريميوم', icon: '✨' },
  { id: 'system', label: 'النظام', icon: '⚙️' },
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [showSecrets, setShowSecrets] = useState({});
  const [activeTab, setActiveTab] = useState('branding');
  const [quickLinkDraft, setQuickLinkDraft] = useState(EMPTY_LINK);
  const [highlightDraft, setHighlightDraft] = useState(EMPTY_HIGHLIGHT);

  // ── Premium emoji manager ──
  const [emojiEnabled, setEmojiEnabled] = useState(false);
  const [emojiRows, setEmojiRows] = useState([]);
  const [emojiSaving, setEmojiSaving] = useState(false);

  // Fetch the premium-emoji catalog once the premium tab is opened.
  useEffect(() => {
    if (activeTab !== 'premium') return;
    api.get('/admin/emojis/catalog').then((r) => {
      setEmojiEnabled(Boolean(r.data.data?.enabled));
      setEmojiRows((r.data.data?.catalog || []).map((row) => ({ ...row, input: row.configuredId || '' })));
    }).catch(() => {});
  }, [activeTab]);

  useEffect(() => {
    api.get('/settings').then((r) => {
      setSettings({
        ...r.data.data,
        bot_quick_links: Array.isArray(r.data.data?.bot_quick_links) ? r.data.data.bot_quick_links : [],
        ui_home_highlights: Array.isArray(r.data.data?.ui_home_highlights) ? r.data.data.ui_home_highlights : []
      });
      setLoading(false);
    });
  }, []);

  const update = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  const handleSave = async (key, keys) => {
    setSavingKey(key);
    try {
      const payload = {};
      keys.forEach((k) => {
        payload[k] = settings[k];
      });
      await api.put('/settings', payload);
      toast.success('✅ تم حفظ التعديلات');
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل في الحفظ');
    }
    setSavingKey('');
  };

  // Backup save: persist EVERY section at once — the phone-friendly rescue
  // button that never depends on a tiny per-card save button being visible.
  const [savingAll, setSavingAll] = useState(false);
  const saveAll = async () => {
    setSavingAll(true);
    haptic.medium();
    try {
      const allKeys = [...brandingKeys, ...navigationKeys, ...messageKeys, ...paymentKeys, ...systemKeys];
      const payload = {};
      allKeys.forEach((k) => { if (settings[k] !== undefined) payload[k] = settings[k]; });
      await api.put('/settings', payload);
      haptic.success();
      toast.success('💾 تم حفظ جميع الإعدادات دفعة واحدة');
    } catch (err) {
      haptic.error();
      toast.error(err.response?.data?.error || 'فشل في الحفظ');
    }
    setSavingAll(false);
  };

  const saveEmojis = async () => {
    setEmojiSaving(true);
    haptic.medium();
    try {
      const map = {};
      emojiRows.forEach((row) => { const v = String(row.input || '').trim(); if (v) map[row.key] = v; });
      await api.put('/admin/emojis', { enabled: emojiEnabled, map });
      haptic.success();
      toast.success('✨ تم حفظ الإيموجي البريميوم — يعمل فوراً في البوت');
    } catch (err) {
      haptic.error();
      toast.error(err.response?.data?.error || 'فشل الحفظ');
    }
    setEmojiSaving(false);
  };

  const testEmojis = async () => {
    haptic.light();
    try {
      await api.post('/admin/emojis/test');
      toast.success('📩 أُرسلت رسالة معاينة إلى حسابك في البوت');
    } catch (err) {
      toast.error(err.response?.data?.error || 'تعذر إرسال المعاينة');
    }
  };

  const quickLinks = useMemo(() => (Array.isArray(settings.bot_quick_links) ? settings.bot_quick_links : []), [settings.bot_quick_links]);
  const highlights = useMemo(() => (Array.isArray(settings.ui_home_highlights) ? settings.ui_home_highlights : []), [settings.ui_home_highlights]);

  const addQuickLink = () => {
    if (!quickLinkDraft.textAr || !quickLinkDraft.type || !quickLinkDraft.value) {
      return toast.error('أكمل بيانات الزر أولاً');
    }
    update('bot_quick_links', [
      ...quickLinks,
      {
        ...quickLinkDraft,
        id: quickLinkDraft.id || `link_${Date.now()}`,
        row: Number(quickLinkDraft.row) || 1,
      }
    ]);
    setQuickLinkDraft(EMPTY_LINK);
  };

  const removeQuickLink = (id) => update('bot_quick_links', quickLinks.filter((item) => item.id !== id));
  const patchQuickLink = (id, key, value) => update('bot_quick_links', quickLinks.map((item) => item.id === id ? { ...item, [key]: value } : item));

  const addHighlight = () => {
    if (!highlightDraft.textAr) return toast.error('أدخل النص العربي على الأقل');
    update('ui_home_highlights', [
      ...highlights,
      { ...highlightDraft, id: highlightDraft.id || `highlight_${Date.now()}` }
    ]);
    setHighlightDraft(EMPTY_HIGHLIGHT);
  };

  const removeHighlight = (id) => update('ui_home_highlights', highlights.filter((item) => item.id !== id));
  const patchHighlight = (id, key, value) => update('ui_home_highlights', highlights.map((item) => item.id === id ? { ...item, [key]: value } : item));

  if (loading) return <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>;

  const brandingKeys = ['bot_name', 'bot_username', 'channel_username', 'support_username', 'ui_theme_preset', 'ui_welcome_badge_ar', 'ui_welcome_badge_en', 'ui_welcome_title_ar', 'ui_welcome_title_en', 'ui_welcome_subtitle_ar', 'ui_welcome_subtitle_en', 'ui_footer_note_ar', 'ui_footer_note_en', 'admin_portal_label_ar', 'admin_portal_label_en', 'ui_home_highlights'];
  const navigationKeys = ['bot_quick_links'];
  const messageKeys = ['welcome_message', 'maintenance_message', 'shop_title', 'shop_description', 'footer_text'];
  const paymentKeys = ['binance_api_key', 'binance_secret_key', 'binance_merchant_id', 'usdt_wallet_trc20', 'min_deposit', 'payment_timeout_minutes', 'stars_enabled', 'stars_per_usd', 'balance_offers_enabled', 'balance_offers_note_ar', 'balance_offers_note_en'];
  const systemKeys = ['referral_bonus', 'auto_verify_payments', 'admin_notification_on_order', 'admin_notification_on_payment', 'force_join_channel', 'channel_id', 'maintenance_mode', 'maintenance_message'];

  const themeName = THEME_PRESETS.find((item) => item.id === settings.ui_theme_preset)?.title || 'Aurora';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-white">🎛️ الإعدادات والتصميم</h2>
          <p className="text-muted text-xs mt-1">مكان واحد لإدارة هوية البوت، الأزرار، الرسائل، والدفع.</p>
        </div>
        <div className="admin-card lg:w-[340px] space-y-2">
          <p className="text-[11px] text-neon font-bold">معاينة سريعة</p>
          <div className="rounded-2xl border border-neon/20 bg-gradient-to-br from-neon/10 to-transparent p-4">
            <p className="text-[10px] text-neon/70 mb-2">{settings.ui_welcome_badge_ar || 'واجهة جديدة • بوت أذكى'}</p>
            <p className="text-white font-black text-sm">{settings.bot_name || 'Digital Keys Store'}</p>
            <p className="text-white text-sm mt-1">{settings.ui_welcome_title_ar || 'متجر رقمي منظم وسريع'}</p>
            <p className="text-muted text-[11px] mt-1 leading-5">{settings.ui_welcome_subtitle_ar || 'واجهة واضحة وتجربة أسرع.'}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {highlights.slice(0, 3).map((item) => (
                <span key={item.id} className="text-[10px] rounded-full border border-border bg-bg px-2 py-1 text-white">
                  {item.icon} {item.textAr}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-muted mt-3">Theme: <span className="text-neon">{themeName}</span></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${activeTab === tab.id ? 'bg-neon/10 border-neon/30 text-neon' : 'bg-card border-border text-muted'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'branding' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-sm">🎨 الهوية العامة</h3>
                <p className="text-muted text-[11px] mt-1">اسم البوت، أسماء التواصل، والثيم الرئيسي.</p>
              </div>
              <button onClick={() => handleSave('branding-main', ['bot_name', 'bot_username', 'channel_username', 'support_username', 'ui_theme_preset', 'admin_portal_label_ar', 'admin_portal_label_en'])} className="neon-btn text-xs px-3 py-1.5">
                {savingKey === 'branding-main' ? '⏳...' : '💾 حفظ'}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="اسم البوت" value={settings.bot_name || ''} onChange={(v) => update('bot_name', v)} />
              <Field label="يوزر البوت" value={settings.bot_username || ''} onChange={(v) => update('bot_username', v)} placeholder="your_bot" />
              <Field label="يوزر الدعم" value={settings.support_username || ''} onChange={(v) => update('support_username', v)} placeholder="support" />
              <Field label="يوزر القناة" value={settings.channel_username || ''} onChange={(v) => update('channel_username', v)} placeholder="yourchannel" />
              <Field label="اسم زر لوحة التحكم AR" value={settings.admin_portal_label_ar || ''} onChange={(v) => update('admin_portal_label_ar', v)} />
              <Field label="Admin portal label EN" value={settings.admin_portal_label_en || ''} onChange={(v) => update('admin_portal_label_en', v)} />
            </div>

            <div>
              <label className="text-xs text-muted font-semibold block mb-2">اختيار الثيم</label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {THEME_PRESETS.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => update('ui_theme_preset', theme.id)}
                    className={`rounded-2xl border p-4 text-right bg-gradient-to-br ${theme.gradient} ${settings.ui_theme_preset === theme.id ? 'border-neon/40' : 'border-border'}`}
                  >
                    <div className="text-2xl mb-2">{theme.icon}</div>
                    <div className="text-white font-bold text-sm">{theme.title}</div>
                    <div className="text-muted text-[11px] mt-1">{theme.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-sm">🪄 نصوص الواجهة</h3>
                <p className="text-muted text-[11px] mt-1">تخصيص البادج، العنوان، والوصف بالعربية والإنجليزية.</p>
              </div>
              <button onClick={() => handleSave('branding-copy', ['ui_welcome_badge_ar', 'ui_welcome_badge_en', 'ui_welcome_title_ar', 'ui_welcome_title_en', 'ui_welcome_subtitle_ar', 'ui_welcome_subtitle_en', 'ui_footer_note_ar', 'ui_footer_note_en'])} className="neon-btn text-xs px-3 py-1.5">
                {savingKey === 'branding-copy' ? '⏳...' : '💾 حفظ'}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Badge AR" value={settings.ui_welcome_badge_ar || ''} onChange={(v) => update('ui_welcome_badge_ar', v)} />
              <Field label="Badge EN" value={settings.ui_welcome_badge_en || ''} onChange={(v) => update('ui_welcome_badge_en', v)} />
              <Field label="العنوان AR" value={settings.ui_welcome_title_ar || ''} onChange={(v) => update('ui_welcome_title_ar', v)} />
              <Field label="Title EN" value={settings.ui_welcome_title_en || ''} onChange={(v) => update('ui_welcome_title_en', v)} />
              <Field label="الوصف AR" type="textarea" value={settings.ui_welcome_subtitle_ar || ''} onChange={(v) => update('ui_welcome_subtitle_ar', v)} />
              <Field label="Subtitle EN" type="textarea" value={settings.ui_welcome_subtitle_en || ''} onChange={(v) => update('ui_welcome_subtitle_en', v)} />
              <Field label="التذييل AR" value={settings.ui_footer_note_ar || ''} onChange={(v) => update('ui_footer_note_ar', v)} />
              <Field label="Footer EN" value={settings.ui_footer_note_en || ''} onChange={(v) => update('ui_footer_note_en', v)} />
            </div>
          </div>

          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-sm">✨ شرائح المميزات</h3>
                <p className="text-muted text-[11px] mt-1">تظهر في شاشة الترحيب والواجهة الرئيسية داخل المتجر.</p>
              </div>
              <button onClick={() => handleSave('branding-highlights', ['ui_home_highlights'])} className="neon-btn text-xs px-3 py-1.5">
                {savingKey === 'branding-highlights' ? '⏳...' : '💾 حفظ'}
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-[100px_1fr_1fr_auto]">
              <input value={highlightDraft.icon} onChange={(e) => setHighlightDraft((s) => ({ ...s, icon: e.target.value }))} className="input-admin" placeholder="⚡" />
              <input value={highlightDraft.textAr} onChange={(e) => setHighlightDraft((s) => ({ ...s, textAr: e.target.value }))} className="input-admin" placeholder="النص العربي" />
              <input value={highlightDraft.textEn} onChange={(e) => setHighlightDraft((s) => ({ ...s, textEn: e.target.value }))} className="input-admin" placeholder="English text" />
              <button onClick={addHighlight} className="success-btn text-xs px-4">إضافة</button>
            </div>

            <div className="space-y-2">
              {highlights.map((item) => (
                <div key={item.id} className="grid gap-2 md:grid-cols-[90px_1fr_1fr_auto] bg-bg border border-border rounded-xl p-3">
                  <input value={item.icon || ''} onChange={(e) => patchHighlight(item.id, 'icon', e.target.value)} className="input-admin text-center" />
                  <input value={item.textAr || ''} onChange={(e) => patchHighlight(item.id, 'textAr', e.target.value)} className="input-admin" />
                  <input value={item.textEn || ''} onChange={(e) => patchHighlight(item.id, 'textEn', e.target.value)} className="input-admin" />
                  <button onClick={() => removeHighlight(item.id)} className="danger-btn text-xs px-4">حذف</button>
                </div>
              ))}
              {!highlights.length && <p className="text-xs text-muted">لا توجد مميزات مضافة بعد.</p>}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'navigation' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="admin-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-white text-sm">🧭 إدارة أزرار البوت</h3>
              <p className="text-muted text-[11px] mt-1">خصص الأزرار الظاهرة للمستخدمين، الروابط، وصفحات الويب، وصفوف التنقل.</p>
            </div>
            <button onClick={() => handleSave('navigation', navigationKeys)} className="neon-btn text-xs px-3 py-1.5">
              {savingKey === 'navigation' ? '⏳...' : '💾 حفظ'}
            </button>
          </div>

          <div className="grid gap-2 xl:grid-cols-[90px_1fr_1fr_120px_1fr_90px_120px_90px_auto]">
            <input value={quickLinkDraft.icon} onChange={(e) => setQuickLinkDraft((s) => ({ ...s, icon: e.target.value }))} className="input-admin" placeholder="✨" />
            <input value={quickLinkDraft.textAr} onChange={(e) => setQuickLinkDraft((s) => ({ ...s, textAr: e.target.value }))} className="input-admin" placeholder="النص العربي" />
            <input value={quickLinkDraft.textEn} onChange={(e) => setQuickLinkDraft((s) => ({ ...s, textEn: e.target.value }))} className="input-admin" placeholder="English label" />
            <select value={quickLinkDraft.type} onChange={(e) => setQuickLinkDraft((s) => ({ ...s, type: e.target.value }))} className="input-admin">
              <option value="callback">callback</option>
              <option value="webapp">webapp</option>
              <option value="url">url</option>
            </select>
            <input value={quickLinkDraft.value} onChange={(e) => setQuickLinkDraft((s) => ({ ...s, value: e.target.value }))} className="input-admin" placeholder="shop أو /customer أو https://..." />
            <input type="number" min="1" value={quickLinkDraft.row} onChange={(e) => setQuickLinkDraft((s) => ({ ...s, row: e.target.value }))} className="input-admin" placeholder="1" />
            <select value={quickLinkDraft.visibility} onChange={(e) => setQuickLinkDraft((s) => ({ ...s, visibility: e.target.value }))} className="input-admin">
              <option value="all">للجميع</option>
              <option value="admin">للإدارة فقط</option>
            </select>
            <select value={quickLinkDraft.style || ''} onChange={(e) => setQuickLinkDraft((s) => ({ ...s, style: e.target.value }))} className="input-admin">
              <option value="">عادي</option>
              <option value="primary">🔵 أزرق</option>
              <option value="success">🟢 أخضر</option>
              <option value="danger">🔴 أحمر</option>
            </select>
            <button onClick={addQuickLink} className="success-btn text-xs px-4">إضافة</button>
          </div>

          <div className="space-y-2">
            {quickLinks.map((item) => (
              <div key={item.id} className="bg-bg border border-border rounded-2xl p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center text-lg">{item.icon || '✨'}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{item.textAr || '—'} <span className="text-muted">/ {item.textEn || '—'}</span></p>
                      <p className="text-[10px] text-muted truncate">{item.type} • row {item.row} • {item.visibility === 'admin' ? 'Admin only' : 'All users'}</p>
                    </div>
                  </div>
                  <button onClick={() => removeQuickLink(item.id)} className="danger-btn text-xs px-3 py-1.5">حذف</button>
                </div>
                <div className="grid gap-2 xl:grid-cols-[90px_1fr_1fr_120px_1fr_90px_120px_90px]">
                  <input value={item.icon || ''} onChange={(e) => patchQuickLink(item.id, 'icon', e.target.value)} className="input-admin" />
                  <input value={item.textAr || ''} onChange={(e) => patchQuickLink(item.id, 'textAr', e.target.value)} className="input-admin" />
                  <input value={item.textEn || ''} onChange={(e) => patchQuickLink(item.id, 'textEn', e.target.value)} className="input-admin" />
                  <select value={item.type || 'callback'} onChange={(e) => patchQuickLink(item.id, 'type', e.target.value)} className="input-admin">
                    <option value="callback">callback</option>
                    <option value="webapp">webapp</option>
                    <option value="url">url</option>
                  </select>
                  <input value={item.value || ''} onChange={(e) => patchQuickLink(item.id, 'value', e.target.value)} className="input-admin" />
                  <input type="number" min="1" value={item.row || 1} onChange={(e) => patchQuickLink(item.id, 'row', Number(e.target.value) || 1)} className="input-admin" />
                  <select value={item.visibility || 'all'} onChange={(e) => patchQuickLink(item.id, 'visibility', e.target.value)} className="input-admin">
                    <option value="all">للجميع</option>
                    <option value="admin">للإدارة فقط</option>
                  </select>
                  <select value={item.style || ''} onChange={(e) => patchQuickLink(item.id, 'style', e.target.value)} className="input-admin">
                    <option value="">عادي</option>
                    <option value="primary">🔵 أزرق</option>
                    <option value="success">🟢 أخضر</option>
                    <option value="danger">🔴 أحمر</option>
                  </select>
                </div>
              </div>
            ))}
            {!quickLinks.length && <p className="text-xs text-muted">لا توجد أزرار معرفة حالياً.</p>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-[11px] text-muted leading-6">
            <p className="font-bold text-white mb-2">ملاحظات سريعة</p>
            <ul className="space-y-1">
              <li>• استخدم <span className="text-neon">callback</span> للقيم الداخلية مثل: <code>shop</code> أو <code>profile</code>.</li>
              <li>• استخدم <span className="text-neon">webapp</span> لصفحات مثل <code>/customer</code> أو <code>/admin#orders</code>.</li>
              <li>• استخدم <span className="text-neon">url</span> للروابط الخارجية، ويمكنك الاستفادة من <code>{'{support}'}</code> و <code>{'{channel}'}</code>.</li>
              <li>• <span className="text-green-400 font-bold">🟢 أخضر</span> للأفعال الإيجابية (شراء، رصيد، مفاتيحي)</li>
              <li>• <span className="text-sky-400 font-bold">🔵 أزرق</span> للتنقل الرئيسي (المتجر، الأقسام، فتح المتجر)</li>
              <li>• <span className="text-red-400 font-bold">🔴 أحمر</span> للأفعال التحذيرية (حذف، رجوع، دعم)</li>
            </ul>
          </div>
        </motion.div>
      )}

      {activeTab === 'messages' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="admin-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-white text-sm">💬 الرسائل العامة</h3>
              <p className="text-muted text-[11px] mt-1">رسالة الترحيب، الصيانة، وعناصر واجهة المتجر.</p>
            </div>
            <button onClick={() => handleSave('messages', messageKeys)} className="neon-btn text-xs px-3 py-1.5">
              {savingKey === 'messages' ? '⏳...' : '💾 حفظ'}
            </button>
          </div>

          <Field label="رسالة الترحيب" type="textarea" value={settings.welcome_message || ''} onChange={(v) => update('welcome_message', v)} />
          <Field label="رسالة الصيانة" type="textarea" value={settings.maintenance_message || ''} onChange={(v) => update('maintenance_message', v)} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="عنوان المتجر" value={settings.shop_title || ''} onChange={(v) => update('shop_title', v)} />
            <Field label="وصف المتجر" value={settings.shop_description || ''} onChange={(v) => update('shop_description', v)} />
          </div>
          <Field label="نص التذييل" value={settings.footer_text || ''} onChange={(v) => update('footer_text', v)} />
        </motion.div>
      )}

      {activeTab === 'payments' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="admin-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-white text-sm">💳 إعدادات الدفع</h3>
              <p className="text-muted text-[11px] mt-1">بينانس، محفظة USDT، الحد الأدنى، ومهلة الدفع.</p>
            </div>
            <button onClick={() => handleSave('payments', paymentKeys)} className="neon-btn text-xs px-3 py-1.5">
              {savingKey === 'payments' ? '⏳...' : '💾 حفظ'}
            </button>
          </div>

          {/* ⭐ Telegram Stars — price is decided by the admin here */}
          <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white flex items-center gap-2">⭐ الدفع بنجوم تيليجرام <span className="text-[9px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/25">XTR</span></p>
                <p className="text-[11px] text-muted mt-1">يشتري العميل بالنجوم مباشرة داخل تيليجرام، والمفاتيح تصله تلقائياً فور الدفع.</p>
              </div>
              <button onClick={() => update('stars_enabled', !(settings.stars_enabled))} className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${settings.stars_enabled ? 'bg-gold' : 'bg-border'}`} aria-label="تفعيل الدفع بالنجوم">
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.stars_enabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-[220px_1fr] items-end">
              <div>
                <label className="text-xs text-muted font-semibold block mb-1.5">سعر النجمة — كم نجمة تعادل 1 دولار؟</label>
                <input
                  type="number" min="1" step="1"
                  value={settings.stars_per_usd ?? 50}
                  onChange={(e) => update('stars_per_usd', Math.max(1, Number(e.target.value) || 1))}
                  className="input-admin" dir="ltr" placeholder="50"
                />
              </div>
              <div className="rounded-xl bg-bg/80 border border-gold/20 p-3 text-[11px] text-white leading-6">
                <p className="font-bold text-gold mb-1">معاينة الأسعار:</p>
                <p>منتج بـ $1 = <b className="text-gold">{Math.max(1, Math.ceil((Number(settings.stars_per_usd) || 50) * 1))} ⭐</b> · منتج بـ $5 = <b className="text-gold">{Math.max(1, Math.ceil((Number(settings.stars_per_usd) || 50) * 5))} ⭐</b> · منتج بـ $10 = <b className="text-gold">{Math.max(1, Math.ceil((Number(settings.stars_per_usd) || 50) * 10))} ⭐</b></p>
                <p className="text-muted mt-1">غيّر الرقم ثم اضغط «حفظ» — ينعكس فوراً على زر الدفع في المتجر.</p>
              </div>
            </div>
          </div>

          {/* 🎁 Balance-for-offers — customers contact support directly */}
          <div className="rounded-2xl border border-neon/25 bg-gradient-to-br from-neon/10 to-transparent p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white flex items-center gap-2">🎁 رصيد مقابل عروض <span className="text-[9px] px-2 py-0.5 rounded-full bg-neon/15 text-neon border border-neon/25">الدعم نفسه</span></p>
                <p className="text-[11px] text-muted mt-1">زر يظهر للعملاء في صفحة الدفع وقائمة شحن الرصيد: يبيع العميل مفاتيح أو حسابات ألعاب مقابل رصيد، والمحادثة تذهب مباشرة إلى يوزر الدعم.</p>
              </div>
              <button onClick={() => update('balance_offers_enabled', !(settings.balance_offers_enabled !== false && String(settings.balance_offers_enabled) !== 'false'))} className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${settings.balance_offers_enabled !== false && String(settings.balance_offers_enabled) !== 'false' ? 'bg-neon' : 'bg-border'}`} aria-label="تفعيل زر العروض">
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.balance_offers_enabled !== false && String(settings.balance_offers_enabled) !== 'false' ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="نص الزر العربي" value={settings.balance_offers_note_ar || ''} onChange={(v) => update('balance_offers_note_ar', v)} placeholder="رصيد مقابل عروض — تواصل مع الدعم" />
              <Field label="نص الزر الإنجليزي" value={settings.balance_offers_note_en || ''} onChange={(v) => update('balance_offers_note_en', v)} placeholder="Balance for offers — contact support" />
            </div>
            <p className="text-[10px] text-muted">المحادثة تُفتح على يوزر الدعم ({settings.support_username ? `@${settings.support_username}` : 'حدده من تبويب الهوية'}).</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SecretField label="Binance API Key" value={settings.binance_api_key || ''} onChange={(v) => update('binance_api_key', v)} visible={showSecrets.binance_api_key} onToggle={() => setShowSecrets((s) => ({ ...s, binance_api_key: !s.binance_api_key }))} />
            <SecretField label="Binance Secret Key" value={settings.binance_secret_key || ''} onChange={(v) => update('binance_secret_key', v)} visible={showSecrets.binance_secret_key} onToggle={() => setShowSecrets((s) => ({ ...s, binance_secret_key: !s.binance_secret_key }))} />
            <Field label="Binance Merchant ID" value={settings.binance_merchant_id || ''} onChange={(v) => update('binance_merchant_id', v)} />
            <Field label="محفظة USDT TRC20" value={settings.usdt_wallet_trc20 || ''} onChange={(v) => update('usdt_wallet_trc20', v)} />
            <Field label="الحد الأدنى للإيداع" type="number" value={settings.min_deposit ?? ''} onChange={(v) => update('min_deposit', Number(v))} />
            <Field label="مهلة الدفع بالدقائق" type="number" value={settings.payment_timeout_minutes ?? ''} onChange={(v) => update('payment_timeout_minutes', Number(v))} />
          </div>
        </motion.div>
      )}

      {activeTab === 'premium' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="admin-card space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-black text-white text-sm">✨ الإيموجي البريميوم</h3>
              <p className="text-muted text-[11px] mt-1">كل الإيموجيات العادية التي يستخدمها البوت — ضع ID الإيموجي البريميوم بجانبها وستتحول فوراً لإيموجيات متحركة.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={testEmojis} className="purple-btn text-xs px-3 py-1.5">📩 معاينة في البوت</button>
              <button onClick={saveEmojis} className="neon-btn text-xs px-3 py-1.5">{emojiSaving ? '⏳...' : '💾 حفظ'}</button>
            </div>
          </div>

          <div className="bg-bg border border-border rounded-2xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">حالة الإيموجي البريميوم</p>
              <p className="text-[11px] text-muted mt-0.5">{emojiEnabled ? 'مفعّل — البوت يرسم الإيموجيات ببريميوم' : 'معطّل — البوت يستخدم الإيموجي العادي'}</p>
            </div>
            <button onClick={() => setEmojiEnabled((v) => !v)} className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${emojiEnabled ? 'bg-gold' : 'bg-border'}`} aria-label="تفعيل الإيموجي البريميوم">
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${emojiEnabled ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="rounded-2xl border border-gold/20 bg-gold/5 p-3 text-[11px] leading-6 text-white">
            <p className="font-bold text-gold">كيف أجلب الـ ID؟</p>
            <p>1. أنشئ حزمة إيموجي من بوت <b dir="ltr">@Stickers</b> عبر الأمر <b dir="ltr">/newemojipack</b>.</p>
            <p>2. أرسل أي إيموجي من حزمتك لبوت <b dir="ltr">@getmyid_bot</b> (أو فعّل «عرض الـ ID» في بعض البوتات) وانسخ الرقم.</p>
            <p>3. الصق الرقم هنا واحفظ — يعمل مباشرة بدون إعادة تشغيل. الحقول الفارغة تبقي الإيموجي الافتراضي.</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted font-bold">القائمة الكاملة ({emojiRows.length})</p>
            <p className="text-[11px] text-gold font-bold">{emojiRows.filter((r) => String(r.input || '').trim()).length} مخصص</p>
          </div>

          <div className="emoji-catalog max-h-[420px] overflow-y-auto pl-1">
            {emojiRows.map((row) => (
              <div key={row.key} className={`emoji-catalog__row ${String(row.input || '').trim() ? 'is-set' : ''}`}>
                <span className="emoji-catalog__glyph" title={row.unicode}>{row.unicode}</span>
                <span className="emoji-catalog__name">{row.key}</span>
                <input
                  className="emoji-catalog__input input-admin"
                  placeholder={row.defaultId || 'ID البريميوم…'}
                  value={row.input}
                  inputMode="numeric"
                  onChange={(e) => setEmojiRows((rows) => rows.map((r) => r.key === row.key ? { ...r, input: e.target.value.replace(/[^0-9]/g, '') } : r))}
                />
              </div>
            ))}
            {!emojiRows.length && <p className="text-xs text-muted">جاري تحميل القائمة…</p>}
          </div>
        </motion.div>
      )}

      {activeTab === 'system' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="admin-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-white text-sm">⚙️ النظام والإشعارات</h3>
              <p className="text-muted text-[11px] mt-1">تبديل السلوك العام وإشعارات الإدارة والانضمام للقناة.</p>
            </div>
            <button onClick={() => handleSave('system', systemKeys)} className="neon-btn text-xs px-3 py-1.5">
              {savingKey === 'system' ? '⏳...' : '💾 حفظ'}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="مكافأة الإحالة" type="number" value={settings.referral_bonus ?? ''} onChange={(v) => update('referral_bonus', Number(v))} />
            <Field label="معرف القناة" value={settings.channel_id || ''} onChange={(v) => update('channel_id', v)} />
          </div>

          <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">🔧 وضع الصيانة</p>
                <p className="text-[11px] text-muted mt-0.5">عند التفعيل يمنع المستخدمون العاديون من استخدام البوت</p>
              </div>
              <button onClick={() => update('maintenance_mode', !settings.maintenance_mode)} className={`w-12 h-6 rounded-full relative transition-colors ${settings.maintenance_mode ? 'bg-warning' : 'bg-border'}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.maintenance_mode ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <Field label="رسالة الصيانة" type="textarea" value={settings.maintenance_message || ''} onChange={(v) => update('maintenance_message', v)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Toggle label="التحقق التلقائي من بينانس" checked={!!settings.auto_verify_payments} onChange={() => update('auto_verify_payments', !settings.auto_verify_payments)} />
            <Toggle label="إشعار الأدمن عند الطلبات الجديدة" checked={!!settings.admin_notification_on_order} onChange={() => update('admin_notification_on_order', !settings.admin_notification_on_order)} />
            <Toggle label="إشعار الأدمن عند إثبات الدفع" checked={!!settings.admin_notification_on_payment} onChange={() => update('admin_notification_on_payment', !settings.admin_notification_on_payment)} />
            <Toggle label="إجبار الانضمام للقناة" checked={!!settings.force_join_channel} onChange={() => update('force_join_channel', !settings.force_join_channel)} />
          </div>
        </motion.div>
      )}
      {/* 📌 زر الحفظ الاحتياطي — عائم دائماً، يحل مشكلة الوصول لأزرار الحفظ من الهاتف */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="admin-floating-save">
        <span>💾 حفظ سريع دون البحث عن أزرار الحفظ الصغيرة — يشمل كل التبويبات</span>
        <button type="button" onClick={saveAll} disabled={savingAll} className="success-btn">
          {savingAll ? '⏳ يُحفظ…' : '💾 حفظ الكل'}
        </button>
      </motion.div>
      <div className="h-16" aria-hidden="true" />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-xs text-muted font-semibold block mb-1.5">{label}</label>
      {type === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || label} rows={4} className="input-admin resize-none" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || label} className="input-admin" />
      )}
    </div>
  );
}

function SecretField({ label, value, onChange, visible, onToggle }) {
  return (
    <div>
      <label className="text-xs text-muted font-semibold block mb-1.5">{label}</label>
      <div className="relative">
        <input type={visible ? 'text' : 'password'} value={value === '***hidden***' ? '' : value} onChange={(e) => onChange(e.target.value)} placeholder={label} className="input-admin" />
        <button onClick={onToggle} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">{visible ? '🙈' : '👁'}</button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="bg-bg border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-[11px] text-muted mt-1">{checked ? 'مفعّل حالياً' : 'معطّل حالياً'}</p>
      </div>
      <button onClick={onChange} className={`w-12 h-6 rounded-full relative transition-colors ${checked ? 'bg-neon' : 'bg-border'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );
}
