'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { fetchStations, fetchLastData } from '@/src/services/api';
import { isStationOnline } from '@/src/utils/weather';
import {
  getSunTimes,
  getSkyKey,
  isNightSky,
} from '@/src/utils/sun';
import { fetchOpenMeteoCurrent, wmoToIcon } from '@/src/utils/openMeteo';
import WeatherIcon from '@/src/components/ui/WeatherIcon';

const REFRESH_MS = 60_000;
const CYCLE_MS = 7_000;        // switch tra stazioni
const METEO_REFRESH_MS = 30 * 60_000; // 30 min

// Ultimo stop del gradiente di ciascun cielo (deve combaciare con globals.css .sky-*)
const SKY_END_COLOR = {
  'sky-night': '#2c3e6f',
  'sky-predawn': '#a87a72',
  'sky-dawn': '#f8d4a0',
  'sky-morning': '#d4e4f4',
  'sky-noon': '#b8d8ee',
  'sky-afternoon': '#e0d4b8',
  'sky-sunset': '#f4a878',
  'sky-dusk': '#b07868',
};

export default function HeroLive({ initialMeteo = null }) {
  const t = useTranslations();
  const locale = useLocale();
  // now è null su SSR / prima del mount per evitare hydration mismatch
  // (timestamp diversi server/client divergono fino al 5° decimale nei calcoli astronomici).
  const [now, setNow] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [meteo, setMeteo] = useState(initialMeteo); // { weatherCode, isDay } — seed da SSR
  const mounted = now !== null;

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const stations = await fetchStations();
        const results = await Promise.all(
          stations.map(async (station) => {
            try {
              const data = await fetchLastData(station.id);
              const online = data ? isStationOnline(data.DateTime, station.id) : false;
              return { station, data, online };
            } catch {
              return { station, data: null, online: false };
            }
          })
        );
        if (!cancelled) {
          setEntries(results);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    const i = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  // Cycling tra stazioni live ogni CYCLE_MS
  useEffect(() => {
    const t = setInterval(() => setCycleIdx((i) => i + 1), CYCLE_MS);
    return () => clearInterval(t);
  }, []);

  // Fetch meteo Open-Meteo (icona reale dell'altopiano), refresh ogni 30 min
  useEffect(() => {
    let cancelled = false;
    async function loadMeteo() {
      try {
        const m = await fetchOpenMeteoCurrent();
        if (!cancelled) setMeteo(m);
      } catch {}
    }
    loadMeteo();
    const i = setInterval(loadMeteo, METEO_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  // Dati astronomici (solo dopo mount; SSR usa default neutri per evitare hydration mismatch)
  const sun = useMemo(
    () => (mounted ? getSunTimes(now) : { sunrise: null, sunset: null, dayLengthHours: null }),
    [now, mounted]
  );
  const skyKey = useMemo(
    () => (mounted ? getSkyKey(now, sun.sunrise, sun.sunset) : 'sky-noon'),
    [now, sun, mounted]
  );
  const night = mounted ? isNightSky(skyKey) : false;

  // Estende il colore di fondo del cielo (ultimo stop) anche al body sotto la hero
  // così il "tramonto arancio" continua sotto invece di tagliarsi netto.
  useEffect(() => {
    if (!mounted) return;
    const c = SKY_END_COLOR[skyKey] || '';
    if (c) document.documentElement.style.setProperty('--page-bg', c);
    return () => {
      document.documentElement.style.removeProperty('--page-bg');
    };
  }, [skyKey, mounted]);

  // Lista stazioni online: Miola sempre per prima (poi le altre per altitudine crescente)
  const onlineStations = useMemo(() => {
    const online = entries.filter((e) => e.online && e.data);
    const miola = online.find((e) =>
      (e.station.nome || '').toLowerCase().includes('miola')
    );
    const others = online
      .filter((e) => e !== miola)
      .sort(
        (a, b) =>
          parseInt(a.station.altitudine || 0) - parseInt(b.station.altitudine || 0)
      );
    return miola ? [miola, ...others] : others;
  }, [entries]);

  // Stazione in evidenza: cycla tra quelle online ogni CYCLE_MS
  const featured = useMemo(() => {
    if (onlineStations.length === 0) return null;
    const chosen = onlineStations[cycleIdx % onlineStations.length];
    const data = chosen.data;
    return {
      station: chosen.station,
      temp: parseFloat(data.Temperature),
      hum: Math.round(parseFloat(data.Humidity)),
      wind: Math.round(parseFloat(data.LatestWindGust)),
      dirSym: data.CurrentWindBearingSymbol,
      onlineCount: onlineStations.length,
      total: entries.length,
    };
  }, [onlineStations, cycleIdx, entries.length]);

  const dateStr = mounted ? formatLocalDate(now, locale) : ' ';

  // Frase descrittiva (condizione + umidità + vento) costruita da frammenti tradotti
  let narrative = '';
  if (featured) {
    const parts = [];
    const wmoKey = meteo != null ? `wmo.${meteo.weatherCode}` : null;
    if (wmoKey && t.has(wmoKey)) parts.push(t(wmoKey));
    const clauses = [t('hero.humidity', { value: featured.hum })];
    if (featured.wind > 2) {
      const strength = t(`hero.strength.${windStrengthKey(featured.wind)}`);
      const dir =
        featured.dirSym && t.has(`windName.${featured.dirSym}`)
          ? t(`windName.${featured.dirSym}`)
          : null;
      clauses.push(
        dir
          ? t('hero.windFrom', { strength, dir })
          : t('hero.windFrom', { strength, dir: '' }).replace(/\s+$/, '')
      );
    }
    parts.push(clauses.join(', '));
    narrative = parts.join('. ') + '.';
  }

  return (
    <section className={`relative overflow-hidden ${skyKey} pt-24 md:pt-28 pb-0 transition-colors duration-700`}>
      {/* Stelle: SOLO dopo mount per evitare hydration mismatch */}
      {mounted && night && <Stars />}

      {/* Scrim sopra al cielo: garantisce contrasto del testo bianco
          su qualsiasi gradiente (notte, alba, mezzogiorno, tramonto…).
          Sfuma in trasparenza prima della silhouette così il colore di fondo
          continua sotto la hero senza essere alterato. */}
      <div
        className="absolute inset-x-0 top-0 h-[78%] z-[1] pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.32) 30%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Icona meteo statica nel cielo (dato Open-Meteo, renderizzata già in SSR per LCP veloce) */}
      {meteo && (
        <SkyWeatherIcon
          condition={wmoToIcon(meteo.weatherCode, meteo.isDay)}
          night={night}
        />
      )}

      {/* Silhouette decorativa di sfondo (ornamento territoriale) */}
      <Silhouette night={night} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-32 md:pb-44">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* SINISTRA — frase + grande temperatura */}
          <div className="lg:col-span-7 xl:col-span-8">
            <p className="text-xs md:text-sm font-medium uppercase tracking-[0.22em] text-white/65 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              {dateStr}
            </p>

            {/* Altezza riservata: evita il layout shift (CLS) quando i dati live popolano l'hero */}
            <div className="min-h-[20rem] md:min-h-[24rem]">
              {featured ? (
                <>
                  {/* Etichetta stazione (cycla ogni CYCLE_MS — fade per smussare il cambio) */}
                  <p
                    key={featured.station.id}
                    className="mt-4 text-sm md:text-base font-semibold animate-fade-up text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]"
                  >
                    {t('hero.stationOf', { name: featured.station.nome })}
                    <span className="ml-2 font-normal text-white/55">
                      · {featured.station.altitudine} m
                    </span>
                  </p>

                  <div key={`temp-${featured.station.id}`} className="mt-2 animate-fade-up">
                    <span
                      className="font-serif font-light leading-none tracking-tight tabular-nums text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.35)]"
                      style={{
                        fontSize: 'clamp(96px, 18vw, 220px)',
                        fontVariationSettings: '"opsz" 144',
                      }}
                    >
                      {Math.round(featured.temp)}°
                    </span>
                  </div>

                  <p
                    key={`narr-${featured.station.id}`}
                    className="max-w-2xl mt-4 text-lg md:text-xl leading-snug font-light animate-fade-up text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]"
                  >
                    {narrative}
                  </p>

                  <p className="mt-4 text-[11px] uppercase tracking-[0.2em] font-bold text-white/55 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
                    {t('hero.liveCount', { count: featured.onlineCount })}
                  </p>
                </>
              ) : (
                <div className="mt-8 text-white/70 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
                  {loaded ? t('hero.noStations') : t('hero.loading')}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* === Silhouette puramente decorativa === */
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

/* === Icona meteo statica nel cielo (basata su WMO code Open-Meteo) === */
function SkyWeatherIcon({ condition, night }) {
  const glow = night
    ? 'drop-shadow(0 0 32px rgba(244,236,214,0.45)) drop-shadow(0 0 12px rgba(244,236,214,0.6))'
    : 'drop-shadow(0 12px 28px rgba(11,30,51,0.18)) drop-shadow(0 4px 8px rgba(11,30,51,0.12))';

  return (
    <div
      className="absolute z-[2] pointer-events-none top-[88px] right-3 sm:top-24 sm:right-5 md:top-28 md:right-10 lg:right-16 origin-top-right"
      aria-hidden="true"
    >
      <div
        className="scale-75 sm:scale-90 md:scale-100 lg:scale-110"
        style={{ filter: glow }}
      >
        <WeatherIcon type={condition} size={140} priority />
      </div>
    </div>
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

/* === Helpers === */
function formatLocalDate(d, locale) {
  const datePart = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const capitalized = datePart.charAt(0).toUpperCase() + datePart.slice(1);
  return `${capitalized} · ${time}`;
}

function windStrengthKey(kmh) {
  if (kmh < 5) return 'calm';
  if (kmh < 15) return 'light';
  if (kmh < 30) return 'moderate';
  if (kmh < 50) return 'strong';
  return 'intense';
}
