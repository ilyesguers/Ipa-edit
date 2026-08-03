import React, { useState } from 'react';
import useStore from '../../store/useStore';
import { cleanMarkdown, t } from '../../i18n';
import PremiumIcon from '../PremiumIcon';

const FAQ_KEYS = [
  ['faqBuy', 'faqBuyA'],
  ['faqDelivery', 'faqDeliveryA'],
  ['faqPayment', 'faqPaymentA'],
  ['faqRefund', 'faqRefundA'],
  ['faqInvalid', 'faqInvalidA']
];

export default function SupportTab() {
  const [openFaq, setOpenFaq] = useState(null);
  const { publicSettings, locale } = useStore();
  const supportUsername = publicSettings?.support_username || 'support';
  const title = cleanMarkdown(publicSettings?.bot_name) || t(locale, 'support');
  const subtitle = cleanMarkdown(locale === 'ar'
    ? (publicSettings?.ui_footer_note_ar || t(locale, 'availableNow'))
    : (publicSettings?.ui_footer_note_en || t(locale, 'availableNow')));

  return (
    <div className="store-page space-y-5">
      <section className="support-intro">
        <PremiumIcon name="support" size="2rem" />
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noreferrer">
          <PremiumIcon name="chat" /> {t(locale, 'directContact')}
        </a>
      </section>

      <section>
        <div className="section-heading"><PremiumIcon name="help" /><h2>{t(locale, 'faq')}</h2></div>
        <div className="faq-list">
          {FAQ_KEYS.map(([question, answer], index) => {
            const open = openFaq === index;
            return (
              <article key={question} className="faq-list__item">
                <button type="button" onClick={() => setOpenFaq(open ? null : index)} aria-expanded={open}>
                  <span>{t(locale, question)}</span>
                  <PremiumIcon name={open ? 'down' : (locale === 'ar' ? 'left' : 'right')} />
                </button>
                {open && <p>{t(locale, answer)}</p>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
