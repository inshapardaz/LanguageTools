import { useCallback, useMemo, useState } from 'react';
import { Box, Divider, Menu, Paper } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin as LexicalLinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { $generateHtmlFromNodes } from '@lexical/html';
import type { EditorState, LexicalEditor } from 'lexical';
import { $getRoot, $insertNodes } from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';

import editorTheme from './themes/editorTheme';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import ZoomPlugin from './plugins/ZoomPlugin';
import TextCleanupPlugin from './plugins/TextCleanupPlugin';
import TransliteratePlugin from './plugins/TransliteratePlugin';
import ExportPlugin from './plugins/ExportPlugin';
import RTLPlugin from './plugins/RTLPlugin';
import type { ParagraphDirection } from './plugins/RTLPlugin';
import LinkPlugin from './plugins/LinkPlugin';
import ImagePlugin from './plugins/ImagePlugin';
import SavePlugin from './plugins/SavePlugin';
import KeyboardShortcutsPlugin from './plugins/KeyboardShortcutsPlugin';
import SpellCheckPlugin from './plugins/SpellCheckPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import AutocorrectPlugin from './plugins/AutocorrectPlugin';
import DictionaryLookupPlugin from './plugins/DictionaryLookupPlugin';
import EditorStatusBar from './EditorStatusBar';
import EditorRefPlugin from './plugins/EditorRefPlugin';
import { ImageNode } from './nodes/ImageNode';
import type { EditorProps } from './types';
import './styles.css';

/**
 * Main rich text editor component built on Lexical.
 * Provides rich text editing with headings, lists, links, code blocks,
 * undo/redo history, and configurable direction/zoom/font.
 */
export default function Editor({
  initialContent,
  initialEditorState,
  documentFont,
  direction = 'ltr',
  zoom: initialZoom = 1,
  spellCheck = false,
  autocomplete = false,
  autocorrect = false,
  showToolbar = true,
  showStatusBar = true,
  dictionaryProvider,
  onChange,
  onSave,
  editorRef,
}: EditorProps) {
  const [currentFont, setCurrentFont] = useState<string>(documentFont || '');
  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const [activeDirection, setActiveDirection] = useState<ParagraphDirection>(direction === 'rtl' ? 'rtl' : 'ltr');
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;

  const handleDirectionChange = useCallback((dir: ParagraphDirection) => {
    if (dir) {
      setActiveDirection(dir);
    }
  }, []);
  const initialConfig = useMemo(
    () => ({
      namespace: 'ScriptConverterEditor',
      theme: editorTheme,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        AutoLinkNode,
        CodeNode,
        CodeHighlightNode,
        ImageNode,
        HorizontalRuleNode,
      ],
      onError: (error: Error) => {
        console.error('[Editor]', error);
      },
      editorState: initialEditorState
        ? initialEditorState
        : initialContent
          ? (editor: LexicalEditor) => {
              const parser = new DOMParser();
              const dom = parser.parseFromString(initialContent, 'text/html');
              const nodes = $generateNodesFromDOM(editor, dom);
              const root = $getRoot();
              root.clear();
              root.selectEnd();
              $insertNodes(nodes);
            }
          : undefined,
    }),
    // initialConfig is only read once by LexicalComposer, so we intentionally
    // exclude initialContent/initialEditorState from deps to avoid re-creating the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      if (!onChange) return;
      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor);
        onChange(html);
      });
    },
    [onChange],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <Paper
        withBorder
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Toolbar */}
        {showToolbar && (
          <Box
            component="nav"
            aria-label="Editor toolbar"
            px="sm"
            py="xs"
            style={{
              borderBottom: '1px solid var(--mantine-color-default-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--mantine-spacing-xs)',
            }}
          >
            <ToolbarPlugin
              currentFont={currentFont}
              onFontChange={setCurrentFont}
              compact={isMobile}
              currentDirection={activeDirection}
              overflowItems={
                isMobile ? (
                  <>
                    <Menu.Item closeMenuOnClick={false}>
                      <ZoomPlugin initialZoom={initialZoom} onZoomChange={setCurrentZoom} />
                    </Menu.Item>
                    <Menu.Item closeMenuOnClick={false}>
                      <RTLPlugin onDirectionChange={handleDirectionChange} />
                    </Menu.Item>
                    <Menu.Item closeMenuOnClick={false}>
                      <TextCleanupPlugin />
                    </Menu.Item>
                    <Menu.Item closeMenuOnClick={false}>
                      <TransliteratePlugin />
                    </Menu.Item>
                    <Menu.Item closeMenuOnClick={false}>
                      <ExportPlugin />
                    </Menu.Item>
                    <Menu.Item closeMenuOnClick={false}>
                      <KeyboardShortcutsPlugin />
                    </Menu.Item>
                  </>
                ) : undefined
              }
            />
            {!isMobile && (
              <>
                <Divider orientation="vertical" />
                <ZoomPlugin initialZoom={initialZoom} onZoomChange={setCurrentZoom} />
                <Divider orientation="vertical" />
                <RTLPlugin onDirectionChange={handleDirectionChange} />
                <Divider orientation="vertical" />
                <TextCleanupPlugin />
                <TransliteratePlugin />
                <ExportPlugin />
                <Divider orientation="vertical" />
                <KeyboardShortcutsPlugin />
              </>
            )}
          </Box>
        )}

        {/* Editor content area */}
        <Box
          component="section"
          aria-label="Document editing area"
          dir={activeDirection || direction}
          className="editor-content-area"
          style={{
            flex: 1,
            overflow: 'auto',
          }}
        >
          <Box
            style={{
              fontFamily: currentFont || 'inherit',
              transform: currentZoom !== 1 ? `scale(${currentZoom})` : undefined,
              transformOrigin: (activeDirection || direction) === 'rtl' ? 'top right' : 'top left',
              width: currentZoom !== 1 ? `${100 / currentZoom}%` : undefined,
            }}
          >
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-root"
                  aria-label="Rich text editor"
                  aria-multiline="true"
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </Box>
        </Box>

        {/* Status bar */}
        {showStatusBar && (
          <Box
            component="footer"
            aria-label="Editor status"
            px="sm"
            py={4}
            style={{
              borderTop: '1px solid var(--mantine-color-default-border)',
              fontSize: '0.75rem',
            }}
          >
            <EditorStatusBar zoom={currentZoom} />
          </Box>
        )}
      </Paper>

      {/* Plugins */}
      <HistoryPlugin />
      <ListPlugin />
      <HorizontalRulePlugin />
      <LexicalLinkPlugin />
      <LinkPlugin />
      <ImagePlugin />
      <SavePlugin onSave={onSave} />
      {editorRef && <EditorRefPlugin editorRef={editorRef} />}
      {onChange && <OnChangePlugin onChange={handleChange} ignoreSelectionChange />}
      {spellCheck && dictionaryProvider && (
        <SpellCheckPlugin dictionaryProvider={dictionaryProvider} />
      )}
      {autocomplete && dictionaryProvider && (
        <AutocompletePlugin dictionaryProvider={dictionaryProvider} />
      )}
      {autocorrect && dictionaryProvider && (
        <AutocorrectPlugin dictionaryProvider={dictionaryProvider} />
      )}
      {dictionaryProvider && (
        <DictionaryLookupPlugin dictionaryProvider={dictionaryProvider} />
      )}
    </LexicalComposer>
  );
}
