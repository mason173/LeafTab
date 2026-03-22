import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SVG_DIR = path.join(ROOT, 'svgs');
const OUT_FILE = path.join(ROOT, 'manifest.json');

const sha256Hex = async (filePath) => {
  const buf = await readFile(filePath);
  return createHash('sha256').update(buf).digest('hex');
};

const main = async () => {
  const files = await readdir(SVG_DIR, { withFileTypes: true });
  const icons = {};
  for (const f of files) {
    if (!f.isFile()) continue;
    if (!f.name.toLowerCase().endsWith('.svg')) continue;
    const domain = f.name.slice(0, -4).toLowerCase();
    const relPath = `svgs/${f.name}`;
    const absPath = path.join(SVG_DIR, f.name);
    icons[domain] = {
      path: relPath,
      sha256: await sha256Hex(absPath),
      updatedAt: new Date().toISOString(),
    };
  }

  const now = new Date();
  const version = now.toISOString().split('T')[0];
  const manifest = {
    version,
    generatedAt: now.toISOString(),
    icons,
  };

  await writeFile(OUT_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Generated manifest.json with ${Object.keys(icons).length} icons`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

