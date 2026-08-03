import { useCallback, useEffect, useRef, useState } from 'react';
import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from 'lexical';

// ─── Serialized type ───────────────────────────────────────────────────────────

export type SerializedImageNode = Spread<
  {
    src: string;
    alt: string;
    width: number | 'inherit';
    height: number | 'inherit';
  },
  SerializedLexicalNode
>;

// ─── ImageNode (DecoratorNode) ─────────────────────────────────────────────────

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __width: number | 'inherit';
  __height: number | 'inherit';

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__width, node.__height, node.__key);
  }

  constructor(
    src: string,
    alt: string,
    width: number | 'inherit' = 'inherit',
    height: number | 'inherit' = 'inherit',
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__width = width;
    this.__height = height;
  }

  // ─── DOM creation ──────────────────────────────────────────────────────────

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  // ─── HTML export (for clipboard / export) ──────────────────────────────────

  exportDOM(): DOMExportOutput {
    const img = document.createElement('img');
    img.setAttribute('src', this.__src);
    img.setAttribute('alt', this.__alt);
    if (this.__width !== 'inherit') {
      img.setAttribute('width', String(this.__width));
    }
    if (this.__height !== 'inherit') {
      img.setAttribute('height', String(this.__height));
    }
    return { element: img };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  // ─── JSON serialization ────────────────────────────────────────────────────

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      alt: this.__alt,
      width: this.__width,
      height: this.__height,
    };
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      src: serializedNode.src,
      alt: serializedNode.alt,
      width: serializedNode.width,
      height: serializedNode.height,
    });
  }

  // ─── Property getters/setters ──────────────────────────────────────────────

  getSrc(): string {
    return this.__src;
  }

  getAlt(): string {
    return this.__alt;
  }

  setWidthAndHeight(width: number | 'inherit', height: number | 'inherit'): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  // ─── Decorate (render React component) ─────────────────────────────────────

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        alt={this.__alt}
        width={this.__width}
        height={this.__height}
        nodeKey={this.getKey()}
      />
    );
  }
}

// ─── DOM → Node conversion ─────────────────────────────────────────────────────

function convertImageElement(domNode: Node): DOMConversionOutput | null {
  if (domNode instanceof HTMLImageElement) {
    const src = domNode.getAttribute('src');
    const alt = domNode.getAttribute('alt') || '';
    const widthAttr = domNode.getAttribute('width');
    const heightAttr = domNode.getAttribute('height');
    const width = widthAttr ? Number(widthAttr) : 'inherit';
    const height = heightAttr ? Number(heightAttr) : 'inherit';

    if (src) {
      const node = $createImageNode({ src, alt, width, height });
      return { node };
    }
  }
  return null;
}

// ─── Helper: create image node ─────────────────────────────────────────────────

export interface ImagePayload {
  src: string;
  alt?: string;
  width?: number | 'inherit';
  height?: number | 'inherit';
  key?: NodeKey;
}

export function $createImageNode({
  src,
  alt = '',
  width = 'inherit',
  height = 'inherit',
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, alt, width, height, key));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}

// ─── ImageComponent (React decorator) ──────────────────────────────────────────

interface ImageComponentProps {
  src: string;
  alt: string;
  width: number | 'inherit';
  height: number | 'inherit';
  nodeKey: NodeKey;
}

function ImageComponent({ src, alt, width, height, nodeKey }: ImageComponentProps) {
  const [editor] = useLexicalComposerContext();
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState<number | 'inherit'>(width);
  const [currentHeight, setCurrentHeight] = useState<number | 'inherit'>(height);

  // Keep local state synced with node properties
  useEffect(() => {
    setCurrentWidth(width);
    setCurrentHeight(height);
  }, [width, height]);

  // Handle selection click
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (imageRef.current && imageRef.current.contains(event.target as Node)) {
        if (!event.shiftKey) {
          clearSelection();
        }
        setSelected(true);
        return true;
      }
      return false;
    },
    [clearSelection, setSelected],
  );

  // Delete on backspace/delete when selected
  const handleDelete = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected) {
        event.preventDefault();
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if (node) {
            node.remove();
          }
        });
        return true;
      }
      return false;
    },
    [editor, isSelected, nodeKey],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(CLICK_COMMAND, handleClick, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, handleDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_DELETE_COMMAND, handleDelete, COMMAND_PRIORITY_LOW),
    );
  }, [editor, handleClick, handleDelete]);

  // ─── Resize logic ─────────────────────────────────────────────────────────

  // Ref-based approach ensures the pointerup handler reads the latest size
  const widthRef = useRef(currentWidth);
  const heightRef = useRef(currentHeight);
  useEffect(() => {
    widthRef.current = currentWidth;
    heightRef.current = currentHeight;
  }, [currentWidth, currentHeight]);

  const handleResizeStartStable = useCallback(
    (
      event: React.PointerEvent,
      direction: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    ) => {
      event.preventDefault();
      event.stopPropagation();
      setIsResizing(true);

      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth =
        widthRef.current === 'inherit'
          ? imageRef.current?.naturalWidth || 300
          : (widthRef.current as number);
      const startHeight =
        heightRef.current === 'inherit'
          ? imageRef.current?.naturalHeight || 200
          : (heightRef.current as number);
      const aspectRatio = startWidth / startHeight;

      const handlePointerMove = (e: PointerEvent) => {
        let deltaX = e.clientX - startX;
        let deltaY = e.clientY - startY;

        if (direction === 'top-left' || direction === 'bottom-left') {
          deltaX = -deltaX;
        }
        if (direction === 'top-left' || direction === 'top-right') {
          deltaY = -deltaY;
        }

        const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
        const newWidth = Math.max(50, startWidth + delta);
        const newHeight = Math.max(50, Math.round(newWidth / aspectRatio));

        setCurrentWidth(newWidth);
        setCurrentHeight(newHeight);
      };

      const handlePointerUp = () => {
        setIsResizing(false);
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);

        // Commit final size to node
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.setWidthAndHeight(
              widthRef.current === 'inherit' ? startWidth : (widthRef.current as number),
              heightRef.current === 'inherit' ? startHeight : (heightRef.current as number),
            );
          }
        });
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    },
    [editor, nodeKey],
  );

  const imgWidth = currentWidth === 'inherit' ? undefined : currentWidth;
  const imgHeight = currentHeight === 'inherit' ? undefined : currentHeight;

  return (
    <span
      className={`editor-image-container ${isSelected ? 'editor-image-selected' : ''}`}
      style={{ display: 'inline-block', position: 'relative' }}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        width={imgWidth}
        height={imgHeight}
        style={{
          display: 'block',
          maxWidth: '100%',
          cursor: 'default',
        }}
        draggable={false}
      />
      {isSelected && (
        <>
          <span
            className="editor-image-resize-handle editor-image-resize-tl"
            onPointerDown={(e) => handleResizeStartStable(e, 'top-left')}
            role="separator"
            aria-label="Resize image from top-left"
            aria-orientation="horizontal"
          />
          <span
            className="editor-image-resize-handle editor-image-resize-tr"
            onPointerDown={(e) => handleResizeStartStable(e, 'top-right')}
            role="separator"
            aria-label="Resize image from top-right"
            aria-orientation="horizontal"
          />
          <span
            className="editor-image-resize-handle editor-image-resize-bl"
            onPointerDown={(e) => handleResizeStartStable(e, 'bottom-left')}
            role="separator"
            aria-label="Resize image from bottom-left"
            aria-orientation="horizontal"
          />
          <span
            className="editor-image-resize-handle editor-image-resize-br"
            onPointerDown={(e) => handleResizeStartStable(e, 'bottom-right')}
            role="separator"
            aria-label="Resize image from bottom-right"
            aria-orientation="horizontal"
          />
        </>
      )}
    </span>
  );
}
