// Shared Yahoo helpers: token cookie, token exchange/refresh, Yahoo JSON parsing.
export const API = "https://fantasysports.yahooapis.com/fantasy/v2";
const COOKIE = "fl_draft_tok";

export const callbackUrl = (req) => `${new URL(req.url).origin}/.netlify/functions/draft-callback`;

export function readTok(req) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  try { return JSON.parse(Buffer.from(m[1], "base64url").toString()); } catch { return null; }
}

export const tokCookie = (t) =>
  `${COOKIE}=${Buffer.from(JSON.stringify(t)).toString("base64url")}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 60}`;

export async function tokenReq(params) {
  const basic = Buffer.from(`${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`).toString("base64");
  const r = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || `token ${r.status}`);
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token || params.refresh_token,
    expires_at: Date.now() + ((j.expires_in || 3600) - 120) * 1000,
  };
}

// Yahoo collections are objects keyed "0","1",... plus "count".
export const items = (c) =>
  c && typeof c === "object"
    ? Object.keys(c).filter((k) => /^\d+$/.test(k)).sort((a, b) => a - b).map((k) => c[k])
    : [];

// Yahoo entities are arrays of single-key objects (sometimes nested). Merge into one object.
export const flat = (a) => {
  const o = {};
  (function f(x) {
    if (Array.isArray(x)) x.forEach(f);
    else if (x && typeof x === "object") Object.assign(o, x);
  })(a);
  return o;
};

export function parseGameCollection(j, kind) {
  // users;use_login=1/games;game_keys=nhl/{leagues|teams}
  const user = items(j?.fantasy_content?.users)[0]?.user;
  const games = user?.[1]?.games;
  const out = [];
  for (const g of items(games)) {
    const coll = g.game?.[1]?.[kind];
    for (const e of items(coll)) {
      out.push(kind === "leagues" ? flat(e.league) : flat(e.team?.[0]));
    }
  }
  return out;
}

export function parseDraft(j) {
  const dr = j?.fantasy_content?.league?.[1]?.draft_results;
  return items(dr).map((x) => {
    const d = x.draft_result || {};
    return { pick: +d.pick, round: +d.round, team_key: d.team_key || null, player_key: d.player_key || null };
  });
}

export function parsePlayers(j) {
  const ps = j?.fantasy_content?.league?.[1]?.players;
  return items(ps).map((p) => {
    const o = flat(p.player?.[0]);
    return {
      player_key: o.player_key,
      name: o.name?.full || "",
      pos: o.display_position || o.primary_position || "",
      team: o.editorial_team_abbr || "",
    };
  });
}
