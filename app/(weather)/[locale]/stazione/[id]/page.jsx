import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/src/i18n/navigation';
import { routing } from '@/src/i18n/routing';
import { fetchStationInfo, fetchStations, fetchLastData } from '@/src/services/api';
import { isStationLive } from '@/src/utils/weather';
import StationLiveData from '@/src/components/station/StationLiveData';
import StationInfo from '@/src/components/station/StationInfo';

const OG_LOCALE = { it: 'it_IT', en: 'en_US', de: 'de_DE' };

function stationPath(locale, id) {
  return locale === 'it' ? `/meteo/stazione/${id}` : `/meteo/${locale}/stazione/${id}`;
}

export async function generateMetadata({ params }) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.station' });
  try {
    const info = await fetchStationInfo(id);
    const vars = { name: info.nome, comune: info.comune, alt: info.altitudine };
    return {
      title: t('title', vars),
      description: t('description', vars),
      alternates: {
        canonical: stationPath(locale, id),
        languages: {
          it: `/meteo/stazione/${id}`,
          en: `/meteo/en/stazione/${id}`,
          de: `/meteo/de/stazione/${id}`,
          'x-default': `/meteo/stazione/${id}`,
        },
      },
      openGraph: {
        title: t('ogTitle', vars),
        description: t('ogDescription', vars),
        url: stationPath(locale, id),
        locale: OG_LOCALE[locale],
      },
      twitter: {
        title: t('title', vars),
        description: t('twitterDescription', vars),
      },
    };
  } catch {
    return { title: t('fallback') };
  }
}

export async function generateStaticParams() {
  try {
    const stations = await fetchStations();
    return routing.locales.flatMap((locale) =>
      stations.map((s) => ({ locale, id: String(s.id) }))
    );
  } catch {
    return [];
  }
}

export default async function StationPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'station' });

  let anagrafica = null;
  try {
    anagrafica = await fetchStationInfo(id);
  } catch (e) {
    console.error('Errore caricamento anagrafica:', e);
  }

  // Ultima rilevazione lato server (cache 60s): la card con la temperatura è già
  // nell'HTML iniziale → LCP veloce e niente layout shift sulla pagina stazione.
  let initialData = null;
  try {
    initialData = await fetchLastData(id, { next: { revalidate: 60 } });
  } catch {}
  const initialOnline = isStationLive(initialData?.DateTime, id);

  if (!anagrafica) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-gray-500 text-lg">{t('notFound')}</p>
      </div>
    );
  }

  // JSON-LD structured data per Knowledge Graph / Maps
  const lat = parseFloat(anagrafica.latitudine);
  const lng = parseFloat(anagrafica.longitudine);
  const stationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `Stazione meteo ${anagrafica.nome}`,
    description: `Stazione meteorologica amatoriale di ${anagrafica.nome}, ${anagrafica.comune} (${anagrafica.altitudine}m) — Altopiano di Piné (TN).`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: anagrafica.comune,
      addressRegion: 'Trentino-Alto Adige',
      addressCountry: 'IT',
    },
    ...(isFinite(lat) && isFinite(lng)
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: lat,
            longitude: lng,
            elevation: parseInt(anagrafica.altitudine) || undefined,
          },
        }
      : {}),
    additionalType: 'https://schema.org/CivicStructure',
  };

  return (
    <div className="pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(stationJsonLd) }}
      />
      {/* Header SSR — indicizzabile */}
      <section className="bg-alpine pt-28 md:pt-32 pb-10 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <Link
            href="/#mappa"
            className="inline-flex items-center gap-1.5 text-sky-100/80 hover:text-white text-xs font-semibold uppercase tracking-[0.18em] mb-4 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToAll')}
          </Link>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {t('title', { name: anagrafica.nome })}
          </h1>
          <p className="text-sky-100/80 mt-2 text-base md:text-lg">
            {t('subtitle', { comune: anagrafica.comune, alt: anagrafica.altitudine })}
          </p>
        </div>
      </section>

      {/* Dati live (card iniziale da SSR, grafici dal client) */}
      <StationLiveData stationId={id} initialData={initialData} initialOnline={initialOnline} />

      {/* Info stazione SSR — indicizzabile */}
      <StationInfo anagrafica={anagrafica} />
    </div>
  );
}
