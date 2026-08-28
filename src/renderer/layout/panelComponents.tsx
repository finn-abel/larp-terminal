import type { IDockviewPanelProps } from 'dockview-react'
import { PanelShell } from '@renderer/components/panel/PanelShell'
import { PANEL_DEFINITIONS, type PanelDefinition } from './panelRegistry'

/** Params dockview stores per panel — this is what gets serialized in a workspace. */
export interface PanelParams {
  readonly config: unknown
}

function wrap(definition: PanelDefinition<unknown>): React.FunctionComponent<IDockviewPanelProps> {
  const Panel = definition.component

  function DockedPanel(props: IDockviewPanelProps): React.JSX.Element {
    const config = (props.params as PanelParams | undefined)?.config ?? definition.defaultConfig
    return (
      <PanelShell type={definition.type} detail={definition.describe?.(config)}>
        <Panel config={config} />
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
