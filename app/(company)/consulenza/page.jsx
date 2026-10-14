import { Manrope } from 'next/font/google';
import styles from '@/src/components/layout/ConsultationForm.module.css';
import { getTranslations } from 'next-intl/server';
import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import ConsultationForm from '@/src/components/layout/ConsultationForm';

const manrope = Manrope({ subsets: ['latin'], variable: '--consultation-font', display: 'swap' });

export async function generateMetadata() {
  const t = await getTranslations('consultationForm');
  return { title: t('title'), alternates: { canonical: '/consulenza' } };
}
export default async function ConsultationPage() {
  const t = await getTranslations('consultationForm');
  return <><Navbar /><main className={`${styles.page} ${manrope.variable}`} id="contenuto"><div className={styles.wrap}><h1>{t('title')}</h1><p className={styles.intro}>{t('intro')}</p><ConsultationForm /></div></main><Footer /></>;
}
