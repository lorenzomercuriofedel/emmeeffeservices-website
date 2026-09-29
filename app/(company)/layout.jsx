import './company.css';

export const metadata = {
  metadataBase: new URL('https://emmeeffeservices.it'),
  title: 'Emme-Effe Services di Lorenzo Mercurio Fedel',
  description: 'Analisi di dati meteo-climatici, ambientali, catastali e storici. Analisi fondiarie, mappe e report. Emme-Effe Services di Lorenzo Mercurio Fedel, a Miola, Baselga di Piné, Trentino.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Emme-Effe Services di Lorenzo Mercurio Fedel — Dati e territorio',
    description: 'Competenze informatiche e conoscenza del territorio. Analisi dati e analisi fondiarie dal cuore del Trentino.',
    siteName: 'Emme-Effe Services di Lorenzo Mercurio Fedel',
    type: 'website', locale: 'it_IT', url: '/',
  },
};

export const viewport = { themeColor: '#224f8b' };

export default function CompanyLayout({ children }) {
  return <html lang="it"><body>{children}</body></html>;
}
