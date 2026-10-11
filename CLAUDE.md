# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Nawishta ("Script Converter") is the front end for the platform's language tools: transliteration between Urdu (Arabic script), Hindi (Devanagari) and Roman, meaning dictionaries (GoldenDict-compatible StarDict/DSL import/export/lookup), spelling dictionaries and a test-bench text editor.

**The backend now lives in the `api` repo** (`/tools/...` and `/dictionaries/...`; see the "Language tools" section of `api/CLAUDE.md`). The React SPA in `src/Nawishta.Web/ClientApp` calls it directly and is shipped as a static nginx container (`dockerfile`, `nginx.conf`, listening on 8080). The .NET projects described below (`Nawishta`, `Nawishta.NaturalDictionary`, `Nawishta.Web`, `Nawishta.Tests`) are no longer built or deployed: they are kept only until their removal, and their code was ported into `api` (`Adapters/Transliteration`, `Adapters/Dictionary.Formats`). Make backend changes in `api`, not here.

### Front end ↔ API

- `src/config.ts` picks the API and main-site URLs from the host (`dictionary.nawishta.co.uk` → `api.nawishta.co.uk`, `dictionary.nawishta.dev` → `api.nawishta.dev`, otherwise `http://localhost:4000`); `VITE_API_URL` / `VITE_MAIN_SITE` override them.
- `src/api/http.ts` sends every request with credentials (the API's httpOnly `token`/`refreshToken` cookies, set for the whole domain when signing in on the main site) and refreshes the access token once on a 401. `src/api/languageTools.ts` holds every endpoint call and converts API shapes to what the components use (e.g. the API's `wordLinks` → `links`).
- `src/auth.tsx` (`useAuth()`) loads the current user from `/accounts/user`; Log in sends people to the main site's `/account/login` with a return URL. Edit controls are shown from the API's HATEOAS links (`create`/`update`/`delete`), which already account for roles and dictionary ownership.
- Pages: Converter (transliteration + saving corrections to the per-language transliteration dictionary), Dictionary (transliteration entries per language), Natural Dictionary (meaning dictionaries), Spelling (per-language word lists), Editor (a scratch `@inshapardaz/likhari-react` editor whose spell check, autocorrect/punctuation and completions come from the API through the stores in `pages/editorStores.ts`).
- `npm run dev` serves on port 4500 (the port `environment/development/docker-compose.yml` publishes), which the API must list in `AppSettings__AllowedOrigins`.

All source lives under `src/`. The solution file is `Nawishta.slnx`.

## Projects

| Project | Path | Purpose |
|---|---|---|
| `Nawishta` | `src/Nawishta` | Core library: rule-based transliteration engine (`ScriptTransliterator`), character mapping tables, and the built-in transliteration dictionary (JSON/SQLite/MySQL storage) |
| `Nawishta.NaturalDictionary` | `src/Nawishta.NaturalDictionary` | GoldenDict-compatible dictionary import/export: StarDict and DSL parsers, EF Core/SQLite storage, exporters (StarDict, DSL, JSON, Kobo, Kindle) |
| `Nawishta.Web` | `src/Nawishta.Web` | ASP.NET Core minimal-API backend + React SPA frontend (`ClientApp/`) |
| `Nawishta.Tests` | `src/Nawishta.Tests` | xUnit tests for the transliteration engine |

## Commands

### Backend (.NET)

```bash
# Restore and build all projects
dotnet build

# Run the web app (API + SPA, serves ClientApp via SpaProxy in dev)
dotnet run --project src/Nawishta.Web

# Run all tests
dotnet test

# Run a single test class or method
dotnet test --filter "FullyQualifiedName~UrduToRomanTests"
dotnet test --filter "FullyQualifiedName~UrduToRomanTests.SomeMethodName"
```

### Frontend (React SPA — `src/Nawishta.Web/ClientApp`)

```bash
cd src/Nawishta.Web/ClientApp
npm install

npm run dev      # Vite dev server on :5173, proxies /api to :5000
npm run build    # tsc --noEmit type-check, then vite build -> ../wwwroot
npm run preview
```

There is no frontend test runner configured in `package.json`.

### Docker

```bash
docker build -t nawishta .
```

The `dockerfile` publishes `src/Nawishta.Web/Nawishta.Web.csproj` and runs it on port 5000.

## Architecture

### Transliteration engine (`Nawishta`)

- `ScriptTransliterator` (singleton, `ScriptTransliterator.Instance`) does rule-based, character-by-character conversion between `Script.Roman`, `Script.UrduArabic`, and `Script.HindiDevanagari` using mapping tables in `Mappings/` (`UrduRomanMap`, `HindiRomanMap`, `UrduHindiMap`, all built on `CharacterMap`/`MappingTable`).
- `DictionaryTransliterator` (in `Dictionary/`) wraps the rule-based engine and layers in phrase/word-level dictionary lookups so known words get their correct, non-mechanical spelling instead of a naive rule conversion. Its `ConvertWithPhrases` method is what the `/api/convert` endpoint calls.
- The built-in dictionary store is pluggable via `DictionaryStoreFactory` / `IDictionaryStore`, selected by `Dictionary:Provider` in `appsettings.json`: `Json` (default, file-backed via `JsonDictionaryStore`), `Sqlite`, or `MySql` (both via `EfDictionaryStore`). Provider/connection string/seeding are wired up in `src/Nawishta.Web/Program.cs`.

### Natural dictionary (`Nawishta.NaturalDictionary`)

- Separate subsystem for importing third-party, GoldenDict-compatible dictionaries (StarDict `.ifo/.idx/.dict[.dz|.gz]`, DSL `.dsl[.dz]`), delivered as `.zip`/`.tar.gz` archives.
- `DictionaryImportService` auto-detects format and drives the registered `IDictionaryParser` implementations (`StarDictParser`, `DslParser`); `DefinitionStructurer` normalizes raw definitions into structured `WordSense`/`WordLink` data.
- Storage is EF Core over SQLite (`NaturalDictionaryDbContext`, entities in `Storage/Entities`), accessed through `INaturalDictionaryStore` (`EfNaturalDictionaryStore`).
- `DictionaryExportService` exports a stored dictionary back out to StarDict, DSL, JSON, Kobo, or Kindle format.
- Registered via the `AddNaturalDictionary()` extension in `ServiceCollectionExtensions.cs`; connection string comes from `NaturalDictionary:ConnectionString` in `appsettings.json`.
- Also backs the app's spell-check feature: `/api/spellcheck/*` endpoints look words up in the natural dictionary first, fall back to the built-in transliteration dictionary, and track user-accepted replacements (`SpellCheckReplacementEntity`) to boost future suggestions by frequency.

### Web API (`Nawishta.Web`)

Minimal APIs (not MVC controllers), grouped by feature as `IEndpointRouteBuilder` extension methods under `Endpoints/`, each mapped from `Program.cs`:

- `Endpoints/ConvertEndpoints.cs` — `MapConvertEndpoints()` — `/api/convert`
- `Endpoints/DictionaryEndpoints.cs` — `MapDictionaryEndpoints()` — `/api/dictionary/*` CRUD + stats + bulk
- `Endpoints/NaturalDictionaryEndpoints.cs` — `MapNaturalDictionaryEndpoints()` — `/api/natural-dictionary/*` (upload/list/get/delete/lookup/suggest/browse/search/export/merge) and `/api/natural-dictionary/{dictId}/articles` CRUD
- `Endpoints/SpellCheckEndpoints.cs` — `MapSpellCheckEndpoints()` — `/api/spellcheck/*`

Request/response DTOs (records and plain classes) live in `Contracts/`, one file per feature area (`ConvertContracts.cs`, `DictionaryContracts.cs`, `NaturalDictionaryContracts.cs`, `SpellCheckContracts.cs`), matching the `Endpoints/` grouping. `Program.cs` itself only wires up DI/configuration and calls the `MapXxxEndpoints()` extensions. Non-`/api` routes fall back to `wwwroot/index.html` for SPA client-side routing. To add an endpoint, extend the relevant `Endpoints/*.cs` file (or add a new one + contracts file for a new feature area) rather than growing `Program.cs`.

Swagger (Swashbuckle) is enabled unconditionally (not gated to `Development`) at `/swagger`, since the app has no distinct `Production` deployment story beyond the Docker image. A real ASP.NET Core health check is mapped at `/health`; the `dockerfile`'s `HEALTHCHECK` polls it.

### Frontend (`Nawishta.Web/ClientApp`)

- React 19 + TypeScript + Vite. Built output goes to `dist/` and is served by nginx (see `dockerfile`); in dev, Vite runs on `:4500` and the app calls the API directly (see `src/config.ts`). Building needs Node 22 (Mantine 9).
- UI is built on **Mantine 9** (`@mantine/core`, `@mantine/hooks`, `@mantine/dropzone`, `@mantine/notifications`) with `@tabler/icons-react` for icons and `postcss-preset-mantine` for the CSS pipeline. Mantine publishes agent-friendly docs at **https://mantine.dev/llms.txt** (and per-page `.md` variants) — fetch that when working on components, props, or theming instead of guessing at the API.
- No router library: `router.ts` implements a minimal hand-rolled router over `window.history`/`popstate` (`useRouter()` hook), driving top-level page selection in `App.tsx` (`converter`, `dictionary`, `natural-dictionary`, `editor`) plus a `natural-dictionary/{id}` deep-link route.
- Pages (`src/pages/`) are lazy-loaded (`React.lazy`) for bundle splitting; Vite's `manualChunks` in `vite.config.ts` further splits `vendor-mantine`, `vendor-react`, `vendor-lexical` (Lexical comes in through likhari-react), and `vendor-icons` chunks.
- `TextEditor` (`pages/TextEditor.tsx`) is `@inshapardaz/likhari-react`'s `EditorRoot` (the same editor library-editor uses; it requires React 19 / Mantine 9 as peers). Unsaved work is kept as a browser draft (`navigationGuard="save-draft"`), so `App.tsx` needs no navigation guard.
- i18n is hand-rolled (`src/i18n/`, `en.ts`/`ur.ts`) via a `useI18n()` hook exposing `locale`/`setLocale`/`t()`, supporting English and Urdu (RTL).

## Configuration

Runtime config is `src/Nawishta.Web/appsettings.json` (and `appsettings.Development.json`):

```json
{
  "Dictionary": {
    "Provider": "Json",
    "ConnectionString": "Data/dictionary.json",
    "SeedIfEmpty": true
  },
  "NaturalDictionary": {
    "ConnectionString": "Data Source=Data/natural_dictionaries.db"
  }
}
```
