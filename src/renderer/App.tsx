import { useEffect } from 'react'
import { Titlebar } from './components/titlebar/Titlebar'
import { PanelHost } from './layout/PanelHost'
import { startEngine, stopEngine } from './store/useMarketStore'
import './app.css'

export function App(): React.JSX.Element {
  useEffect(() => {
    startEngine()
    return stopEngine
  }, [])

  return (
    <div className="app">
      <Titlebar />
      <main className="workspace" aria-label="Workspace">
        <PanelHost />
      </main>
    </div>
  )
}
