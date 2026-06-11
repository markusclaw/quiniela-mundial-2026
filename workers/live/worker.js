// ───────────────────────────────────────────────────────────────────────────
//  Live scores proxy — Cloudflare Worker
// ───────────────────────────────────────────────────────────────────────────
//  Hides your API-Football key, adds CORS, and caches upstream responses at the
//  edge so many viewers cost only a few API calls. Deploy with Wrangler and set
//  the key as a secret:  wrangler secret put APISPORTS_KEY
//
//  Endpoints (GET):
//    /            -> live World Cup fixtures (scores + minute)
//    /stats?fixture=ID -> per-team match statistics
// ───────────────────────────────────────────────────────────────────────────

const API = "https://v3.football.api-sports.io";
const LEAGUE = 1; // FIFA World Cup
const SEASON = 2026;
const CACHE_TTL = 15; // seconds — faster refresh (paid plan has the budget)

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "*",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    const key = env.APISPORTS_KEY;
    if (!key) return json({ error: "Missing APISPORTS_KEY secret" }, 500);

    const url = new URL(request.url);
    let path;
    if (url.pathname === "/stats") {
      const fixture = url.searchParams.get("fixture");
      if (!fixture) return json({ error: "fixture required" }, 400);
      path = `/fixtures/statistics?fixture=${encodeURIComponent(fixture)}`;
    } else if (url.searchParams.get("all")) {
      // Every World Cup fixture this season (for standings/points). The app
      // derives results from this so points update the instant a match ends.
      path = `/fixtures?league=${LEAGUE}&season=${SEASON}`;
    } else if (url.searchParams.get("date")) {
      // Full day of World Cup fixtures: upcoming, in-play AND finished (with
      // final scores) — so the app shows finals the moment a match ends,
      // without waiting on the slower free results feed.
      const p = new URLSearchParams({
        league: String(LEAGUE),
        season: String(SEASON),
        date: url.searchParams.get("date"),
      });
      const tz = url.searchParams.get("tz");
      if (tz) p.set("timezone", tz);
      path = `/fixtures?${p.toString()}`;
    } else {
      // Back-compat: in-play only.
      path = `/fixtures?league=${LEAGUE}&season=${SEASON}&live=all`;
    }

    // Serve a recent good response from the edge cache so many viewers cost
    // only a few upstream calls. We cache ONLY successful payloads — a
    // transient rate-limit or upstream error must not get pinned for 30s.
    const cache = caches.default;
    const cacheKey = new Request(new URL(path, API).toString(), { method: "GET" });
    const hit = await cache.match(cacheKey);
    if (hit) return withCors(hit);

    try {
      const upstream = await fetch(API + path, {
        headers: { "x-apisports-key": key },
      });
      const data = await upstream.json();

      if (hasErrors(data)) {
        // Don't cache — let the next poll retry immediately.
        return json(data, 200, "no-store");
      }
      const res = json(data, 200, `public, max-age=${CACHE_TTL}`);
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (e) {
      return json({ error: String(e) }, 502, "no-store");
    }
  },
};

// API-Football returns errors as [] when healthy, or a populated object/array.
function hasErrors(data) {
  const e = data && data.errors;
  if (!e) return false;
  return Array.isArray(e) ? e.length > 0 : Object.keys(e).length > 0;
}

function withCors(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  return out;
}

function json(obj, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS,
      "content-type": "application/json",
      "cache-control": cacheControl,
    },
  });
}
