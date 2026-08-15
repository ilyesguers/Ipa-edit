import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import useStore from '../store/useStore';
import PremiumIcon from './PremiumIcon';

export default function WalletTopupSheet({ open, onClose }) {
  const { locale, setUser, user } = useStore();
  const ar = locale === 'ar';
  const [config, setConfig] = useState(null);
  const [amount, setAmount] = useState('10');
  const [method, setMethod] = useState('telegram_stars');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (!open) return;
    api.get('/wallet/config').then((r) => {
      setConfig(r.data.data);
      const first = r.data.data?.stars?.enabled ? 'telegram_stars' : r.data.data?.usdt?.enabled ? 'usdt' : 'paypal';
      setMethod(first);
    }).catch(() => toast.error(ar ? 'تعذر تحميل طرق الدفع' : 'Could not load payment methods'));
  }, [open]);

  const stars = useMemo(() => Math.ceil(Number(amount || 0) * Number(config?.stars?.perUsd || 50)), [amount, config]);
  if (!open) return null;
  const refreshBalance = async () => {
    const r = await api.get('/auth/me');
    setUser({ ...user, ...r.data.user });
  };
  const poll = async (id) => {
    for (let index = 0; index < 15; index += 1) {
      const r = await api.get(`/wallet/${id}`);
      if (r.data.data.status === 'completed') { await refreshBalance(); toast.success(ar ? 'تمت إضافة الرصيد إلى حسابك' : 'Balance added to your account'); onClose(); return true; }
      await new Promise((resolve) => setTimeout(resolve, 1300));
    }
    return false;
  };
  const start = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < Number(config?.minDeposit || 1) || value > 10000) return toast.error(ar ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount');
    setBusy(true);
    try {
      if (method === 'telegram_stars') {
        const r = await api.post('/wallet/stars', { amount: value });
        const data = r.data.data;
        const tg = window.Telegram?.WebApp;
        if (tg?.openInvoice) {
          tg.openInvoice(data.invoiceUrl, async (status) => { if (status === 'paid') await poll(data.topupId); else setBusy(false); });
          return;
        }
        window.open(data.invoiceUrl, '_blank', 'noopener,noreferrer');
        setPending({ ...data, method, external: true });
      } else {
        const r = await api.post('/wallet/manual', { amount: value, method });
        setPending(r.data.data);
        if (method === 'paypal' && r.data.data.paymentUrl) window.open(r.data.data.paymentUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) { toast.error(error.response?.data?.error || (ar ? 'تعذر إنشاء عملية الشحن' : 'Could not create top-up')); }
    setBusy(false);
  };
  const submitProof = async () => {
    if (!reference.trim()) return toast.error(ar ? 'أدخل رقم العملية' : 'Enter transaction reference');
    setBusy(true);
    try { await api.post(`/wallet/${pending.topupId}/proof`, { reference }); toast.success(ar ? 'تم إرسال العملية للمراجعة' : 'Payment sent for review'); onClose(); }
    catch (error) { toast.error(error.response?.data?.error || 'Error'); }
    setBusy(false);
  };
  const copy = (value) => navigator.clipboard.writeText(value).then(() => toast.success(ar ? 'تم النسخ' : 'Copied'));

  return <div className="topup-overlay" role="dialog" aria-modal="true">
    <button className="topup-overlay__backdrop" onClick={onClose} aria-label="close" />
    <section className="topup-sheet">
      <header><div><p>{ar ? 'محفظتك' : 'Your wallet'}</p><h2>{ar ? 'إضافة ميزانية للحساب' : 'Add account balance'}</h2></div><button onClick={onClose}>✕</button></header>
      {!pending ? <div className="topup-sheet__body">
        <div className="topup-balance"><PremiumIcon name="wallet" size="1.4rem" /><span>{ar ? 'الرصيد الحالي' : 'Current balance'}</span><strong>${Number(user?.balance || 0).toFixed(2)}</strong></div>
        <label className="topup-amount"><span>{ar ? 'الميزانية التي تريد إضافتها' : 'Balance to add'}</span><div><b>$</b><input type="number" min={config?.minDeposit || 1} max="10000" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" /></div></label>
        <div className="topup-presets">{[5,10,25,50,100].map((value)=><button key={value} onClick={()=>setAmount(String(value))} className={Number(amount)===value?'is-active':''}>${value}</button>)}</div>
        <p className="topup-label">{ar ? 'اختر طريقة الدفع' : 'Choose payment method'}</p>
        <div className="topup-methods">
          {config?.stars?.enabled && <button className={method==='telegram_stars'?'is-active':''} onClick={()=>setMethod('telegram_stars')}><b>⭐</b><span>Telegram Stars<small>{stars} ⭐</small></span><i>✓</i></button>}
          {config?.usdt?.enabled && <button className={method==='usdt'?'is-active':''} onClick={()=>setMethod('usdt')}><b>₮</b><span>USDT<small>TRC20 / Binance</small></span><i>✓</i></button>}
          {config?.paypal?.enabled && <button className={method==='paypal'?'is-active':''} onClick={()=>setMethod('paypal')}><b>Pay</b><span>PayPal<small>{ar?'مراجعة سريعة':'Quick review'}</small></span><i>✓</i></button>}
        </div>
        <button className="topup-submit" disabled={busy||!config} onClick={start}>{busy ? (ar?'جاري التجهيز…':'Preparing…') : `${ar?'متابعة الدفع وإضافة':'Continue and add'} $${Number(amount||0).toFixed(2)}`}</button>
        <p className="topup-secure"><PremiumIcon name="shield" /> {ar?'الدفع محمي ولن تضاف الميزانية مرتين':'Protected payment with duplicate-credit prevention'}</p>
      </div> : <div className="topup-sheet__body">
        <div className="topup-created"><PremiumIcon name="checkmark" size="1.5rem" /><h3>{ar?'تم إنشاء طلب الشحن':'Top-up created'}</h3><code>{pending.topupNumber}</code><strong>${Number(pending.amount).toFixed(2)}</strong></div>
        {pending.method==='usdt' && <div className="topup-instructions"><p>{ar?'أرسل المبلغ عبر USDT ثم أدخل TxHash':'Send USDT then enter the TxHash'}</p>{pending.usdt?.wallet && <div><code dir="ltr">{pending.usdt.wallet}</code><button onClick={()=>copy(pending.usdt.wallet)}>نسخ</button></div>}{pending.usdt?.binanceId && <div><code dir="ltr">Binance ID: {pending.usdt.binanceId}</code><button onClick={()=>copy(pending.usdt.binanceId)}>نسخ</button></div>}</div>}
        {pending.method==='paypal' && <a className="topup-pay-link" href={pending.paymentUrl} target="_blank" rel="noreferrer">{ar?'فتح PayPal للدفع':'Open PayPal to pay'} ↗</a>}
        {pending.external ? <><p className="topup-wait">{ar?'بعد إتمام الدفع بالنجوم اضغط التحقق':'After paying with Stars, check the payment'}</p><button className="topup-submit" onClick={()=>poll(pending.topupId)}>{ar?'التحقق وإضافة الرصيد':'Check and add balance'}</button></> : <><label className="topup-amount"><span>{ar?'رقم العملية / TxHash':'Transaction ID / TxHash'}</span><div><input value={reference} onChange={(e)=>setReference(e.target.value)} dir="ltr" placeholder="Transaction reference" /></div></label><button className="topup-submit" disabled={busy} onClick={submitProof}>{ar?'إرسال للمراجعة':'Submit for review'}</button></>}
      </div>}
    </section>
  </div>;
}
