import { API, readTok, tokCookie, tokenReq, callbackUrl, parseGameCollection, parseDraft, parsePlayers } from "../lib/yahoo.mjs";

// ?op=setup&league_id=58705              -> { league_key, team_key, league_name, num_teams }
// ?op=draft&lk=<league_key>               -> { picks: [{ pick, round, team_key, player_key }] }
// ?op=players&lk=<league_key>&keys=a,b    -> { players: [{ player_key, name, pos, team }] }  (max 25 keys)
const json = (body, status = 200, cookie) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...(cookie ? { "Set-Cookie": cookie } : {}) },
  });

export default async (req) => {
  const u = new URL(req.url);
  const op = u.searchParams.get("op");
  let tok = readTok(req);
  if (!tok) return json({ error: "auth" }, 401);

  let cookie = null;
  if (Date.now() > tok.expires_at) {
    try {
      tok = await tokenReq({ grant_type: "refresh_token", refresh_token: tok.refresh_token, redirect_uri: callbackUrl(req) });
      cookie = tokCookie(tok);
    } catch {
      return json({ error: "auth" }, 401);
    }
  }

  const y = async (path) => {
    const r = await fetch(`${API}/${path}?format=json`, { headers: { Authorization: `Bearer ${tok.access_token}` } });
    if (r.status === 401) throw Object.assign(new Error("auth"), { status: 401 });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      const d = (t.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || (() => { try { const j = JSON.parse(t); return j.error?.description || j.error?.message || ""; } catch { return t.slice(0, 160); } })();
      throw Object.assign(new Error(`Yahoo returned ${r.status}${d ? ": " + d.trim() : ""}`), { status: 502 });
    }
    return r.json();
  };

  try {
    if (op === "setup") {
      const id = String(u.searchParams.get("league_id") || "").trim();
      const leagues = parseGameCollection(await y("users;use_login=1/games;game_keys=nhl/leagues"), "leagues");
      const lg = leagues.find((l) => String(l.league_id) === id);
      if (!lg) {
        return json({ error: `League ${id} isn't in this Yahoo account's NHL leagues.`, leagues: leagues.map((l) => ({ id: l.league_id, name: l.name })) }, 404, cookie);
      }
      const teams = parseGameCollection(await y("users;use_login=1/games;game_keys=nhl/teams"), "teams");
      const tm = teams.find((t) => String(t.team_key || "").startsWith(`${lg.league_key}.t.`));
      return json({ league_key: lg.league_key, league_name: lg.name, num_teams: +lg.num_teams || null, team_key: tm?.team_key || null, team_name: tm?.name || null }, 200, cookie);
    }
    const lk = u.searchParams.get("lk") || "";
    if (!/^\d+\.l\.\d+$/.test(lk)) return json({ error: "bad league key" }, 400, cookie);
    if (op === "draft") {
      return json({ picks: parseDraft(await y(`league/${lk}/draftresults`)) }, 200, cookie);
    }
    if (op === "players") {
      const keys = (u.searchParams.get("keys") || "").split(",").filter((k) => /^\d+\.p\.\d+$/.test(k)).slice(0, 25);
      if (!keys.length) return json({ players: [] }, 200, cookie);
      return json({ players: parsePlayers(await y(`league/${lk}/players;player_keys=${keys.join(",")}`)) }, 200, cookie);
    }
    return json({ error: "unknown op" }, 400, cookie);
  } catch (e) {
    return json({ error: e.message }, e.status || 500, cookie);
  }
};
