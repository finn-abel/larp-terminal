import { useMaximized } from '@renderer/hooks/useMaximized'

const ICON_PROPS = {
  width: 10,
  height: 10,
  viewBox: '0 0 10 10',
  'aria-hidden': true,
  focusable: false
} as const

function MinimizeIcon(): React.JSX.Element {
  return (
    <svg {...ICON_PROPS}>
      <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function MaximizeIcon({ isMaximized }: { isMaximized: boolean }): React.JSX.Element {
  if (isMaximized) {
    return (
      <svg {...ICON_PROPS}>
        <path d="M0.5 3.5h6v6h-6z" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M3.5 3.5v-3h6v6h-3" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    )
  }
  return (
    <svg {...ICON_PROPS}>
      <path d="M0.5 0.5h9v9h-9z" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg {...ICON_PROPS}>
      <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export function WindowControls(): React.JSX.Element {
  const isMaximized = useMaximized()
  const { minimize, toggleMaximize, close } = window.larp.window

  return (
    <div className="window-controls">
      <button
        type="button"
        className="window-control"
        onClick={minimize}
        title="Minimize"
        aria-label="Minimize window"
      >
        <MinimizeIcon />
      </button>
      <button
        type="button"
        className="window-control"
        onClick={toggleMaximize}
        title={isMaximized ? 'Restore' : 'Maximize'}
        aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
      >
        <MaximizeIcon isMaximized={isMaximized} />
      </button>
      <button
        type="button"
        className="window-control window-control--close"
        onClick={close}
        title="Close"
        aria-label="Close window"
      >
        <CloseIcon />
      </button>
    </div>
  )
}
