const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

const steps = [
  {
    title: 'Build extension bundles',
    command: 'npm run build',
  },
  {
    title: 'Run Playwright extension smoke tests',
    command: 'npx playwright test',
  },
  {
    title: 'Run jsdom/UI test suite',
    command: 'npx vitest run',
  },
  {
    title: 'Run node/sync engine test suite',
    command: 'npx vitest run -c vitest.node.config.ts',
  },
];

for (const step of steps) {
  console.log(`\n[plugin-check] ${step.title}`);
  execSync(step.command, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: '1',
    },
  });
}

console.log('\n[plugin-check] All checks passed.');
