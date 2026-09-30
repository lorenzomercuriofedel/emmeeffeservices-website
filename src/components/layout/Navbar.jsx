'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { siteHome, weatherHome } from '@/src/i18n/site-language';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './Navbar.module.css';

export default function Navbar({ section }) {
  const locale = useLocale();
  const t = useTranslations('siteNav');
  const home = siteHome(locale);
  const [mobileOpen, setMobileOpen] = useState(false);
  const header = useRef(null);
  const menuButton = useRef(null);

  useEffect(() => {
    function closeOutside(event) {
      if (!header.current?.contains(event.target)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  function closeOnEscape(event) {
    if (event.key !== 'Escape') return;
    if (mobileOpen) {
      setMobileOpen(false);
      menuButton.current?.focus();
    }
  }

  return (
    <header ref={header} className={styles.header} onKeyDown={closeOnEscape}>
      <a href={home} className={`${styles.brand} ${section === 'meteo' ? styles.weatherBrand : ''}`}>
        <img src="/company/emme_effe__logouff.png" width="2172" height="724"
          alt="Emme-Effe Services di Lorenzo Mercurio Fedel" />
        {section === 'meteo' && <span className={styles.sectionLabel}>meteo</span>}
      </a>
      <button ref={menuButton} className={styles.menuToggle}
        aria-expanded={mobileOpen} aria-controls="site-navigation"
        onClick={() => setMobileOpen(!mobileOpen)}>
        {t('menu')} <span aria-hidden="true">{mobileOpen ? '−' : '＋'}</span>
      </button>
      <nav id="site-navigation" aria-label={t('navigation')} onClick={(event) => { if (event.target.closest('a')) setMobileOpen(false); }}
        className={`${styles.navigation} ${mobileOpen ? styles.open : ''}`}>
        <a href={`${home}#ambiti`}>{t('services')}</a>
        <a href={weatherHome(locale)}>{t('weather')}</a>
        <a href={`${home}#contatti`} className={styles.contact}>{t('contacts')}</a>
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
