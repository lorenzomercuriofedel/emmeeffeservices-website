export const SITE_TITLE = 'EMME-EFFE Services - Lorenzo Mercurio Fedel';
export const WEATHER_TITLE = `emme-effe meteo | ${SITE_TITLE}`;
export function weatherTitle(pageTitle) {
  return pageTitle ? `${pageTitle} | ${WEATHER_TITLE}` : WEATHER_TITLE;
}
export function customerRobots(customer, production = process.env.VERCEL_ENV === 'production') {
  const index = production && customer?.webPublic === true;
  return { index, follow: index, googleBot: { index, follow: index } };
}
