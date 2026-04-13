const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { resolveChannel, writeChannelMarkerToDir } = require('./channel-utils');

const channel = resolveChannel(process.argv[2] || process.env.VITE_DIST_CHANNEL);
const root = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  VITE_DIST_CHANNEL: channel,
  VITE_BROWSER_TARGET: 'chromium',
  VITE_BUILD_OUT_DIR: 'build',
};
const switchManifestScript = path.join(root, 'scripts', 'switch-manifest.js');
const buildIconLibraryScript = path.join(root, 'scripts', 'build-icon-library.mjs');
const buildDir = path.join(root, 'build');
const communityLocaleOverrides = {
  en: {
    appTitle: {
      message: 'LeafTab - Open-Source E2EE + WebDAV New Tab [Community]',
      description: 'The title of the application',
    },
    appDescription: {
      message: 'Open-source new tab with end-to-end encrypted backup, WebDAV and cloud sync, customizable shortcuts, and a clean focus layout. [Community Edition]',
      description: 'The description of the application',
    },
  },
  zh_CN: {
    appTitle: {
      message: 'LeafTab 新标签页 - 开源加密与 WebDAV 同步【社区版】',
      description: 'The title of the application',
    },
    appDescription: {
      message: '开源新标签页，支持端到端加密备份、WebDAV 与云同步、快捷方式自定义，界面简洁专注。【社区版】',
      description: 'The description of the application',
    },
  },
};
const localeFiles = Object.entries(communityLocaleOverrides).map(([locale]) => path.join(root, 'public', '_locales', locale, 'messages.json'));
const BUILD_MANIFEST_TEMPLATE_FILES = [
  'manifest.community.json',
  'manifest.store.json',
  'manifest.firefox.json',
];

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env });
}

function removeBuildManifestTemplates(dirPath) {
  for (const fileName of BUILD_MANIFEST_TEMPLATE_FILES) {
    const filePath = path.join(dirPath, fileName);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function applyCommunityLocaleOverrides() {
  const backups = new Map();
  for (const filePath of localeFiles) {
    backups.set(filePath, readFileIfExists(filePath));
  }
  for (const [locale, content] of Object.entries(communityLocaleOverrides)) {
    const filePath = path.join(root, 'public', '_locales', locale, 'messages.json');
    fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
  }
  return () => {
    for (const [filePath, originalContent] of backups.entries()) {
      if (originalContent == null) {
        fs.rmSync(filePath, { force: true });
      } else {
        fs.writeFileSync(filePath, originalContent);
      }
    }
  };
}

console.log(`[build] channel: ${channel}`);
const restoreLocales = channel === 'community' ? applyCommunityLocaleOverrides() : () => {};
try {
  run(`node "${buildIconLibraryScript}"`);
  run(`node "${switchManifestScript}" ${channel}`);
  run('npx vite build');
  if (fs.existsSync(buildDir)) {
    removeBuildManifestTemplates(buildDir);
    writeChannelMarkerToDir(buildDir, channel);
  }
  run(`node "${path.join(root, 'scripts', 'build-firefox.js')}"`);
} finally {
  restoreLocales();
  // Always restore tracked manifest to community template to prevent accidental store-manifest commits.
  run(`node "${switchManifestScript}" community`);
}
