import { getTranslations } from 'next-intl/server';
import { Link } from '@/src/i18n/navigation';

export default async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-sky-100/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/company/emme_effe__logouff.png"
                width="2172" height="724"
                alt="Emme-Effe Services di Lorenzo Mercurio Fedel"
                className="w-[210px] max-w-full h-auto bg-[#f5f7f9] p-2"
              />
            </div>
            <p className="text-sm leading-relaxed">
              {t('tagline')}
            </p>
            <Link href="/contatti" className="inline-flex items-center gap-1.5 mt-4 text-sun hover:text-sun-soft text-sm font-semibold transition-colors">
              {t('contactUs')}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <FooterCol title={t('partner')}>
            <div className="space-y-5">
              <a href="https://www.meteotrentinoaltoadige.it" target="_blank" rel="noopener noreferrer" className="block text-sm text-sky-100/60 hover:text-white transition-colors">
                Meteo Trentino Alto Adige
              </a>

              <a href="https://www.visittrento.it/it/servizi/sottovento-parapendio-pine" target="_blank" rel="noopener noreferrer" className="block text-sm text-sky-100/60 hover:text-white transition-colors">
                ASD Sottovento - Club Parapendio Piné
              </a>
            </div>
          </FooterCol>

          <FooterCol title={t('usefulLinks')}>
            <ul className="space-y-2.5">
              <FooterLink href="https://meteocenta.altervista.org/">Meteo Centa S. Nicolò</FooterLink>
              <FooterLink href="https://www.meteotrentino.it/">MeteoTrentino</FooterLink>
              <FooterLink href="https://www.trento.info/">Visit Trento - Piné - Monte Bondone</FooterLink>
            </ul>
          </FooterCol>

          <FooterCol title={t('weatherNetworks')}>
            <ul className="space-y-2.5">
              <FooterLink href="https://www.meteotrentinoaltoadige.it/stazioni-meteo/mappa-stazioni-meteo">Rete Meteo Trentino AA</FooterLink>
              <FooterLink href="https://retemeteo.lineameteo.it/index.php">LineaMeteo</FooterLink>
              <FooterLink href="https://www.meteonetwork.it/rete/livemap/">Meteo Network</FooterLink>
              <FooterLink href="https://www.meteo4.com/stazioni/rete/MappaLeaflet/LMap.html">Meteo4</FooterLink>
            </ul>
          </FooterCol>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 text-xs text-sky-100/60 mb-4">
            <a href="https://www.iubenda.com/privacy-policy/17001218" rel="noreferrer nofollow" target="_blank" className="hover:text-white transition-colors">
              {t('privacyPolicy')}
            </a>
            <span className="hidden sm:inline text-sky-100/30">·</span>
            <a href="#" role="button" className="iubenda-advertising-preferences-link hover:text-white transition-colors">
              {t('customizeTracking')}
            </a>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-sky-100/70">
            <span>{t('rights', { year: String(year) })}</span>
            <a
            href="https://www.rhaeticon.it"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-2.5 text-sm text-sky-100/55 hover:text-white transition-colors"
          >
            <span>{t('madeWith')}</span>
            <svg
              className="w-4 h-4 text-sun"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 21s-7.5-4.6-9.5-9.4C1.2 8.4 3.4 5 6.6 5c1.9 0 3.6 1 4.4 2.6.8-1.6 2.5-2.6 4.4-2.6 3.2 0 5.4 3.4 4.1 6.6C19.5 16.4 12 21 12 21z" />
            </svg>
            <span>{t('by')}</span>
            <RhaeticonMark />
            <span className="font-semibold text-white/80 group-hover:text-white">Rhaeticon</span>
            <span className="hidden sm:inline text-sky-100/70">{t('agencyTagline')}</span>
          </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* Logo Rhaeticon inline (SVG semplificato dal logosmall ufficiale) */
function RhaeticonMark() {
  return (
    <svg
      width="20"
      height="22"
      viewBox="0 0 209 235"
      fill="currentColor"
      className="shrink-0 text-white/80 group-hover:text-[#a5b4fc] transition-colors"
      aria-hidden="true"
    >
      <g transform="translate(0,235) scale(0.1,-0.1)">
        <path d="M35 2288 c-3 -7 -4 -291 -3 -632 l3 -618 115 148 c63 82 222 289 353 459 131 171 242 311 245 312 4 1 60 -68 125 -153 65 -85 121 -154 125 -154 4 1 45 52 92 115 46 63 87 111 91 107 6 -7 422 -540 444 -570 22 -28 281 87 354 156 38 36 41 43 41 91 0 140 -72 332 -167 447 -112 134 -280 228 -503 280 -66 15 -150 18 -693 21 -506 4 -618 2 -622 -9z" />
        <path d="M543 1438 c-111 -145 -271 -355 -357 -467 l-156 -203 2 -360 3 -360 275 1 275 1 1 343 c2 419 1 416 108 523 108 107 249 170 637 282 72 20 131 40 132 43 1 4 -63 90 -143 193 l-144 187 -18 -23 c-9 -13 -48 -64 -85 -115 -37 -51 -71 -92 -75 -93 -3 0 -60 70 -125 155 -65 85 -121 154 -124 155 -3 0 -96 -118 -206 -262z" />
        <path d="M1995 1420 c-71 -80 -233 -162 -515 -265 -317 -115 -425 -175 -478 -265 -31 -51 -35 -127 -9 -175 8 -17 114 -174 235 -350 l220 -320 306 0 c168 0 306 1 306 3 0 2 -13 20 -29 40 -52 67 -483 684 -479 686 1 2 37 20 78 42 107 55 241 190 297 299 45 89 66 150 84 242 14 76 10 92 -16 63z" />
      </g>
    </svg>
  );
}

function FooterCol({ title, children }) {
  return (
    <div>
      <p className="text-white text-xs uppercase tracking-[0.18em] font-bold mb-4">{title}</p>
      {children}
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-sky-100/60 hover:text-white transition-colors inline-flex items-center gap-1.5 group"
      >
        <svg className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {children}
      </a>
    </li>
  );
}
