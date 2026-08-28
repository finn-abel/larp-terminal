import { StatusCluster } from './StatusCluster'
import { WindowControls } from './WindowControls'
import './titlebar.css'

export function Titlebar(): React.JSX.Element {
  return (
    <header className="titlebar" data-platform={window.larp.platform}>
      <div className="titlebar__brand">
        <span className="titlebar__mark" aria-hidden="true" />
        <span className="titlebar__name">
          LARP<span className="titlebar__name-sep">//</span>TERMINAL
        </span>
        <span className="titlebar__build">v0.1.0</span>
      </div>

      <StatusCluster />

      <WindowControls />
    </header>
  )
}
