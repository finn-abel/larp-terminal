import { useEffect, useState } from 'react'
import type { IDockviewPanelHeaderProps } from 'dockview-react'
import './panel.css'

/**
 * The panel title bar: type name, a blinking LIVE dot, and a close button. Dockview
 * makes the tab itself the drag handle, so dragging, splitting and tabbing come free.
 */
export function PanelTab(props: IDockviewPanelHeaderProps): React.JSX.Element {
  const [title, setTitle] = useState(props.api.title ?? props.api.id)

  useEffect(() => {
    const subscription = props.api.onDidTitleChange((event) => setTitle(event.title))
    return () => subscription.dispose()
  }, [props.api])

  return (
    <div className="panel-tab" title={title}>
      <span className="panel-tab__dot" aria-hidden="true" />
      <span className="panel-tab__title">{title}</span>
      <button
        type="button"
        className="panel-tab__close"
        aria-label={`Close ${title}`}
        onClick={(event) => {
          // Without this the tab's own mousedown handler starts a drag instead.
          event.stopPropagation()
          props.api.close()
        }}
      >
        ✕
      </button>
    </div>
  )
}
