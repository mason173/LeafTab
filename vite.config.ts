
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

function getPackageName(id: string): string | null {
  const normalizedId = id.split('\\').join('/');
  const nodeModulesIndex = normalizedId.lastIndexOf('/node_modules/');
  if (nodeModulesIndex === -1) return null;

  const pathAfterNodeModules = normalizedId.slice(nodeModulesIndex + '/node_modules/'.length);
  const cleanPath = pathAfterNodeModules.startsWith('.pnpm/')
    ? pathAfterNodeModules.split('/').slice(1).join('/')
    : pathAfterNodeModules;

  if (!cleanPath) return null;

  const parts = cleanPath.split('/');
  if (parts[0].startsWith('@') && parts.length > 1) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

function resolveManualChunk(id: string): string | undefined {
  const normalizedId = id.split('\\').join('/');

  if (normalizedId.includes('/src/i18n/locales/')) {
    return undefined;
  }

  if (normalizedId.includes('/src/i18n/')) {
    return 'vendor-i18n';
  }

  if (normalizedId.includes('/src/lazy/')) {
    return 'vendor-lazy';
  }

  if (
    normalizedId.includes('/src/components/react-bits/gradual-blur.tsx') ||
    normalizedId.includes('/src/hooks/useRenderActivity.ts')
  ) {
    return 'vendor-visual-utils';
  }

  if (
    normalizedId.includes('/src/components/react-bits/prism.tsx') ||
    normalizedId.includes('/src/components/react-bits/silk.tsx') ||
    normalizedId.includes('/src/components/react-bits/light-rays.tsx') ||
    normalizedId.includes('/src/components/react-bits/beams.tsx') ||
    normalizedId.includes('/src/components/react-bits/galaxy.tsx') ||
    normalizedId.includes('/src/components/react-bits/iridescence.tsx') ||
    normalizedId.includes('/src/components/wallpaper/dynamicWallpapers.tsx') ||
    normalizedId.includes('/src/components/wallpaper/dynamicWallpaperSceneImpl.tsx')
  ) {
    return 'vendor-visuals';
  }

  const pkg = getPackageName(normalizedId);
  if (!pkg) return undefined;

  if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') {
    return 'vendor-react';
  }

  if (
    pkg === 'i18next' ||
    pkg === 'react-i18next' ||
    pkg === 'i18next-browser-languagedetector'
  ) {
    return 'vendor-i18n';
  }

  if (
    pkg === 'framer-motion' ||
    pkg === 'motion'
  ) {
    return 'vendor-motion';
  }

  if (
    pkg === 'next-themes' ||
    pkg === 'use-sync-external-store' ||
    pkg === 'use-sync-external-store/shim'
  ) {
    return 'vendor-theme';
  }

  if (
    pkg === 'clsx' ||
    pkg === 'tailwind-merge' ||
    pkg === 'class-variance-authority'
  ) {
    return 'vendor-style-utils';
  }

  if (
    pkg.startsWith('@radix-ui/') ||
    pkg === 'cmdk' ||
    pkg === 'vaul' ||
    pkg === 'react-resizable-panels' ||
    pkg === 'react-hook-form' ||
    pkg === 'react-day-picker' ||
    pkg === 'embla-carousel-react'
  ) {
    return 'vendor-ui';
  }

  if (
    pkg.startsWith('@dnd-kit/') ||
    pkg.startsWith('@atlaskit/')
  ) {
    return 'vendor-dnd';
  }

  if (
    pkg === '@react-three/fiber' ||
    pkg === '@react-three/drei' ||
    pkg === 'three' ||
    pkg === 'ogl'
  ) {
    return 'vendor-visuals';
  }

  if (pkg === 'recharts') {
    return 'vendor-charts';
  }

  if (pkg === 'lunar-javascript') {
    return 'vendor-lunar';
  }

  if (normalizedId.includes('/china-division/dist/areas.json')) {
    return 'vendor-location-areas';
  }

  if (
    normalizedId.includes('/china-division/dist/provinces.json')
    || normalizedId.includes('/china-division/dist/cities.json')
  ) {
    return 'vendor-location-core';
  }

  if (pkg === 'china-division') {
    return 'vendor-location';
  }

  if (pkg === '@remixicon/react' || pkg === 'lucide-react') {
    return 'vendor-icons';
  }

  return 'vendor-misc';
}

export default defineConfig(async () => {
  const { default: tailwindcss } = await import('@tailwindcss/vite');
  return {
  base: './',
  plugins: [react(), tailwindcss()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'input-otp@1.4.2': 'input-otp',
        'figma:asset/eceae747f646d77b2406cf085c3a85831a804f63.png': path.resolve(__dirname, './src/assets/eceae747f646d77b2406cf085c3a85831a804f63.png'),
        'figma:asset/e94ede32a90535fa2d1287523cc24e57e946e48b.png': path.resolve(__dirname, './src/assets/e94ede32a90535fa2d1287523cc24e57e946e48b.png'),
        'figma:asset/b77d1380c2842279a0c197d1863d764aeb826406.png': path.resolve(__dirname, './src/assets/Default_wallpaper.png'),
        'figma:asset/7ed6e054af5c8c137c0543e2a2a79648eb201022.png': path.resolve(__dirname, './src/assets/7ed6e054af5c8c137c0543e2a2a79648eb201022.png'),
        'figma:asset/6e78c062deb7e4b6d0fc541ae668ca3ee589f8e0.png': path.resolve(__dirname, './src/assets/6e78c062deb7e4b6d0fc541ae668ca3ee589f8e0.png'),
        'figma:asset/32e3999e6bc2402807c181924305f8505f10e884.png': path.resolve(__dirname, './src/assets/32e3999e6bc2402807c181924305f8505f10e884.png'),
        'figma:asset/183c775081a1ec5818a41fff8edb1e69601b8ebe.png': path.resolve(__dirname, './src/assets/183c775081a1ec5818a41fff8edb1e69601b8ebe.png'),
        'figma:asset/115225cf7ba7be92b085ec6289ea86e45feb8260.png': path.resolve(__dirname, './src/assets/115225cf7ba7be92b085ec6289ea86e45feb8260.png'),
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      modulePreload: {
        resolveDependencies: (_filename, deps, context) => {
          if (context.hostType === 'html') {
            return deps.filter((dep) => !dep.includes('vendor-visuals'));
          }
          return deps;
        },
      },
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
