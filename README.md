# Script Converter (LanguageTools)

The language tools front end for [nawishta.co.uk](https://nawishta.co.uk), served at `dictionary.nawishta.co.uk`:

- **Converter** — transliterate between Roman, Urdu (Arabic script) and Hindi (Devanagari); dictionary writers can correct words, which saves them to the transliteration dictionary.
- **Dictionary** — the per-language (Urdu, Hindi) transliteration dictionary: romanised spellings that should convert to a known native spelling.
- **Natural Dictionary** — meaning dictionaries: upload GoldenDict-compatible StarDict or DSL dictionaries, look words up across them, browse and edit articles, merge numbered duplicates, export to StarDict, DSL, JSON, Kobo or Kindle.
- **Spelling** — the per-language word lists the spell checker uses, with import (text or Hunspell `.dic`) and export.
- **Editor** — a scratch editor ([likhari](https://github.com/inshapardaz/likhari)) using the spelling lists and autocorrect/punctuation lists.

All data and logic live in the [api](https://github.com/inshapardaz/api) (`/tools` and `/dictionaries` endpoints); this repo is only the React app.

## Build & Deploy Status

[![Docker Image CI](https://github.com/inshapardaz/LanguageTools/actions/workflows/docker-image.yml/badge.svg)](https://github.com/inshapardaz/LanguageTools/actions/workflows/docker-image.yml)
[![Playwright Tests](https://github.com/inshapardaz/LanguageTools/actions/workflows/playwright.yml/badge.svg)](https://github.com/inshapardaz/LanguageTools/actions/workflows/playwright.yml)

## Getting started

Requires Node 22 and a running API (by default `http://localhost:4000`, which must allow `http://localhost:4500` in its CORS origins).

```bash
npm install
npm start            # http://localhost:4500
```

To use another API or main site, copy `.env.example` to `.env.local` and edit it.

```bash
npm run build        # type-check and build to dist/
npm run lint
npm run test:unit    # vitest
npm test             # Playwright end-to-end tests
```

## Docker

```bash
docker build -t languagetools .
docker run -p 4500:80 -e API_URL=http://localhost:4000 -e MAIN_SITE=http://localhost:4200 languagetools
```

`API_URL` and `MAIN_SITE` default to production. They are written into `/env-config.js` when the container starts, so one image runs in every environment.

## License

See the repository for licensing details.
