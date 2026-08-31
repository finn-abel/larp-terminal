import { useEffect, useRef, useState } from 'react'
import { useRegimeName, useStreams } from '@renderer/store/useMarketStore'
import type { PanelProps } from '@renderer/layout/panelRegistry'
import { createScriptRng, nextExchange, type ConsoleLine } from './consoleScript'
import './console-panel.css'

export interface ConsoleConfig {
  /** Milliseconds per character. */
  readonly typeSpeed: number
  readonly historyLimit: number
}

interface TypedLine extends ConsoleLine {
  readonly id: number
}

export function ConsolePanel({ config }: PanelProps<ConsoleConfig>): React.JSX.Element {
  const regime = useRegimeName()
  const streams = useStreams()
  const [lines, setLines] = useState<readonly TypedLine[]>([])
  const [typing, setTyping] = useState('')

  // Live values the typing loop reads without restarting when they change.
  const contextRef = useRef({ regime, symbols: streams.map((s) => s.definition.symbol) })
  contextRef.current = { regime, symbols: streams.map((s) => s.definition.symbol) }

  useEffect(() => {
    const rng = createScriptRng(0xc0de)
    let queue: ConsoleLine[] = []
    let current: ConsoleLine | null = null
    let position = 0
    let counter = 0
    let timer: ReturnType<typeof setTimeout>

    const step = (): void => {
      if (!current) {
        if (queue.length === 0) queue = [...nextExchange(rng, contextRef.current)]
        current = queue.shift() ?? null
        position = 0
      }

      if (current) {
        position += 1
        setTyping(current.text.slice(0, position))

        if (position >= current.text.length) {
          const finished: TypedLine = { ...current, id: (counter += 1) }
          setLines((previous) => [...previous, finished].slice(-config.historyLimit))
          setTyping('')
          current = null
          // A beat between lines, longer after an output line.
          timer = setTimeout(step, finished.output ? 900 : 260)
          return
        }
      }

      timer = setTimeout(step, config.typeSpeed)
    }

    timer = setTimeout(step, 400)
    return () => clearTimeout(timer)
  }, [config.typeSpeed, config.historyLimit])

  return (
    <div className="console">
      {lines.map((line) => (
        <p key={line.id} className={`console__line${line.output ? ' console__line--out' : ''}`}>
          <span className="console__prompt">{line.prompt}</span> {line.text}
        </p>
      ))}
      <p className="console__line console__line--active">
        <span className="console__prompt">$</span> {typing}
        <span className="console__cursor" aria-hidden="true">
          ▊
        </span>
      </p>
    </div>
  )
}
