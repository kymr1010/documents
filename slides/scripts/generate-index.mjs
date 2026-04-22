import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const slidesDir = path.resolve(__dirname, '..');
const distDir = path.join(slidesDir, 'dist');

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const extractTitle = (markdown) => {
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
};

const toDisplayDate = (fileName) => {
  const match = fileName.match(/^(\d{4})(\d{2})(\d{2})/);

  if (!match) {
    return '';
  }

  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
};

const main = async () => {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.html') && name !== 'index.html')
    .sort((a, b) => a.localeCompare(b, 'ja'));

  const pages = await Promise.all(
    htmlFiles.map(async (htmlFile) => {
      const baseName = path.basename(htmlFile, '.html');
      const markdownPath = path.join(slidesDir, `${baseName}.md`);

      let title = baseName;

      try {
        const markdown = await fs.readFile(markdownPath, 'utf8');
        title = extractTitle(markdown) ?? baseName;
      } catch {
        title = baseName;
      }

      return {
        htmlFile,
        title,
        dateLabel: toDisplayDate(baseName),
      };
    })
  );

  const listItems = pages
    .map(
      ({ htmlFile, title, dateLabel }) => `
        <li>
          <a href="./${encodeURI(htmlFile)}">${escapeHtml(title)}</a>
          <span>${escapeHtml(dateLabel || htmlFile)}</span>
        </li>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Slides</title>
    <style>
      :root {
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: linear-gradient(135deg, #f8fafc, #e2e8f0);
        color: #0f172a;
      }

      main {
        width: min(720px, calc(100% - 32px));
        margin: 48px auto;
        padding: 32px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid #dbe4f0;
        border-radius: 20px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
      }

      h1 {
        margin: 0 0 8px;
        font-size: clamp(1.8rem, 4vw, 2.4rem);
      }

      p {
        margin: 0 0 24px;
        color: #475569;
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 12px;
      }

      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 18px;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #fff;
      }

      a {
        color: #0f172a;
        font-weight: 700;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      span {
        color: #64748b;
        white-space: nowrap;
        font-size: 0.95rem;
      }

      .empty {
        padding: 20px;
        border: 1px dashed #cbd5e1;
        border-radius: 14px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Slides</h1>
      <p>公開中のスライド一覧です。</p>
      ${
        pages.length > 0
          ? `<ul>${listItems}
      </ul>`
          : '<div class="empty">公開できる HTML がまだありません。</div>'
      }
    </main>
  </body>
</html>
`;

  await fs.writeFile(path.join(distDir, 'index.html'), html, 'utf8');
};

await main();
