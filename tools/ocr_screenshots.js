#!/usr/bin/env node
/**
 * Scan today's daily note for embedded images (screenshots), run OCR on them using macOS `screencapture` OCRKit (VisionKit) via `sips+mdls` alternative: use `tesseract` if installed, or `osascript` Vision OCR.
 * Append a section "## Screenshot Text (OCR)" with bullet summaries.
 *
 * Dependencies (choose one):
 * - Homebrew: `brew install tesseract`
 * - Or macOS Vision OCR via `osascript` (requires macOS 14+): uses a small AppleScript to extract text
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { getTodayFilePath } = require('../lib/writer');

function findImageLinks(markdown) {
  const links = [];
  const re = /!\[.*?\]\(([^)]+)\)|!\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const p = m[1] || m[2];
    if (!p) continue;
    if (/\.(png|jpg|jpeg|gif|heic)$/i.test(p)) links.push(p);
  }
  return Array.from(new Set(links));
}

function resolveImagePath(vaultRoot, rel) {
  if (path.isAbsolute(rel)) return rel;
  const p = path.join(vaultRoot, rel);
  if (fs.existsSync(p)) return p;
  // Try Resources/Images fallback if not found
  const alt = path.join(vaultRoot, 'Resources', 'Images', rel);
  if (fs.existsSync(alt)) return alt;
  return null;
}

function hasTesseract() {
  try { execFileSync('tesseract', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; }
}

function ocrWithTesseract(imgPath) {
  try {
    const tmpTxt = path.join('/tmp', 'ocr_' + path.basename(imgPath) + '.txt');
    execFileSync('tesseract', [imgPath, tmpTxt.replace(/\.txt$/, '')], { stdio: 'ignore' });
    const out = fs.readFileSync(tmpTxt, 'utf8');
    return out.trim();
  } catch { return ''; }
}

function ocrWithVisionKit(imgPath) {
  // Use AppleScript to run Vision framework OCR via Shortcuts or shell
  const script = `
use framework "Vision"
use framework "AppKit"
use scripting additions
on ocrFile(thePath)
  set theURL to current application's |NSURL|'s fileURLWithPath:thePath
  set theReq to current application's VNRecognizeTextRequest's alloc()'s init()
  theReq's setRecognitionLevel:0 -- accurate
  set handler to current application's VNImageRequestHandler's alloc()'s initWithURL:theURL options:(current application's NSDictionary's new())
  handler's performRequests:{theReq} |error|:(missing value)
  set obs to theReq's results()
  set out to {}
  repeat with r in obs
    set end of out to (r's |string|()) as text
  end repeat
  return (out as text)
end ocrFile
return ocrFile("${imgPath.replace(/"/g, '\\"')}")
`;
  const res = spawnSync('osascript', ['-l', 'AppleScript', '-e', script], { encoding: 'utf8' });
  if (res.status === 0) return (res.stdout || '').trim();
  return '';
}

function summarizeLines(text, maxLines = 3) {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length <= maxLines) return lines.join(' ');
  return lines.slice(0, maxLines).join(' ') + ' …';
}

async function main() {
  const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/joi/switchboard/dailynote';
  const vaultRoot = path.resolve(dailyDir, '..');
  const filePath = getTodayFilePath(dailyDir);
  if (!fs.existsSync(filePath)) { console.error('No daily note for today'); process.exit(0); }
  let md = fs.readFileSync(filePath, 'utf8');
  const images = findImageLinks(md);
  if (!images.length) process.exit(0);
  const useTess = hasTesseract();
  const entries = [];
  for (const rel of images) {
    const abs = resolveImagePath(vaultRoot, rel);
    if (!abs) continue;
    const text = useTess ? ocrWithTesseract(abs) : ocrWithVisionKit(abs);
    if (text && text.trim().length >= 8) {
      entries.push({ rel, text: summarizeLines(text, 3) });
    }
  }
  if (!entries.length) process.exit(0);
  const block = ['## Screenshot Text (OCR)', ...entries.map(e => `- ${e.rel}: ${e.text}`)].join('\n') + '\n';
  // Insert before Reminders or at end
  if (/^##\s*Reminders/m.test(md)) {
    md = md.replace(/(^##\s*Reminders[\s\S]*$)/m, (m0) => block + '\n' + m0);
  } else {
    md = md.trimEnd() + '\n\n' + block + '\n';
  }
  md = md.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(filePath, md);
  console.log('Appended OCR block to daily note');
}

main().catch(e => { console.error(e.message); process.exit(1); });


