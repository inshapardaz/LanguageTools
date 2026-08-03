/**
 * localStorage-based document storage for the text editor.
 * Each document is stored as a JSON object under key `doc-{id}`.
 * A separate index key `doc-index` tracks all document IDs for listing.
 */

export interface SavedDocument {
  id: string;
  title: string;
  font: string;
  direction: 'ltr' | 'rtl';
  zoom: number;
  content: string; // Serialized Lexical JSON
  updatedAt: string; // ISO date string
}

export interface DocumentMeta {
  id: string;
  title: string;
  updatedAt: string;
}

const DOC_PREFIX = 'doc-';
const DOC_INDEX_KEY = 'doc-index';

/** Generate a unique document ID using timestamp + random suffix. */
export function generateDocId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Get the list of document IDs from the index. */
function getIndex(): string[] {
  try {
    const raw = localStorage.getItem(DOC_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/** Save the document index. */
function setIndex(ids: string[]): void {
  try {
    localStorage.setItem(DOC_INDEX_KEY, JSON.stringify(ids));
  } catch { /* storage full or unavailable */ }
}

/** Save a document to localStorage. Adds to index if new. */
export function saveDocument(doc: SavedDocument): void {
  try {
    localStorage.setItem(DOC_PREFIX + doc.id, JSON.stringify(doc));
    const index = getIndex();
    if (!index.includes(doc.id)) {
      index.push(doc.id);
      setIndex(index);
    }
  } catch { /* storage full or unavailable */ }
}

/** Load a single document by ID. Returns null if not found. */
export function loadDocument(id: string): SavedDocument | null {
  try {
    const raw = localStorage.getItem(DOC_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as SavedDocument;
  } catch {
    return null;
  }
}

/** List all saved documents (metadata only — no content). Sorted by most recent first. */
export function listDocuments(): DocumentMeta[] {
  const index = getIndex();
  const docs: DocumentMeta[] = [];

  for (const id of index) {
    try {
      const raw = localStorage.getItem(DOC_PREFIX + id);
      if (!raw) continue;
      const doc = JSON.parse(raw) as SavedDocument;
      docs.push({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt });
    } catch {
      continue;
    }
  }

  // Sort by most recently updated first
  docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return docs;
}

/** Delete a document from localStorage and remove from index. */
export function deleteDocument(id: string): void {
  try {
    localStorage.removeItem(DOC_PREFIX + id);
    const index = getIndex().filter((docId) => docId !== id);
    setIndex(index);
  } catch { /* ignore */ }
}
