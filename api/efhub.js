const USER_ID = '116014046796435242846';
const MANAGER_ID = '17605071047055';
const MANAGER_SKILL = 'PossessionGame';
const MANAGER_VALUE = '89';
const PROFILE_URL = `https://efhub.com/es/community/${USER_ID}`;
const EFHUB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';

const TIER_LIST_URLS = [
  "https://efhub.com/es/tier-list/116014046796435242846_78046652-98a8-48eb-9140-b25e37781b9c",
  "https://efhub.com/es/tier-list/116014046796435242846_8787408d-e9c5-4a33-8690-8aec8605aba2",
  "https://efhub.com/es/tier-list/116014046796435242846_c33fc4ce-0afa-45de-b407-fbbc713d1125",
  "https://efhub.com/es/tier-list/116014046796435242846_c1005476-a159-482d-9ac4-6b42d83be5f1",
  "https://efhub.com/es/tier-list/116014046796435242846_0e2075d3-d3b3-4ed7-8c3a-7804e869aa11",
  "https://efhub.com/es/tier-list/116014046796435242846_c8204e72-a8eb-455c-b97a-59d131dc6348",
  "https://efhub.com/es/tier-list/116014046796435242846_cf4606d9-9aac-4658-9f5e-e8a3b9bc0a13",
  "https://efhub.com/es/tier-list/116014046796435242846_27a1df05-c04d-4130-b138-35e85a1bc0d0",
  "https://efhub.com/es/tier-list/116014046796435242846_ee5b5025-17ee-4af2-a6a6-24ba5ea2c71d",
  "https://efhub.com/es/tier-list/116014046796435242846_b5fe2af3-fa77-4041-80b1-0d455fef9e4a",
  "https://efhub.com/es/tier-list/116014046796435242846_256dd05d-39af-4aa4-89b1-75058c193c1f",
  "https://efhub.com/es/tier-list/116014046796435242846_40003376-ae79-470b-bfb4-b069ea25f272"
];

const POSITION_BY_CODE = [
  'GK','CB','LB','RB','DMF','CMF','LMF','RMF','AMF','LWF','RWF','SS','CF'
];

function normalizeBody(body) {
  return String(body || '')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/\\u003f/gi, '?')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/gi, '&');
}

function isBuildString(value) {
  return typeof value === 'string' && /^\d{10,}(?:_\d+){11}$/.test(value);
}

function buildToPortableUrl(build, booster2=null) {
  if (!isBuildString(build)) return null;

  const parts = build.split('_');
  const playerId = parts.shift();
  const n = parts.map(v => Number(v));

  const params = new URLSearchParams();
  const progression = {
    sho:n[0], pas:n[1], dri:n[2], def:n[3], aes:n[4],
    dex:n[5], gk1:n[6], gk2:n[7], gk3:n[8], lbs:n[9]
  };

  for (const [key,value] of Object.entries(progression)) {
    if (Number.isFinite(value) && value > 0) params.set(key, String(value));
  }

  const pos = POSITION_BY_CODE[n[10]];
  if (pos) params.set('pos', pos);

  if (booster2 !== null && booster2 !== undefined && booster2 !== '') {
    params.set('b2', String(booster2));
  }

  params.set('mgr', MANAGER_ID);
  params.set('msk', MANAGER_SKILL);
  params.set('msv', MANAGER_VALUE);

  return `https://efhub.com/es/players/${playerId}?${params.toString()}`;
}

function extractBooster2FromValue(value) {
  if (typeof value === 'string') {
    const m = value.match(/[?&]b2=(\d+)/i);
    if (m) return m[1];
  }
  return null;
}

function scalarFromCandidate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return value;
  if (value && typeof value === 'object') {
    for (const key of ['id','value','boosterId','boosterID','booster_id','code']) {
      const v = value[key];
      if ((typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && /^\d+$/.test(v))) {
        return v;
      }
    }
  }
  return null;
}

function findBooster2(obj, maxDepth=5) {
  const exact = new Set([
    'b2','booster2','booster2id','booster2_id','secondbooster',
    'secondboosterid','secondbooster_id','selectedbooster2',
    'selectedbooster2id','selectedbooster2_id','booster_2'
  ]);

  const seen = new Set();

  function walk(value, depth) {
    if (depth > maxDepth || value == null) return null;

    const fromString = extractBooster2FromValue(value);
    if (fromString) return fromString;

    if (typeof value !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);

    for (const [key,val] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g,'');
      if (exact.has(normalized)) {
        const scalar = scalarFromCandidate(val);
        if (scalar !== null) return scalar;
      }
    }

    for (const [key,val] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g,'');
      if (
        normalized.includes('booster') &&
        (normalized.includes('second') || normalized.endsWith('2') || normalized.includes('_2'))
      ) {
        const scalar = scalarFromCandidate(val);
        if (scalar !== null) return scalar;
      }
    }

    for (const val of Object.values(value)) {
      const found = walk(val, depth + 1);
      if (found !== null) return found;
    }

    return null;
  }

  return walk(obj, 0);
}

function extractBuildData(text) {
  const normalized = normalizeBody(text);
  const builds = {};
  const portableBuilds = {};
  const booster2ByPlayer = {};

  let parsed = null;
  try { parsed = JSON.parse(normalized); } catch(e) {}

  const add = (build, context=null) => {
    if (!isBuildString(build)) return;
    const playerId = build.split('_')[0];

    if (!builds[playerId]) {
      builds[playerId] = `https://efhub.com/es/players/${playerId}?build=${build}&userId=${USER_ID}`;
    }

    const b2 = context ? findBooster2(context) : null;
    if (b2 !== null && b2 !== undefined && b2 !== '') {
      booster2ByPlayer[playerId] = String(b2);
    }

    const portable = buildToPortableUrl(build, booster2ByPlayer[playerId] ?? null);
    if (portable) portableBuilds[playerId] = portable;
  };

  if (parsed && typeof parsed === 'object') {
    const seen = new Set();

    const walk = (value, ancestors=[]) => {
      if (value == null) return;

      if (typeof value === 'string') {
        if (isBuildString(value)) {
          const context = ancestors.length ? ancestors[ancestors.length - 1] : null;
          add(value, context);
        }
        for (const m of value.matchAll(/(?:[?&])build=(\d{10,}(?:_\d+){11})/gi)) {
          const context = ancestors.length ? ancestors[ancestors.length - 1] : null;
          add(m[1], context);
        }
        return;
      }

      if (typeof value !== 'object' || seen.has(value)) return;
      seen.add(value);

      const nextAncestors = [...ancestors, value].slice(-4);

      for (const val of Object.values(value)) {
        walk(val, nextAncestors);
      }
    };

    walk(parsed);
  }

  // Respaldo por texto, por si eFHUB cambia la forma del JSON.
  for (const m of normalized.matchAll(/(?:[?&])build=(\d{10,}(?:_\d+){11})/gi)) add(m[1], null);
  for (const m of normalized.matchAll(/["']build["']\s*:\s*["'](\d{10,}(?:_\d+){11})["']/gi)) add(m[1], null);
  for (const m of normalized.matchAll(/\b(\d{10,}(?:_\d+){11})\b/g)) add(m[1], null);

  return { builds, portableBuilds, booster2ByPlayer };
}

async function fetchEfhub(url, extraHeaders={}) {
  const r = await fetch(url, {
    headers: {
      'user-agent': EFHUB_UA,
      'accept': 'application/json,text/plain,text/html,application/xhtml+xml,*/*;q=0.8',
      'accept-language': 'es-ES,es;q=0.9,en;q=0.7',
      'cache-control': 'no-cache',
      ...extraHeaders
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(18000)
  });
  const body = await r.text();
  return { ok:r.ok, status:r.status, body, headers:r.headers };
}

function getHubRequestCookie(headers) {
  const setCookie = headers?.get?.('set-cookie') || '';
  const match = setCookie.match(/(?:^|[,;]\s*)(__hub_req=[^;,\s]+)/i)
    || setCookie.match(/(__hub_req=[^;,\s]+)/i);
  return match ? match[1] : '';
}

async function fetchAllPublicBuilds() {
  // eFHUB protects /api/community/builds with a short-lived __hub_req cookie.
  // Its own website obtains that cookie from /api/auth/token before requesting builds.
  const token = await fetchEfhub('https://efhub.com/api/auth/token', {
    'accept': '*/*',
    'referer': PROFILE_URL,
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin'
  });

  if (!(token.ok || token.status === 204)) {
    throw new Error('eFHUB auth bootstrap HTTP ' + token.status);
  }

  const cookie = getHubRequestCookie(token.headers);
  if (!cookie) {
    throw new Error('eFHUB auth bootstrap did not return __hub_req');
  }

  const collected = [];
  let cursor = null;
  let pages = 0;
  let lastStatus = 0;

  while (pages < 20) {
    const url = new URL('https://efhub.com/api/community/builds');
    url.searchParams.set('userId', USER_ID);
    url.searchParams.set('locale', 'es');
    if (cursor !== null && cursor !== undefined && cursor !== '') {
      url.searchParams.set('cursor', String(cursor));
    }

    const r = await fetchEfhub(url.toString(), {
      'accept': 'application/json,text/plain,*/*',
      'referer': PROFILE_URL,
      'cookie': cookie,
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    });

    lastStatus = r.status;
    if (!r.ok) throw new Error('eFHUB builds HTTP ' + r.status);

    let payload;
    try {
      payload = JSON.parse(r.body);
    } catch(e) {
      throw new Error('eFHUB builds returned invalid JSON');
    }

    if (Array.isArray(payload.builds)) collected.push(...payload.builds);
    pages += 1;

    if (!payload.hasMore || payload.nextCursor === null || payload.nextCursor === undefined) break;
    cursor = payload.nextCursor;
  }

  collected.sort((a,b) =>
    Number(b?.savedAt?.seconds || 0) - Number(a?.savedAt?.seconds || 0)
  );

  return {
    builds: collected,
    pages,
    status: lastStatus,
    authStatus: token.status
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.query && req.query.mode === 'list') {
    const id = Number(req.query.id);
    if (!Number.isInteger(id) || id < 1 || id > TIER_LIST_URLS.length) {
      return res.status(400).json({error:'Invalid list id'});
    }

    const source = new URL(TIER_LIST_URLS[id - 1]);
    source.searchParams.set('refresh', Date.now().toString());
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    try {
      const r = await fetchEfhub(source);
      return res.status(r.ok ? 200 : r.status).send(r.body);
    } catch (e) {
      return res.status(502).json({error: String(e && e.message || e)});
    }
  }

  if (req.query && req.query.mode === 'builds') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      const feed = await fetchAllPublicBuilds();
      const data = extractBuildData(JSON.stringify({builds:feed.builds}));

      // Preserve every public build for a card. The legacy "builds" map still
      // points to the newest one so existing single-build behaviour stays intact.
      const buildOptions = {};
      for (const item of feed.builds) {
        const buildID = String(item?.buildID || '');
        const playerId = String(item?.playerID || buildID.split('_')[0] || '');
        if (!isBuildString(buildID) || !/^\d{10,}$/.test(playerId)) continue;

        if (!buildOptions[playerId]) buildOptions[playerId] = [];
        buildOptions[playerId].push({
          buildID,
          buildName: String(item?.buildName || item?.playerNameEn || 'Build'),
          playerName: String(item?.playerNameEn || item?.buildName || ''),
          overall: Number(item?.overall || 0) || null,
          booster2: item?.booster2 ?? null,
          managerId: item?.selectedManagerID ? String(item.selectedManagerID) : null,
          savedAt: Number(item?.savedAt?.seconds || 0) || 0,
          url: `https://efhub.com/es/players/${playerId}?build=${encodeURIComponent(buildID)}&userId=${USER_ID}`
        });
      }

      return res.status(200).json({
        userId: USER_ID,
        count: Object.keys(data.builds).length,
        rawCount: feed.builds.length,
        pages: feed.pages,
        portableCount: Object.keys(data.portableBuilds).length,
        booster2Count: Object.keys(data.booster2ByPlayer).length,
        builds: data.builds,
        buildOptions,
        multiBuildPlayers: Object.values(buildOptions).filter(list => list.length > 1).length,
        portableBuilds: data.portableBuilds,
        booster2ByPlayer: data.booster2ByPlayer,
        source: {
          url: 'https://efhub.com/api/community/builds',
          ok: true,
          status: feed.status,
          authStatus: feed.authStatus
        }
      });
    } catch (e) {
      return res.status(502).json({
        error: String(e && e.message || e),
        userId: USER_ID,
        count: 0,
        rawCount: 0,
        pages: 0,
        portableCount: 0,
        booster2Count: 0,
        builds: {},
        buildOptions: {},
        multiBuildPlayers: 0,
        portableBuilds: {},
        booster2ByPlayer: {}
      });
    }
  }

  const source = new URL(TIER_LIST_URLS[0]);
  source.searchParams.set('refresh', Date.now().toString());
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const r = await fetchEfhub(source);
    res.status(r.ok ? 200 : r.status).send(r.body);
  } catch (e) {
    res.status(502).json({error: String(e && e.message || e)});
  }
}
