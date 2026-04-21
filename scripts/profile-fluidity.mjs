import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const APP_URL = process.env.PLAYWRIGHT_APP_URL
  || pathToFileURL(path.resolve(process.cwd(), 'build/index.html')).href;

const RENDER_PROFILER_STORAGE_KEY = 'leaftab_render_profiler';
const TOP_NAV_INTRO_SEEN_KEY = 'leaftab_top_nav_layout_intro_seen_v1';

function createLink(id, title) {
  return {
    id,
    title,
    url: `https://${id}.example.com`,
    icon: '',
  };
}

function createFolder(id, title, children, folderDisplayMode = 'small') {
  return {
    id,
    title,
    url: '',
    icon: '',
    kind: 'folder',
    folderDisplayMode,
    children,
  };
}

function buildSeedSnapshot() {
  const shortcuts = [
    createLink('docs', 'Docs'),
    createLink('mail', 'Mail'),
    createLink('calendar', 'Calendar'),
    createLink('drive', 'Drive'),
    createLink('notion', 'Notion'),
    createLink('figma', 'Figma'),
    createLink('slack', 'Slack'),
    createLink('linear', 'Linear'),
    createFolder('folder-work', 'Work', [
      createLink('github', 'GitHub'),
      createLink('jira', 'Jira'),
      createLink('vercel', 'Vercel'),
      createLink('openai', 'OpenAI'),
      createLink('sentry', 'Sentry'),
      createLink('aws', 'AWS'),
    ], 'small'),
    createLink('youtube', 'YouTube'),
    createLink('maps', 'Maps'),
    createLink('photos', 'Photos'),
    createLink('music', 'Music'),
    createLink('translate', 'Translate'),
    createLink('news', 'News'),
    createLink('weather', 'Weather'),
    createLink('github-home', 'GitHub Home'),
    createLink('chatgpt', 'ChatGPT'),
    createLink('x', 'X'),
    createLink('reddit', 'Reddit'),
  ];

  return {
    scenarioModes: [
      { id: 'life-mode-001', name: '生活模式', color: '#3DD6C5', icon: 'leaf' },
    ],
    selectedScenarioId: 'life-mode-001',
    scenarioShortcuts: {
      'life-mode-001': shortcuts,
    },
  };
}

function summarizeSnapshot(snapshot) {
  return Object.values(snapshot)
    .map((record) => ({
      id: record.id,
      commits: record.commits,
      actualDurationTotal: Number(record.actualDurationTotal.toFixed(2)),
      maxActualDuration: Number(record.maxActualDuration.toFixed(2)),
      mountCommits: record.mountCommits,
      updateCommits: record.updateCommits,
      nestedUpdateCommits: record.nestedUpdateCommits,
    }))
    .sort((left, right) => {
      if (right.actualDurationTotal !== left.actualDurationTotal) {
        return right.actualDurationTotal - left.actualDurationTotal;
      }
      return right.commits - left.commits;
    });
}

async function preparePage(page, snapshot) {
  await page.addInitScript(([seedSnapshot, profilerStorageKey, introSeenKey]) => {
    window.localStorage.clear();
    window.localStorage.setItem(profilerStorageKey, '1');
    window.localStorage.setItem(introSeenKey, 'true');
    window.localStorage.setItem('has_visited', 'true');
    window.localStorage.setItem('role', 'programmer');
    window.localStorage.setItem('i18nextLng', 'zh');
    window.localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(seedSnapshot));
    window.localStorage.setItem('scenario_modes_v1', JSON.stringify(seedSnapshot.scenarioModes));
    window.localStorage.setItem('scenario_selected_v1', seedSnapshot.selectedScenarioId);
    window.localStorage.setItem(
      'local_shortcuts_v3',
      JSON.stringify(seedSnapshot.scenarioShortcuts),
    );
  }, [snapshot, RENDER_PROFILER_STORAGE_KEY, TOP_NAV_INTRO_SEEN_KEY]);

  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__LEAFTAB_RENDER_PROFILER__?.reset();
  });
}

async function captureScenario(browser, snapshot, scenario) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await preparePage(page, snapshot);
    await scenario.run(page);
    await page.waitForTimeout(500);
    const snapshotResult = await page.evaluate(() => (
      window.__LEAFTAB_RENDER_PROFILER__?.snapshot() ?? {}
    ));

    return summarizeSnapshot(snapshotResult);
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const snapshot = buildSeedSnapshot();
  const scenarios = [
    {
      name: 'folder-open',
      run: async (page) => {
        await page.getByTestId('root-shortcut-card-folder-work').click();
        await page.getByTestId('shortcut-folder-overlay').waitFor();
      },
    },
    {
      name: 'settings-open',
      run: async (page) => {
        await page.getByTestId('top-nav-settings-button').click({ force: true });
        await page.getByTestId('settings-modal').waitFor();
      },
    },
    {
      name: 'search-type',
      run: async (page) => {
        const searchInput = page.getByTestId('home-search-input');
        await searchInput.click();
        await searchInput.fill('');
        await searchInput.type('git', { delay: 60 });
      },
    },
  ];

  const results = {};

  try {
    for (const scenario of scenarios) {
      results[scenario.name] = await captureScenario(browser, snapshot, scenario);
    }
  } finally {
    await browser.close();
  }

  process.stdout.write(`${JSON.stringify({
    appUrl: APP_URL,
    profiledAt: new Date().toISOString(),
    scenarios: results,
  }, null, 2)}\n`);
}

await main();
