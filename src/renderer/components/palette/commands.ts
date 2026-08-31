import { DEFAULT_SYMBOLS, REGIMES, type RegimeName } from '@renderer/engine'
import { PANEL_DEFINITIONS } from '@renderer/layout/panelRegistry'

export interface Command {
  /** Short code, Bloomberg style: type it and hit enter. */
  readonly code: string
  readonly label: string
  readonly hint?: string
  readonly group: 'PANEL' | 'SYMBOL' | 'REGIME' | 'SESSION'
  readonly run: (actions: CommandActions) => void
}

/** Everything the palette is allowed to do, injected so the list stays testable. */
export interface CommandActions {
  readonly spawnPanel: (type: string, config?: unknown) => void
  readonly openSymbol: (symbolId: string) => void
  readonly forceRegime: (regime: RegimeName) => void
  readonly reseed: () => void
  readonly resetWorkspace: () => void
  readonly toggleCrt: () => void
}

const REGIME_CODES: Readonly<Record<string, RegimeName>> = {
  CALM: 'calm',
  RALLY: 'rally',
  CRASH: 'crash',
  VOL: 'high_vol'
}

/** The full command list. Panels and symbols are derived, so new ones appear for free. */
export function buildCommands(): readonly Command[] {
  const panels: Command[] = PANEL_DEFINITIONS.map((definition) => ({
    // The display name is already the terminal-style code for the panel.
    code: definition.displayName,
    label: `Open ${definition.displayName}`,
    hint: 'panel',
    group: 'PANEL',
    run: (actions) => actions.spawnPanel(definition.type)
  }))

  const symbols: Command[] = DEFAULT_SYMBOLS.map((definition) => ({
    code: definition.symbol,
    label: `Chart ${definition.name}`,
    hint: definition.sector,
    group: 'SYMBOL',
    run: (actions) => actions.openSymbol(definition.id)
  }))

  const regimes: Command[] = Object.entries(REGIME_CODES).map(([code, regime]) => ({
    code,
    label: `Force ${REGIMES[regime].code}`,
    hint: 'regime',
    group: 'REGIME',
    run: (actions) => actions.forceRegime(regime)
  }))

  const session: Command[] = [
    {
      code: 'SEED',
      label: 'Reseed the simulation',
      hint: 'restarts the session',
      group: 'SESSION',
      run: (actions) => actions.reseed()
    },
    {
      code: 'CRT',
      label: 'Toggle CRT overlay',
      hint: 'scanlines',
      group: 'SESSION',
      run: (actions) => actions.toggleCrt()
    },
    {
      code: 'RESET',
      label: 'Reset workspace layout',
      hint: 'restores the default panels',
      group: 'SESSION',
      run: (actions) => actions.resetWorkspace()
    }
  ]

  return [...panels, ...symbols, ...regimes, ...session]
}

/**
 * Ranks commands against a query. An exact code match always wins, so typing a code and
 * hitting enter behaves like a real terminal rather than like a fuzzy finder.
 */
export function matchCommands(
  commands: readonly Command[],
  query: string,
  limit = 12
): readonly Command[] {
  const needle = query.trim().toUpperCase()
  if (needle.length === 0) return commands.slice(0, limit)

  const scored: Array<{ command: Command; score: number }> = []

  for (const command of commands) {
    const code = command.code.toUpperCase()
    const label = command.label.toUpperCase()

    let score = -1
    if (code === needle) score = 0
    else if (code.startsWith(needle)) score = 1
    else if (label.startsWith(needle)) score = 2
    else if (code.includes(needle)) score = 3
    else if (label.includes(needle)) score = 4

    if (score >= 0) scored.push({ command, score })
  }

  return scored
    .sort((a, b) => a.score - b.score || a.command.code.localeCompare(b.command.code))
    .slice(0, limit)
    .map((entry) => entry.command)
}
