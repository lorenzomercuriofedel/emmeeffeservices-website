import { getTranslations } from 'next-intl/server';
import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import ConsultationForm from '@/src/components/layout/ConsultationForm';

export async function generateMetadata() {
  const t = await getTranslations('consultationForm');
  return { title: t('title'), alternates: { canonical: '/consulenza' } };
}
export default async function ConsultationPage() {
  const t = await getTranslations('consultationForm');
  return <><Navbar /><main className="wrap section" id="contenuto"><h1>{t('title')}</h1><p>{t('intro')}</p><ConsultationForm /></main><Footer /></>;
}
