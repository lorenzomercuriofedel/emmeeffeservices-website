'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/src/i18n/navigation';
import { fetchStations } from '@/src/services/api';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './Navbar.module.css';

export default function Navbar() {
  const t = useTranslations('nav');
  const [stations, setStations] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const header = useRef(null);
  const menuButton = useRef(null);
  const stationButton = useRef(null);

  useEffect(() => {
    fetchStations().then(setStations).catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeOutside(event) {
      if (!header.current?.contains(event.target)) {
        setMobileOpen(false);
        setDropdownOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  function closeOnEscape(event) {
    if (event.key !== 'Escape') return;
    if (dropdownOpen) {
      setDropdownOpen(false);
      stationButton.current?.focus();
    } else if (mobileOpen) {
      setMobileOpen(false);
      menuButton.current?.focus();
    }
  }

  return (
    <header ref={header} className={styles.header} onKeyDown={closeOnEscape}>
      <a href="/" className={styles.brand}>
        <img src="/company/emme_effe__logouff.png" width="2172" height="724"
          alt="Emme-Effe Services di Lorenzo Mercurio Fedel" />
      </a>
      <button ref={menuButton} className={styles.menuToggle}
        aria-expanded={mobileOpen} aria-controls="meteo-navigation"
        onClick={() => setMobileOpen(!mobileOpen)}>
        {t('menu')} <span aria-hidden="true">{mobileOpen ? '−' : '＋'}</span>
      </button>
      <nav id="meteo-navigation" aria-label={t('menu')}
        className={`${styles.navigation} ${mobileOpen ? styles.open : ''}`}>
        <a href="/">{t('home')}</a>
        <div className={styles.stations}>
          <button ref={stationButton} className={styles.stationToggle}
            aria-expanded={dropdownOpen} aria-controls="meteo-stations"
            onClick={() => setDropdownOpen(!dropdownOpen)}>
            {t('stations')} <span aria-hidden="true">{dropdownOpen ? '−' : '＋'}</span>
          </button>
          {dropdownOpen && (
            <div id="meteo-stations" className={styles.dropdown}>
              {stations.map((station) => (
                <Link key={station.id} href={`/stazione/${station.id}`}
                  onClick={() => { setDropdownOpen(false); setMobileOpen(false); }}>
                  <span>{station.nome}</span><small>{station.altitudine}m</small>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className={styles.languages}><LanguageSwitcher /></div>
      </nav>
    </header>
  );
}
