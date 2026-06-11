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
const CACHE_TTL = 30; // seconds — one upstream call serves all viewers in window

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "*",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    const key = env.APISPORTS_KEY;
    if (!key) return json({ error: "Missing APISPORTS_KEY secret" }, 500);

    const url = new URL(request.url);
    try {
      let path;
      if (url.pathname === "/stats") {
        const fixture = url.searchParams.get("fixture");
        if (!fixture) return json({ error: "fixture required" }, 400);
        path = `/fixtures/statistics?fixture=${encodeURIComponent(fixture)}`;
      } else {
        path = `/fixtures?league=${LEAGUE}&season=${SEASON}&live=all`;
      }
      const upstream = await fetch(API + path, {
        headers: { "x-apisports-key": key },
        cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
      });
      const data = await upstream.json();
      return json(data);
    } catch (e) {
      return json({ error: String(e) }, 502);
    }
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS,
      "content-type": "application/json",
      "cache-control": `public, max-age=${CACHE_TTL}`,
    },
  });
}
