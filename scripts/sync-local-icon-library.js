const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'leaftab-icons-main', 'svgs');
const targetRoot = path.join(root, 'public', 'leaftab-icons');
const targetDir = path.join(targetRoot, 'svgs');
const manifestPath = path.join(targetRoot, 'manifest.json');
const packageJsonPath = path.join(root, 'package.json');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const safeReadJson = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const listSvgFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.svg'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));
};

const sha256Hex = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const syncLocalIconLibrary = () => {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`[icons] source directory not found: ${sourceDir}`);
    return;
  }

  ensureDir(targetDir);

  const svgFiles = listSvgFiles(sourceDir);
  const keep = new Set(svgFiles);
  const icons = {};

  for (const fileName of svgFiles) {
    const sourceFile = path.join(sourceDir, fileName);
    const targetFile = path.join(targetDir, fileName);
    const buffer = fs.readFileSync(sourceFile);
    fs.writeFileSync(targetFile, buffer);
    const stat = fs.statSync(sourceFile);
    const domain = fileName.slice(0, -4).toLowerCase();
    icons[domain] = {
      path: `svgs/${fileName}`,
      sha256: sha256Hex(buffer),
      updatedAt: stat.mtime.toISOString(),
    };
  }

  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.svg')) continue;
    if (keep.has(entry.name)) continue;
    fs.rmSync(path.join(targetDir, entry.name), { force: true });
  }

  const pkg = safeReadJson(packageJsonPath);
  const manifest = {
    version: typeof pkg?.version === 'string' ? pkg.version : undefined,
    generatedAt: new Date().toISOString(),
    icons,
  };

  ensureDir(targetRoot);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`[icons] synced ${svgFiles.length} SVG files to public/leaftab-icons`);
};

syncLocalIconLibrary();
