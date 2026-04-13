const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const iconRepoDir = path.join(root, 'leaftab-icons-main');
const sourceShapeDir = path.join(iconRepoDir, 'shapes');
const sourceLibraryPath = path.join(iconRepoDir, 'icon-library.json');
const targetRoot = path.join(root, 'public', 'leaftab-icons');
const targetShapeDir = path.join(targetRoot, 'shapes');
const targetLegacySvgDir = path.join(targetRoot, 'svgs');
const libraryFileName = 'icon-library.json';
const targetLibraryPath = path.join(targetRoot, libraryFileName);
const legacyManifestPath = path.join(targetRoot, 'manifest.json');

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

const pathExists = (targetPath) => fs.existsSync(targetPath);

const normalizeHexColor = (value) => {
  const trimmed = String(value || '').trim();
  const matched = trimmed.match(/^#([0-9a-fA-F]{6})$/);
  if (!matched) return '';
  return `#${matched[1].toUpperCase()}`;
};

const toDomainFromFileName = (fileName) => fileName.slice(0, -4).trim().toLowerCase();

const ensureLocalIconRepository = () => {
  if (pathExists(sourceShapeDir) && pathExists(sourceLibraryPath)) return true;

  const relativeShapeDir = path.relative(root, sourceShapeDir);
  const relativeLibraryPath = path.relative(root, sourceLibraryPath);
  const hasExistingPublicIcons = pathExists(targetShapeDir) || pathExists(targetLibraryPath) || pathExists(legacyManifestPath);
  if (hasExistingPublicIcons) {
    console.warn(
      `[icons] local icon sources not found at ${relativeShapeDir} or ${relativeLibraryPath}; keeping existing public/leaftab-icons assets`,
    );
    return false;
  }

  console.warn(`[icons] local icon sources not found at ${relativeShapeDir} or ${relativeLibraryPath}`);
  return false;
};

const cleanTargetDirectory = (dirPath, keepFileNames) => {
  if (!pathExists(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (keepFileNames.has(entry.name)) continue;
    fs.rmSync(path.join(dirPath, entry.name), { force: true });
  }
};

const validateSourceLibrary = () => {
  const library = safeReadJson(sourceLibraryPath);
  if (!library || typeof library !== 'object' || Array.isArray(library)) {
    throw new Error(`[icons] invalid library file: ${path.relative(root, sourceLibraryPath)}`);
  }

  const icons = library.icons;
  if (!icons || typeof icons !== 'object' || Array.isArray(icons)) {
    throw new Error(`[icons] missing icons map in ${path.relative(root, sourceLibraryPath)}`);
  }

  const shapeFiles = new Set(listSvgFiles(sourceShapeDir));
  const referencedShapeFiles = new Set();
  const normalizedIcons = {};

  for (const [domainKey, entry] of Object.entries(icons)) {
    const domain = toDomainFromFileName(`${domainKey}.svg`);
    if (!domain) {
      throw new Error(`[icons] invalid icon domain in library: ${domainKey}`);
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`[icons] invalid icon entry for ${domain}`);
    }

    const shapePath = typeof entry.shapePath === 'string' ? entry.shapePath.trim().replace(/^\/+/, '') : '';
    const defaultColor = normalizeHexColor(entry.defaultColor);
    if (!shapePath.startsWith('shapes/')) {
      throw new Error(`[icons] ${domain} must use a shapes/* path in icon-library.json`);
    }
    if (!defaultColor) {
      throw new Error(`[icons] ${domain} is missing a valid defaultColor`);
    }

    const shapeFileName = path.basename(shapePath);
    if (!shapeFiles.has(shapeFileName)) {
      throw new Error(`[icons] missing shape SVG for ${domain}: ${shapePath}`);
    }

    referencedShapeFiles.add(shapeFileName);
    normalizedIcons[domain] = {
      ...entry,
      mode: 'shape-color',
      shapePath,
      defaultColor,
    };
  }

  for (const fileName of shapeFiles) {
    if (!referencedShapeFiles.has(fileName)) {
      throw new Error(`[icons] shape SVG is not declared in icon-library.json: shapes/${fileName}`);
    }
  }

  return {
    ...library,
    icons: normalizedIcons,
  };
};

const syncLocalIconLibrary = () => {
  if (!ensureLocalIconRepository()) {
    return;
  }

  ensureDir(targetShapeDir);
  if (pathExists(targetLegacySvgDir)) {
    fs.rmSync(targetLegacySvgDir, { recursive: true, force: true });
  }

  const library = validateSourceLibrary();
  const icons = library.icons || {};
  const sourceFiles = Object.values(icons).map((entry) => path.basename(entry.shapePath));
  if (!sourceFiles.length) {
    console.warn(`[icons] no SVG files found in ${path.relative(root, sourceShapeDir)}`);
    return;
  }

  const keep = new Set();
  for (const fileName of sourceFiles) {
    const sourceFile = path.join(sourceShapeDir, fileName);
    const targetFile = path.join(targetShapeDir, fileName);
    fs.copyFileSync(sourceFile, targetFile);
    keep.add(fileName);
  }

  cleanTargetDirectory(targetShapeDir, keep);

  ensureDir(targetRoot);
  if (fs.existsSync(legacyManifestPath)) {
    fs.rmSync(legacyManifestPath, { force: true });
  }
  fs.writeFileSync(targetLibraryPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8');
  console.log(`[icons] synced ${sourceFiles.length} official icon shapes to public/leaftab-icons`);
};

syncLocalIconLibrary();
