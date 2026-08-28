#!/usr/bin/env node
import { spawn } from 'node:child_process'

/**
 * Thin wrapper around the electron-vite CLI.
 *
 * Some editors and terminals export `ELECTRON_RUN_AS_NODE=1`. Electron inherits it and
 * boots as a plain Node process — no window, and `require('electron')` resolves to the
 * npm shim instead of the built-in module, which fails with a confusing error. Stripping
 * it here keeps `npm run dev` reliable wherever it is launched from.
 */
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn('electron-vite', process.argv.slice(2), {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32'
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})

child.on('error', (error) => {
  console.error('[larp] failed to start electron-vite:', error.message)
  process.exit(1)
})
