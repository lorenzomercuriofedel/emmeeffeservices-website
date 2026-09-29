import { setRequestLocale } from 'next-intl/server';
import { fetchOpenMeteoCurrent } from '@/src/utils/openMeteo';
import HeroLive from '@/src/components/home/HeroLive';
import WeatherMapLoader from '@/src/components/home/WeatherMapLoader';

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Meteo corrente lato server (cachato 30 min): permette di renderizzare l'icona
  // del cielo già nell'HTML iniziale → LCP veloce e scopribile, niente attesa del fetch client.
  let initialMeteo = null;
  try {
    initialMeteo = await fetchOpenMeteoCurrent();
  } catch {}

  return (
    <>
      <HeroLive initialMeteo={initialMeteo} />
      <WeatherMapLoader />
    </>
  );
}
