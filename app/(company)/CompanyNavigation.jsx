 'use client';

import { useRef, useState } from 'react';

export default function CompanyNavigation() {
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  return <>
    <button ref={toggle} className="menu-toggle" aria-expanded={open} aria-controls="navigation"
      onClick={() => setOpen(!open)} onKeyDown={closeOnEscape}>
      Menu <span aria-hidden="true">{open ? '−' : '＋'}</span>
    </button>
    <nav id="navigation" aria-label="Navigazione principale" className={`menu-ready${open ? ' is-open' : ''}`}
      onClick={() => setOpen(false)} onKeyDown={closeOnEscape}>
      <a href="#ambiti">Servizi</a><a href="/meteo">Meteo</a><a className="nav-contact" href="#contatti">Contatti</a>
    </nav>
  </>;

  function closeOnEscape(event) {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      toggle.current?.focus();
    }
  }
}
