'use client';
import { customerDisplayName } from '@/src/utils/customers';
import { useState } from 'react';

export default function CustomerLogo({ customer }) {
  const [failedUrl, setFailedUrl] = useState(null);
  if (!customer?.logoUrl || failedUrl === customer.logoUrl) return null;
  return <div className="w-full max-w-[260px] md:w-[260px] h-28 md:h-32 shrink-0 rounded-2xl bg-white/95 p-4 shadow-card flex items-center justify-center">
    <img src={customer.logoUrl} alt={customerDisplayName(customer)} referrerPolicy="no-referrer"
      className="max-w-full max-h-full object-contain" onError={() => setFailedUrl(customer.logoUrl)} />
  </div>;
}
