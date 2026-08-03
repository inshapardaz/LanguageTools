# Text Editor — Design

## Architecture

```
src/
  components/
    Editor/                         ← Reusable editor package
      index.ts                      ← Public exports
      Editor.tsx                    ← Main editor component
      EditorToolbar.tsx             ← Toolbar with formatting controls
      EditorStatusBar.tsx           ← Bottom bar (word count, zoom, script indicator)
      plugins/
        ToolbarPlugin.tsx           ← Lexical plugin for toolbar state sync
        SpellCheckPlugin.tsx        ← Spell-check underlines + suggestions
        AutocompletePlugin.tsx      ← Dictionary-based word completion
        AutocorrectPlugin.tsx       ← Auto-fix known mappings
        DictionaryLookupPlugin.tsx  ← Select word → show definition popup
        TransliteratePlugin.tsx     ← Convert selected/all text between scripts
        TextCleanupPlugin.tsx       ← Join lines, remove spaces, etc.
        ImagePlugin.tsx             ← Image insert/resize
        LinkPlugin.tsx              ← Link insert/edit
        ZoomPlugin.tsx              ← Document zoom level
      nodes/
        ImageNode.tsx               ← Custom Lexical node for images
      themes/
        editorTheme.ts              ← Lexical theme (class names for styling)
      types.ts                      ← Shared TypeScript types
      styles.css                    ← Editor-specific styles
  pages/
    TextEditor.tsx                  ← Page wrapper (integrates editor into app)
```

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Rich text engine | Lexical (Meta) | Extensible, performant, framework-agnostic core, excellent plugin system |
| UI framework | Mantine | Already used in the app; provides modals, menus, buttons for toolbar |
| Spell check | Custom plugin | Uses existing `/api/dictionary` and `/api/convert` endpoints |
| Autocomplete | Custom plugin | Uses `/api/dictionary?q=` prefix search |
| State persistence | localStorage | Simple, no backend needed for drafts |

## Component Design

### `Editor` (Main Component)

```tsx
interface EditorProps {
  // Configuration
  initialContent?: string;           // HTML or serialized Lexical state
  documentFont?: string;             // Applied to entire editor
  direction?: 'ltr' | 'rtl';        // Document direction
  zoom?: number;                     // Initial zoom (1.0 = 100%)

  // Feature toggles
  spellCheck?: boolean;
  autocomplete?: boolean;
  autocorrect?: boolean;
  showToolbar?: boolean;
  showStatusBar?: boolean;

  // Dictionary integration
  dictionaryProvider?: DictionaryProvider;

  // Callbacks
  onChange?: (html: string) => void;
  onSave?: (html: string) => void;

  // i18n
  labels?: Partial<EditorLabels>;
}

interface DictionaryProvider {
  lookup: (word: string) => Promise<DictEntry | null>;
  search: (prefix: string, limit?: number) => Promise<string[]>;
  suggest: (word: string) => Promise<string[]>;
  addWord: (entry: DictEntry) => Promise<void>;
  convert: (text: string, from: string, to: string) => Promise<string>;
}
```

### `EditorToolbar`

Groups:
1. **History** — Undo, Redo
2. **Block type** — Paragraph, H1–H6, Bullet list, Numbered list, Block quote, Code block
3. **Inline format** — Bold, Italic, Underline, Strikethrough, Superscript, Subscript
4. **Alignment** — Left, Center, Right, Justify
5. **Insert** — Link, Image
6. **Text tools** — Cleanup dropdown (join lines, remove spaces, trim), Transliterate dropdown
7. **Document** — Font selector, Zoom, Export

### `SpellCheckPlugin`

- Runs on a debounced timer (300ms after last edit)
- Iterates all text nodes in the document
- For each word, checks against `dictionaryProvider.lookup()`
- Words not found are decorated with a red underline (Lexical decoration)
- Right-click on underlined word shows context menu with:
  - Suggestions from `dictionaryProvider.suggest()`
  - "Add to dictionary" action
  - "Ignore" action

### `AutocompletePlugin`

- Monitors text input and tracks current word being typed
- After 2+ characters, calls `dictionaryProvider.search(prefix)`
- Shows a floating dropdown near the cursor with matches
- Tab/Enter accepts the top suggestion
- Arrow keys navigate suggestions
- Escape dismisses

### `AutocorrectPlugin`

- After a word boundary (space, punctuation), checks the previous word
- If the word has a known dictionary mapping with a different canonical form, auto-corrects
- Adds an undo step so the user can revert with Ctrl+Z
- Can be toggled on/off via toolbar or settings

### `DictionaryLookupPlugin`

- Double-click a word or select text + press a hotkey (Ctrl+D)
- Shows a floating card with:
  - Transliterations (Roman, Urdu, Hindi)
  - Meaning (if available)
  - "Edit in dictionary" link
  - "Transliterate in place" button (replaces selection with chosen script)

### `TransliteratePlugin`

- Toolbar dropdown: "Transliterate → Urdu" / "→ Hindi" / "→ Roman"
- Applies to selection or entire document if nothing selected
- Calls `/api/convert` endpoint
- Result replaces the text (with undo support)

### `TextCleanupPlugin`

Actions available in a toolbar dropdown:
- **Join lines**: Replace `\n` within selection with spaces
- **Remove multiple spaces**: Collapse `\s{2,}` → single space
- **Trim paragraphs**: Remove leading/trailing whitespace from each paragraph node
- **Remove empty paragraphs**: Delete paragraph nodes that are empty/whitespace-only

### `ImageNode`

- Custom Lexical `DecoratorNode`
- Renders `<img>` with optional resize handles
- Properties: `src`, `alt`, `width`, `height`
- Supports both URL and base64 data URIs

### `ZoomPlugin`

- Applies CSS `transform: scale(N)` on the editor content container
- Toolbar control: slider or +/- buttons
- Keyboard shortcuts: Ctrl+ / Ctrl- / Ctrl+0 (reset)
- Range: 50%–200% in 10% steps

## Data Flow

```
User types → Lexical state update
  → ToolbarPlugin syncs active formats to toolbar UI
  → SpellCheckPlugin (debounced) checks words
  → AutocompletePlugin checks current word prefix
  → AutocorrectPlugin checks completed word

User clicks toolbar button → Plugin applies format/action to Lexical state

Dictionary lookup:
  User selects word → DictionaryLookupPlugin
    → fetch /api/dictionary?q=word
    → fetch /api/convert (for transliterations)
    → display popup
    → user clicks "transliterate" → replace selection in Lexical state

Save:
  User clicks Save / Ctrl+S
    → serialize Lexical state to HTML
    → store in localStorage (key: doc-{id})
    → call onSave callback
```

## API Integration

| Feature | Endpoint | Method |
|---------|----------|--------|
| Spell check lookup | `/api/dictionary?q={word}` | GET |
| Autocomplete | `/api/dictionary?q={prefix}&limit=8` | GET |
| Add to dictionary | `/api/dictionary` | POST |
| Transliterate | `/api/convert` | POST |
| Dictionary popup | `/api/dictionary?q={word}` | GET |

## Document Storage (localStorage)

```json
{
  "id": "doc-1719...",
  "title": "Untitled",
  "font": "Noto Naskh Arabic",
  "direction": "rtl",
  "zoom": 1.0,
  "content": "<serialized Lexical JSON>",
  "updatedAt": "2024-..."
}
```

## Toolbar Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ↩ ↪ │ ¶ H1 H2 H3 • 1. ❝ │ B I U S │ ◀ ▬ ▶ ≡ │ 🔗 🖼 │ 🧹▾ 🔄▾ │ Font▾ 🔍+- │
└─────────────────────────────────────────────────────────────────────────┘
```

## Status Bar

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Words: 1,234 │ Characters: 7,890 │ Script: Roman │ Spell: ✓ │ Zoom: 100% │
└─────────────────────────────────────────────────────────────────────────┘
```

## Styling

- Editor area uses `contenteditable` div styled by Lexical theme
- Toolbar uses Mantine `ActionIcon`, `Menu`, `Select` components
- Spell-check underline: `text-decoration: underline wavy red`
- Autocomplete popup: Mantine `Paper` with `ScrollArea`
- Dictionary popup: Mantine `Popover`
- Supports dark mode via Mantine theme variables
- RTL-aware toolbar layout

## File Structure — Detailed

```
src/components/Editor/
├── index.ts                    # export { Editor, type EditorProps, type DictionaryProvider }
├── Editor.tsx                  # LexicalComposer + plugins + toolbar + status bar
├── EditorToolbar.tsx           # Toolbar component with all formatting controls
├── EditorStatusBar.tsx         # Word count, zoom, script indicator
├── plugins/
│   ├── ToolbarPlugin.tsx       # Syncs Lexical state → toolbar active states
│   ├── SpellCheckPlugin.tsx    # Underlines + context menu
│   ├── AutocompletePlugin.tsx  # Type-ahead suggestions
│   ├── AutocorrectPlugin.tsx   # Auto-fix on word boundary
│   ├── DictionaryLookupPlugin.tsx  # Select → popup
│   ├── TransliteratePlugin.tsx # Convert text between scripts
│   ├── TextCleanupPlugin.tsx   # Cleanup actions
│   ├── ImagePlugin.tsx         # Image insert/upload
│   ├── LinkPlugin.tsx          # Link insert/edit
│   └── ZoomPlugin.tsx          # Zoom control
├── nodes/
│   └── ImageNode.tsx           # Custom image node with resize
├── themes/
│   └── editorTheme.ts          # Class name mappings for Lexical
├── types.ts                    # DictionaryProvider, EditorLabels, etc.
└── styles.css                  # Editor-specific styles (spell underline, etc.)
```

## Implementation Phases

### Phase 1: Core Editor
- Lexical setup with basic formatting (bold, italic, underline)
- Block types (headings, lists, quotes)
- Alignment
- Toolbar with history (undo/redo)
- Document font selector
- Zoom
- Links and images

### Phase 2: Text Tools
- Text cleanup actions (join lines, remove spaces, trim)
- Transliterate plugin (selection and full document)
- Export (HTML, plain text, Markdown)
- Save/load from localStorage

### Phase 3: Dictionary Integration
- Spell check plugin
- Autocomplete plugin
- Autocorrect plugin
- Dictionary lookup popup
- Add to dictionary from editor

### Phase 4: Polish
- RTL editing improvements
- Mobile toolbar responsive layout
- Keyboard shortcuts documentation
- Performance optimization for large documents
