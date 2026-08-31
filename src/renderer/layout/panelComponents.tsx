import { Suspense } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import { PanelShell } from '@renderer/components/panel/PanelShell'
import { PanelErrorBoundary } from '@renderer/components/panel/PanelErrorBoundary'
import { PANEL_DEFINITIONS, panelTitle, type PanelDefinition } from './panelRegistry'

/** Params dockview stores per panel — this is what gets serialized in a workspace. */
export interface PanelParams {
  readonly config: unknown
}

function wrap(definition: PanelDefinition<unknown>): React.FunctionComponent<IDockviewPanelProps> {
  const Panel = definition.component

  function DockedPanel(props: IDockviewPanelProps): React.JSX.Element {
    const config = (props.params as PanelParams | undefined)?.config ?? definition.defaultConfig

    // Writing config back through dockview means it lands in the serialized workspace,
    // so a panel's settings survive a reload for free.
    const setConfig = (next: unknown): void => {
      props.api.updateParameters({ config: next } satisfies PanelParams)
      props.api.setTitle(panelTitle(definition.type, next))
    }

    return (
      <PanelShell type={definition.type} detail={definition.describe?.(config)}>
        <PanelErrorBoundary type={definition.type}>
          <Suspense fallback={<p className="panel-loading">LOADING {definition.displayName}…</p>}>
            <Panel config={config} setConfig={setConfig} />
          </Suspense>
        </PanelErrorBoundary>
      </PanelShell>
    )
  }

  DockedPanel.displayName = `Docked(${definition.displayName})`
  return DockedPanel
}

/**
 * Built from the registry, so adding a panel type touches only `panelRegistry.ts` —
 * the host never changes.
 */
export const PANEL_COMPONENTS: Record<string, React.FunctionComponent<IDockviewPanelProps>> =
  Object.fromEntries(PANEL_DEFINITIONS.map((definition) => [definition.type, wrap(definition)]))
