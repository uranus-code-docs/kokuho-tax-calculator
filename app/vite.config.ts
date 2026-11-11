import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// すべてのページをビルドする（index.html = トップページ、<slug>.html = 市町村ごとのページ。tools/gunma/gen-pages.mjs が生成）
const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const pages = Object.fromEntries(
  fs
    .readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), path.join(root, f)]),
);

// base: './' … どのパスに置いても動くように相対パスで出力する
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { rollupOptions: { input: pages } },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
