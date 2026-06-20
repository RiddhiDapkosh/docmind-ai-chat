// Client-only document text extraction. Returns pages: an array of strings (one per page).
// PDFs are parsed with pdfjs-dist; DOCX with mammoth; TXT/MD are split heuristically.

export interface ParsedDoc {
  pages: string[]; // text per page (or per logical section)
  totalPages: number;
}

export async function parseFile(file: File): Promise<ParsedDoc> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return parsePdf(file);
  if (name.endsWith(".docx")) return parseDocx(file);
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown") || file.type.startsWith("text/")) {
    return parseText(file);
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

async function parsePdf(file: File): Promise<ParsedDoc> {
  const pdfjs = await import("pdfjs-dist");
  // Configure worker (legacy URL import).
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - vite worker URL import
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map((it: any) => (typeof it.str === "string" ? it.str : "")).join(" ");
    pages.push(text);
  }
  return { pages, totalPages: pdf.numPages };
}

async function parseDocx(file: File): Promise<ParsedDoc> {
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const result = await (mammoth as any).extractRawText({ arrayBuffer: buf });
  const text: string = result.value || "";
  // DOCX has no real pages; split by ~3000 char "pages" as a proxy.
  const pages = splitIntoPages(text, 3000);
  return { pages, totalPages: pages.length };
}

async function parseText(file: File): Promise<ParsedDoc> {
  const text = await file.text();
  const pages = splitIntoPages(text, 3000);
  return { pages, totalPages: pages.length };
}

function splitIntoPages(text: string, perPage: number): string[] {
  if (!text) return [""];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += perPage) {
    out.push(text.slice(i, i + perPage));
  }
  return out;
}

// Chunk text from pages into ~chunkSize chars with overlap. Preserves page provenance.
export interface Chunk {
  content: string;
  page_number: number;
  chunk_index: number;
}

export function chunkPages(pages: string[], chunkSize = 800, overlap = 120): Chunk[] {
  const chunks: Chunk[] = [];
  let idx = 0;
  pages.forEach((pageText, pageIdx) => {
    const clean = pageText.replace(/\s+/g, " ").trim();
    if (!clean) return;
    for (let start = 0; start < clean.length; start += chunkSize - overlap) {
      const slice = clean.slice(start, start + chunkSize).trim();
      if (slice.length < 40) continue;
      chunks.push({ content: slice, page_number: pageIdx + 1, chunk_index: idx++ });
      if (start + chunkSize >= clean.length) break;
    }
  });
  return chunks;
}