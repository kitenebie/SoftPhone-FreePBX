import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.js', // entry ng package mo
      name: 'JuvKSIPSoftphone', // global variable sa browser
      fileName: 'juv-ksip-softphone',
      formats: ['es', 'umd'] // ES modules + CDN (UMD)
    },
    rollupOptions: {
      // external deps (optional pero recommended)
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})