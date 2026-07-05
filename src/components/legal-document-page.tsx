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
          background: #080808;
          color: #f5f5f5;
          font-family: var(--font-inter), Inter, system-ui, sans-serif;
        }
        .legal-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 16px clamp(20px, 5vw, 56px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(8, 8, 8, 0.9);
          backdrop-filter: blur(16px);
        }
        .legal-brand,
        .legal-nav,
        .legal-toc,
        .legal-toc a {
          display: flex;
          align-items: center;
        }
        .legal-brand {
          gap: 10px;
          color: #f5f5f5;
          font-weight: 800;
          font-size: 18px;
          text-decoration: none;
        }
        .legal-brand img {
          width: 52px;
          height: auto;
        }
        .legal-nav {
          gap: 16px;
        }
        .legal-nav a,
        .legal-toc a,
        .legal-article a {
          color: #c8f135;
          text-decoration: none;
        }
        .legal-nav a:hover,
        .legal-toc a:hover,
        .legal-article a:hover {
          text-decoration: underline;
        }
        .legal-shell {
          display: grid;
          grid-template-columns: 240px minmax(0, 820px);
          gap: 48px;
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 56px 0 88px;
        }
        .legal-toc {
          position: sticky;
          top: 92px;
          align-self: start;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
          padding: 16px;
        }
        .legal-toc p {
          margin: 0 0 8px;
          color: #8f8f8f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .legal-toc a {
          min-height: 34px;
          color: #b9b9b9;
          font-size: 13.5px;
          line-height: 1.35;
        }
        .legal-toc a[aria-current="page"] {
          color: #c8f135;
          font-weight: 700;
        }
        .legal-article {
          min-width: 0;
          color: #d6d6d6;
          font-size: 16px;
          line-height: 1.72;
        }
        .legal-article h1,
        .legal-article h2,
        .legal-article h3,
        .legal-article h4 {
          color: #f5f5f5;
          font-family: var(--font-dm-sans), "DM Sans", system-ui, sans-serif;
          letter-spacing: 0;
          line-height: 1.15;
        }
        .legal-article h1 {
          margin: 0 0 14px;
          font-size: clamp(34px, 5vw, 54px);
        }
        .legal-article h2 {
          margin: 42px 0 12px;
          font-size: 24px;
        }
        .legal-article h3 {
          margin: 28px 0 10px;
          font-size: 19px;
        }
        .legal-article h4 {
          margin: 24px 0 8px;
          font-size: 16px;
        }
        .legal-article p {
          margin: 0 0 18px;
        }
        .legal-article ul {
          margin: 0 0 22px;
          padding-left: 24px;
        }
        .legal-article li {
          margin: 7px 0;
        }
        .legal-article strong {
          color: #f5f5f5;
        }
        .legal-article code {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.06);
          color: #f3f3f3;
          padding: 1px 6px;
          font-size: 0.9em;
        }
        .legal-article blockquote {
          margin: 18px 0 24px;
          border-left: 3px solid #c8f135;
          background: rgba(200, 241, 53, 0.06);
          padding: 14px 18px;
        }
        .legal-article blockquote p {
          margin: 0;
        }
        .legal-table-wrap {
          overflow-x: auto;
          margin: 18px 0 28px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        .legal-article table {
          width: 100%;
          border-collapse: collapse;
          min-width: 680px;
        }
        .legal-article th,
        .legal-article td {
          padding: 13px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          vertical-align: top;
        }
        .legal-article th {
          color: #f5f5f5;
          background: rgba(255, 255, 255, 0.05);
          font-size: 13px;
        }
        .legal-article td {
          color: #d0d0d0;
          font-size: 14px;
        }
        @media (max-width: 860px) {
          .legal-header {
            align-items: flex-start;
            flex-direction: column;
          }
          .legal-shell {
            grid-template-columns: 1fr;
            gap: 28px;
            padding-top: 32px;
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
        @media (max-width: 520px) {
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

