/**
 * WeatherIcon — wrapper su Meteocons by Bas Milius (MIT).
 * Repo: https://github.com/basmilius/weather-icons
 * Self-hosted in /public/icons (stessa origine → LCP veloce e stabile, niente CDN terza parte).
 *
 * Prop `type` accetta nomi Meteocons (es. "clear-day", "partly-cloudy-night-rain",
 * "overcast-day", "thunderstorms-day-extreme", "snow", "fog-day", ...).
 */
const ICON_BASE = '/icons';

export default function WeatherIcon({ type = 'clear-day', size = 32, className = '', priority = false }) {
  return (
    <img
      src={`${ICON_BASE}/${type}.svg`}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      aria-hidden="true"
      decoding="async"
    />
  );
}
