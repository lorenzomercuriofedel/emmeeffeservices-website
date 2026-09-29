import { setRequestLocale, getTranslations } from 'next-intl/server';

const EMAIL = 'mp@emmeeffeservices.it';

const PATH = { it: '/contatti', en: '/en/contatti', de: '/de/contatti' };
const OG_LOCALE = { it: 'it_IT', en: 'en_US', de: 'de_DE' };

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.contacts' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: PATH[locale],
      languages: {
        it: '/contatti',
        en: '/en/contatti',
        de: '/de/contatti',
        'x-default': '/contatti',
      },
    },
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: PATH[locale],
      locale: OG_LOCALE[locale],
    },
  };
}

export default async function ContactsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'contacts' });

  return (
    <>
      <section className="bg-alpine pt-28 md:pt-32 pb-12 px-4 relative overflow-hidden">
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-sun font-bold mb-3">{t('eyebrow')}</p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {t('title')}
          </h1>
          <p className="text-sky-100/80 mt-3 max-w-md mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <section className="px-4 -mt-8 pb-20 relative z-10">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-elev border border-sky-100 px-6 py-10 md:px-12 md:py-14 text-center">
          <a
            href={`mailto:${EMAIL}`}
            className="block text-xl md:text-3xl font-bold text-sky-700 hover:text-sky-900 transition-colors break-all"
          >
            {EMAIL}
          </a>
        </div>
      </section>
    </>
  );
}
