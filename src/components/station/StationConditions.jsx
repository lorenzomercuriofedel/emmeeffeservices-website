'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { fetchOpenMeteoCurrent, wmoToIcon } from '@/src/utils/openMeteo';
import { getSunTimes, getSkyKey, isNightSky } from '@/src/utils/sun';
import WeatherIcon from '@/src/components/ui/WeatherIcon';

export default function StationConditions({ latitude, longitude, name }) {
  const t = useTranslations('stationConditions');
  const wmo = useTranslations('wmo');
  const locale = useLocale();
  const [now, setNow] = useState(null);
  const [meteo, setMeteo] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMeteo(null);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    async function refresh() {
      try {
        const current = await fetchOpenMeteoCurrent(latitude, longitude);
        if (!cancelled) setMeteo(current);
      } catch {
        if (!cancelled) setMeteo(null);
      }
    }
    refresh();
    const timer = setInterval(refresh, 30 * 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [latitude, longitude]);

  const sun = now ? getSunTimes(now, latitude, longitude, 'Europe/Rome') : null;
  const sky = sun ? getSkyKey(now, sun.sunrise, sun.sunset, 'Europe/Rome') : 'sky-noon';
  const night = isNightSky(sky);
  const code = meteo?.weatherCode;
  const hasCondition = code != null && wmo.has(String(code));
  const overcast = code >= 3;
  const date = now ? new Intl.DateTimeFormat(locale, {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Rome',
  }).format(now) : '\u00a0';

  return (
    <section className="px-4 pb-6">
      <div className={`relative overflow-hidden max-w-5xl mx-auto rounded-3xl ${sky} transition-colors duration-700`}>
        {now && night && <Stars />}
        <div aria-hidden="true" className="absolute inset-0" style={{ background: overcast
          ? 'linear-gradient(180deg, rgba(25,40,60,.7), rgba(55,70,85,.45))'
          : 'linear-gradient(180deg, rgba(0,0,0,.5), rgba(0,0,0,.15))' }} />
        <Silhouette night={night} />
        <div className="relative z-10 p-6 md:p-10 min-h-64 flex flex-wrap items-center justify-between gap-6 text-white">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/80 mb-3">{date}</p>
            <h2 className="text-xl md:text-2xl font-bold">{t('title', { name })}</h2>
            <p className="mt-4 text-2xl md:text-3xl">{hasCondition ? wmo(String(code)) : t('unavailable')}</p>
            <p className="mt-4 text-xs text-white/80">{t('source')}</p>
          </div>
          {hasCondition && <WeatherIcon type={wmoToIcon(code, !night)} size={120} />}
        </div>
      </div>
    </section>
  );
}

function Silhouette({ night }) {
  // Maschera lineare verticale: le montagne svaniscono nella foschia in basso,
  // così non c'è un bordo netto "tagliato" alla fine della sezione.
  const fillFar = night ? 'rgba(255,255,255,0.08)' : 'rgba(11,30,51,0.10)';
  const fillMid = night ? 'rgba(255,255,255,0.13)' : 'rgba(11,30,51,0.18)';
  const fillNear = night ? 'rgba(255,255,255,0.20)' : 'rgba(11,30,51,0.28)';

  return (
    <svg
      className="absolute bottom-0 left-0 w-full h-[42%] md:h-[48%] pointer-events-none z-[1]"
      viewBox="0 0 1200 260"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="silhouette-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="silhouette-mask">
          <rect width="1200" height="260" fill="url(#silhouette-fade)" />
        </mask>
      </defs>

      <g mask="url(#silhouette-mask)">
        {/* Layer 1 — Dolomiti lontane */}
        <path
          d="M0 260 L0 165 Q 80 130 180 148 T 360 138 T 540 120 T 720 132 T 900 115 T 1080 128 L 1200 122 L 1200 260 Z"
          fill={fillFar}
        />
        {/* Layer 2 — colline di mezzo */}
        <path
          d="M0 260 L0 195 Q 130 160 280 180 T 560 170 T 840 188 T 1100 172 L 1200 178 L 1200 260 Z"
          fill={fillMid}
        />
        {/* Layer 3 — bordo dell'altopiano in primo piano */}
        <path
          d="M0 260 L0 220 Q 200 198 400 212 T 800 208 T 1200 215 L 1200 260 Z"
          fill={fillNear}
        />
      </g>
    </svg>
  );
}

function Stars() {
  // 50 stelle pseudo-random ma deterministiche
  const stars = useMemo(() => {
    const s = [];
    for (let i = 0; i < 60; i++) {
      const seed = (i * 97 + 13) % 1000;
      s.push({
        left: ((seed * 7) % 1000) / 10,
        top: ((seed * 11) % 600) / 10,
        size: ((seed % 3) + 1) * 0.7,
        delay: (seed % 35) / 10,
      });
    }
    return s;
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}
