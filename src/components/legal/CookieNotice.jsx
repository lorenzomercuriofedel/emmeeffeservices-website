'use client';
import { useEffect, useState } from 'react';
const VERSION = '2026-10-03';
export default function CookieNotice({ locale = 'it' }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { try { const value = JSON.parse(localStorage.getItem('emme_cookie_notice')); setVisible(value?.version !== VERSION || value.expires < Date.now()); } catch { setVisible(true); } }, []);
  const text = {
    it: ['Privacy e cookie', 'Utilizziamo cookie tecnici per accesso e lingua. Non attiviamo cookie pubblicitari o di profilazione. Consulta le informative per conoscere dati trattati, servizi esterni e diritti.', 'Ho capito', 'Privacy', 'Cookie'],
    en: ['Privacy and cookies', 'We use technical cookies for sign-in and language. We do not activate advertising or profiling cookies. Read our notices for details about personal data, external services and your rights.', 'Got it', 'Privacy', 'Cookies'],
    de: ['Datenschutz und Cookies', 'Wir verwenden technische Cookies für Anmeldung und Sprache, keine Werbe- oder Profiling-Cookies. Unsere Hinweise erläutern Datenverarbeitung, externe Dienste und Ihre Rechte.', 'Verstanden', 'Datenschutz', 'Cookies'],
  }[locale] || [];
  if (!visible) return null;
  return <aside aria-label={text[0]} style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 2000, maxWidth: 700, margin: '0 auto', padding: 22, background: '#fff', color: '#17334b', border: '1px solid #cbd5e1', borderRadius: 16, boxShadow: '0 8px 40px #0003', fontSize: 15, lineHeight: 1.5 }}><strong>{text[0]}</strong><p style={{ margin: '8px 0' }}>{text[1]}</p><div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}><a href="/privacy" style={{ textDecoration: 'underline' }}>{text[3]}</a><a href="/cookie" style={{ textDecoration: 'underline' }}>{text[4]}</a><button type="button" onClick={() => { try { localStorage.setItem('emme_cookie_notice', JSON.stringify({ version: VERSION, expires: Date.now() + 180 * 86400000 })); } catch {} setVisible(false); }} style={{ padding: '9px 16px', background: '#224f8b', color: '#fff', borderRadius: 8, cursor: 'pointer' }}>{text[2]}</button></div></aside>;
}
