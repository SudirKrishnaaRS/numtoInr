import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On GitHub Actions, GITHUB_REPOSITORY is "owner/repo". Project sites are served
// from https://owner.github.io/repo/, user sites (owner.github.io) from "/".
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repo && !repo.endsWith('.github.io') ? `/${repo}/` : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
