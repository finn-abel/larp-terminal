import { useCallback } from 'react'
import type { IWatermarkPanelProps } from 'dockview-react'
import { PANEL_DEFINITIONS } from './panelRegistry'
import { addPanel } from './workspace'

/**
 * Shown when the workspace is empty. Driven by the registry, so a new panel type
 * appears here without touching the host. Step 7 replaces this with the command palette.
 */
export function WorkspaceWatermark(props: IWatermarkPanelProps): React.JSX.Element {
  const { containerApi } = props
  const spawn = useCallback(
    (type: string) => {
      addPanel(containerApi, type)
    },
    [containerApi]
  )

  return (
    <div className="watermark">
      <p className="watermark__title">NO PANELS MOUNTED</p>
      <ul className="watermark__list">
        {PANEL_DEFINITIONS.map((definition) => (
          <li key={definition.type}>
            <button type="button" className="watermark__add" onClick={() => spawn(definition.type)}>
              + {definition.displayName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
