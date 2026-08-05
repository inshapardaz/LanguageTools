/**
 * Export utilities for the text editor.
 * Supports downloading editor content as HTML, plain text, or Markdown.
 */
import { $generateHtmlFromNodes } from '@lexical/html';
import { $getRoot } from 'lexical';
import type { LexicalEditor } from 'lexical';

// --- Download helper ---

/**
 * Trigger a file download in the browser using Blob + object URL.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Export functions ---

/**
 * Export the editor content as an HTML file.
 * Wraps the generated HTML in a basic document structure.
 */
export function exportAsHtml(editor: LexicalEditor): void {
  editor.getEditorState().read(() => {
    const html = $generateHtmlFromNodes(editor);
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
${html}
</body>
</html>`;
    downloadFile(fullHtml, 'document.html', 'text/html;charset=utf-8');
  });
}

/**
 * Export the editor content as a plain text file.
 * Uses Lexical's built-in getTextContent() which preserves paragraph breaks.
 */
export function exportAsPlainText(editor: LexicalEditor): void {
  editor.getEditorState().read(() => {
    const root = $getRoot();
    const text = root.getTextContent();
    downloadFile(text, 'document.txt', 'text/plain;charset=utf-8');
  });
}

/**
 * Export the editor content as a Markdown file.
 * Generates HTML first, then converts to Markdown.
 */
export function exportAsMarkdown(editor: LexicalEditor): void {
  editor.getEditorState().read(() => {
    const html = $generateHtmlFromNodes(editor);
    const markdown = htmlToMarkdown(html);
    downloadFile(markdown, 'document.md', 'text/markdown;charset=utf-8');
  });
}

// --- HTML to Markdown converter ---

/**
 * Convert an HTML string to Markdown.
 * Handles common elements: headings, bold, italic, underline, strikethrough,
 * links, lists, blockquotes, code blocks, and paragraphs.
 */
export function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return convertNodes(doc.body.childNodes).trim();
}

function convertNodes(nodes: NodeListOf<ChildNode> | ChildNode[]): string {
  let result = '';
  for (const node of Array.from(nodes)) {
    result += convertNode(node);
  }
  return result;
}

function convertNode(node: ChildNode): string {
  // Text node
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  // Element node
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'h1':
      return `# ${getInlineContent(el)}\n\n`;
    case 'h2':
      return `## ${getInlineContent(el)}\n\n`;
    case 'h3':
      return `### ${getInlineContent(el)}\n\n`;
    case 'h4':
      return `#### ${getInlineContent(el)}\n\n`;
    case 'h5':
      return `##### ${getInlineContent(el)}\n\n`;
    case 'h6':
      return `###### ${getInlineContent(el)}\n\n`;

    case 'p':
      return `${getInlineContent(el)}\n\n`;

    case 'br':
      return '\n';

    case 'strong':
    case 'b':
      return `**${getInlineContent(el)}**`;

    case 'em':
    case 'i':
      return `*${getInlineContent(el)}*`;

    case 'u':
      return `<u>${getInlineContent(el)}</u>`;

    case 's':
    case 'del':
    case 'strike':
      return `~~${getInlineContent(el)}~~`;

    case 'a': {
      const href = el.getAttribute('href') || '';
      const text = getInlineContent(el);
      return `[${text}](${href})`;
    }

    case 'code': {
      // Inline code (no block parent)
      const parent = el.parentElement;
      if (parent && parent.tagName.toLowerCase() === 'pre') {
        // Handled by <pre> case
        return el.textContent || '';
      }
      return `\`${el.textContent || ''}\``;
    }

    case 'pre': {
      const codeContent = el.textContent || '';
      return `\`\`\`\n${codeContent}\n\`\`\`\n\n`;
    }

    case 'blockquote': {
      const content = convertNodes(el.childNodes).trim();
      const lines = content.split('\n');
      return lines.map((line) => `> ${line}`).join('\n') + '\n\n';
    }

    case 'ul':
      return convertList(el, 'ul') + '\n';

    case 'ol':
      return convertList(el, 'ol') + '\n';

    case 'li': {
      // Handled by convertList, but fallback
      return `- ${getInlineContent(el)}\n`;
    }

    case 'img': {
      const alt = el.getAttribute('alt') || '';
      const src = el.getAttribute('src') || '';
      return `![${alt}](${src})`;
    }

    case 'div':
    case 'section':
    case 'article':
      return convertNodes(el.childNodes);

    case 'span':
      return getInlineContent(el);

    default:
      return convertNodes(el.childNodes);
  }
}

function getInlineContent(el: HTMLElement): string {
  let result = '';
  for (const child of Array.from(el.childNodes)) {
    result += convertNode(child);
  }
  return result;
}

function convertList(el: HTMLElement, type: 'ul' | 'ol', indent = 0): string {
  const items: string[] = [];
  let index = 1;

  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() !== 'li') continue;

    const prefix = type === 'ul' ? '- ' : `${index}. `;
    const indentation = '  '.repeat(indent);

    // Check for nested lists within the li
    let inlineText = '';
    let nestedList = '';

    for (const liChild of Array.from(child.childNodes)) {
      if (
        liChild.nodeType === Node.ELEMENT_NODE &&
        ((liChild as HTMLElement).tagName.toLowerCase() === 'ul' ||
          (liChild as HTMLElement).tagName.toLowerCase() === 'ol')
      ) {
        const nestedType = (liChild as HTMLElement).tagName.toLowerCase() as 'ul' | 'ol';
        nestedList += convertList(liChild as HTMLElement, nestedType, indent + 1);
      } else {
        inlineText += convertNode(liChild);
      }
    }

    items.push(`${indentation}${prefix}${inlineText.trim()}`);
    if (nestedList) {
      items.push(nestedList.trimEnd());
    }

    index++;
  }

  return items.join('\n') + '\n';
}
