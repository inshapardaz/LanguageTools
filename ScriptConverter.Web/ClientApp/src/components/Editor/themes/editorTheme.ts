import type { EditorThemeClasses } from 'lexical';

/**
 * Lexical theme class name mappings for the Editor.
 * Each key maps to a CSS class used for styling that element type.
 */
const editorTheme: EditorThemeClasses = {
  // Root
  root: 'editor-root',
  
  // Text formatting
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underline-strikethrough',
    subscript: 'editor-text-subscript',
    superscript: 'editor-text-superscript',
    code: 'editor-text-code',
  },

  // Block types
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  code: 'editor-code-block',

  // Lists
  list: {
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-list-item',
    nested: {
      listitem: 'editor-nested-list-item',
    },
    listitemChecked: 'editor-list-item-checked',
    listitemUnchecked: 'editor-list-item-unchecked',
  },

  // Links
  link: 'editor-link',

  // Image
  image: 'editor-image',
};

export default editorTheme;
