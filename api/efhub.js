const USER_ID = '116014046796435242846';
const MANAGER_ID = '17605071047055';
const MANAGER_SKILL = 'PossessionGame';
const MANAGER_VALUE = '89';

function normalizeBody(body) {
  return String(body || '')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/\\u003f/gi, '?')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/gi, '&');
}

function extractBuilds(text) {
  const normalized = normalizeBody(text);
  const builds = {};

  const add = (build) => {
    if (!build || !/^\d{10,}(?:_\d+)+$/.test(build)) return;
    const playerId = build.split('_')[0];
    if (!builds[playerId]) {
      builds[playerId] = `https://efhub.com/es/players/${playerId}?build=${build}&userId=${USER_ID}&mgr=${MANAGER_ID}&msk=${MANAGER_SKILL}&msv=${MANAGER_VALUE}`;
    }
  };

  for (const m of normalized.matchAll(/(?:[?&])build=([0-9_]+)/gi)) add(m[1]);
  for (const m of normalized.matchAll(/["']build["']\s*:\s*["']([0-9_]+)["']/gi)) add(m[1]);
  for (const m of normalized.matchAll(/\b(\d{10,}(?:_\d+){4,})\b/g)) add(m[1]);

  return builds;
}

async function fetchEfhub(url) {
  const r = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'es-ES,es;q=0.9,en;q=0.7',
      'cache-control': 'no-cache'
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(18000)
  });
  const body = await r.text();
  return { ok:r.ok, status:r.status, body };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.query && req.query.mode === 'builds') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // Endpoint real usado por eFHUB al abrir la pestaña Builds del perfil público.
    const url = `https://efhub.com/api/community/builds?userId=${USER_ID}&locale=es`;

    try {
      const r = await fetchEfhub(url);
      const builds = r.ok ? extractBuilds(r.body) : {};

      return res.status(r.ok ? 200 : r.status).json({
        userId: USER_ID,
        count: Object.keys(builds).length,
        builds,
        source: {
          url,
          ok: r.ok,
          status: r.status,
          bytes: r.body.length
        }
      });
    } catch (e) {
      return res.status(502).json({
        error: String(e && e.message || e),
        userId: USER_ID,
        count: 0,
        builds: {}
      });
    }
  }

  const source = new URL('https://efhub.com/es/tier-list/116014046796435242846_f1163d0a-6eed-4b91-92f3-2b925fe7eee7');
  source.searchParams.set('refresh', Date.now().toString());
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  try {
    const r = await fetchEfhub(source);
    res.status(r.ok ? 200 : r.status).send(r.body);
  } catch (e) {
    res.status(502).json({error: String(e && e.message || e)});
  }
}
