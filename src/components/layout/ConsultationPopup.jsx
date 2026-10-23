'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import styles from './ConsultationPopup.module.css';

export default function ConsultationPopup() {
  const t = useTranslations('consultationPopup');
  const company = useTranslations('company');
  const dialog = useRef(null);
  const previousOverflow = useRef('');

  function open() {
    previousOverflow.current = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
  }

  return <>
    <button type="button" className={`button services-consultation-button ${styles.trigger}`} onClick={open} aria-haspopup="dialog">
      {company('requestConsultation')}<span aria-hidden="true">→</span>
    </button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="consultation-title" aria-describedby="consultation-description"
      onClose={() => { document.body.style.overflow = previousOverflow.current; }}
      onClick={event => { if (event.target === event.currentTarget) dialog.current.close(); }}>
      <div className={styles.content}>
        <button type="button" className={styles.close} onClick={() => dialog.current.close()} aria-label={t('close')} autoFocus>×</button>
        <h2 id="consultation-title">{t('title')}</h2>
        <p id="consultation-description">{t('intro')}</p>
        <div className={styles.actions}>
          <a className={styles.email} href="mailto:info@emmeeffeservices.it"><span>{t('email')}</span><strong>info@emmeeffeservices.it</strong></a>
          <a className={`button ${styles.whatsapp}`} href="https://wa.me/393484605688" target="_blank" rel="noopener noreferrer">{company('whatsapp')}<span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </dialog>
  </>;
}
