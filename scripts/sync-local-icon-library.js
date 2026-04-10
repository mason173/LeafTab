const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const iconRepoDir = path.join(root, 'leaftab-icons-main');
const sourceDir = path.join(root, 'leaftab-icons-main', 'svgs');
const targetRoot = path.join(root, 'public', 'leaftab-icons');
const targetDir = path.join(targetRoot, 'svgs');
const manifestFileName = 'icon-library.json';
const manifestPath = path.join(targetRoot, manifestFileName);
const legacyManifestPath = path.join(targetRoot, 'manifest.json');
const packageJsonPath = path.join(root, 'package.json');
const iconRepoUrl = process.env.LEAFTAB_ICONS_REPO_URL || 'https://github.com/mason173/leaftab-icons.git';
const iconRepoRef = (process.env.LEAFTAB_ICONS_GIT_REF || '').trim();
const autoFetchEnabled = process.env.LEAFTAB_ICONS_AUTO_FETCH !== '0';
const autoUpdateEnabled = process.env.LEAFTAB_ICONS_AUTO_UPDATE === '1';

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

const runGit = (args) => {
  execFileSync('git', args, {
    cwd: root,
    stdio: 'inherit',
  });
};

const pathExists = (targetPath) => fs.existsSync(targetPath);

const ensureLocalIconRepository = () => {
  if (pathExists(sourceDir)) return true;

  if (!autoFetchEnabled) {
    console.warn(`[icons] source directory not found and auto-fetch is disabled: ${sourceDir}`);
    return false;
  }

  const hasGitRepo = pathExists(path.join(iconRepoDir, '.git'));
  try {
    if (!hasGitRepo) {
      if (pathExists(iconRepoDir)) {
        fs.rmSync(iconRepoDir, { recursive: true, force: true });
      }
      console.log(`[icons] cloning ${iconRepoUrl} -> ${path.relative(root, iconRepoDir)}`);
      runGit(['clone', '--depth=1', iconRepoUrl, iconRepoDir]);
    } else if (autoUpdateEnabled) {
      console.log(`[icons] updating local icon repo at ${path.relative(root, iconRepoDir)}`);
      execFileSync('git', ['pull', '--ff-only'], {
        cwd: iconRepoDir,
        stdio: 'inherit',
      });
    }

    if (iconRepoRef) {
      console.log(`[icons] checking out ${iconRepoRef}`);
      execFileSync('git', ['checkout', iconRepoRef], {
        cwd: iconRepoDir,
        stdio: 'inherit',
      });
    }
  } catch (error) {
    console.warn(`[icons] failed to prepare local icon repository: ${error.message}`);
    return false;
  }

  if (!pathExists(sourceDir)) {
    console.warn(`[icons] icon repository is present but ${sourceDir} is still missing`);
    return false;
  }

  return true;
};

const syncLocalIconLibrary = () => {
  if (!ensureLocalIconRepository()) {
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
  if (fs.existsSync(legacyManifestPath)) {
    fs.rmSync(legacyManifestPath, { force: true });
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`[icons] synced ${svgFiles.length} SVG files to public/leaftab-icons`);
};

syncLocalIconLibrary();
