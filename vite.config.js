import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

if (process.env.GITHUB_PAGES === "true" && !process.env.VITE_API_URL) {
  throw new Error("Set VITE_API_URL to the deployed API origin before building for GitHub Pages.");
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/clg-project/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
