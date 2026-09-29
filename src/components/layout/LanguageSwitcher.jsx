'use client';

import { useState, useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, Link } from '@/src/i18n/navigation';
import { routing } from '@/src/i18n/routing';

// Autonimi: ogni lingua nel proprio nome (standard per un selettore lingua)
const LOCALE_LABEL = { it: 'Italiano', en: 'English', de: 'Deutsch' };
const LOCALE_CODE = { it: 'IT', en: 'EN', de: 'DE' };

export default function LanguageSwitcher({ variant = 'desktop' }) {
  const t = useTranslations('lang');
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const locales = routing.locales;

  if (variant === 'mobile') {
    return (
      <div className="pt-1">
        <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] font-bold text-ink-mute">
          {t('label')}
        </p>
        <div className="flex gap-1.5 px-1">
          {locales.map((loc) => (
            <Link
              key={loc}
              href={pathname}
              locale={loc}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                loc === locale
                  ? 'bg-sky-100 border-sky-200 text-sky-900'
                  : 'bg-white border-sky-100 text-ink-soft hover:bg-sky-50'
              }`}
            >
              <Flag code={loc} className="w-5 h-[14px]" />
              {LOCALE_CODE[loc]}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`${t('label')} ${LOCALE_CODE[locale]}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-2 text-sm font-semibold rounded-lg transition-colors text-ink-soft hover:text-ink hover:bg-sky-50"
      >
        <Flag code={locale} className="w-5 h-[14px] rounded-[2px] shadow-sm ring-1 ring-black/5" />
        <span className="tabular-nums">{LOCALE_CODE[locale]}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-2xl shadow-pop border border-sky-100 py-1.5 overflow-hidden z-50">
            {locales.map((loc) => (
              <Link
                key={loc}
                href={pathname}
                locale={loc}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                  loc === locale
                    ? 'bg-sky-50 text-sky-900 font-semibold'
                    : 'text-ink-soft hover:bg-sky-50 hover:text-ink'
                }`}
              >
                <Flag code={loc} className="w-5 h-[14px] rounded-[2px] ring-1 ring-black/5" />
                <span className="flex-1">{LOCALE_LABEL[loc]}</span>
                {loc === locale && (
                  <svg className="w-3.5 h-3.5 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </Link>
            ))}
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}

/* === Bandierine SVG inline (nessun asset esterno) === */
function Flag({ code, className }) {
  if (code === 'it') return <ItFlag className={className} />;
  if (code === 'de') return <DeFlag className={className} />;
  return <GbFlag className={className} />;
}

function ItFlag({ className }) {
  return (
    <svg className={className} viewBox="0 0 3 2" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1" height="2" x="0" fill="#009246" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#ce2b37" />
    </svg>
  );
}

function DeFlag({ className }) {
  return (
    <svg className={className} viewBox="0 0 5 3" preserveAspectRatio="none" aria-hidden="true">
      <rect width="5" height="1" y="0" fill="#000" />
      <rect width="5" height="1" y="1" fill="#dd0000" />
      <rect width="5" height="1" y="2" fill="#ffce00" />
    </svg>
  );
}

function GbFlag({ className }) {
  // Union Jack compatto; id di clip unici per evitare conflitti tra istanze multiple
  const uid = useId().replace(/:/g, '');
  const s = `s-${uid}`;
  const t = `t-${uid}`;
  return (
    <svg className={className} viewBox="0 0 60 30" preserveAspectRatio="none" aria-hidden="true">
      <clipPath id={s}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={t}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${s})`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${t})`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
