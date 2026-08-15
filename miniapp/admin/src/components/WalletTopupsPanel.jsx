import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const METHOD = { telegram_stars: '⭐ Stars', usdt: '₮ USDT', paypal: 'PayPal' };
export default function WalletTopupsPanel() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState('');
  const load = () => api.get('/admin/wallet-topups?status=processing').then((r)=>setItems(r.data.data||[])).catch(()=>{});
  useEffect(load, []);
  const approve = async (id) => { setBusy(id); try { await api.post(`/admin/wallet-topups/${id}/approve`); toast.success('تمت إضافة الميزانية للحساب'); load(); } catch(e){toast.error(e.response?.data?.error||'فشل التأكيد');} setBusy(''); };
  const reject = async (id) => { const reason=prompt('سبب الرفض:','تعذر التحقق من عملية الدفع'); if(reason===null)return; setBusy(id); try{await api.post(`/admin/wallet-topups/${id}/reject`,{reason});toast.success('تم رفض الطلب');load();}catch(e){toast.error(e.response?.data?.error||'فشل الرفض');}setBusy(''); };
  return <section className="admin-card border-gold/20">
    <button type="button" onClick={()=>setOpen(!open)} className="w-full flex items-center justify-between text-right"><span><b className="text-white text-sm">💰 طلبات إضافة الميزانية</b><small className="block text-muted mt-0.5">عمليات USDT وPayPal بانتظار المراجعة</small></span><span className="rounded-full bg-gold/10 text-gold px-2 py-1 text-xs font-black">{items.length}</span></button>
    {open && <div className="space-y-2 mt-3">{items.map((item)=><div key={item._id} className="rounded-xl border border-border bg-bg p-3">
      <div className="flex justify-between gap-2"><div className="min-w-0"><p className="text-white text-xs font-black">@{item.username||item.user} · {item.topupNumber}</p><p className="text-[10px] text-muted" dir="ltr">{item.transactionReference}</p></div><div className="text-left"><strong className="text-green">${Number(item.amount).toFixed(2)}</strong><small className="block text-muted">{METHOD[item.method]||item.method}</small></div></div>
      <div className="grid grid-cols-2 gap-2 mt-2"><button disabled={busy===item._id} onClick={()=>approve(item._id)} className="success-btn py-2 rounded-lg text-xs font-bold">✅ تأكيد وإضافة</button><button disabled={busy===item._id} onClick={()=>reject(item._id)} className="danger-btn py-2 rounded-lg text-xs font-bold">❌ رفض</button></div>
    </div>)}{!items.length&&<p className="text-center text-muted text-xs py-3">لا توجد طلبات معلقة</p>}<button onClick={load} className="w-full text-[10px] text-neon">تحديث الطلبات</button></div>}
  </section>;
}
