'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTranslations } from 'next-intl';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const chartColors = {
  temperature: { border: '#ef4444', bg: 'rgba(239,68,68,.1)' },
  dewPoint: { border: '#f97316', bg: 'rgba(249,115,22,.1)' },
  humidity: { border: '#06b6d4', bg: 'rgba(6,182,212,.1)' },
  wind: { border: '#8b5cf6', bg: 'rgba(139,92,246,.1)' },
  gust: { border: '#f97316', bg: 'rgba(249,115,22,.1)' },
  rain: { border: '#3b82f6', bg: 'rgba(59,130,246,.1)' },
  rainRate: { border: '#06b6d4', bg: 'rgba(6,182,212,.1)' },
  pressure: { border: '#10b981', bg: 'rgba(16,185,129,.1)' },
};

const baseOptions = {
  responsive: true,
  animation: false,
  elements: { point: { radius: 0 } },
  interaction: { mode: 'index', intersect: false },
  scales: {
    x: { ticks: { maxTicksLimit: 12, font: { size: 11 } }, grid: { display: false } },
    y: { ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.06)' } },
  },
  plugins: {
    legend: { position: 'top', labels: { usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } } },
    tooltip: { backgroundColor: 'rgba(0,0,0,.8)', cornerRadius: 8, padding: 10 },
  },
};

function makeDataset(label, data, colorKey, hidden = false) {
  return {
    label,
    data,
    borderColor: chartColors[colorKey].border,
    backgroundColor: chartColors[colorKey].bg,
    fill: true,
    tension: 0.3,
    borderWidth: 2,
    hidden,
  };
}

export function TemperatureChart({ labels, temperatures, dewPoints }) {
  const t = useTranslations('charts');
  return (
    <Line
      data={{
        labels,
        datasets: [
          makeDataset(t('temperature'), temperatures, 'temperature'),
          makeDataset(t('dewPoint'), dewPoints, 'dewPoint', true),
        ],
      }}
      options={baseOptions}
    />
  );
}

export function HumidityChart({ labels, humidities }) {
  const t = useTranslations('charts');
  return (
    <Line
      data={{
        labels,
        datasets: [makeDataset(t('humidity'), humidities, 'humidity')],
      }}
      options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: false } } }}
    />
  );
}

export function WindChart({ labels, winds, gusts }) {
  const t = useTranslations('charts');
  return (
    <Line
      data={{
        labels,
        datasets: [
          makeDataset(t('wind'), winds, 'wind'),
          makeDataset(t('gust'), gusts, 'gust', true),
        ],
      }}
      options={baseOptions}
    />
  );
}

export function RainChart({ labels, rainSoFars, rainRates }) {
  const t = useTranslations('charts');
  return (
    <Line
      data={{
        labels,
        datasets: [
          makeDataset(t('rain'), rainSoFars, 'rain'),
          makeDataset(t('rainRate'), rainRates, 'rainRate', true),
        ],
      }}
      options={baseOptions}
    />
  );
}

export function PressureChart({ labels, pressures }) {
  const t = useTranslations('charts');
  return (
    <Line
      data={{
        labels,
        datasets: [makeDataset(t('pressure'), pressures, 'pressure')],
      }}
      options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: false } } }}
    />
  );
}
