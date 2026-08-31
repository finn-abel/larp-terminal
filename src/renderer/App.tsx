import { useCallback, useEffect, useState } from 'react'
import { Titlebar } from './components/titlebar/Titlebar'
import { StatusBar } from './components/statusbar/StatusBar'
import { Splash } from './components/splash/Splash'
import { CommandPalette } from './components/palette/CommandPalette'
import { PanelHost } from './layout/PanelHost'
import { getWorkspaceApi } from './layout/workspaceApi'
import { addPanel, buildDefaultLayout } from './layout/workspace'
import { useRegimeFlash } from './hooks/useRegimeFlash'
import { useCrtOverlay } from './hooks/useCrtOverlay'
import { forceRegime, setSeed, startEngine, stopEngine } from './store/useMarketStore'
import type { CommandActions } from './components/palette/commands'
import './app.css'

export function App(): React.JSX.Element {
  const flash = useRegimeFlash()
  const crt = useCrtOverlay()
  const [booted, setBooted] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    startEngine()
    return stopEngine
  }, [])

  // Cmd/Ctrl+K anywhere opens the palette.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const actions: CommandActions = {
    spawnPanel: useCallback((type, config) => {
      const api = getWorkspaceApi()
      if (api) addPanel(api, type, config === undefined ? {} : { config })
    }, []),
    openSymbol: useCallback((symbolId) => {
      const api = getWorkspaceApi()
      if (api) {
        addPanel(api, 'chart', {
          config: { symbolId, intervalSeconds: 2, style: 'candles' }
        })
      }
    }, []),
    forceRegime: useCallback((regime) => forceRegime(regime), []),
    reseed: useCallback(() => setSeed(Math.floor(Date.now() % 1_000_000)), []),
    resetWorkspace: useCallback(() => {
      const api = getWorkspaceApi()
      if (!api) return
      api.clear()
      buildDefaultLayout(api)
    }, []),
    toggleCrt: crt.toggle
  }

  return (
    <div className="app" data-flash={flash ?? undefined}>
      <Titlebar />
      <main className="workspace" aria-label="Workspace">
        <PanelHost />
      </main>
      <StatusBar />

      <div className="app__flash" aria-hidden="true" />
      {crt.enabled ? <div className="app__crt" aria-hidden="true" /> : null}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={actions}
      />
      {/* The engine ticks behind the splash, so the first frame after it is a session
          already in progress rather than a screen of zeroes. */}
      {booted ? null : <Splash onDone={() => setBooted(true)} />}
    </div>
  )
}
