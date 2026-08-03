export type {
  DictEntry,
  DictionaryProvider,
  EditorLabels,
  EditorProps,
  EditorRefHandle,
} from './types';

export type { EditorToolbarProps } from './EditorToolbar';
export type { EditorStatusBarProps } from './EditorStatusBar';
export type { ZoomPluginProps } from './plugins/ZoomPlugin';
export type { ImagePayload, SerializedImageNode } from './nodes/ImageNode';
export type { InsertImagePayload } from './plugins/ImagePlugin';

export { default as editorTheme } from './themes/editorTheme';
export { default as Editor } from './Editor';
export { default as EditorToolbar } from './EditorToolbar';
export { default as EditorStatusBar } from './EditorStatusBar';
export { default as DocumentManager } from './DocumentManager';
export { default as ToolbarPlugin } from './plugins/ToolbarPlugin';
export { default as ZoomPlugin } from './plugins/ZoomPlugin';
export { default as ImagePlugin } from './plugins/ImagePlugin';
export { default as SavePlugin } from './plugins/SavePlugin';
export { default as SpellCheckPlugin } from './plugins/SpellCheckPlugin';
export { ImageNode, $createImageNode, $isImageNode } from './nodes/ImageNode';
export { INSERT_IMAGE_COMMAND } from './plugins/ImagePlugin';
export { createApiDictionaryProvider } from './providers/ApiDictionaryProvider';
