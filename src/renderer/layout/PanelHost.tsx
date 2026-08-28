import { useEffect, useRef } from 'react'
import { DockviewReact, themeAbyss, type DockviewApi, type DockviewReadyEvent } from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import { PanelTab } from '@renderer/components/panel/PanelTab'
import { PANEL_COMPONENTS } from './panelComponents'
import { WorkspaceWatermark } from './WorkspaceWatermark'
import { buildDefaultLayout, clearWorkspace, loadWorkspace, saveWorkspace } from './workspace'
import './panel-host.css'

/** Layout changes arrive in bursts while dragging; only the settled result is stored. */
const SAVE_DEBOUNCE_MS = 250

export function PanelHost(): React.JSX.Element {
  const apiRef = useRef<DockviewApi | null>(null)
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const disposables = disposablesRef.current
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      for (const disposable of disposables) disposable.dispose()
      disposables.length = 0
    }
  }, [])

  const onReady = (event: DockviewReadyEvent): void => {
    apiRef.current = event.api

    const stored = loadWorkspace()
    let restored = false
    if (stored) {
      try {
        event.api.fromJSON(stored)
        restored = event.api.panels.length > 0
      } catch (error) {
        // A layout referencing a panel type that no longer exists must not brick launch.
        console.warn('[workspace] discarding unusable layout', error)
        clearWorkspace()
      }
    }
    if (!restored) buildDefaultLayout(event.api)

    disposablesRef.current.push(
      event.api.onDidLayoutChange(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => saveWorkspace(event.api.toJSON()), SAVE_DEBOUNCE_MS)
      })
    )
  }

  return (
    <DockviewReact
      className="panel-host"
      theme={themeAbyss}
      components={PANEL_COMPONENTS}
      defaultTabComponent={PanelTab}
      watermarkComponent={WorkspaceWatermark}
      onReady={onReady}
    />
  )
}
