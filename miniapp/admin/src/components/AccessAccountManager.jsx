import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Sheet, { SheetActions } from './Sheet';

const LANGUAGES = [['ar','العربية'],['en','English'],['fr','Français'],['es','Español'],['de','Deutsch'],['tr','Türkçe'],['ru','Русский'],['ur','اردو'],['hi','हिन्दी'],['id','Indonesia'],['pt','Português'],['zh','中文']];
const initialCreate = { firstName:'', lastName:'', accessUsername:'', password:'', phone:'', balance:0, preferredLanguage:'ar', accessEnabled:true, accessExpiresAt:'', accessSessionDays:7, adminNotes:'' };
const randomPassword = () => {
  const bytes = new Uint32Array(4); window.crypto.getRandomValues(bytes);
  return `Gs!${Array.from(bytes, (n) => n.toString(36)).join('').slice(0, 13)}A7`;
};

export function CreateAccessAccount({ open, onClose, onCreated }) {
  const [form, setForm] = useState(initialCreate);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const close = () => { setForm(initialCreate); setCreated(null); onClose(); };
  const submit = async () => {
    if (!form.firstName.trim() || !form.accessUsername.trim()) return toast.error('الاسم واسم الدخول مطلوبان');
    setBusy(true);
    try {
      const response = await api.post('/admin/users/access-account', form);
      setCreated(response.data.credentials);
      toast.success('تم إنشاء حساب الدخول بنجاح');
      onCreated?.(response.data.data);
    } catch (error) { toast.error(error.response?.data?.error || 'تعذر إنشاء الحساب'); }
    setBusy(false);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(`Username: ${created.username}\nPassword: ${created.password}`);
    toast.success('تم نسخ بيانات الدخول');
  };
  return <Sheet open={open} onClose={close} title="🔐 إنشاء Login جديد" footer={created ? <SheetActions saveLabel="تم" onSave={close} /> : <SheetActions saveLabel="إنشاء الحساب" onSave={submit} saving={busy} onCancel={close} />}>
    {created ? <div className="space-y-3">
      <div className="rounded-2xl border border-green/30 bg-green/5 p-4 text-center"><p className="text-green font-black mb-1">تم إنشاء الحساب</p><p className="text-[11px] text-muted">تظهر كلمة المرور هذه الآن فقط. انسخها وأرسلها للمستخدم بشكل آمن.</p></div>
      <div className="rounded-xl border border-border bg-bg p-3" dir="ltr"><p className="text-[10px] text-muted">USERNAME</p><p className="font-mono text-white font-bold select-all">{created.username}</p></div>
      <div className="rounded-xl border border-border bg-bg p-3" dir="ltr"><p className="text-[10px] text-muted">PASSWORD</p><p className="font-mono text-neon font-bold select-all break-all">{created.password}</p></div>
      <button type="button" onClick={copy} className="neon-btn w-full py-3">📋 نسخ بيانات الدخول</button>
    </div> : <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2"><input className="input-admin" placeholder="الاسم الأول *" value={form.firstName} onChange={(e)=>set('firstName',e.target.value)} /><input className="input-admin" placeholder="اسم العائلة" value={form.lastName} onChange={(e)=>set('lastName',e.target.value)} /></div>
      <div><label className="label-admin">اسم الدخول *</label><input className="input-admin mt-1" dir="ltr" autoCapitalize="none" placeholder="player.name" value={form.accessUsername} onChange={(e)=>set('accessUsername',e.target.value.toLowerCase())} /><p className="text-[10px] text-muted mt-1">4-32 حرفاً إنجليزياً، ويسمح بالنقطة والشرطة و _</p></div>
      <div><div className="flex justify-between items-center"><label className="label-admin">كلمة المرور</label><button type="button" onClick={()=>set('password',randomPassword())} className="text-[10px] text-neon">توليد قوية</button></div><input className="input-admin mt-1" dir="ltr" placeholder="تُولّد تلقائياً إن تركتها فارغة" value={form.password} onChange={(e)=>set('password',e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2"><div><label className="label-admin">الهاتف</label><input className="input-admin mt-1" dir="ltr" value={form.phone} onChange={(e)=>set('phone',e.target.value)} /></div><div><label className="label-admin">الميزانية الأولية — تضاف مباشرة</label><input type="number" min="0" className="input-admin mt-1" dir="ltr" value={form.balance} onChange={(e)=>set('balance',e.target.value)} /></div></div>
      <div className="grid grid-cols-2 gap-2"><div><label className="label-admin">اللغة</label><select className="input-admin mt-1" value={form.preferredLanguage} onChange={(e)=>set('preferredLanguage',e.target.value)}>{LANGUAGES.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select></div><div><label className="label-admin">مدة الجلسة بالأيام</label><input type="number" min="1" max="30" className="input-admin mt-1" dir="ltr" value={form.accessSessionDays} onChange={(e)=>set('accessSessionDays',e.target.value)} /></div></div>
      <div><label className="label-admin">انتهاء صلاحية الحساب (اختياري)</label><input type="datetime-local" className="input-admin mt-1" dir="ltr" value={form.accessExpiresAt} onChange={(e)=>set('accessExpiresAt',e.target.value)} /></div>
      <button type="button" onClick={()=>set('accessEnabled',!form.accessEnabled)} className="w-full rounded-xl border border-border bg-bg p-3 flex justify-between"><span className="text-sm font-bold">السماح بالدخول فوراً</span><span className={form.accessEnabled?'text-green':'text-red'}>{form.accessEnabled?'مفعّل':'معطّل'}</span></button>
      <textarea className="input-admin resize-none" rows="3" maxLength="1000" placeholder="ملاحظات الإدارة الخاصة" value={form.adminNotes} onChange={(e)=>set('adminNotes',e.target.value)} />
    </div>}
  </Sheet>;
}

export function AccessControlCard({ user, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});
  useEffect(() => { setForm({ accessUsername:user?.accessUsername||'', password:'', accessEnabled:user?.accessEnabled===true, accessExpiresAt:user?.accessExpiresAt?new Date(user.accessExpiresAt).toISOString().slice(0,16):'', accessSessionDays:user?.accessSessionDays||7, revokeSessions:false }); }, [user]);
  if (!user) return null;
  const save = async () => {
    setBusy(true);
    try { const r=await api.patch(`/admin/users/${user.telegramId}/access`,form); toast.success('تم حفظ صلاحيات الدخول'); onUpdated?.(r.data.data); setOpen(false); }
    catch(error){ toast.error(error.response?.data?.error||'فشل الحفظ'); }
    setBusy(false);
  };
  const active = user.accessEnabled && (!user.accessExpiresAt || new Date(user.accessExpiresAt)>new Date());
  return <>
    <div className="admin-card space-y-2 border-neon/20">
      <div className="flex justify-between items-center"><div><p className="font-bold text-white text-sm">🔐 دخول المتجر</p><p className="text-[10px] text-muted" dir="ltr">{user.accessUsername||'لم يتم إنشاء Login'}</p></div><span className={`text-[10px] font-bold ${active?'text-green':'text-red'}`}>{active?'● مفعّل':'● معطّل'}</span></div>
      <div className="grid grid-cols-2 gap-2"><div className="bg-bg rounded-xl p-2"><p className="text-[9px] text-muted">آخر دخول</p><p className="text-xs text-white">{user.accessLastLoginAt?new Date(user.accessLastLoginAt).toLocaleString('ar-IQ-u-nu-latn'):'—'}</p></div><div className="bg-bg rounded-xl p-2"><p className="text-[9px] text-muted">انتهاء الحساب</p><p className="text-xs text-white">{user.accessExpiresAt?new Date(user.accessExpiresAt).toLocaleDateString('ar-IQ-u-nu-latn'):'بلا انتهاء'}</p></div></div>
      <button type="button" onClick={()=>setOpen(true)} className="neon-btn w-full py-2 text-xs">إدارة Login وكلمة المرور والجلسات</button>
    </div>
    <Sheet open={open} onClose={()=>setOpen(false)} title="🔐 التحكم بالدخول" footer={<SheetActions saveLabel="حفظ التحكم" onSave={save} saving={busy} onCancel={()=>setOpen(false)} />}>
      <div className="space-y-3">
        <div><label className="label-admin">اسم الدخول</label><input className="input-admin mt-1" dir="ltr" value={form.accessUsername||''} onChange={(e)=>setForm({...form,accessUsername:e.target.value.toLowerCase()})} /></div>
        <div><label className="label-admin">كلمة مرور جديدة (اختياري)</label><input className="input-admin mt-1" dir="ltr" value={form.password||''} onChange={(e)=>setForm({...form,password:e.target.value})} placeholder="10 أحرف على الأقل" /></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="label-admin">انتهاء الحساب</label><input type="datetime-local" className="input-admin mt-1" dir="ltr" value={form.accessExpiresAt||''} onChange={(e)=>setForm({...form,accessExpiresAt:e.target.value})} /></div><div><label className="label-admin">مدة الجلسة</label><input type="number" min="1" max="30" className="input-admin mt-1" dir="ltr" value={form.accessSessionDays||7} onChange={(e)=>setForm({...form,accessSessionDays:e.target.value})} /></div></div>
        <button type="button" onClick={()=>setForm({...form,accessEnabled:!form.accessEnabled})} className="w-full rounded-xl border border-border bg-bg p-3 flex justify-between"><span className="text-sm font-bold">السماح بالدخول</span><span className={form.accessEnabled?'text-green':'text-red'}>{form.accessEnabled?'مفعّل':'معطّل'}</span></button>
        <button type="button" onClick={()=>setForm({...form,revokeSessions:!form.revokeSessions})} className={`w-full rounded-xl border p-3 text-sm font-bold ${form.revokeSessions?'border-red/40 bg-red/10 text-red':'border-border bg-bg text-muted'}`}>قطع كل الجلسات المفتوحة {form.revokeSessions?'✓':''}</button>
      </div>
    </Sheet>
  </>;
}
