import { CandlestickSeries, LineSeries, type ChartOptions, type DeepPartial } from 'lightweight-charts'
import { readToken } from '@renderer/lib/tokens'

export type ChartStyle = 'candles' | 'line'

/** Chart options built from the Appendix C tokens, read at creation time. */
export function chartOptions(): DeepPartial<ChartOptions> {
  const line = readToken('--color-line', '#1b2430')
  const textDim = readToken('--color-text-dim', '#6c7a8a')

  return {
    layout: {
      background: { color: 'transparent' },
      textColor: textDim,
      fontSize: 10,
      fontFamily: readToken('--font-mono', 'monospace'),
      attributionLogo: false
    },
    grid: {
      vertLines: { color: line },
      horzLines: { color: line }
    },
    rightPriceScale: {
      borderColor: line,
      scaleMargins: { top: 0.12, bottom: 0.12 }
    },
    timeScale: {
      borderColor: line,
      timeVisible: true,
      secondsVisible: true,
      rightOffset: 3,
      barSpacing: 7
    },
    crosshair: {
      vertLine: { color: readToken('--color-accent', '#ffae00'), width: 1, style: 3, labelBackgroundColor: readToken('--color-accent', '#ffae00') },
      horzLine: { color: readToken('--color-accent', '#ffae00'), width: 1, style: 3, labelBackgroundColor: readToken('--color-accent', '#ffae00') }
    },
    handleScale: { axisPressedMouseMove: { time: true, price: false } }
  }
}

/**
 * Series options per style. Kept as two functions rather than one union-returning
 * helper so `addSeries` stays precisely typed at each call site.
 */
export function candleOptions() {
  const up = readToken('--color-up', '#2ee88a')
  const down = readToken('--color-down', '#ff5b55')

  return {
    upColor: up,
    downColor: down,
    wickUpColor: up,
    wickDownColor: down,
    borderUpColor: up,
    borderDownColor: down
  }
}

export function lineOptions() {
  return { color: readToken('--color-accent', '#ffae00'), lineWidth: 1 as const }
}

export { CandlestickSeries, LineSeries }
