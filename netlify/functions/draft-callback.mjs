import { callbackUrl, tokenReq, tokCookie } from "../lib/yahoo.mjs";

// Yahoo returns here with ?code=; swap it for tokens, store them in an httpOnly cookie, go back to the board.
export default async (req) => {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return new Response("Missing code from Yahoo.", { status: 400 });
  try {
    const tok = await tokenReq({ grant_type: "authorization_code", code, redirect_uri: callbackUrl(req) });
    return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": tokCookie(tok) } });
  } catch (e) {
    return new Response(`Yahoo sign-in failed: ${e.message}`, { status: 502 });
  }
};
