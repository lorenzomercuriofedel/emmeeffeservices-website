'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/src/i18n/navigation';
import { safeLogoUrl } from '@/src/utils/customers';
import CustomerLogo from './CustomerLogo';

const input = 'w-full rounded-xl border border-sky-200 bg-white px-4 py-3 mt-2 text-ink focus:outline-2 focus:outline-sky-600';
const button = 'rounded-xl bg-sky-700 text-white px-5 py-3 font-semibold disabled:opacity-50';
function profile(customer) {
  return { name: customer.name ?? '', project_name: customer.project_name ?? '', email: customer.email ?? '', description: typeof customer.description === 'string' ? customer.description : customer.description?.it ?? '', project_type: customer.project_type ?? '', logo_url: customer.logo_url ?? '', web_public: [true, 1, '1', 'true'].includes(customer.web_public) };
}
export default function CustomerArea({ verificationToken = '' }) {
  const t = useTranslations('customerArea');
  const [customer, setCustomer] = useState(null);
  const [stations, setStations] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [consulting, setConsulting] = useState(false);
  const [verifyToken, setVerifyToken] = useState(verificationToken);
  const [resending, setResending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  async function api(method, body) {
    const response = await fetch('/api/customers', { method, cache: 'no-store', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    if (!response.ok) { const e = new Error(); e.status = response.status; throw e; }
    return response.json();
  }
  function accept(data) {
    if (!data.customer?.id) throw new Error('Invalid profile');
    setCustomer(data.customer); setForm(profile(data.customer)); setStations(data.stations ?? []);
  }
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('verify') || verificationToken;
    if (/^[a-f0-9]{64}$/.test(token)) {
      setVerifyToken(token);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [verificationToken]);
  useEffect(() => {
    let active = true;
    api('GET').then(data => { if (active) accept(data); }).catch(e => { if (active && e.status !== 401) setError(t('unavailable')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);
  async function perform(action) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (e) {
      if (e.status === 401 && customer) { setCustomer(null); setStations([]); setForm({}); setDeleting(false); setError(t('expired')); }
      else setError(t(e.status === 401 ? 'invalidLogin' : e.status === 403 ? 'verificationNeeded' : e.status === 409 ? 'emailExists' : e.status === 422 ? 'invalidFields' : e.status === 429 ? 'rateLimited' : 'unavailable'));
    } finally { setBusy(false); }
  }
  function change(event) { const { name, value, checked, type } = event.target; setForm(old => ({ ...old, [name]: type === 'checkbox' ? checked : value })); }
  return <div className="pb-16">
    <section className="bg-alpine px-4 py-12"><div className="max-w-5xl mx-auto"><p className="text-sky-100 uppercase tracking-widest text-xs mb-3">emme-effe meteo</p><h1 className="text-white text-3xl md:text-5xl font-extrabold">{t('title')}</h1><p className="text-sky-100 mt-4 max-w-xl">{t('intro')}</p></div></section>
    <div className="max-w-5xl mx-auto px-4 mt-8">
      {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4 mb-5">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 text-emerald-800 p-4 mb-5">{message}</p>}
      {verifyToken && <section className="max-w-md bg-white rounded-3xl p-6 border border-sky-100 mb-6"><h2 className="font-bold mb-3">{t('verifyEmail')}</h2><p className="text-sm mb-4">{t('verificationHelp')}</p><button className={button} disabled={busy} onClick={() => perform(async () => { accept(await api('POST', { action: 'verify_email', verification_token: verifyToken })); setVerifyToken(''); window.history.replaceState(null, '', window.location.pathname); setMessage(t('verified')); })}>{t('verifyEmail')}</button></section>}
      {!customer && resending && <form className="max-w-md mb-5 rounded-2xl border border-sky-200 p-4" onSubmit={event => { event.preventDefault(); perform(async () => { await api('POST', { action: 'resend_verification', email: pendingEmail }); setMessage(t('resendSent')); }); }}><label>{t('email')}<input className={input} type="email" required value={pendingEmail} onChange={event => setPendingEmail(event.target.value)} /></label><button className={`${button} mt-3`} disabled={busy}>{t('resendVerification')}</button></form>}
      {loading ? <p role="status">{t('loading')}</p> : !customer ? <form key={registering ? 'register' : 'login'} className="max-w-md bg-white rounded-3xl border border-sky-100 p-6 md:p-8 shadow-card" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (registering && data.get('password') !== data.get('confirm_password')) { setError(t('passwordMismatch')); return; }
        const payload = { action: registering ? 'register' : 'login', email: data.get('email'), password: data.get('password') };
        if (registering) {
          if (new TextEncoder().encode(payload.password).length > 72) { setError(t('passwordHelp')); return; }
          payload.privacy_acknowledged = data.get('privacy_acknowledged') === 'on'; payload.terms_accepted = data.get('terms_accepted') === 'on';
          payload.name = data.get('name'); payload.project_name = data.get('project_name'); payload.description = data.get('description');
        }
        perform(async () => { const response = await api('POST', payload); if (response.verification_required) { setPendingEmail(payload.email); setResending(true); setMessage(t('verificationSent')); setRegistering(false); } else { accept(response); setMessage(''); } });
      }}>
        <h2 className="text-xl font-bold mb-5">{t(registering ? 'register' : 'login')}</h2>
        <fieldset disabled={busy}>
          {registering && <>
            <label className="block mb-4">{t('name')}<input className={input} name="name" autoComplete="name" required maxLength={255} /></label>
            <label className="block mb-4">{t('projectName')}<input className={input} name="project_name" maxLength={255} /></label>
            <label className="block mb-4">{t('description')}<textarea className={input} name="description" maxLength={5000} rows={3} /></label>
          </>}
          <label className="block mb-4">{t('email')}<input className={input} name="email" type="email" autoComplete="username" required maxLength={254} /></label>
          <label className="block mb-4">{t('password')}<input className={input} name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 12 : undefined} maxLength={registering ? 72 : 1024} /></label>
          {registering && <><p className="text-sm text-ink-mute mb-4">{t('passwordHelp')}</p><label className="block mb-6">{t('confirmPassword')}<input className={input} name="confirm_password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label></>}
          {registering && <div className="text-sm space-y-4 my-5">
            <details className="rounded-xl bg-sky-50 p-4"><summary className="cursor-pointer font-semibold">{t('registrationNotice')}</summary><p className="mt-3 whitespace-pre-line">{t('privacySummary')}</p><p className="mt-3">{t('termsSummary')}</p><a className="block mt-3 underline" href="https://www.iubenda.com/privacy-policy/62711798" target="_blank" rel="noopener noreferrer">{t('privacyPolicy')}</a></details>
            <label className="flex gap-3 items-start"><input name="privacy_acknowledged" type="checkbox" required className="mt-1" /><span>{t('privacyAcknowledgement')} <a className="underline" href="https://www.iubenda.com/privacy-policy/62711798" target="_blank" rel="noopener noreferrer">{t('privacyPolicy')}</a></span></label>
            <label className="flex gap-3 items-start"><input name="terms_accepted" type="checkbox" required className="mt-1" /><span>{t('termsAcceptance')}</span></label>
          </div>}
          <button className={button}>{busy ? t('working') : t(registering ? 'register' : 'login')}</button>
        </fieldset>
        <button type="button" disabled={busy} className="block mt-5 text-sky-700 underline" onClick={() => { setRegistering(!registering); setError(''); setMessage(''); }}>{t(registering ? 'backToLogin' : 'createAccount')}</button>
        <button type="button" className="block mt-4 text-sky-700 underline" disabled={busy} onClick={event => { setResending(true); setPendingEmail(event.currentTarget.form?.elements.namedItem('email')?.value || ''); setMessage(t('resendHelp')); }}>{t('resendVerification')}</button>
        <p className="text-sm text-ink-mute mt-5">{t('accessHelp')} <span className="break-all">elaborazione@emmeeffeservices.it</span></p>
      </form> : <div className="grid md:grid-cols-[1fr_300px] gap-6">
        <form className="bg-white rounded-3xl border border-sky-100 p-6 md:p-8 shadow-card" onSubmit={event => { event.preventDefault(); if (form.logo_url && !safeLogoUrl(form.logo_url)) { setError(t('invalidLogo')); return; } perform(async () => { const payload = stations.length ? form : { name: form.name, email: form.email, project_name: form.project_name, description: form.description }; const result = await api('PATCH', payload); accept(result); setMessage(t(result.email_change_pending ? 'emailChangePending' : 'saved')); }); }}>
          <div className="flex items-center justify-between gap-3 mb-6"><h2 className="text-xl font-bold">{t('profile')}</h2><button type="button" className="text-sky-700 underline" disabled={busy} onClick={() => perform(async () => { await api('POST', { action: 'logout' }); setCustomer(null); setStations([]); setForm({}); setDeleting(false); })}>{t('logout')}</button></div>
          <fieldset disabled={busy} className="space-y-5">
            <label className="block">{t('name')}<input className={input} name="name" value={form.name} onChange={change} required maxLength={255} autoComplete="organization" /></label>
            <label className="block">{t('email')}<input className={input} name="email" type="email" value={form.email} onChange={change} required maxLength={254} autoComplete="email" /></label>
            <label className="block">{t('projectName')}<input className={input} name="project_name" value={form.project_name} onChange={change} maxLength={255} /></label>
            <label className="block">{t('description')}<textarea className={input} name="description" value={form.description} onChange={change} rows={4} maxLength={5000} /></label>
            {stations.length > 0 && <>
            <label className="block">{t('projectType')}<select className={input} name="project_type" value={form.project_type} onChange={change}><option value="">{t('unspecified')}</option>{['professional', 'hobby', 'other'].map(type => <option key={type} value={type}>{t(type)}</option>)}</select></label>
            <label className="block">{t('logo')}<input className={input} name="logo_url" type="url" value={form.logo_url} onChange={change} maxLength={2048} placeholder="https://…" /><span className="text-sm text-ink-mute block mt-2">{t('logoHelp')}</span></label>
            <label className="block">{t('uploadLogo')}<input className={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
              const element = event.currentTarget; const file = element.files?.[0]; if (!file) return;
              if (file.size > 2097152 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError(t('logoFileHelp')); element.value = ''; return; }
              perform(async () => { const body = new FormData(); body.set('logo', file); const response = await fetch('/api/customers/logo', { method: 'POST', body }); if (!response.ok) { const e = new Error(); e.status = response.status; throw e; } const data = await response.json(); setCustomer(data.customer); setForm(old => ({ ...old, logo_url: data.customer.logo_url })); element.value = ''; setMessage(t('logoUploaded')); });
            }} /><span className="text-sm text-ink-mute block mt-2">{t('logoFileHelp')}</span></label>
            <label className="flex gap-3 items-start"><input type="checkbox" className="mt-1" name="web_public" checked={form.web_public} onChange={change} /><span>{t('consent')}</span></label>
            </>}
            <button className={button}>{busy ? t('working') : t('save')}</button>
          </fieldset>
        </form>
        <aside className="space-y-6">
          <section className="bg-white rounded-3xl border border-sky-100 p-6">
            <h2 className="font-bold mb-4">{t('menu')}</h2>
            {!stations.length && <p className="text-sm text-ink-mute mb-4">{t('newAccountHelp')}</p>}
            <button type="button" className="text-sky-700 underline text-left" aria-expanded={consulting} disabled={busy} onClick={() => setConsulting(!consulting)}>{t('consultation')}</button>
            {consulting && <form className="mt-5" onSubmit={event => {
              event.preventDefault(); const element = event.currentTarget; const data = new FormData(element);
              perform(async () => { const response = await api('POST', { action: 'consultation', message: data.get('message') }); if (!response.consultation?.id) throw new Error(); setMessage(t('consultationSent', { id: response.consultation.id })); element.reset(); });
            }}><label className="block">{t('consultationMessage')}<textarea className={input} name="message" rows={5} required maxLength={5000} disabled={busy} /></label><p className="text-sm text-ink-mute mt-3">{t('consultationHelp')}</p><button className={`${button} mt-4`} disabled={busy}>{busy ? t('working') : t('requestConsultation')}</button></form>}
          </section>
          {stations.length > 0 && <>
          <section className="bg-white rounded-3xl border border-sky-100 p-6"><h2 className="font-bold mb-4">{t('preview')}</h2><div className="bg-alpine rounded-2xl p-4"><CustomerLogo customer={{ name: form.name, projectName: form.project_name, projectType: form.project_type, logoUrl: safeLogoUrl(form.logo_url) }} />{!safeLogoUrl(form.logo_url) && <p className="text-sky-100 text-sm">{t('noLogo')}</p>}</div></section>
          <section className="bg-white rounded-3xl border border-sky-100 p-6"><h2 className="font-bold mb-4">{t('stations')}</h2>{stations.length ? <ul className="space-y-3">{stations.map(station => <li key={station.id}><Link className="text-sky-700 underline" href={`/stazione/${encodeURIComponent(station.id)}`}>{station.nome}</Link></li>)}</ul> : <p className="text-sm text-ink-mute">{t('noStations')}</p>}</section>
          </>}
          <section className="rounded-3xl border border-red-200 p-6"><h2 className="font-bold mb-3">{t('deleteTitle')}</h2><p className="text-sm text-ink-mute mb-4">{t('deleteHelp')}</p>{!deleting ? <button disabled={busy} className="text-red-700 underline" onClick={() => setDeleting(true)}>{t('delete')}</button> : <form onSubmit={event => { event.preventDefault(); const password = new FormData(event.currentTarget).get('password'); perform(async () => { await api('DELETE', { password }); setCustomer(null); setStations([]); setForm({}); setDeleting(false); setMessage(t('deleted')); }); }}><label>{t('confirmPassword')}<input className={input} name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={busy} /></label><button className="mt-4 text-red-700 font-bold" disabled={busy}>{t('confirmDelete')}</button><button type="button" className="block mt-3 underline" disabled={busy} onClick={() => setDeleting(false)}>{t('cancel')}</button></form>}</section>
        </aside>
      </div>}
    </div>
  </div>;
}
