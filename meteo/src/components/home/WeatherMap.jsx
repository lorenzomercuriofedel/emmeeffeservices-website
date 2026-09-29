'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchStations, fetchLastData } from '@/src/services/api';
import { getTemperatureColor, isStationOnline } from '@/src/utils/weather';

function createWeatherMarker({ temp, color, online }) {
  const tempLabel = online && temp != null && temp !== 'off'
    ? String(temp)
    : 'off';
  const fg = isLightColor(color) ? '#0b1e33' : '#ffffff';

  const html = `
    <div class="map-marker" style="
      position: relative;
      display: inline-flex;
      align-items: center;
      padding: 5px 11px;
      background: ${color};
      color: ${fg};
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      box-shadow: 0 2px 4px rgba(0,0,0,.12), 0 6px 14px -4px rgba(0,0,0,.25);
      border: 2px solid rgba(255,255,255,.9);
      white-space: nowrap;
      transform: translate(-50%, -50%);
      transition: transform .15s ease, box-shadow .15s ease;
      cursor: pointer;
    "
    onmouseover="this.style.transform='translate(-50%, -50%) scale(1.08)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,.18), 0 10px 22px -4px rgba(0,0,0,.35)'"
    onmouseout="this.style.transform='translate(-50%, -50%) scale(1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,.12), 0 6px 14px -4px rgba(0,0,0,.25)'">
      <span style="line-height:1">${tempLabel}</span>
      ${online ? `<span style="position:absolute;top:-3px;right:-3px;width:8px;height:8px;background:#10b981;border:2px solid #fff;border-radius:9999px;box-shadow:0 0 0 2px ${color}"></span>` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'weather-marker',
    html,
    iconSize: [80, 36],
    iconAnchor: [0, 0],
  });
}

function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 175;
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [60, 60] });
    }
  }, [map, positions]);
  return null;
}

const LEGEND_GRADIENT =
  'linear-gradient(to right, #7c3aed 0%, #1e3a5f 12%, #2563eb 25%, #06b6d4 38%, #86efac 50%, #fde047 62%, #fdba74 75%, #fb923c 88%, #ef4444 100%)';

export default function WeatherMap() {
  const t = useTranslations('map');
  const router = useRouter();
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [activeMetric, setActiveMetric] = useState('temperature');

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
          setMarkers(results);
          setUpdatedAt(new Date());
        }
      } catch (err) {
        console.error('Errore caricamento mappa:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const positions = markers
    .filter((m) => m.station.latitudine && m.station.longitudine)
    .map((m) => [parseFloat(m.station.latitudine), parseFloat(m.station.longitudine)]);

  const onlineCount = markers.filter((m) => m.online).length;
  const timeStr = updatedAt
    ? `${String(updatedAt.getHours()).padStart(2, '0')}:${String(updatedAt.getMinutes()).padStart(2, '0')}`
    : '—';

  const metricConfig = getMetricConfig(activeMetric);
  const metricLabel = t(`metric.${activeMetric}`);

  return (
    <div className="bg-white rounded-3xl shadow-[0_2px_4px_rgba(11,30,51,0.04),0_16px_48px_-16px_rgba(11,30,51,0.18)] border border-sky-100 overflow-hidden h-[640px] flex flex-col">
          {/* Map header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 py-4 border-b border-sky-100">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-ink leading-tight">{t('title')}</h2>
              <p className="text-xs text-ink-mute mt-0.5">
                {t('subtitle', { online: onlineCount, total: markers.length, time: timeStr })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto">
              <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 p-0.5">
                {['temperature', 'rain', 'wind'].map((metricId) => (
                  <button
                    key={metricId}
                    type="button"
                    onClick={() => setActiveMetric(metricId)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                      activeMetric === metricId
                        ? 'bg-ink text-white'
                        : 'text-ink-mute hover:text-ink'
                    }`}
                  >
                    {t(`metric.${metricId}`)}
                  </button>
                ))}
              </div>

              {/* Legend — scala gradiente continua, singola linea */}
              <div
                className="flex items-center gap-2"
                title={t('scale', { metric: metricLabel })}
              >
                <span className="text-[10px] font-bold text-ink-mute tracking-wider tabular-nums">{metricConfig.legendMin}</span>
                <div
                  role="img"
                  className="h-2 w-32 sm:w-40 md:w-48 rounded-full ring-1 ring-ink/5"
                  style={{ background: metricConfig.legendGradient }}
                  aria-label={t('scale', { metric: metricLabel })}
                />
                <span className="text-[10px] font-bold text-ink-mute tracking-wider tabular-nums">{metricConfig.legendMax}</span>
              </div>
            </div>
          </div>

          <div className="relative flex-1">
            {loading && (
              <div className="absolute inset-0 z-[1000] bg-white/85 backdrop-blur-sm flex items-center justify-center">
                <div className="spinner-alpine" />
              </div>
            )}
            <MapContainer
              center={[46.1403, 11.2607]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
              zoomControl={true}
              attributionControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds positions={positions} />

              {markers.map(({ station, data, online }) => {
                if (!station.latitudine || !station.longitudine) return null;

                const tempVal = online && data ? parseFloat(data.Temperature) : null;
                const metricValue = getMetricValue(activeMetric, data, online);
                const markerLabel = formatMetricValue(activeMetric, metricValue);
                const metricTooltipValue = markerLabel === 'off' ? t('offline') : `${markerLabel}${metricConfig.unit}`;
                const color = getMetricColor(activeMetric, metricValue, tempVal, online);

                return (
                  <Marker
                    key={station.id}
                    position={[parseFloat(station.latitudine), parseFloat(station.longitudine)]}
                    icon={createWeatherMarker({ temp: markerLabel, color, online })}
                    eventHandlers={{
                      click: () => router.push(`/stazione/${station.id}`),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -14]} opacity={1} className="weather-tooltip">
                      <div className="font-sans">
                        <p className="font-semibold text-ink leading-tight">{station.nome}</p>
                        <p className="text-[10px] text-ink-mute leading-tight">
                          {station.altitudine} m · {online ? metricTooltipValue : t('offline')}
                        </p>
                        <p className="text-[10px] text-sky-700 font-semibold mt-0.5">{t('openStation')}</p>
                      </div>
                    </Tooltip>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
  );
}

function getMetricConfig(metric) {
  if (metric === 'rain') {
    return {
      label: 'Pioggia',
      unit: ' mm',
      legendMin: '0 mm',
      legendMax: '50+ mm',
      legendGradient: 'linear-gradient(to right, #e0f2fe 0%, #7dd3fc 25%, #38bdf8 50%, #0ea5e9 75%, #0369a1 100%)',
    };
  }

  if (metric === 'wind') {
    return {
      label: 'Vento',
      unit: ' km/h',
      legendMin: '0 km/h',
      legendMax: '80+ km/h',
      legendGradient: 'linear-gradient(to right, #dcfce7 0%, #86efac 25%, #facc15 50%, #fb923c 75%, #ef4444 100%)',
    };
  }

  return {
    label: 'Temperatura',
    unit: '',
    legendMin: '−15°C',
    legendMax: '+35°C',
    legendGradient: LEGEND_GRADIENT,
  };
}

function getMetricValue(metric, data, online) {
  if (!online || !data) return null;

  if (metric === 'rain') {
    const rainVal = parseFloat(data.TodayRainSoFar);
    return isNaN(rainVal) ? null : rainVal;
  }

  if (metric === 'wind') {
    const windVal = parseFloat(data.LatestWindGust);
    return isNaN(windVal) ? null : windVal;
  }

  const tempVal = parseFloat(data.Temperature);
  return isNaN(tempVal) ? null : tempVal;
}

function formatMetricValue(metric, value) {
  if (value == null || isNaN(value)) return 'off';
  if (metric === 'wind') return String(Math.round(value));
  return value.toFixed(1);
}

function getMetricColor(metric, value, tempVal, online) {
  if (!online) return '#94a3b8';
  if (metric === 'temperature') return getTemperatureColor(tempVal);

  if (value == null || isNaN(value)) return '#94a3b8';

  if (metric === 'rain') {
    if (value <= 0) return '#e0f2fe';
    if (value < 2) return '#7dd3fc';
    if (value < 10) return '#38bdf8';
    if (value < 25) return '#0ea5e9';
    return '#0369a1';
  }

  if (value < 5) return '#86efac';
  if (value < 20) return '#facc15';
  if (value < 40) return '#fb923c';
  return '#ef4444';
}

