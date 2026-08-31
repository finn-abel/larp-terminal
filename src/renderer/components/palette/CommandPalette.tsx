import { useEffect, useMemo, useRef, useState } from 'react'
import { buildCommands, matchCommands, type CommandActions } from './commands'
import './command-palette.css'

interface CommandPaletteProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly actions: CommandActions
}

/** Bloomberg-style: type a code, hit enter. Arrow keys pick from the ranked list. */
export function CommandPalette({
  open,
  onClose,
  actions
}: CommandPaletteProps): React.JSX.Element | null {
  const commands = useMemo(() => buildCommands(), [])
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => matchCommands(commands, query), [commands, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const submit = (position: number): void => {
    const command = results[position]
    if (!command) return
    command.run(actions)
    onClose()
  }

  return (
    <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="palette__scrim" onClick={onClose} />

      <div className="palette__panel">
        <div className="palette__input-row">
          <span className="palette__prompt">&gt;</span>
          <input
            ref={inputRef}
            className="palette__input"
            value={query}
            spellCheck={false}
            autoComplete="off"
            placeholder="COMMAND OR CODE"
            aria-label="Command"
            onChange={(event) => {
              setQuery(event.target.value)
              setIndex(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') return onClose()
              if (event.key === 'Enter') return submit(index)
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setIndex((value) => Math.min(value + 1, results.length - 1))
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setIndex((value) => Math.max(value - 1, 0))
              }
            }}
          />
          <kbd className="palette__hint">ESC</kbd>
        </div>

        <ul className="palette__list">
          {results.length === 0 ? <li className="palette__empty">NO MATCH</li> : null}
          {results.map((command, position) => (
            <li key={`${command.group}-${command.code}`}>
              <button
                type="button"
                className={`palette__item${position === index ? ' is-active' : ''}`}
                onMouseEnter={() => setIndex(position)}
                onClick={() => submit(position)}
              >
                <span className="palette__code">{command.code}</span>
                <span className="palette__label">{command.label}</span>
                {command.hint ? <span className="palette__meta">{command.hint}</span> : null}
                <span className="palette__group">{command.group}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
