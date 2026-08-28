import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  readonly type: string
  readonly children: ReactNode
}

interface State {
  readonly error: Error | null
}

/**
 * One panel must never take the workspace down with it. A crashing panel is contained
 * here and reports itself in place, leaving every other panel running.
 */
export class PanelErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[panel:${this.props.type}] crashed`, error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="panel-error" role="alert">
        <p className="panel-error__title">PANEL FAULT · {this.props.type.toUpperCase()}</p>
        <p className="panel-error__detail">{error.message}</p>
        <button
          type="button"
          className="panel-error__retry"
          onClick={() => this.setState({ error: null })}
        >
          RETRY
        </button>
      </div>
    )
  }
}
