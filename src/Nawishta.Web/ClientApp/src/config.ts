// Where the API and the main site (which owns the login pages) live, picked from the host this app
// is served from -- the same scheme library-editor uses. VITE_API_URL / VITE_MAIN_SITE override it
// (e.g. for the Aspire AppHost or a local API on another port).
const host = window.location.host.toLowerCase();

const environments: Record<string, { apiUrl: string; mainSite: string }> = {
  'dictionary.nawishta.co.uk': { apiUrl: 'https://api.nawishta.co.uk', mainSite: 'https://www.nawishta.co.uk' },
  'dictionary.nawishta.dev': { apiUrl: 'http://api.nawishta.dev', mainSite: 'http://www.nawishta.dev' },
};

const local = { apiUrl: 'http://localhost:4000', mainSite: 'http://localhost:4200' };
const environment = environments[host] ?? local;

export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? environment.apiUrl;
export const MAIN_SITE: string = (import.meta.env.VITE_MAIN_SITE as string | undefined) ?? environment.mainSite;

// A main-site account page that returns here afterwards.
export const accountUrl = (path: string) =>
  `${MAIN_SITE}${path}?returnUrl=${encodeURIComponent(window.location.href)}`;
