// The access token is kept in memory only (never persisted to localStorage
// or a JS-readable cookie) so it cannot be exfiltrated via XSS. It is
// re-obtained on page load via the httpOnly refresh-token cookie.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}
