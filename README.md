# Flamingo Classic draft board (Yahoo live sync)

Static board in `public/index.html` plus three Netlify Functions:

- `draft-auth` sends you to Yahoo's sign-in
- `draft-callback` stores the tokens in an httpOnly cookie
- `draft` finds your league and team, then returns draft results and player names (refreshes the token automatically)

The board polls every 6 seconds while the tab is visible. Picks by your team are marked Mine, everyone else's Taken. Your draft slot is set automatically from round 1. Manual Taken/Mine buttons still work for anything the feed misses.

## Setup

1. **Deploy.** Push this folder to a GitHub repo and connect it to a new Netlify site (drag-and-drop does not deploy functions). Or from the folder: `netlify deploy --prod`. No build step. Note the URL, e.g. `https://flamingo-board.netlify.app`.
2. **Yahoo app.** Use your Front Office Yahoo app if it accepts more than one redirect URI; otherwise create a new one at https://developer.yahoo.com/apps/create/ with Fantasy Sports Read permission.
   Redirect URI: `https://YOUR-SITE.netlify.app/.netlify/functions/draft-callback`
3. **Environment variables** (Site configuration > Environment variables): `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`. Redeploy after adding them.
4. **Connect.** Open the site, check League ID is 58705, tap Connect Yahoo, approve. The status line should read "Live from Yahoo (Flamingo Classic 2026-27): 0 picks".

## During the draft

- Keep the board open in a browser tab. Polling pauses when the tab is hidden and catches up the moment you switch back.
- Players drafted who aren't on the board still count toward your F/D/G slots and show under My team.
- If the dot turns pink, the line says why. On a sign-in error: Disconnect, then Connect Yahoo.
- Reset clears manual marks only; synced picks reload on the next poll.
