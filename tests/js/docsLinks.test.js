const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

/**
 * Option A: static link checker for local .md cross-links.
 * - Scans README.md and docs/ for markdown links
 * - For relative .md links, asserts the target file exists
 * - Skips external (http/https/mailto), images, anchors-only
 */
describe('docs link integrity (local .md)', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const mdFiles = [path.join(projectRoot, 'README.md')].concat(
    fg.sync('docs/**/!(*node_modules)/*.md', { cwd: projectRoot, absolute: true })
  );

  const isExternal = (href) => /^(https?:|mailto:)/i.test(href);
  const isAnchorOnly = (href) => href.startsWith('#');
  const isImage = (prefix) => prefix && prefix.startsWith('!');

  test('all relative .md links point to existing files', () => {
    const missing = [];
    const linkRe = /(!)?\[[^\]]*]\(([^)]+)\)/g; // capture optional ! and href

    for (const file of mdFiles) {
      const content = fs.readFileSync(file, 'utf8');
      let m;
      while ((m = linkRe.exec(content)) !== null) {
        const bang = m[1] || '';
        let href = m[2] || '';

        if (isImage(bang)) continue; // skip images
        if (isExternal(href)) continue;
        if (isAnchorOnly(href)) continue;

        // Strip anchor part if present (file.md#section)
        const [rawPath] = href.split('#');
        // Decode URL-encoded spaces, etc.
        const decoded = decodeURIComponent(rawPath);

        // Consider only .md files
        if (!/\.md$/i.test(decoded)) continue;

        // Resolve path relative to the linking file or project root
        let target;
        if (decoded.startsWith('/')) {
          target = path.join(projectRoot, decoded.replace(/^\/+/, ''));
        } else {
          target = path.resolve(path.dirname(file), decoded);
        }

        if (!fs.existsSync(target)) {
          missing.push({ from: path.relative(projectRoot, file), href, target: path.relative(projectRoot, target) });
        }
      }
    }

    if (missing.length > 0) {
      const msg = missing.map(m => `Missing: ${m.href} (from ${m.from}) -> ${m.target}`).join('\n');
      throw new Error(`Found broken local links:\n${msg}`);
    }
  });
});


