import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/**
 * The renderer ships a strict CSP, but Vite's dev server injects the React Refresh
 * preamble inline. Relax `script-src` for `electron-vite dev` only; the built
 * index.html keeps the strict policy.
 */
function devCspPlugin(): Plugin {
  return {
    name: 'larp-dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace("script-src 'self';", "script-src 'self' 'unsafe-inline' 'unsafe-eval';")
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // A sandboxed preload must be CommonJS, so it is emitted as .cjs even though
        // the package is ESM.
        output: { format: 'cjs', entryFileNames: 'index.cjs' }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react(), devCspPlugin()]
  }
})
