# Text Editor — Requirements

## Overview

A rich text editor page integrated into the Script Converter web app, built as a reusable React component using Lexical. It combines standard word-processing features with the app's transliteration, dictionary, and spell-checking capabilities.

## Functional Requirements

### FR-1: Rich Text Formatting
- Bold, italic, underline, strikethrough
- Font size control
- Text color and background color
- Superscript and subscript

### FR-2: Font Selection (Document-level)
- Font family selector applies to the entire document, not per-selection
- Include system fonts + Urdu UI (Noto Naskh Arabic) + Noto Sans Devanagari
- Persist font choice in document metadata

### FR-3: Block-Level Formatting
- Heading levels (H1–H6)
- Paragraph
- Bulleted list
- Numbered list
- Block quote
- Code block

### FR-4: Text Alignment
- Left, Center, Right, Justify
- Applies to current paragraph/block

### FR-5: Links
- Insert/edit hyperlinks
- Display URL and optional title
- Open in new tab option

### FR-6: Images
- Insert images via URL
- Insert embedded images (base64 / file upload)
- Resize handles
- Alt text support

### FR-7: Zoom
- Document zoom level control (50%–200%)
- Keyboard shortcuts (Ctrl+/Ctrl-)

### FR-8: Text Cleanup Tools
- **Join lines** — merge selected lines into one paragraph, removing line breaks
- **Remove multiple spaces** — collapse consecutive spaces into single space
- **Trim whitespace** — remove leading/trailing whitespace from paragraphs
- **Remove empty paragraphs** — delete blank lines

### FR-9: Spell Checker
- Underline misspelled words with red squiggly
- Uses the transliteration dictionary as word list
- Right-click context menu with suggestions
- Add word to dictionary option
- Support for Roman, Urdu, and Hindi scripts

### FR-10: Autocomplete
- As-you-type word suggestions from the transliteration dictionary
- Triggered after 2+ characters
- Popup positioned near cursor
- Accept with Tab or Enter

### FR-11: Autocorrect
- Automatically correct known misspellings using dictionary mappings
- Configurable on/off toggle
- Shows correction inline (can undo with Ctrl+Z)

### FR-12: Dictionary Integration
- Select a word and look up its dictionary entry
- Inline popup showing transliteration results (Roman ↔ Urdu ↔ Hindi)
- Option to transliterate selected text in-place
- Quick-add word to dictionary from editor context menu

### FR-13: Transliteration
- Convert selected text or entire document between scripts
- Direction selector (same as Converter page)
- Preview before applying
- Undo support

### FR-14: Document Management
- New document
- Save/load from browser localStorage
- Export as HTML, plain text, or Markdown
- Import plain text or HTML

## Non-Functional Requirements

### NFR-1: Reusability
- Editor component lives in `src/components/Editor/` as a self-contained package
- Accepts configuration props (toolbar features, dictionary provider, fonts)
- No hard dependencies on app-level routing or i18n (accepts translations as props)
- Can be extracted to a standalone npm package later

### NFR-2: Performance
- Handle documents up to 50,000 words without lag
- Debounced spell-check (300ms after last keystroke)
- Virtual rendering for autocomplete dropdown

### NFR-3: RTL Support
- Full RTL editing when document font/direction is set to Urdu
- Mixed LTR/RTL paragraphs
- Correct cursor movement in RTL mode

### NFR-4: Accessibility
- All toolbar buttons have aria-labels
- Keyboard navigation for all tools
- Screen reader compatible
- High contrast mode support

### NFR-5: Internationalization
- All UI labels come from the app's i18n system
- RTL toolbar layout when UI is in Urdu
