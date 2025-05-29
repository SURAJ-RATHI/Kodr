import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prismjs from 'vite-plugin-prismjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    prismjs({
      languages: ['javascript', 'python', 'java', 'cpp'],
      plugins: ['line-numbers'],
      theme: 'default',
      css: true,
    }),
  ],
})
