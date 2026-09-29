'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { fetchLastData, fetchDataRange, fetchDailyExtremes } from '@/src/services/api';
import { formatDateTime, getYesterdayDateString, getTemperatureColor, formatWindBearing, isStationLive } from '@/src/utils/weather';
import { TemperatureChart, HumidityChart, WindChart, RainChart, PressureChart } from './WeatherChart';
import DailyExtremes from './DailyExtremes';

export default function StationLiveData({ stationId, initialData = null, initialOnline = false }) {
  const t = useTranslations('station');
  const locale = useLocale();

  const TABS = [
    { id: 'temp', label: t('tabs.temp') },
    { id: 'hum', label: t('tabs.hum') },
    { id: 'wind', label: t('tabs.wind') },
    { id: 'rain', label: t('tabs.rain') },
    { id: 'press', label: t('tabs.press') },
  ];

  const [lastData, setLastData] = useState(initialData);
  const [chartData, setChartData] = useState(null);
  const [dailyData, setDailyData] = useState({});
  const [activeTab, setActiveTab] = useState('temp');
  const [online, setOnline] = useState(initialOnline);
  const [loading, setLoading] = useState(!initialData);

  const loadData = useCallback(async () => {
    try {
      const [last, daily] = await Promise.all([
        fetchLastData(stationId),
        fetchDailyExtremes(stationId),
      ]);

      setLastData(last);
      setDailyData(daily);

      if (last) {
        setOnline(isStationLive(last.DateTime, stationId));

        const yesterday = getYesterdayDateString(last.DateTime);
        const rangeData = await fetchDataRange(stationId, yesterday, last.DateTime);

        const labels = [], temperatures = [], dewPoints = [], humidities = [];
        const winds = [], gusts = [], rainSoFars = [], rainRates = [], pressures = [];

        for (const d of rangeData) {
          const [, time] = d.DateTime.split(' ');
          const [h, m] = time.split(':');
          labels.push(`${h}:${m}`);
          temperatures.push(parseFloat(d.Temperature));
          dewPoints.push(parseFloat(d.DewPoint));
          humidities.push(parseFloat(d.Humidity));
          winds.push(parseFloat(d.WindSpeed));
          gusts.push(parseFloat(d.WindGust));
          rainSoFars.push(parseFloat(d.TodayRainSoFar));
          rainRates.push(parseFloat(d.RainRate));
          pressures.push(parseFloat(d.Pressure));
        }

        setChartData({ labels, temperatures, dewPoints, humidities, winds, gusts, rainSoFars, rainRates, pressures });
      }
    } catch (err) {
      console.error('Errore caricamento dati stazione:', err);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    setLoading(true);
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    // Riserva lo spazio del contenuto live (card + grafici) per evitare layout shift (CLS)
    return (
      <div className="px-4 -mt-6 relative z-10">
        <div className="max-w-5xl mx-auto min-h-[42rem] flex items-start justify-center pt-24">
          <div className="spinner-alpine" />
        </div>
      </div>
    );
  }

  const tempVal = lastData ? parseFloat(lastData.Temperature) : null;
  const tempColor = tempVal !== null ? getTemperatureColor(tempVal) : '#94a3b8';

  return (
    <>
      {/* Hero card with current conditions — overlaps the dark page header */}
      {lastData && (
        <section className="px-4 -mt-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl shadow-elev border border-sky-100 overflow-hidden">
              <div className="grid md:grid-cols-[auto_1fr] gap-0">
                {/* Left: big temp + condition */}
                <div
                  className="p-6 md:p-8 flex flex-col justify-between min-w-[260px]"
                  style={{
                    background: `linear-gradient(135deg, ${tempColor}18 0%, ${tempColor}08 100%)`,
                    borderRight: '1px solid rgb(224 234 246 / 0.7)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                        online
                          ? 'bg-emerald-700 text-white'
                          : 'bg-ink-mute/20 text-ink'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-white animate-pulse' : 'bg-ink-mute'}`} />
                      {online ? t('live') : t('offline')}
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="text-7xl font-extrabold leading-none tracking-tight tabular-nums" style={{ color: tempColor }}>
                      {parseFloat(tempVal).toFixed(1)}°
                    </span>
                  </div>

                  <p className="text-ink-mute text-xs mt-3">{t('updatedAt', { time: formatDateTime(lastData.DateTime) })}</p>
                </div>

                {/* Right: clickable stats grid */}
                <div className="p-4 md:p-6">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-mute font-bold mb-3">{t('currentMeasurements')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <StatTile id="temp" label={t('tiles.temp')} value={`${lastData.Temperature}°`} active={activeTab === 'temp'} onClick={() => setActiveTab('temp')} />
                    <StatTile id="hum" label={t('tiles.hum')} value={`${Math.round(lastData.Humidity)}%`} active={activeTab === 'hum'} onClick={() => setActiveTab('hum')} />
                    <StatTile
                      id="wind"
                      label={t('tiles.wind')}
                      value={`${Math.round(lastData.LatestWindGust)}`}
                      sub="km/h"
                      active={activeTab === 'wind'}
                      onClick={() => setActiveTab('wind')}
                      bearing={lastData.CurrentWindBearing}
                      bearingSym={lastData.CurrentWindBearingSymbol}
                      bearingTitle={formatWindBearing(lastData.CurrentWindBearingSymbol, locale)}
                    />
                    <StatTile id="rain" label={t('tiles.rain')} value={lastData.TodayRainSoFar} sub="mm" active={activeTab === 'rain'} onClick={() => setActiveTab('rain')} />
                    <StatTile id="press" label={t('tiles.press')} value={`${Math.round(lastData.Pressure)}`} sub="hPa" active={activeTab === 'press'} onClick={() => setActiveTab('press')} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Charts */}
      {chartData ? (
        <section className="px-4 pt-8 pb-12">
          <div className="max-w-5xl mx-auto">
            {/* Mobile tabs */}
            <div className="md:hidden flex gap-1 mb-4 overflow-x-auto pb-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors shrink-0 ${
                    activeTab === tab.id ? 'bg-ink text-white' : 'bg-white text-ink-soft border border-sky-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl shadow-card border border-sky-100 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-ink">
                  {TABS.find((tab) => tab.id === activeTab)?.label}
                </h2>
                <p className="text-xs text-ink-mute">{t('last24h')}</p>
              </div>

              {activeTab === 'temp' && (
                <>
                  <TemperatureChart labels={chartData.labels} temperatures={chartData.temperatures} dewPoints={chartData.dewPoints} />
                  <DailyExtremes title={t('dailyExtremes')} rows={[
                    { label: t('extremes.minTemp'), value: dailyData.min_temp, unit: '°C' },
                    { label: t('extremes.maxTemp'), value: dailyData.max_temp, unit: '°C' },
                    { label: t('extremes.avgTemp'), value: dailyData.avg_temp, unit: '°C' },
                  ]} />
                </>
              )}
              {activeTab === 'hum' && (
                <>
                  <HumidityChart labels={chartData.labels} humidities={chartData.humidities} />
                  <DailyExtremes title={t('dailyExtremes')} rows={[
                    { label: t('extremes.minHum'), value: dailyData.min_hum, unit: '%' },
                    { label: t('extremes.maxHum'), value: dailyData.max_hum, unit: '%' },
                    { label: t('extremes.avgHum'), value: dailyData.avg_hum, unit: '%' },
                  ]} />
                </>
              )}
              {activeTab === 'wind' && (
                <>
                  <WindChart labels={chartData.labels} winds={chartData.winds} gusts={chartData.gusts} />
                  <DailyExtremes title={t('dailyExtremes')} rows={[
                    { label: t('extremes.maxWspeed'), value: dailyData.max_wspeed, unit: 'km/h' },
                    { label: t('extremes.avgWspeed'), value: dailyData.avg_wspeed, unit: 'km/h' },
                    { label: t('extremes.maxWgust'), value: dailyData.max_wgust, unit: 'km/h' },
                    { label: t('extremes.dominantDir'), value: formatWindBearing(dailyData.dominant_dir, locale), unit: '' },
                  ]} />
                </>
              )}
              {activeTab === 'rain' && (
                <>
                  <RainChart labels={chartData.labels} rainSoFars={chartData.rainSoFars} rainRates={chartData.rainRates} />
                  <DailyExtremes title={t('dailyExtremes')} rows={[
                    { label: t('extremes.maxRrate'), value: dailyData.max_rrate, unit: 'mm/h' },
                  ]} />
                </>
              )}
              {activeTab === 'press' && (
                <>
                  <PressureChart labels={chartData.labels} pressures={chartData.pressures} />
                  <DailyExtremes title={t('dailyExtremes')} rows={[
                    { label: t('extremes.minPress'), value: dailyData.min_press, unit: 'hPa' },
                    { label: t('extremes.maxPress'), value: dailyData.max_press, unit: 'hPa' },
                    { label: t('extremes.avgPress'), value: dailyData.avg_press, unit: 'hPa' },
                  ]} />
                </>
              )}
            </div>
          </div>
        </section>
      ) : (
        // Placeholder a altezza riservata mentre i grafici (range 24h) caricano dal client
        <section className="px-4 pt-8 pb-12">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl shadow-card border border-sky-100 min-h-[30rem] flex items-center justify-center">
              <div className="spinner-alpine" />
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function StatTile({ label, value, sub, active, onClick, bearing, bearingSym, bearingTitle }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-start p-3 rounded-xl transition-all text-left border ${
        active
          ? 'bg-sky-50 border-sky-700 shadow-sm'
          : 'bg-white border-sky-100 hover:border-sky-300 hover:bg-sky-50/40'
      }`}
    >
      <span className="text-[10px] uppercase tracking-wider text-ink-mute font-bold">{label}</span>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-base font-extrabold text-ink leading-none">{value}</span>
        {sub && <span className="text-[10px] font-medium text-ink-mute">{sub}</span>}
      </div>
      {bearing !== undefined && bearingSym && (
        <span
          className="absolute top-2 right-2 text-sky-700"
          style={{ transform: `rotate(${bearing}deg)` }}
          title={bearingTitle}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3 7h-2v13h-2V9H9z" />
          </svg>
        </span>
      )}
    </button>
  );
}
