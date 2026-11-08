# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

LanguageTools ("Script Converter", served at `dictionary.nawishta.co.uk`) is a React single-page app over the platform's language tools: transliteration between Urdu (Arabic script), Hindi (Devanagari) and Roman, meaning dictionaries (GoldenDict-compatible StarDict/DSL import/export/lookup), per-language spelling word lists, and a scratch text editor.

**There is no backend in this repo.** Everything it shows comes from the `api` repo (`/tools/...` and `/dictionaries/...`; see the "Language tools" section of `api/CLAUDE.md`). Make backend changes there. The repo is laid out and shipped like the other front ends (`library-ui`, `library-editor`, `main-site`): Vite app at the root, nginx image, runtime environment config.

## Commands

```bash
npm install
npm start               # Vite dev server on http://localhost:4500 (calls the API at http://localhost:4000)
npm run build           # tsc --noEmit, then vite build -> dist/
npm run lint            # eslint (TypeScript + react-hooks)
npm run test:unit       # vitest (src/**/*.test.ts)
npm test                # Playwright end-to-end tests (tests/), starts the dev server itself
npm run test:debug      # Playwright UI mode
```

Node 22 is required (Mantine 9's packages declare it).

## Layout

```
src/                     the app (React 19 + TypeScript)
  config.ts              API_URL / MAIN_SITE / NODE_ENV, resolved at runtime (see "Configuration")
  api/http.ts            fetch wrapper: credentials, one token refresh on 401, ApiError
  api/languageTools.ts   every API call, typed; converts API shapes to what components use
  auth.tsx               current user (useAuth), login/logout via the main site
  pages/                 Converter, DictionaryManager (transliteration entries), NaturalDictionary
                         (+ DictionaryBrowser), SpellingWords, Corrections (autocorrect/punctuation
                         lists), TextEditor (+ editorStores.ts)
  components/            ArticleView, ArticleEditor, MergeDuplicates
  i18n/                  en.ts / ur.ts, useI18n()
  router.ts              tiny history-based router (no router library)
  test/setup.ts          vitest setup (minimal window for node)
public/env-config.js     empty runtime config for local dev (replaced in the container)
tests/                   Playwright specs (specs/) and page objects (pageObjects/)
config/nginx/nginx.conf  nginx config baked into the image
config/docker/           container-start script that writes /env-config.js from env vars
dockerfile               node build -> nginx
.github/workflows/       docker-image.yml (build, push, deploy), playwright.yml (lint, unit, e2e)
```

## Architecture

- **API access.** All requests go through `src/api/http.ts` with `credentials: 'include'`: the API authenticates with the httpOnly `token`/`refreshToken` cookies it sets on the shared parent domain when the user signs in on the main site. On a 401 the access token is refreshed once (shared between concurrent requests) and the request retried. `src/api/languageTools.ts` is the only place that knows URLs and response shapes; it maps them to the shapes the components were written against (e.g. the API's `wordLinks` → `links` with PascalCase link types, alternates array ↔ JSON string).
- **Auth and permissions.** `useAuth()` loads the user from `/accounts/user`; Log in sends people to the main site's `/account/login` with a return URL. Edit controls are driven by the API's HATEOAS links (`create`/`update`/`delete`), which already account for roles (Admin, DictionaryWriter, editors) and dictionary ownership — don't re-implement permission rules here.
- **Corrections** (`pages/Corrections.tsx`, `/corrections?profile=autocorrect|punctuation&language=…`) manages the autocorrect and punctuation lists that library-editor and the Editor tab apply. It moved here from library-editor, whose Tools menu now links to this page with `profile` and `language` in the URL — keep those parameters working. Any editor may add/edit/delete (per the API's links); bulk JSON import is offered to Admins/DictionaryWriters only.
- **Transliteration dictionary** is per language (`ur`, `hi`): roman → native spelling. The Converter saves word corrections into the dictionary of the non-Roman side.
- **Editor tab** (`pages/TextEditor.tsx`) is `@inshapardaz/likhari-react`'s `EditorRoot` (the editor library-editor uses), with stores in `pages/editorStores.ts` that load the API's autocorrect/punctuation lists and spelling word lists. Unsaved work is kept as a browser draft (`navigationGuard="save-draft"`), so the app needs no navigation guard. likhari-react requires React 19 and Mantine 9 as peers.
- **Vite resolve conditions.** likhari-react exports a `development` condition pointing at TypeScript source that isn't published; `vite.config.ts` pins `resolve.conditions` so the dev server uses the published build. Without it the Editor tab fails to load in `npm start` (the production build is unaffected) — the "loads the editor" Playwright test guards this.
- **UI** is Mantine 9 (`@mantine/core`, `hooks`, `dropzone`, `notifications`) with `@tabler/icons-react`; Mantine publishes agent-friendly docs at https://mantine.dev/llms.txt. Pages are lazy-loaded; `vite.config.ts`'s `manualChunks` splits `vendor-mantine`, `vendor-react`, `vendor-lexical` (Lexical comes in through likhari-react) and `vendor-icons`.
- **Themes.** `html[data-nw-theme="nawishta|white|black"]` (state in `AppWithI18n.tsx`, stored in local storage as `uiTheme`, set again in `main.tsx` before first render) picks the palette in `src/styles/appearance.css`; `createAppTheme()` in `src/theme` supplies the Mantine accent/shape on top of the locale's font stack. Use the semantic variables (`--paper*`, `--ink*`, `--nw-line`, `--nw-chrome-*`) rather than fixed greys. White/Black pin the colour scheme; Nawishta follows the light/dark/system toggle.
- **i18n** is hand-rolled (`src/i18n/`, English and Urdu/RTL) via `useI18n()`; `ur.ts` must define every key in `en.ts`.

## Configuration

Resolved at runtime so one image runs anywhere (same scheme as library-ui). Precedence:

1. `window.__ENV__` from `/env-config.js` — in the container, `config/docker/40-env-config.sh` writes it at start-up from the `API_URL`, `MAIN_SITE` and `NODE_ENV` environment variables, plus the links to the other apps (`LIBRARIES_URL`, `LIBRARY_EDITOR_URL`, `DICTIONARY_URL`; used by the header logo, which goes to `MAIN_SITE`, and the app switcher) (the `dockerfile` defaults them to production);
2. `VITE_API_URL` / `VITE_MAIN_SITE` / `VITE_NODE_ENV` (and `VITE_LIBRARIES_URL` / `VITE_LIBRARY_EDITOR_URL` / `VITE_DICTIONARY_URL`) from `.env.local` (see `.env.example`) for `npm start`;
3. `http://localhost:4000` / `http://localhost:4200` / `local`.

The API must allow this app's origin in `AppSettings__AllowedOrigins` (the dev server is `http://localhost:4500`).

## Deployment

`docker-image.yml` builds and pushes `ghcr.io/inshapardaz/languagetools` on every push and pull request to `main`, and on push deploys it to production by pulling the `environment` repo and restarting the `languagetools` service there. The container serves on port 80 and, for now, also 8080 — the port the environment proxy used for the old ASP.NET container; drop `listen 8080` from `config/nginx/nginx.conf` once the proxy points at port 80.
