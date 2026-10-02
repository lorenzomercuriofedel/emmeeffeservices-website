'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/src/i18n/navigation';
import { getCustomer, customerPath, customerDisplayName } from '@/src/utils/customers';

export default function StationInfo({ anagrafica }) {
  const t = useTranslations('station.info');
  const [activeTab, setActiveTab] = useState('posizione');

  const customer = getCustomer(anagrafica);

  const tabs = [
    { id: 'posizione', label: t('tabs.location') },
    { id: 'dettagli', label: t('tabs.details') },
    { id: 'info', label: t('tabs.info') },
  ];

  if (!anagrafica) return null;

  return (
    <section className="px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-sky-700 font-bold">{t('eyebrow')}</p>
          <span className="h-px flex-1 bg-sky-100" />
        </div>
        <div className="bg-white rounded-3xl shadow-card border border-sky-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative h-64 lg:h-auto min-h-64">
              <Image
                src={`/images/stations/${anagrafica.codice}.jpg`}
                alt={anagrafica.nome}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/0" />
            </div>

            <div className="p-6 md:p-8">
              <h2 className="text-xl font-bold text-ink mb-1">{t('registry')}</h2>
              <p className="text-ink-mute text-sm mb-5">{anagrafica.nome} · {anagrafica.comune}</p>

              <div className="flex gap-1 mb-6 bg-sky-50 p-1 rounded-xl w-fit">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-ink shadow-sm'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'posizione' && (
                <div className="space-y-3">
                  <InfoRow label={t('locality')} value={anagrafica.nome} />
                  <InfoRow label={t('municipality')} value={t('municipalityValue', { comune: anagrafica.comune })} />
                  <InfoRow label={t('hamlet')} value={anagrafica.frazione} />
                  <InfoRow label={t('altitude')} value={t('altitudeValue', { alt: anagrafica.altitudine })} />
                  <InfoRow label={t('coordinates')} value={`${anagrafica.latitudine}° ${anagrafica.longitudine}°`} />
                </div>
              )}

              {activeTab === 'dettagli' && (
                <div className="space-y-3">
                  <InfoRow label={t('installDate')} value={anagrafica.data_installazione} />
                  <InfoRow label={t('model')} value={anagrafica.modello} />
                  <InfoRow label={t('issHeight')} value={anagrafica.altezza_dal_suolo ? `${Number(anagrafica.altezza_dal_suolo).toFixed(2)} m` : null} />
                  <InfoRow label={t('anemometerHeight')} value={anagrafica.altezza_anemometro_dal_suolo ? `${Number(anagrafica.altezza_anemometro_dal_suolo).toFixed(2)} m` : null} />
                  <InfoRow label={t('placement')} value={anagrafica.ubicazione} />
                  <InfoRow label={t('terrainType')} value={anagrafica.tipo_terreno} />
                  <InfoRow label={t('customer')} value={customer ? <span><Link href={customerPath(customer)} className="text-sky-700 underline underline-offset-4">{customerDisplayName(customer)}</Link>{customer.projectType === 'hobby' && customer.projectName && <span className="block mt-1 text-xs text-ink-mute">{t('customerOwner', { owner: customer.name })}</span>}</span> : null} />
                  <InfoRow label={t('solarShield')} value={anagrafica.schermo_solare} />
                </div>
              )}

              {activeTab === 'info' && (
                <div className="text-ink-soft leading-relaxed text-sm">
                  {anagrafica.informazioni || t('noInfo')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-sky-50 last:border-0">
      <span className="text-xs uppercase tracking-wider font-semibold text-ink-mute min-w-[120px] pt-0.5">{label}</span>
      <span className="text-sm font-medium text-ink flex-1">{value || '—'}</span>
    </div>
  );
}
