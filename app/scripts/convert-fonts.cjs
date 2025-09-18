#!/usr/bin/env node
/*
  Normalize/convert Saira Condensed TTFs into jsPDF-friendly TTFs.
  Output goes to public/fonts/converted/.
  Uses pure-JS fonteditor-core so it works on Vercel build machines.
*/

const fs = require('fs');
const path = require('path');
let Font;
try {
  Font = require('fonteditor-core').Font;
} catch (e) {
  console.warn('[convert-fonts] fonteditor-core not installed; skipping conversion');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const inDir = path.join(ROOT, 'public', 'fonts');
const outDir = path.join(inDir, 'converted');

const targets = [
  { inName: 'SairaCondensed-Regular.ttf', outName: 'SairaCondensed-Regular.ttf' },
  { inName: 'SairaCondensed-Bold.ttf', outName: 'SairaCondensed-Bold.ttf' },
];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function convertOne(inPath, outPath) {
  const buf = fs.readFileSync(inPath);
  const font = Font.create(buf, { type: 'ttf', hinting: true });
  // Optionally optimize to simplify compound glyphs for embedding
  try {
    font.optimize();
  } catch (_) {}
  // Write back as TTF with hinting and simple glyf instructions
  const out = font.write({ type: 'ttf', hinting: true });
  fs.writeFileSync(outPath, Buffer.from(out));
}

(async () => {
  try {
    ensureDir(outDir);

    for (const t of targets) {
      const inPath = path.join(inDir, t.inName);
      const outPath = path.join(outDir, t.outName);
      if (!fs.existsSync(inPath)) {
        console.warn(`[convert-fonts] missing input ${t.inName} — skipping`);
        continue;
      }
      try {
        console.warn(`[convert-fonts] converting ${t.inName} -> converted/${t.outName}`);
        convertOne(inPath, outPath);
        const sz = fs.statSync(outPath).size;
        console.warn(`[convert-fonts] wrote ${t.outName} (${sz} bytes)`);
      } catch (e) {
        console.warn(`[convert-fonts] failed ${t.inName}:`, e && e.message ? e.message : e);
      }
    }

    console.warn('[convert-fonts] done');
  } catch (e) {
    console.warn('[convert-fonts] fatal error:', e && e.message ? e.message : e);
    // Do not fail the build if conversion hiccups — we still have runtime fallbacks
    process.exit(0);
  }
})();

