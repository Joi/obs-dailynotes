/**
 * HTML ↔ Markdown converter for Notes.app sync
 *
 * Notes.app uses simple HTML:
 * - <div>content</div> for paragraphs
 * - <div><br></div> for empty lines
 * - <b>bold</b> and <i>italic</i> for formatting
 * - <h1>, <h2>, etc. for headings
 * - <ul><li>item</li></ul> for lists
 * - <a href="url">text</a> for links
 */

/**
 * Convert Notes.app HTML to Markdown
 * @param {string} html - HTML content from Notes.app
 * @returns {string} - Markdown content
 */
function htmlToMarkdown(html) {
  if (!html) return '';

  let md = html;

  // Handle headings first (before divs)
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n');

  // Handle lists
  md = md.replace(/<ul[^>]*>/gi, '');
  md = md.replace(/<\/ul>/gi, '');
  md = md.replace(/<ol[^>]*>/gi, '');
  md = md.replace(/<\/ol>/gi, '');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');

  // Handle links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Handle bold and italic
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');

  // Handle strikethrough
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');

  // Handle code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Handle empty divs (empty lines)
  md = md.replace(/<div><br\s*\/?><\/div>/gi, '\n');

  // Handle divs (paragraphs)
  md = md.replace(/<div[^>]*>/gi, '');
  md = md.replace(/<\/div>/gi, '\n');

  // Handle br tags
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Handle paragraphs
  md = md.replace(/<p[^>]*>/gi, '');
  md = md.replace(/<\/p>/gi, '\n\n');

  // Handle span tags (often used for styling, just remove)
  md = md.replace(/<span[^>]*>/gi, '');
  md = md.replace(/<\/span>/gi, '');

  // Decode common HTML entities
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");

  // Clean up multiple newlines
  md = md.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  md = md.trim();

  return md;
}

/**
 * Convert Markdown to Notes.app HTML
 * @param {string} markdown - Markdown content
 * @returns {string} - HTML content for Notes.app
 */
function markdownToHtml(markdown) {
  if (!markdown) return '';

  // Split into lines for processing
  const lines = markdown.split('\n');
  const htmlLines = [];

  for (let line of lines) {
    // Handle headings
    if (line.startsWith('######')) {
      const text = line.replace(/^######\s*/, '');
      htmlLines.push(`<h6>${text}</h6>`);
      continue;
    }
    if (line.startsWith('#####')) {
      const text = line.replace(/^#####\s*/, '');
      htmlLines.push(`<h5>${text}</h5>`);
      continue;
    }
    if (line.startsWith('####')) {
      const text = line.replace(/^####\s*/, '');
      htmlLines.push(`<h4>${text}</h4>`);
      continue;
    }
    if (line.startsWith('###')) {
      const text = line.replace(/^###\s*/, '');
      htmlLines.push(`<h3>${text}</h3>`);
      continue;
    }
    if (line.startsWith('##')) {
      const text = line.replace(/^##\s*/, '');
      htmlLines.push(`<h2>${text}</h2>`);
      continue;
    }
    if (line.startsWith('#')) {
      const text = line.replace(/^#\s*/, '');
      htmlLines.push(`<h1>${text}</h1>`);
      continue;
    }

    // Handle list items
    if (line.match(/^[\-\*]\s+/)) {
      const text = line.replace(/^[\-\*]\s+/, '');
      htmlLines.push(`<div>• ${convertInlineMarkdown(text)}</div>`);
      continue;
    }

    // Handle numbered lists
    if (line.match(/^\d+\.\s+/)) {
      const text = line.replace(/^\d+\.\s+/, '');
      htmlLines.push(`<div>${convertInlineMarkdown(text)}</div>`);
      continue;
    }

    // Handle empty lines
    if (line.trim() === '') {
      htmlLines.push('<div><br></div>');
      continue;
    }

    // Regular paragraph
    htmlLines.push(`<div>${convertInlineMarkdown(line)}</div>`);
  }

  return htmlLines.join('');
}

/**
 * Convert inline Markdown formatting to HTML
 * @param {string} text - Text with inline Markdown
 * @returns {string} - Text with HTML formatting
 */
function convertInlineMarkdown(text) {
  let html = text;

  // Handle links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Handle bold **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  html = html.replace(/__([^_]+)__/g, '<b>$1</b>');

  // Handle italic *text* or _text_ (but not ** or __)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<i>$1</i>');

  // Handle strikethrough ~~text~~
  html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');

  // Handle inline code `text`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  return html;
}

/**
 * Generate a safe filename from a note title
 * @param {string} title - Note title
 * @returns {string} - Safe filename (without .md extension)
 */
function titleToFilename(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\s-]/g, '') // Keep Japanese chars
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100) || 'untitled';
}

/**
 * Extract title from filename
 * @param {string} filename - Filename (with or without .md)
 * @returns {string} - Human-readable title
 */
function filenameToTitle(filename) {
  return filename
    .replace(/\.md$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = {
  htmlToMarkdown,
  markdownToHtml,
  titleToFilename,
  filenameToTitle
};
