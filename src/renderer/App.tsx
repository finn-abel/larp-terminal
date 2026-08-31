import { useEffect } from 'react'
import { Titlebar } from './components/titlebar/Titlebar'
import { StatusBar } from './components/statusbar/StatusBar'
import { PanelHost } from './layout/PanelHost'
import { useRegimeFlash } from './hooks/useRegimeFlash'
import { startEngine, stopEngine } from './store/useMarketStore'
import './app.css'

export function App(): React.JSX.Element {
  const flash = useRegimeFlash()

  useEffect(() => {
    startEngine()
    return stopEngine
  }, [])

  return (
    <div className="app" data-flash={flash ?? undefined}>
      <Titlebar />
      <main className="workspace" aria-label="Workspace">
        <PanelHost />
      </main>
      <StatusBar />
      <div className="app__flash" aria-hidden="true" />
    </div>
  )
}
