# Script Converter

A .NET 8 solution for transliterating text between Urdu (Arabic script), Hindi (Devanagari), and Romanised forms — with dictionary-enhanced conversion and GoldenDict-compatible natural dictionary support.

## Projects

| Project | Description |
|---------|-------------|
| `Nawishta` | Core library — rule-based transliteration engine, character mappings, and dictionary store |
| `Nawishta.NaturalDictionary` | GoldenDict-compatible dictionary import — StarDict and DSL parsers, SQLite storage |
| `Nawishta.Web` | ASP.NET Core web API + React SPA frontend |
| `Nawishta.Tests` | xUnit test suite |

## Features

### Script Transliteration

All six conversion directions between three scripts:

- Roman &harr; Urdu Arabic
- Roman &harr; Hindi Devanagari
- Urdu Arabic &harr; Hindi Devanagari

Conversion uses a rule-based engine with character mapping tables, enhanced by a dictionary for known words (providing correct spellings that rule-based mapping can't always produce).

### Natural Dictionary (GoldenDict-compatible)

Upload any GoldenDict-compatible dictionary source and use it as a lookup dictionary within the app.

**Supported formats:**

- **StarDict** — `.ifo` + `.idx` + `.dict` (or `.dict.dz` / `.dict.gz`)
- **DSL** — ABBYY Lingvo `.dsl` (or `.dsl.dz`)

**Capabilities:**

- Upload dictionaries as `.zip` or `.tar.gz` archives
- Auto-detection of dictionary format
- Browse entries alphabetically with pagination
- Search headwords within a dictionary
- Cross-dictionary word lookup
- Autocomplete suggestions

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/) (for the frontend)

### Build

```bash
# Restore and build all projects
dotnet build

# Build the frontend
cd Nawishta.Web/ClientApp
npm install
npm run build
```

### Run

```bash
# Run the web app (API + SPA)
dotnet run --project Nawishta.Web
```

The app will be available at `http://localhost:5000` (or the port configured in `launchSettings.json`).

## API Reference

### Conversion

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/convert` | Convert text between scripts |

**Request body:**
```json
{ "text": "salam", "from": "Roman", "to": "UrduArabic" }
```

### Transliteration Dictionary (built-in)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dictionary?q=&limit=` | List/search entries |
| GET | `/api/dictionary/stats` | Dictionary statistics |
| POST | `/api/dictionary` | Add an entry |
| PUT | `/api/dictionary/{id}` | Update an entry |
| DELETE | `/api/dictionary/{id}` | Delete an entry |
| POST | `/api/dictionary/bulk` | Bulk import entries |

### Natural Dictionary (GoldenDict)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/natural-dictionary/upload` | Upload a dictionary archive (multipart form, field: `file`) |
| GET | `/api/natural-dictionary` | List all imported dictionaries |
| GET | `/api/natural-dictionary/{id}` | Get dictionary metadata |
| DELETE | `/api/natural-dictionary/{id}` | Delete a dictionary |
| GET | `/api/natural-dictionary/lookup?word=` | Look up a word across all dictionaries |
| GET | `/api/natural-dictionary/suggest?prefix=` | Autocomplete headword suggestions |
| GET | `/api/natural-dictionary/{id}/browse?page=&pageSize=` | Browse entries in a dictionary |
| GET | `/api/natural-dictionary/{id}/search?q=&page=&pageSize=` | Search within a dictionary |

## Configuration

Configuration is in `Nawishta.Web/appsettings.json`:

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

**Dictionary providers:** `Json` (default, file-based), `Sqlite`, `MySql`

## Tests

```bash
dotnet test
```

## Project Structure

```
Nawishta/
  Converters/        — Script-specific converter implementations
  Mappings/          — Character mapping tables (Urdu-Roman, Hindi-Roman, Urdu-Hindi)
  Dictionary/        — Built-in transliteration dictionary (JSON/SQLite/MySQL storage)

Nawishta.NaturalDictionary/
  Models/            — Domain models (NaturalDictionaryInfo, Article, BrowseResult)
  Parsers/           — Format parsers (StarDictParser, DslParser)
  Services/          — DictionaryImportService (archive extraction + format detection)
  Storage/           — EF Core entities, DbContext, and store implementation

Nawishta.Web/
  Program.cs         — API endpoints (minimal APIs)
  ClientApp/src/     — React SPA (Converter, DictionaryManager, NaturalDictionary, DictionaryBrowser)
```

## License

Private project.
