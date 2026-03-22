import { execSync } from 'node:child_process';

const sh = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => String(execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] })).trim();

const main = () => {
  try {
    out('git rev-parse --is-inside-work-tree');
  } catch {
    console.error('Not a git repository. Run this inside your icon library repo.');
    process.exit(1);
  }

  const message = process.argv.slice(2).join(' ').trim();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const commitMessage = message || `update icons ${ts}`;

  sh('node scripts/generate-manifest.mjs');
  sh('git add -A');

  const status = out('git status --porcelain');
  if (!status) {
    console.log('No changes to publish.');
    return;
  }

  try {
    sh(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
  } catch {
    console.error('Commit failed. Fix the error above, then re-run.');
    process.exit(1);
  }

  sh('git push');
  console.log('Pushed. Wait for GitHub Actions to finish deploying Pages, then refresh LeafTab.');
};

main();

