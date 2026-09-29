'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getSunTimes, getMoonInfo, formatHM, formatDuration } from '@/src/utils/sun';

export default function StationAlmanac({ latitude, longitude }) {
  const t = useTranslations('moon');
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const sun = now
    ? getSunTimes(now, Number.isFinite(latitude) ? latitude : undefined, Number.isFinite(longitude) ? longitude : undefined, 'Europe/Rome')
    : { sunrise: null, sunset: null, dayLengthHours: null };
  const moon = now ? getMoonInfo(now) : { phase: null, index: null };
  const moonName = moon.index == null ? t('unknown') : t(String(moon.index));

  return (
    <section className="px-4 pb-12">
      <div className="max-w-5xl mx-auto">
        <Almanac now={now} sun={sun} moonName={moonName} moonPhase={moon.phase} />
      </div>
    </section>
  );
}

/* Almanacco della stazione. */
function Almanac({ now, sun, moonName, moonPhase }) {
  const t = useTranslations('almanac');
  const labelColor = 'text-white/70';
  const valueColor = 'text-white';

  return (
    <div
      className="rounded-2xl px-5 py-5 md:px-6 md:py-6 bg-ink border border-white/15 shadow-card"
    >
      <p className={`text-[10px] font-bold tracking-[0.22em] uppercase ${labelColor} mb-4`}>
        {t('title')}{now ? ` · ${now.getFullYear()}` : ''}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        <AlmanacRow icon={<SunSmall />} label={t('sunrise')} value={formatHM(sun.sunrise)} valueColor={valueColor} labelColor={labelColor} />
        <AlmanacRow icon={<SunSetSmall />} label={t('sunset')} value={formatHM(sun.sunset)} valueColor={valueColor} labelColor={labelColor} />
        <AlmanacRow icon={<HourGlassSmall />} label={t('dayLength')} value={formatDuration(sun.dayLengthHours)} valueColor={valueColor} labelColor={labelColor} />
        <AlmanacRow icon={<MoonGlyph phase={moonPhase} />} label={t('moon')} value={moonName} valueColor={valueColor} labelColor={labelColor} />
      </div>
    </div>
  );
}

function AlmanacRow({ icon, label, value, valueColor, labelColor }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-[0.18em] font-bold ${labelColor}`}>{label}</p>
        <p className={`text-base md:text-lg font-semibold ${valueColor} tabular-nums`}>
          {value}
        </p>
      </div>
    </div>
  );
}
/* === Tiny inline SVGs for almanac (sempre bianchi su scrim) === */
function SunSmall() {
  const c = 'rgba(255,255,255,0.85)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.5" fill={c} stroke="none" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
    </svg>
  );
}
function SunSetSmall() {
  const c = 'rgba(255,255,255,0.85)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 17h14M3 21h18" />
      <path d="M8 17a4 4 0 0 1 8 0" fill={c} stroke="none" opacity="0.6"/>
      <path d="M8 17a4 4 0 0 1 8 0" />
      <path d="M12 6v3M5.5 9l1.5 1.5M16.5 10.5L18 9" />
    </svg>
  );
}
function HourGlassSmall() {
  const c = 'rgba(255,255,255,0.85)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12M6 21h12M7 3v3a5 5 0 0 0 3 4.6L12 12l2-1.4A5 5 0 0 0 17 6V3M7 21v-3a5 5 0 0 1 3-4.6L12 12l2 1.4A5 5 0 0 1 17 18v3" />
    </svg>
  );
}
function MoonGlyph({ phase }) {
  // Disegna fase lunare in modo schematico (su scrim scuro: avorio chiaro)
  const c = '#f4ecd6';
  const bg = 'rgba(255,255,255,0.12)';

  // phase=null → solo il cerchio neutro (placeholder pre-mount, deterministico).
  if (phase == null) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="7.5" fill={bg} />
      </svg>
    );
  }

  const illum = 1 - Math.abs(0.5 - phase) * 2;
  // Arrotonda a 2 decimali per evitare float drift residuo tra render successivi.
  const rx = (5 * (1 - illum) + 0.1).toFixed(2);
  const sweep1 = phase < 0.5 ? 1 : 0;
  const sweep2 = phase < 0.5 ? 0 : 1;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7.5" fill={bg} />
      {illum > 0.05 && (
        <path
          d={`M 12 4.5 A 7.5 7.5 0 0 ${sweep1} 12 19.5 A ${rx} 7.5 0 0 ${sweep2} 12 4.5 Z`}
          fill={c}
        />
      )}
    </svg>
  );
}
