// Environment config is resolved at runtime so one built image can be deployed anywhere.
// Precedence: window.__ENV__ (written into /env-config.js by the container at startup, see
// config/docker/40-env-config.sh) -> VITE_* vars from .env files (local dev) -> localhost defaults.
// The same scheme library-ui uses.

declare global {
  interface Window {
    __ENV__?: {
      NODE_ENV?: string;
      API_URL?: string;
      MAIN_SITE?: string;
      LIBRARIES_URL?: string;
      LIBRARY_EDITOR_URL?: string;
      DICTIONARY_URL?: string;
    };
  }
}

const runtimeEnv = window.__ENV__ ?? {};
const buildEnv = import.meta.env ?? {};

const pick = (runtimeValue: string | undefined, buildValue: string | undefined, fallback: string) =>
  runtimeValue || buildValue || fallback;

export const NODE_ENV = pick(runtimeEnv.NODE_ENV, buildEnv.VITE_NODE_ENV, 'local');
export const API_URL = pick(runtimeEnv.API_URL, buildEnv.VITE_API_URL, 'http://localhost:4000');
export const MAIN_SITE = pick(runtimeEnv.MAIN_SITE, buildEnv.VITE_MAIN_SITE, 'http://localhost:4200');

// The other Nawishta apps, linked from the header (logo and app switcher). This app is DICTIONARY_URL.
export const LIBRARIES_URL = pick(runtimeEnv.LIBRARIES_URL, buildEnv.VITE_LIBRARIES_URL, 'http://localhost:4400');
export const LIBRARY_EDITOR_URL = pick(runtimeEnv.LIBRARY_EDITOR_URL, buildEnv.VITE_LIBRARY_EDITOR_URL, 'http://localhost:4300');
export const DICTIONARY_URL = pick(runtimeEnv.DICTIONARY_URL, buildEnv.VITE_DICTIONARY_URL, 'http://localhost:4500');

// A main-site account page that returns here afterwards.
export const accountUrl = (path: string) =>
  `${MAIN_SITE}${path}?returnUrl=${encodeURIComponent(window.location.href)}`;
