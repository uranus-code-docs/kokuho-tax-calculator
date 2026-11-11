import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' … どのパスに置いても動くように相対パスで出力する
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
