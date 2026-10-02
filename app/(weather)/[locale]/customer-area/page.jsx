import { setRequestLocale, getTranslations } from 'next-intl/server';
import CustomerArea from '@/src/components/customer/CustomerArea';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'customerArea' });
  return { title: t('title'), referrer: 'no-referrer', robots: { index: false, follow: false, googleBot: { index: false, follow: false } }, alternates: { canonical: locale === 'it' ? '/meteo/customer-area' : `/meteo/${locale}/customer-area`, languages: {} } };
}
export default async function CustomerAreaPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const verificationToken = typeof query?.verify === 'string' && /^[a-f0-9]{64}$/.test(query.verify) ? query.verify : '';
  return <CustomerArea verificationToken={verificationToken} />;
}
