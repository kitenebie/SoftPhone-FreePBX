import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // When importing juv-ksip-softphone in dev, force Vite to use the ESM build
    conditions: ['import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    // Pre-bundle react-draggable so its CJS code is converted to ESM by Vite
    include: ['react-draggable'],
  },
});
