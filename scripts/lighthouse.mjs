#!/usr/bin/env node
/**
 * Lighthouse runner ripetibile da CLI.
 *
 *   node scripts/lighthouse.mjs [path...]      # default: /, /meteo e /meteo/stazione/1
 *   npm run lighthouse                          # build + start + audit
 *   npm run lighthouse:fast -- /meteo/en              # salta il build (server già buildato)
 *
 * Avvia `next start`, esegue Lighthouse desktop + mobile su ogni path,
 * stampa punteggi e metriche chiave, poi spegne il server.
 */
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 3000;
const BASE = `http://localhost:${PORT}`;
const paths = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const PATHS = paths.length ? paths : ['/', '/meteo', '/meteo/stazione/1'];
const skipBuild = process.argv.includes('--no-build');
const out = mkdtempSync(join(tmpdir(), 'lh-'));

function sh(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

async function waitUp(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + '/');
      if (res.ok || res.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('server non risponde');
}

function runLH(url, formFactor) {
  const file = join(out, `${formFactor}-${url.replace(/[^a-z0-9]/gi, '_')}.json`);
  const preset = formFactor === 'desktop' ? '--preset=desktop' : '';
  execSync(
    `npx lighthouse "${url}" ${preset} --quiet ` +
      `--only-categories=performance,accessibility,best-practices,seo ` +
      `--chrome-flags="--headless=new" --output=json --output-path="${file}"`,
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
  const r = JSON.parse(readFileSync(file, 'utf8'));
  const c = r.categories;
  const a = r.audits;
  const pct = (x) => (x == null ? '—' : Math.round(x * 100));
  return {
    perf: pct(c.performance.score),
    a11y: pct(c.accessibility.score),
    bp: pct(c['best-practices'].score),
    seo: pct(c.seo.score),
    FCP: a['first-contentful-paint'].displayValue,
    LCP: a['largest-contentful-paint'].displayValue,
    TBT: a['total-blocking-time'].displayValue,
    CLS: a['cumulative-layout-shift'].displayValue,
    SI: a['speed-index'].displayValue,
  };
}

let server;
try {
  if (!skipBuild) sh('npm run build');
  server = spawn('npm', ['start'], { stdio: 'ignore', detached: true });
  await waitUp();

  for (const p of PATHS) {
    const url = BASE + p;
    for (const ff of ['desktop', 'mobile']) {
      const m = runLH(url, ff);
      console.log(
        `\n${ff.toUpperCase().padEnd(7)} ${p}\n` +
          `  perf ${m.perf} · a11y ${m.a11y} · best-practices ${m.bp} · seo ${m.seo}\n` +
          `  FCP ${m.FCP} · LCP ${m.LCP} · TBT ${m.TBT} · CLS ${m.CLS} · SI ${m.SI}`
      );
    }
  }
} finally {
  try {
    if (server) process.kill(-server.pid);
  } catch {}
  // Fallback robusto: libera la porta a prescindere
  try {
    execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: 'ignore' });
  } catch {}
}
