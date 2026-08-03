# Text Editor — Implementation Tasks

## Phase 1: Core Editor

- [x] 1. Install Lexical dependencies (`@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/link`, `@lexical/code`, `@lexical/selection`, `@lexical/utils`)
- [x] 2. Create `src/components/Editor/` folder structure with `types.ts`, `themes/editorTheme.ts`, `styles.css`
- [x] 3. Implement `Editor.tsx` — LexicalComposer with RichTextPlugin, HistoryPlugin, ListPlugin, LinkPlugin, basic theme
- [x] 4. Implement `EditorToolbar.tsx` — Undo/Redo, Block type selector (P, H1-H6), Inline format buttons (B, I, U, S), Alignment buttons
- [x] 5. Implement `plugins/ToolbarPlugin.tsx` — Syncs Lexical editor state to toolbar active states (bold active, current block type, etc.)
- [x] 6. Implement font selector (document-level) — Dropdown that sets CSS font-family on the editor root
- [x] 7. Implement `plugins/ZoomPlugin.tsx` — Scale the editor content area, toolbar controls, keyboard shortcuts
- [x] 8. Implement `plugins/LinkPlugin.tsx` — Insert/edit link modal, auto-detect URLs
- [x] 9. Implement `plugins/ImagePlugin.tsx` and `nodes/ImageNode.tsx` — Insert via URL or file upload, resize handles, alt text
- [x] 10. Implement `EditorStatusBar.tsx` — Word count, character count, current script detection, zoom display
- [x] 11. Create `pages/TextEditor.tsx` — Page wrapper that integrates the editor into the app with nav tab
- [x] 12. Add "Editor" tab to `App.tsx` and routing, add i18n keys for editor labels

## Phase 2: Text Tools

- [x] 13. Implement `plugins/TextCleanupPlugin.tsx` — Join lines, remove multiple spaces, trim paragraphs, remove empty paragraphs
- [x] 14. Implement `plugins/TransliteratePlugin.tsx` — Direction selector, apply to selection or full doc via `/api/convert`
- [x] 15. Implement document Save/Load — Serialize Lexical state to localStorage, list saved documents, open/delete
- [x] 16. Implement Export — HTML download, plain text download, Markdown download

## Phase 3: Dictionary Integration

- [x] 17. Define `DictionaryProvider` interface and implement it using existing `/api/dictionary` and `/api/convert` endpoints
- [x] 18. Implement `plugins/SpellCheckPlugin.tsx` — Debounced word checking, red underline decorations, right-click suggestions
- [x] 19. Implement `plugins/AutocompletePlugin.tsx` — Floating suggestion popup, Tab/Enter to accept, arrow navigation
- [x] 20. Implement `plugins/AutocorrectPlugin.tsx` — Word boundary detection, auto-replace with undo support, toggle on/off
- [x] 21. Implement `plugins/DictionaryLookupPlugin.tsx` — Double-click or Ctrl+D popup with transliterations, meaning, edit link

## Phase 4: Polish

- [x] 22. RTL editing — Correct cursor behavior, paragraph direction toggle, mixed LTR/RTL support
- [x] 23. Mobile/responsive toolbar — Collapsed groups, overflow menu on small screens
- [x] 24. Keyboard shortcuts panel — Help modal listing all available shortcuts
- [x] 25. Performance optimization — Debounce spell-check for large docs, virtual list for autocomplete
- [x] 26. Accessibility audit — ARIA labels, focus management, screen reader testing
