#!/usr/bin/env node
/*
  Fetch TTF fonts at build-time into app/public/fonts so PDF generation can load
  from same-origin local files without network calls.
*/
const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'public', 'fonts');
const targets = [
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/audiowide/Audiowide-Regular.ttf',
    filename: 'Audiowide-Regular.ttf',
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/saira/Saira%5Bwdth%2Cwght%5D.ttf',
    filename: 'Saira-Variable.ttf',
  },
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function fetchToFile(url, filePath) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[fonts] Skipping ${url}: HTTP ${res.status}`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(filePath, buf);
    console.log(`[fonts] Saved ${path.basename(filePath)} (${buf.length} bytes)`);
    return true;
  } catch (err) {
    console.warn(`[fonts] Failed ${url}:`, err?.message || err);
    return false;
  }
}

(async () => {
  try {
    await ensureDir(outDir);
    let okAny = false;
    for (const t of targets) {
      const dest = path.join(outDir, t.filename);
      // Only download if file doesn't already exist
      try {
        await fs.promises.access(dest, fs.constants.F_OK);
        console.log(`[fonts] Exists ${t.filename}, skipping`);
        okAny = true;
        continue;
      } catch {}
      const ok = await fetchToFile(t.url, dest);
      okAny = okAny || ok;
    }
    if (!okAny) {
      console.warn('[fonts] No fonts fetched. PDF will rely on /api/font/* fallback.');
    }
  } catch (e) {
    console.warn('[fonts] Unexpected error:', e?.message || e);
  }
})();

