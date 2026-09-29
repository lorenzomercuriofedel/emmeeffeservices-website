import { cache } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchStations, fetchStationInfo } from '@/src/services/api';
import { groupCustomers, customerDescription, customerPath, findCustomerByRouteId } from '@/src/utils/customers';
import { Link } from '@/src/i18n/navigation';

const loadCustomer = cache(async (id) => {
  const stations = await fetchStations();
  // The list endpoint may omit customer data; use the full station registry in that case.
  const fullStations = await Promise.all(stations.map(async (station) => {
    if (Object.hasOwn(station, 'customer')) return station;
    const details = await fetchStationInfo(station.id);
    return { ...station, ...details };
  }));
  return findCustomerByRouteId(groupCustomers(fullStations), id);
});

export async function generateMetadata({ params }) {
  const { locale, id } = await params;
  const customer = await loadCustomer(id);
  if (!customer) return {};
  const t = await getTranslations({ locale, namespace: 'customers' });
  const path = customerPath(customer);
  const languages = { it: `/meteo${path}`, en: `/meteo/en${path}`, de: `/meteo/de${path}`, 'x-default': `/meteo${path}` };
  return {
    title: t('title', { name: customer.name }),
    description: customerDescription(customer, locale) || t('stationsTitle'),
    alternates: { canonical: languages[locale], languages },
    openGraph: { title: t('title', { name: customer.name }), url: languages[locale] },
  };
}

export default async function CustomerPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const customer = await loadCustomer(id);
  if (!customer) notFound();
  const t = await getTranslations('customers');
  const description = customerDescription(customer, locale);
  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <Link href="/#mappa" className="text-sm text-sky-700 underline">{t('backToMap')}</Link>
      <p className="mt-8 text-xs uppercase tracking-widest text-ink-mute">{t('label')}</p>
      <h1 className="text-3xl md:text-4xl font-bold text-ink mt-2">{customer.name}</h1>
      {customer.projectType && <p className="inline-block mt-4 rounded-full bg-sky-100 px-4 py-2 text-sm">{t(`types.${customer.projectType}`)}</p>}
      <h2 className="mt-8 text-xl font-semibold text-ink">{t('project')}</h2>
      <p className="mt-3 whitespace-pre-line text-ink-soft leading-relaxed">{description || t('noDescription')}</p>
      <h2 className="mt-10 mb-5 text-2xl font-bold text-ink">{t('stationsTitle')}</h2>
      <ul className="grid sm:grid-cols-2 gap-4">
        {customer.stations.map((station) => (
          <li key={station.id}>
            <Link href={`/stazione/${station.id}`} className="block h-full rounded-2xl border border-sky-100 bg-white p-6 hover:border-sky-500">
              <h3 className="text-lg font-bold text-ink">{station.nome}</h3>
              <p className="mt-2 text-sm text-ink-soft">{station.comune} · {station.altitudine} m</p>
              <p className="mt-4 text-sm text-sky-700">{t('openStation')} →</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
