export type BuildBrowserTarget = 'chromium' | 'firefox';

export function getBuildBrowserTarget(): BuildBrowserTarget {
  return __BROWSER_TARGET__;
}

export function isFirefoxBuildTarget(): boolean {
  return __BROWSER_TARGET__ === 'firefox';
}

export function isChromiumBuildTarget(): boolean {
  return __BROWSER_TARGET__ === 'chromium';
}
