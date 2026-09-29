'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/src/i18n/navigation';
import { fetchStations } from '@/src/services/api';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const t = useTranslations('nav');
  const [stations, setStations] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    fetchStations().then(setStations).catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sempre chiaro translucido — il cielo dietro varia con l'ora del giorno
  const transparent = false;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent
          ? 'bg-transparent'
          : 'bg-white/85 backdrop-blur-xl shadow-[0_1px_0_rgba(11,30,51,0.06)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/images/logo.svg"
            alt="Meteo Piné"
            className="h-7 sm:h-8 md:h-9 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          <NavLink href="/" active={isHome} transparent={transparent}>{t('home')}</NavLink>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                transparent
                  ? 'text-white/90 hover:text-white hover:bg-white/10'
                  : 'text-ink-soft hover:text-ink hover:bg-sky-50'
              }`}
            >
              {t('stations')}
              <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-pop border border-sky-100 py-2 overflow-hidden">
                {stations.map((s) => (
                  <Link
                    key={s.id}
                    href={`/stazione/${s.id}`}
                    className="flex items-center justify-between px-4 py-2 text-sm text-ink-soft hover:bg-sky-50 hover:text-ink"
                  >
                    <span>{s.nome}</span>
                    <span className="text-[10px] font-semibold text-ink-mute">{s.altitudine}m</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <NavLink href="/contatti" active={pathname === '/contatti'} transparent={transparent}>{t('contacts')}</NavLink>

          <span className="mx-1 h-5 w-px bg-sky-100" />
          <LanguageSwitcher variant="desktop" />
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`lg:hidden p-2 rounded-lg transition-colors ${
            transparent ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-sky-50'
          }`}
          aria-label={t('menu')}
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="lg:hidden bg-white border-t border-sky-100">
          <div className="px-3 py-3 space-y-0.5 max-h-[80vh] overflow-y-auto">
            <MobileLink href="/">{t('home')}</MobileLink>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-ink rounded-lg hover:bg-sky-50"
            >
              {t('stations')}
              <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="pl-3 ml-2 border-l border-sky-100 space-y-0.5">
                {stations.map((s) => (
                  <MobileLink key={s.id} href={`/stazione/${s.id}`}>
                    {s.nome} <span className="text-ink-mute text-xs">({s.altitudine}m)</span>
                  </MobileLink>
                ))}
              </div>
            )}
            <MobileLink href="/contatti">{t('contacts')}</MobileLink>

            <div className="pt-2 mt-2 border-t border-sky-100">
              <LanguageSwitcher variant="mobile" />
            </div>
          </div>
        </nav>
      )}

      {dropdownOpen && !mobileOpen && (
        <div className="fixed inset-0 z-[-1]" onClick={() => setDropdownOpen(false)} />
      )}
    </header>
  );
}

function NavLink({ href, active, transparent, children }) {
  if (transparent) {
    return (
      <Link
        href={href}
        className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
          active ? 'text-white bg-white/15' : 'text-white/90 hover:text-white hover:bg-white/10'
        }`}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? 'text-sky-900 bg-sky-100' : 'text-ink-soft hover:text-ink hover:bg-sky-50'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileLink({ href, children }) {
  return (
    <Link href={href} className="block px-3 py-2.5 text-sm font-medium text-ink-soft rounded-lg hover:bg-sky-50 hover:text-ink transition-colors">
      {children}
    </Link>
  );
}
