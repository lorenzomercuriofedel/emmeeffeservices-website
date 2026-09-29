import { setRequestLocale, getTranslations } from 'next-intl/server';
import WeatherMapLoader from '@/src/components/home/WeatherMapLoader';
import LanguageSwitcher from '@/src/components/layout/LanguageSwitcher';

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('meteoServices');
  return (
    <>
      <section className="px-4 py-10 md:py-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-end mb-4"><LanguageSwitcher /></div>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-5">{t('title')}</h1>
          <p className="max-w-3xl text-ink-soft leading-relaxed">{t('description')}</p>
          <a href="/#contatti" className="inline-flex mt-6 bg-[#224f8b] text-white px-6 py-3 font-semibold hover:bg-[#1b4275]">{t('cta')}</a>
          <p className="mt-8 text-sm text-ink-soft">{t('mapHint')}</p>
        </div>
      </section>
      <WeatherMapLoader />
    </>
  );
}
