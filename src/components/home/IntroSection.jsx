import { getTranslations } from 'next-intl/server';
import { Link } from '@/src/i18n/navigation';

export default async function IntroSection() {
  const t = await getTranslations('intro');

  return (
    <section className="px-4 py-20">
      <div className="max-w-5xl mx-auto bg-mesh-light border border-sky-100 rounded-3xl px-6 py-12 md:px-12 md:py-14 text-center shadow-card">
        <p className="text-[11px] uppercase tracking-[0.2em] text-sky-700 font-bold mb-3">{t('eyebrow')}</p>
        <h2 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight mb-5 max-w-2xl mx-auto leading-tight">
          {t('title')}
        </h2>
        <div className="text-ink-soft leading-relaxed space-y-3 max-w-2xl mx-auto text-sm md:text-base">
          <p>{t('p1')}</p>
          <p>
            {t.rich('p2', {
              b: (chunks) => <span className="font-semibold text-ink">{chunks}</span>,
            })}
          </p>
        </div>
        <Link
          href="/contatti"
          className="inline-flex items-center gap-2 mt-7 bg-ink hover:bg-sky-900 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-card"
        >
          {t('cta')}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
