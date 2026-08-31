import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { IDockviewHeaderActionsProps } from 'dockview-react'
import { PANEL_DEFINITIONS } from './panelRegistry'
import { addPanel } from './workspace'
import './group-actions.css'

/**
 * The `+` in every group header. Closing a panel used to be one-way unless the whole
 * workspace was empty (the watermark) or you knew the palette shortcut; this makes
 * adding one discoverable from wherever you just closed it.
 */
export function GroupActions(props: IDockviewHeaderActionsProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  /** Anchor for the portalled menu, since a group header clips its own overflow. */
  const [anchor, setAnchor] = useState({ top: 0, right: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = (): void => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) setAnchor({ top: rect.bottom + 2, right: window.innerWidth - rect.right })
    setOpen((value) => !value)
  }

  const spawn = (type: string): void => {
    // Referencing the active panel drops the new one into this group as a tab.
    const reference = props.group.activePanel?.id
    addPanel(props.containerApi, type, reference ? { referencePanel: reference } : {})
    setOpen(false)
  }

  return (
    <div className="group-actions" ref={rootRef}>
      <button
        type="button"
        className="group-actions__toggle"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Add panel"
        onClick={toggle}
      >
        +
      </button>

      {open
        ? createPortal(
            <ul
              className="group-actions__menu"
              role="menu"
              ref={menuRef}
              style={{ top: anchor.top, right: anchor.right }}
            >
              <li className="group-actions__heading">ADD PANEL</li>
              {PANEL_DEFINITIONS.map((definition) => (
                <li key={definition.type}>
                  <button
                    type="button"
                    role="menuitem"
                    className="group-actions__item"
                    onClick={() => spawn(definition.type)}
                  >
                    <span className="group-actions__code">{definition.displayName}</span>
                  </button>
                </li>
              ))}
              <li className="group-actions__footer">⌘K for all commands</li>
            </ul>,
            document.body
          )
        : null}
    </div>
  )
}
