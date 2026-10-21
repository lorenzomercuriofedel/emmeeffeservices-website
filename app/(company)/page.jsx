import { getLocale, getTranslations } from 'next-intl/server';
import Footer from '@/src/components/layout/Footer';
import Navbar from '@/src/components/layout/Navbar';

export default async function CompanyPage() {
  const t = await getTranslations('company');
  const locale = await getLocale();
  const consultationHref = locale === 'it' ? '/consulenza' : `/consulenza?lang=${locale}`;
  return <>

<a className="skip" href="#contenuto">{t('skip')}</a>
<Navbar />
<main id="contenuto">
<section className="hero wrap" id="inizio">
  <div className="hero-copy"><h1>{t('headline')}<br />{t('new')} <em>{t('perspectives')}</em></h1><p className="intro">{t('intro')}</p><div className="hero-actions"><a className="button" href="#ambiti">{t('explore')} </a></div></div>
  <div className="terrain"><img src="/company/territorio.svg?v=20260915-palette" alt={t('terrainAlt')} width="600" height="650" /><div className="map-label"><span className="cross" aria-hidden="true">＋</span><span>{t('starting')}<br /><strong>{t('plateau')}</strong></span></div></div>
</section>
 
<section className="section wrap" id="ambiti"><div className="section-heading"><h2>{t('areas')}<br /><em>{t('services')}</em></h2></div>
<div className="services">
<article className="service"><div className="service-top"><span></span><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 39h35M12 32V22m10 10V9m10 23V16m10 16V5"></path></svg></div><h3>{t('dataTitle')}<br />{t('dataTitleEnd')}</h3><p>{t('dataText')}<br />{t('dataTextEnd')}</p><p className="service-ateco">{t('atecoCodes')} <strong>63.10.29</strong>{t('dataActivity')}<strong>62.20.10</strong>{t('itActivity')}</p></article>
<article className="service"><div className="service-top"><span></span><svg viewBox="0 0 48 48" aria-hidden="true"><path d="m5 13 12-6 14 6 12-6v29l-12 6-14-6-12 6Zm12-6v29m14-23v29M9 25l12-5 14 6 5-2"></path></svg></div><h3>{t('landTitle')}<br />{t('landTitleEnd')}</h3><p>{t('landText')}</p><p className="service-note">{t('noBrokerage')}</p><p className="service-ateco">{t('atecoCode')} <strong>68.32.09</strong>{t('landActivity')}</p></article>
</div>
<div className="services-consultation">
  <p>{t('consultationScope')}</p>
  <a href={consultationHref} className="button services-consultation-button">{t('requestConsultation')}<span aria-hidden="true">→</span></a>
</div>
</section>

</main>
<Footer />

  </>;
}
