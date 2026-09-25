// In dev, the Vite server (5173) and API server (3333) run separately.
// In any built/served bundle (prod or a local e2e build), the API is same-origin as the page.
export const SERVER_URL = import.meta.env.DEV
  ? "http://localhost:3333"
  : window.location.origin;
