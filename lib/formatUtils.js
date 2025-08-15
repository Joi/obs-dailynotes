/**
 * Normalize spacing in markdown content:
 * - Ensure at most one blank line between sections
 * - Trim trailing whitespace and end file with a single newline
 */
function normalizeMarkdownSpacing(text) {
    if (!text) return '';
    let out = text
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n');
    if (!out.endsWith('\n')) out += '\n';
    return out;
}

module.exports = {
    normalizeMarkdownSpacing,
};


