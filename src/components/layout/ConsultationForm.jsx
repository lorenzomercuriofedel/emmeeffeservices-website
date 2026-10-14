'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './ConsultationForm.module.css';

export default function ConsultationForm() {
  const t = useTranslations('consultationForm');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  return <form className={styles.form} onSubmit={async event => {
    event.preventDefault();
    const element = event.currentTarget;
    const data = new FormData(element);
    setBusy(true); setStatus(''); setError(false);
    try {
      const response = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'access_request', service: data.get('service'), name: data.get('name'), email: data.get('email'), project_name: data.get('project_name'), description: data.get('description'), privacy_acknowledged: data.get('privacy_acknowledged') === 'on' }) });
      const result = await response.json();
      if (!response.ok || result.request_sent !== true) throw new Error();
      element.reset(); setStatus(t('sent'));
    } catch { setError(true); setStatus(t('error')); }
    finally { setBusy(false); }
  }}>
    <fieldset disabled={busy}>
      <label>{t('service')}<select name="service" defaultValue="" required><option value="" disabled>{t('choose')}</option><option value="weather">{t('weather')}</option><option value="data">{t('data')}</option><option value="land">{t('land')}</option></select></label>
      <label>{t('name')}<input name="name" autoComplete="name" required maxLength={255} /></label>
      <label>{t('email')}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>{t('projectName')}<input name="project_name" maxLength={255} /></label>
      <label>{t('message')}<textarea name="description" rows={6} required maxLength={5000} /></label>
      <label className={styles.privacy}><input name="privacy_acknowledged" type="checkbox" required /><span>{t('privacy')} <a href="/privacy" target="_blank" rel="noopener noreferrer">{t('privacyLink')}</a></span></label>
      <button className="button" disabled={busy}>{t(busy ? 'sending' : 'send')}</button>
    </fieldset>
    {status && <p role={error ? 'alert' : 'status'} className={error ? styles.error : styles.success}>{status}</p>}
  </form>;
}
