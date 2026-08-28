import type { ReactNode } from 'react'
import './panel.css'

interface PanelShellProps {
  readonly type: string
  /** Short config summary shown in the footer, e.g. the configured symbol. */
  readonly detail?: string
  readonly children: ReactNode
}

/**
 * The frame every panel renders inside: scroll containment, density, and the footer
 * code strip. The panel's title bar, drag handle, close button and LIVE dot live in
 * `PanelTab` — dockview owns the tab, so that is where the chrome belongs.
 */
export function PanelShell({ type, detail, children }: PanelShellProps): React.JSX.Element {
  return (
    <section className="panel" data-panel-type={type}>
      <div className="panel__body">{children}</div>
      <footer className="panel__foot">
        <span className="panel__code">{type.toUpperCase()}</span>
        {detail ? <span className="panel__detail">{detail}</span> : null}
      </footer>
    </section>
  )
}
