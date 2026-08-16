# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Nawishta ("Script Converter") is a .NET 8 solution for transliterating text between Urdu (Arabic script), Hindi (Devanagari), and Romanised forms, with a dictionary-enhanced conversion engine and GoldenDict-compatible "natural dictionary" import/export/lookup support. It ships as an ASP.NET Core minimal-API backend serving a React SPA frontend.

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

- React 18 + TypeScript + Vite. Built output goes to `../wwwroot`, served by the ASP.NET Core app; in dev, Vite runs standalone on `:5173` and proxies `/api` to the backend on `:5000` (see `vite.config.ts`).
- UI is built on **Mantine** (`@mantine/core`, `@mantine/hooks`, `@mantine/dropzone`, `@mantine/notifications`) with `@tabler/icons-react` for icons and `postcss-preset-mantine` for the CSS pipeline. Mantine publishes agent-friendly docs at **https://mantine.dev/llms.txt** (and per-page `.md` variants) — fetch that when working on components, props, or theming instead of guessing at the API.
- No router library: `router.ts` implements a minimal hand-rolled router over `window.history`/`popstate` (`useRouter()` hook), driving top-level page selection in `App.tsx` (`converter`, `dictionary`, `natural-dictionary`, `editor`) plus a `natural-dictionary/{id}` deep-link route.
- Pages (`src/pages/`) are lazy-loaded (`React.lazy`) for bundle splitting; Vite's `manualChunks` in `vite.config.ts` further splits `vendor-mantine`, `vendor-react`, `vendor-lexical`, and `vendor-icons` chunks.
- `TextEditor` (`pages/TextEditor.tsx` + `components/Editor/`) is a rich-text editor built on **Lexical** (`lexical`, `@lexical/react`, plus code/link/list/rich-text/selection/utils packages), with its own nodes, plugins, themes, and providers under `components/Editor/`. It registers a navigation guard (`navigationGuardRef`) with `App.tsx` so switching tabs while there are unsaved changes is intercepted and confirmed via `UnsavedChangesModal`.
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
