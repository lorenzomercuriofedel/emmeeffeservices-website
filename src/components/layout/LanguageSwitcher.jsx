'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { languageHref, siteLocales } from '@/src/i18n/site-language';
import styles from './Navbar.module.css';

const labels = { it: 'Italiano', en: 'English', de: 'Deutsch' };
export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [suffix, setSuffix] = useState({ search: '', hash: '' });
  useEffect(() => {
    const update = () => setSuffix({ search: window.location.search, hash: window.location.hash });
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [pathname]);
  return (
    <div className={styles.languageList} aria-label="Language">
      {siteLocales.map((language) => (
        <a key={language} href={languageHref(pathname, suffix.search, language, suffix.hash)}
          hrefLang={language} lang={language} aria-label={labels[language]}
          aria-current={language === locale ? 'true' : undefined}
          onClick={(event) => {
            // Read current filters at click time, even after client-side query changes.
            event.currentTarget.href = languageHref(window.location.pathname, window.location.search, language, window.location.hash);
          }}>
          {language.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
