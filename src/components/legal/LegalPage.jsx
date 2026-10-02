import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
export default function LegalPage({ title, children }) {
  return <><Navbar /><main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', lineHeight: 1.75, color: '#17334b' }} lang="it"><h1 style={{ fontSize: 36, fontWeight: 700 }}>{title}</h1><p>Emme-Effe Services · Ultimo aggiornamento: 3 ottobre 2026</p><nav style={{ display: 'flex', gap: 24, margin: '20px 0' }}><a href="/privacy">Privacy Policy</a><a href="/cookie">Cookie Policy</a></nav>{children}</main><Footer /></>;
}
