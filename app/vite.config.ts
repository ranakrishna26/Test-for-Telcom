import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // echarts-for-react prebundle emits `import "tslib"`; without this, dev fails to resolve tslib from .vite/deps.
  optimizeDeps: {
    include: ['echarts-for-react', 'echarts', 'tslib'],
  },
})
