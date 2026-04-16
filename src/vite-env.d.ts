/// <reference types="vite/client" />

declare module '*.png?url' {
  const content: string;
  export default content;
}

declare const __BROWSER_TARGET__: 'chromium' | 'firefox';

declare module 'lunar-javascript' {
  export const Solar: {
    fromDate(date: Date): {
      getLunar(): {
        getMonth(): number;
        getDay(): number;
        getMonthInChinese(): string;
        getDayInChinese(): string;
      };
    };
  };
}
