import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
);

const resolveFromRoot = (...paths: string[]) => resolve(__dirname, ...paths);

export default defineConfig({
  resolve: {
    alias: {
      '@': resolveFromRoot('src'),
    },
  },
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'カベガマー＋',
        namespace: 'https://tampermonkey.net/',
        version: pkg.version ?? '0.1.0',
        description:
          'サイト別の設定で壁紙を背景CSS/オーバーレイ/シャドウDOMなど複数のアダプタから選んで適用できます。',
        match: ['*://*/*'],
        'run-at': 'document-start',
        connect: [
          'raw.githubusercontent.com',
          'githubusercontent.com',
          'github.com',
          'lh3.googleusercontent.com',
          'i.imgur.com',
          'images.unsplash.com',
        ],
        require: ['https://update.greasyfork.org/scripts/12228/GM_config.js'],
      },
      build: {
        fileName: 'kabegami.user.js',
        metaFileName: true,
      },
      server: {
        open: false,
        mountGmApi: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    reportCompressedSize: false,
  },
});
