import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { LEGAL_DOCUMENTS, getLegalDocument, type LegalDocumentKey } from "@/lib/legal-documents";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(value: string) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      const safeHref = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("/")
        ? href
        : "#";
      return `<a href="${escapeHtml(safeHref)}">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function isTableSeparator(line: string) {
  return /^\s*\|?[\s:|-]+\|[\s:|-]+\|?\s*$/.test(line);
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isBlockStart(line: string, nextLine?: string) {
  return (
    /^#{1,4}\s+/.test(line) ||
    /^-\s+/.test(line) ||
    /^>\s?/.test(line) ||
    (/^\|/.test(line) && Boolean(nextLine && isTableSeparator(nextLine)))
  );
}

function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      html.push(`<blockquote><p>${renderInline(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    if (/^\|/.test(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = tableCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(tableCells(lines[i]));
        i += 1;
      }
      html.push(
        `<div class="legal-table-wrap"><table><thead><tr>${headers
          .map((cell) => `<th>${renderInline(cell)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ""));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    const paragraphLines = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
  }

  return html.join("\n");
}

export function LegalDocumentPage({ documentKey }: { documentKey: LegalDocumentKey }) {
  const document = getLegalDocument(documentKey);
  const markdownPath = path.join(process.cwd(), "legal", document.source);
  const markdown = fs.readFileSync(markdownPath, "utf8");
  const html = renderMarkdown(markdown);

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link href="/" className="legal-brand" aria-label="FitSplit home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new_logo.png" alt="FitSplit" width="52" height="22" />
          <span>FitSplit</span>
        </Link>
        <nav className="legal-nav" aria-label="Legal documents">
          <Link href="/">Home</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </header>

      <main className="legal-shell">
        <aside className="legal-toc" aria-label="Legal document links">
          <p>Legal</p>
          {LEGAL_DOCUMENTS.map((item) => (
            <Link key={item.key} href={item.href} aria-current={item.key === documentKey ? "page" : undefined}>
              {item.title}
            </Link>
          ))}
        </aside>
        <article className="legal-article" dangerouslySetInnerHTML={{ __html: html }} />
      </main>

      <style>{`
        .legal-page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-inter), Inter, system-ui, sans-serif;
        }
        .legal-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-6);
          padding: var(--space-4) clamp(var(--space-5), 5vw, var(--space-12));
          border-bottom: 1px solid var(--border);
          background: var(--surface-glass);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .legal-brand,
        .legal-nav,
        .legal-toc,
        .legal-toc a {
          display: flex;
          align-items: center;
        }
        .legal-brand {
          gap: var(--space-2);
          color: var(--text);
          font-weight: 800;
          font-size: var(--text-lg);
          text-decoration: none;
        }
        .legal-brand img {
          width: 52px;
          height: auto;
        }
        .legal-nav {
          gap: var(--space-4);
        }
        .legal-nav a,
        .legal-toc a,
        .legal-article a {
          color: var(--brand);
          text-decoration: none;
        }
        .legal-nav a:hover,
        .legal-toc a:hover,
        .legal-article a:hover {
          text-decoration: underline;
        }
        .legal-page :focus-visible {
          outline: 2px solid var(--brand);
          outline-offset: 2px;
          border-radius: var(--radius-xs);
        }
        .legal-shell {
          display: grid;
          grid-template-columns: 240px minmax(0, 820px);
          gap: var(--space-12);
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: var(--space-16) 0 var(--space-24);
        }
        .legal-toc {
          position: sticky;
          top: 92px;
          align-self: start;
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--bg-subtle);
          padding: var(--space-4);
        }
        .legal-toc p {
          margin: 0 0 var(--space-2);
          color: var(--text-faint);
          font-size: var(--text-xs);
          font-weight: 800;
          letter-spacing: var(--tracking-caps);
          text-transform: uppercase;
        }
        .legal-toc a {
          min-height: 34px;
          color: var(--text-soft);
          font-size: var(--text-sm);
          line-height: 1.35;
        }
        .legal-toc a[aria-current="page"] {
          color: var(--brand);
          font-weight: 700;
        }
        .legal-article {
          min-width: 0;
          color: var(--text-soft);
          font-size: var(--text-md);
          line-height: var(--leading-relaxed);
        }
        .legal-article h1,
        .legal-article h2,
        .legal-article h3,
        .legal-article h4 {
          color: var(--text);
          font-family: var(--font-archivo), "Archivo", var(--font-inter), "Inter", system-ui, sans-serif;
          letter-spacing: var(--tracking-normal);
          line-height: var(--leading-tight);
        }
        .legal-article h1 {
          margin: 0 0 var(--space-4);
          font-size: clamp(2.125rem, 5vw, 3.375rem);
        }
        .legal-article h2 {
          margin: var(--space-10) 0 var(--space-3);
          font-size: var(--text-2xl);
        }
        .legal-article h3 {
          margin: var(--space-8) 0 var(--space-3);
          font-size: var(--text-lg);
        }
        .legal-article h4 {
          margin: var(--space-6) 0 var(--space-2);
          font-size: var(--text-md);
        }
        .legal-article p {
          margin: 0 0 var(--space-5);
        }
        .legal-article ul {
          margin: 0 0 var(--space-6);
          padding-left: var(--space-6);
        }
        .legal-article li {
          margin: var(--space-2) 0;
        }
        .legal-article strong {
          color: var(--text);
        }
        .legal-article code {
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-xs);
          background: var(--bg-subtle);
          color: var(--text);
          padding: 1px 6px;
          font-size: 0.9em;
        }
        .legal-article blockquote {
          margin: var(--space-5) 0 var(--space-6);
          border-left: 3px solid var(--brand);
          background: color-mix(in srgb, var(--brand) 8%, transparent);
          padding: var(--space-4) var(--space-5);
        }
        .legal-article blockquote p {
          margin: 0;
        }
        .legal-table-wrap {
          overflow-x: auto;
          margin: var(--space-5) 0 var(--space-6);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .legal-article table {
          width: 100%;
          border-collapse: collapse;
          min-width: 680px;
        }
        .legal-article th,
        .legal-article td {
          padding: var(--space-3) var(--space-4);
          border-bottom: 1px solid var(--border);
          text-align: left;
          vertical-align: top;
        }
        .legal-article th {
          color: var(--text);
          background: var(--bg-subtle);
          font-size: var(--text-sm);
        }
        .legal-article td {
          color: var(--text-soft);
          font-size: var(--text-base);
        }
        @media (max-width: 768px) {
          .legal-header {
            align-items: flex-start;
            flex-direction: column;
          }
          .legal-shell {
            grid-template-columns: 1fr;
            gap: var(--space-8);
            padding-top: var(--space-8);
          }
          .legal-toc {
            position: static;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            width: 100%;
          }
          .legal-toc p {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 480px) {
          .legal-nav {
            flex-wrap: wrap;
          }
          .legal-toc {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

