import { useEffect, useRef, useState } from 'react'
import { DockviewReact, themeAbyss, type DockviewApi, type DockviewReadyEvent } from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import { PanelTab } from '@renderer/components/panel/PanelTab'
import { PANEL_COMPONENTS } from './panelComponents'
import { WorkspaceWatermark } from './WorkspaceWatermark'
import { GroupActions } from './GroupActions'
import {
  buildDefaultLayout,
  DEFAULT_WORKSPACE,
  readWorkspace,
  saveWorkspace
} from './workspace'
import { setWorkspaceApi } from './workspaceApi'
import './panel-host.css'

/** Layout changes arrive in bursts while dragging; only the settled result is stored. */
const SAVE_DEBOUNCE_MS = 250

export function PanelHost(): React.JSX.Element {
  const apiRef = useRef<DockviewApi | null>(null)
  /** The stored layout, fetched before the host mounts so `onReady` can apply it. */
  const [stored, setStored] = useState<{ name: string; layout: unknown } | null>(null)
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    void readWorkspace().then((snapshot) => {
      if (!cancelled) setStored({ name: snapshot.active, layout: snapshot.layout })
    })
    return () => {
      cancelled = true
    }
  }, [])

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
    setWorkspaceApi(event.api)

    const name = stored?.name ?? DEFAULT_WORKSPACE
    let restored = false

    if (stored?.layout) {
      try {
        event.api.fromJSON(stored.layout as Parameters<DockviewApi['fromJSON']>[0])
        restored = event.api.panels.length > 0
      } catch (error) {
        // A layout referencing a panel type that no longer exists must not brick launch.
        console.warn('[workspace] discarding unusable layout', error)
      }
    }
    if (!restored) buildDefaultLayout(event.api)

    disposablesRef.current.push(
      event.api.onDidLayoutChange(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(
          () => void saveWorkspace(name, event.api.toJSON()),
          SAVE_DEBOUNCE_MS
        )
      })
    )
  }

  // Mounting before the stored layout arrives would build the default and immediately
  // overwrite whatever was saved.
  if (!stored) return <p className="panel-loading">RESTORING WORKSPACE…</p>

  return (
    <DockviewReact
      className="panel-host"
      theme={themeAbyss}
      components={PANEL_COMPONENTS}
      defaultTabComponent={PanelTab}
      watermarkComponent={WorkspaceWatermark}
      rightHeaderActionsComponent={GroupActions}
      onReady={onReady}
    />
  )
}
