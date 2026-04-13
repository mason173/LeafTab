import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const ICON_LIBRARY_ROOT = path.join(ROOT, 'public', 'leaftab-icons');
const SHAPES_DIR = path.join(ICON_LIBRARY_ROOT, 'shapes');
const OUTPUT_FILE = path.join(ICON_LIBRARY_ROOT, 'icon-library.json');
const PACKAGE_JSON_FILE = path.join(ROOT, 'package.json');

const FILE_NAME_WITH_COLOR_PATTERN = /^(.+)_([0-9a-fA-F]{6})\.svg$/i;

const normalizeDomain = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized.endsWith('.svg')) return '';
  const domain = normalized.slice(0, -4);
  if (!domain || !/^[a-z0-9.-]+$/.test(domain) || !domain.includes('.')) return '';
  return domain;
};

const normalizeHexColor = (value) => {
  const trimmed = String(value || '').trim();
  const matched = trimmed.match(/^#([0-9a-fA-F]{6})$/);
  if (!matched) return '';
  return `#${matched[1].toUpperCase()}`;
};

const sha256Hex = async (filePath) => {
  const buf = await readFile(filePath);
  return createHash('sha256').update(buf).digest('hex');
};

const listSvgFiles = async (dirPath) => {
  const files = await readdir(dirPath, { withFileTypes: true });
  return files
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.svg'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));
};

const parseIconFileName = (fileName) => {
  const normalized = String(fileName || '').trim();
  const matched = normalized.match(FILE_NAME_WITH_COLOR_PATTERN);
  if (!matched) return null;

  const domain = normalizeDomain(`${matched[1]}.svg`);
  const defaultColor = normalizeHexColor(`#${matched[2]}`);
  if (!domain || !defaultColor) return null;

  return { domain, defaultColor };
};

const readPackageVersion = async () => {
  const pkg = JSON.parse(await readFile(PACKAGE_JSON_FILE, 'utf8'));
  return typeof pkg?.version === 'string' ? pkg.version : undefined;
};

const buildLibrary = async () => {
  const shapeFiles = await listSvgFiles(SHAPES_DIR);
  if (!shapeFiles.length) {
    throw new Error(`[icons] no SVG files found in ${path.relative(ROOT, SHAPES_DIR)}`);
  }

  const icons = {};
  for (const fileName of shapeFiles) {
    const parsed = parseIconFileName(fileName);
    if (!parsed?.domain) {
      throw new Error(`[icons] invalid SVG file name: ${fileName}`);
    }

    const { domain, defaultColor } = parsed;
    if (icons[domain]) {
      throw new Error(`[icons] duplicate icon domain detected: ${domain}`);
    }

    const filePath = path.join(SHAPES_DIR, fileName);
    const fileStat = await stat(filePath);
    icons[domain] = {
      mode: 'shape-color',
      shapePath: `shapes/${fileName}`,
      defaultColor,
      sha256: await sha256Hex(filePath),
      updatedAt: fileStat.mtime.toISOString(),
    };
  }

  const library = {
    version: await readPackageVersion(),
    generatedAt: new Date().toISOString(),
    icons,
  };

  await writeFile(OUTPUT_FILE, `${JSON.stringify(library, null, 2)}\n`, 'utf8');
  console.log(`[icons] wrote public/leaftab-icons/icon-library.json with ${shapeFiles.length} icons`);
};

buildLibrary().catch((error) => {
  console.error(error);
  process.exit(1);
});
