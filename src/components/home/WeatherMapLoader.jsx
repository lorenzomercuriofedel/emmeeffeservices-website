'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

function MapSkeleton() {
  // Stessa altezza esatta della card mappa montata → nessun layout shift allo swap
  return (
    <div className="bg-white rounded-3xl shadow-elev border border-sky-100 overflow-hidden h-[640px] flex items-center justify-center">
      <div className="spinner-alpine" />
    </div>
  );
}

// Fallback `loading`: durante il download del chunk mostra lo skeleton (640px),
// così la card non collassa a 0 mentre il bundle Leaflet arriva.
const WeatherMap = dynamic(() => import('./WeatherMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function WeatherMapLoader() {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  // Monta la mappa (chunk Leaflet + tile OSM) solo quando entra in viewport.
  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <section id="mappa" ref={ref} className="px-4 -mt-8 md:-mt-12 relative z-10">
      <div className="max-w-7xl mx-auto">
        {show ? <WeatherMap /> : <MapSkeleton />}
      </div>
    </section>
  );
}
