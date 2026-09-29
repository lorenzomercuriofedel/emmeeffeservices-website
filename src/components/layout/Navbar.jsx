'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
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
      <a href="/" className={styles.brand}>
        <img src="/company/emme_effe__logouff.png" width="2172" height="724"
          alt="Emme-Effe Services di Lorenzo Mercurio Fedel" />
      </a>
      <button ref={menuButton} className={styles.menuToggle}
        aria-expanded={mobileOpen} aria-controls="site-navigation"
        onClick={() => setMobileOpen(!mobileOpen)}>
        Menu <span aria-hidden="true">{mobileOpen ? '−' : '＋'}</span>
      </button>
      <nav id="site-navigation" aria-label="Navigazione principale" onClick={() => setMobileOpen(false)}
        className={`${styles.navigation} ${mobileOpen ? styles.open : ''}`}>
        <a href="/#ambiti">Servizi</a>
        <a href="/meteo">Meteo</a>
        <a href="/#contatti" className={styles.contact}>Contatti</a>
      </nav>
    </header>
  );
}
