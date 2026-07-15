/**
 * A small, dependency-free Markdown → HTML renderer scoped to exactly the
 * subset our contract template (and its AI rewrite) produces: headings, bold,
 * tables, horizontal rules, blockquotes, and paragraphs. Input is HTML-escaped
 * first — this renders on a public, unauthenticated page, so untrusted/AI-
 * rewritten content must never be able to inject markup.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderTable(lines: string[]): string {
  // lines[0] = header, lines[1] = separator (---|---), rest = rows
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());

  const header = cells(lines[0]);
  const rows = lines.slice(2).map(cells);

  const thead = `<tr>${header.map((h) => `<th>${inline(h)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
    .join("");

  return `<table class="contract-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

export function renderContractMarkdown(md: string): string {
  const escaped = escapeHtml(md);
  const lines = escaped.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^#{1,2}\s/.test(line)) {
      const level = line.startsWith("## ") ? 2 : 1;
      const text = line.replace(/^#{1,2}\s/, "");
      out.push(`<h${level}>${inline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^---\s*$/.test(line)) {
      out.push("<hr />");
      i += 1;
      continue;
    }

    if (/^&gt;\s/.test(line)) {
      out.push(`<blockquote>${inline(line.replace(/^&gt;\s/, ""))}</blockquote>`);
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      out.push(renderTable(tableLines));
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    out.push(`<p>${inline(line)}</p>`);
    i += 1;
  }

  return out.join("\n");
}
