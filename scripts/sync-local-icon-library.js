const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const iconRepoDir = path.join(root, 'leaftab-icons-main');
const sourceDir = path.join(iconRepoDir, 'official-icon-sources');
const legacyLayeredRoot = path.join(iconRepoDir, '官方图标分层');
const legacyLayeredShapeDir = path.join(legacyLayeredRoot, '形状');
const legacyLayeredColorDir = path.join(legacyLayeredRoot, '颜色');
const targetRoot = path.join(root, 'public', 'leaftab-icons');
const targetShapeDir = path.join(targetRoot, 'shapes');
const targetLegacySvgDir = path.join(targetRoot, 'svgs');
const manifestFileName = 'icon-library.json';
const manifestPath = path.join(targetRoot, manifestFileName);
const legacyManifestPath = path.join(targetRoot, 'manifest.json');
const packageJsonPath = path.join(root, 'package.json');

const SOURCE_FILE_PATTERN = /^(.+?)__([0-9a-fA-F]{6})\.svg$/;

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

const pathExists = (targetPath) => fs.existsSync(targetPath);

const normalizeSolidFill = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') return '';
  if (trimmed.toLowerCase() === 'white') return '#FFFFFF';
  if (trimmed.toLowerCase() === 'black') return '#000000';

  const matched = trimmed.match(/^#([0-9a-fA-F]{6})$/);
  if (!matched) return '';
  return `#${matched[1].toUpperCase()}`;
};

const extractDefaultColorFromLegacySvg = (svgText) => {
  const withoutDefs = svgText.replace(/<defs[\s\S]*?<\/defs>/gi, '');
  const fills = [...withoutDefs.matchAll(/\sfill="([^"]+)"/gi)]
    .map((match) => normalizeSolidFill(match[1]))
    .filter(Boolean);

  if (!fills.length) return '';
  return fills[fills.length - 1];
};

const parseSourceFileName = (fileName) => {
  const matched = fileName.match(SOURCE_FILE_PATTERN);
  if (!matched) return null;
  return {
    domain: matched[1].trim().toLowerCase(),
    defaultColor: `#${matched[2].toUpperCase()}`,
  };
};

const ensureMigratedOfficialIconSources = () => {
  const existing = listSvgFiles(sourceDir);
  if (existing.length > 0) return true;

  if (!pathExists(legacyLayeredShapeDir) || !pathExists(legacyLayeredColorDir)) {
    return false;
  }

  const shapeFiles = listSvgFiles(legacyLayeredShapeDir);
  const colorFiles = new Set(listSvgFiles(legacyLayeredColorDir));
  if (!shapeFiles.length) return false;

  ensureDir(sourceDir);
  let migratedCount = 0;

  for (const fileName of shapeFiles) {
    if (!colorFiles.has(fileName)) {
      throw new Error(`[icons] missing legacy color SVG for ${fileName}`);
    }

    const domain = fileName.slice(0, -4).toLowerCase();
    const shapePath = path.join(legacyLayeredShapeDir, fileName);
    const colorPath = path.join(legacyLayeredColorDir, fileName);
    const colorSvg = fs.readFileSync(colorPath, 'utf8');
    const defaultColor = extractDefaultColorFromLegacySvg(colorSvg);
    if (!defaultColor) {
      throw new Error(`[icons] cannot infer default color from legacy SVG: ${fileName}`);
    }

    const targetFileName = `${domain}__${defaultColor.slice(1)}.svg`;
    const targetPath = path.join(sourceDir, targetFileName);
    fs.copyFileSync(shapePath, targetPath);
    migratedCount += 1;
  }

  console.log(`[icons] migrated ${migratedCount} layered SVG pairs into ${path.relative(root, sourceDir)}`);
  return true;
};

const ensureLocalIconRepository = () => {
  if (pathExists(sourceDir) || pathExists(legacyLayeredRoot)) return true;

  const relativeSourceDir = path.relative(root, sourceDir);
  const hasExistingPublicIcons = pathExists(targetShapeDir) || pathExists(manifestPath) || pathExists(legacyManifestPath);
  if (hasExistingPublicIcons) {
    console.warn(
      `[icons] local icon sources not found at ${relativeSourceDir}; keeping existing public/leaftab-icons assets`,
    );
    return false;
  }

  console.warn(`[icons] local icon sources not found at ${relativeSourceDir}`);
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

const syncLocalIconLibrary = () => {
  if (!ensureLocalIconRepository()) {
    return;
  }
  if (!ensureMigratedOfficialIconSources()) {
    console.warn(`[icons] official icon sources are unavailable: ${sourceDir}`);
    return;
  }

  ensureDir(targetShapeDir);
  if (pathExists(targetLegacySvgDir)) {
    fs.rmSync(targetLegacySvgDir, { recursive: true, force: true });
  }

  const sourceFiles = listSvgFiles(sourceDir);
  const keep = new Set();
  const icons = {};

  for (const fileName of sourceFiles) {
    const parsed = parseSourceFileName(fileName);
    if (!parsed) {
      throw new Error(`[icons] invalid official icon source file name: ${fileName}`);
    }
    if (!parsed.domain) {
      throw new Error(`[icons] invalid domain in official icon source file name: ${fileName}`);
    }
    if (icons[parsed.domain]) {
      throw new Error(`[icons] duplicate official icon domain detected: ${parsed.domain}`);
    }

    const sourceFile = path.join(sourceDir, fileName);
    const targetFileName = `${parsed.domain}.svg`;
    const targetFile = path.join(targetShapeDir, targetFileName);
    const buffer = fs.readFileSync(sourceFile);
    fs.writeFileSync(targetFile, buffer);
    keep.add(targetFileName);

    const stat = fs.statSync(sourceFile);
    icons[parsed.domain] = {
      mode: 'shape-color',
      shapePath: `shapes/${targetFileName}`,
      defaultColor: parsed.defaultColor,
      sha256: sha256Hex(buffer),
      updatedAt: stat.mtime.toISOString(),
    };
  }

  cleanTargetDirectory(targetShapeDir, keep);

  const pkg = safeReadJson(packageJsonPath);
  const manifest = {
    version: typeof pkg?.version === 'string' ? pkg.version : undefined,
    generatedAt: new Date().toISOString(),
    icons,
  };

  ensureDir(targetRoot);
  if (fs.existsSync(legacyManifestPath)) {
    fs.rmSync(legacyManifestPath, { force: true });
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`[icons] synced ${sourceFiles.length} official icon shapes to public/leaftab-icons`);
};

syncLocalIconLibrary();
