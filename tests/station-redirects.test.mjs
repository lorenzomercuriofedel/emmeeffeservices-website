import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export default withNextIntl(nextConfig);', 'return nextConfig;');
const config = new Function('createNextIntlPlugin', source)(() => config => config);

test('plural station URLs permanently redirect to the canonical station route', async () => {
  const redirects = await config.redirects();
  for (const [from, to] of [
    ['/stazioni/:path*', '/meteo/stazione/:path*'],
    ['/meteo/stazioni/:path*', '/meteo/stazione/:path*'],
    ['/meteo/en/stazioni/:path*', '/meteo/en/stazione/:path*'],
    ['/meteo/de/stazioni/:path*', '/meteo/de/stazione/:path*'],
  ]) {
    const redirect = redirects.find(item => item.source === from);
    assert.equal(redirect?.destination, to);
    assert.equal(redirect?.permanent, true);
  }
});
