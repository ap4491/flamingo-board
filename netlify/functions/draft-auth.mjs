import { callbackUrl } from "../lib/yahoo.mjs";

// Sends the browser to Yahoo's consent screen.
export default async (req) => {
  const url =
    "https://api.login.yahoo.com/oauth2/request_auth" +
    `?client_id=${encodeURIComponent(process.env.YAHOO_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl(req))}` +
    "&response_type=code&language=en-us";
  return new Response(null, { status: 302, headers: { Location: url } });
};
