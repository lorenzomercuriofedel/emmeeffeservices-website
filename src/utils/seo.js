export const SITE_TITLE = 'Emme-Effe Services';
export const WEATHER_TITLE = `Meteo | ${SITE_TITLE}`;
export function weatherTitle(pageTitle) {
  return pageTitle ? `${pageTitle} | ${WEATHER_TITLE}` : WEATHER_TITLE;
}
// All weather pages remain unlisted, regardless of customer visibility settings.
export function customerRobots() {
  return { index: false, follow: false, googleBot: { index: false, follow: false } };
}
