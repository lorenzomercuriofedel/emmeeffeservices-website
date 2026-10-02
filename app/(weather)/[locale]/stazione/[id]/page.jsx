import { notFound } from 'next/navigation';
import { weatherTitle } from '@/src/utils/seo';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/src/i18n/navigation';
import { routing } from '@/src/i18n/routing';
import { fetchStationInfo, fetchStations, fetchLastData } from '@/src/services/api';
import { isStationLive } from '@/src/utils/weather';
import StationLiveData from '@/src/components/station/StationLiveData';
import CustomerLogo from '@/src/components/customer/CustomerLogo';
import { getCustomer } from '@/src/utils/customers';
import StationInfo from '@/src/components/station/StationInfo';
import StationAlmanac from '@/src/components/station/StationAlmanac';
import StationConditions from '@/src/components/station/StationConditions';

export const dynamic = 'force-dynamic';

const OG_LOCALE = { it: 'it_IT', en: 'en_US', de: 'de_DE' };

function stationPath(locale, id) {
  return locale === 'it' ? `/meteo/stazione/${id}` : `/meteo/${locale}/stazione/${id}`;
}

export async function generateMetadata({ params }) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.station' });
  try {
    const info = await fetchStationInfo(id);
    if (!info) return { title: t('fallback'), robots: { index: false, follow: false } };
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
        title: weatherTitle(t('title', vars)),
        description: t('ogDescription', vars),
        url: stationPath(locale, id),
        locale: OG_LOCALE[locale],
      },
      twitter: {
        title: weatherTitle(t('title', vars)),
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

  if (!anagrafica) notFound();

  // Ultima rilevazione lato server (cache 60s): la card con la temperatura è già
  // nell'HTML iniziale → LCP veloce e niente layout shift sulla pagina stazione.
  let initialData = null;
  try {
    initialData = await fetchLastData(id, { next: { revalidate: 60 } });
  } catch {}
  const initialOnline = isStationLive(initialData?.DateTime, id);


  const stationCustomer = getCustomer(anagrafica);

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
      <section className="bg-alpine pt-10 md:pt-12 pb-10 px-4 relative overflow-hidden">
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {t('title', { name: anagrafica.nome })}
          </h1>
          <p className="text-sky-100/80 mt-2 text-base md:text-lg">
            {t('subtitle', { comune: anagrafica.comune, alt: anagrafica.altitudine })}
          </p>
          {stationCustomer && <p className="text-sky-100/80 text-xs mt-3">{stationCustomer.projectType === 'hobby' && stationCustomer.projectName ? stationCustomer.projectName : stationCustomer.name}</p>}
          </div>
          <CustomerLogo customer={getCustomer(anagrafica)} />
          </div>
        </div>
      </section>

      {/* Dati live (card iniziale da SSR, grafici dal client) */}
      <StationLiveData stationId={id} initialData={initialData} initialOnline={initialOnline} />

      <StationConditions latitude={lat} longitude={lng} name={anagrafica.nome} />
      <StationAlmanac latitude={lat} longitude={lng} />

      {/* Info stazione SSR — indicizzabile */}
      <StationInfo anagrafica={anagrafica} />
    </div>
  );
}
