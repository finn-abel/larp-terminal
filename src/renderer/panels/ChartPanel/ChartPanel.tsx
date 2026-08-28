import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import { DEFAULT_SYMBOLS, REGIMES, streamChange } from '@renderer/engine'
import { engine, useStream, useRegimeName } from '@renderer/store/useMarketStore'
import { closeSeries, createCandleState, pushPrice, seedCandles, type CandleState } from '@renderer/lib/candles'
import { sessionDirection, signed } from '@renderer/lib/format'
import type { PanelProps } from '@renderer/layout/panelRegistry'
import {
  candleOptions,
  chartOptions,
  CandlestickSeries,
  lineOptions,
  LineSeries,
  type ChartStyle
} from './chartTheme'
import './chart-panel.css'

export interface ChartConfig {
  readonly symbolId: string
  /** Seconds of simulated time per candle. */
  readonly intervalSeconds: number
  readonly style: ChartStyle
}

/** Candles retained per panel. */
const CANDLE_LIMIT = 400
/** Widest a candle is allowed to get when the seeded history is short. */
const MAX_BAR_WIDTH = 22
/** Simulated time starts at zero; anchor it to launch so the axis reads as a clock. */
const SESSION_EPOCH_SECONDS = Math.floor(Date.now() / 1000)
const INTERVALS = [1, 2, 5, 15] as const

const chartTime = (simMilliseconds: number): number =>
  SESSION_EPOCH_SECONDS + simMilliseconds / 1000

export function ChartPanel({ config, setConfig }: PanelProps<ChartConfig>): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
  const candlesRef = useRef<CandleState>(createCandleState(config.intervalSeconds, CANDLE_LIMIT))

  const stream = useStream(config.symbolId)
  const regime = useRegimeName()

  // Chart instance: created once, resized by observer, never rebuilt on config change.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      ...chartOptions(),
      width: container.clientWidth,
      height: container.clientHeight
    })
    chartRef.current = chart

    // Dockview panels resize constantly; the observer keeps the canvas crisp.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) chart.resize(width, height)
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Series: rebuilt when the style changes.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const series =
      config.style === 'line'
        ? chart.addSeries(LineSeries, lineOptions())
        : chart.addSeries(CandlestickSeries, candleOptions())
    seriesRef.current = series

    return () => {
      // On unmount React runs this after the chart effect's cleanup, which already
      // disposed the chart and its series; removing again would throw.
      if (chartRef.current === chart) chart.removeSeries(series)
      seriesRef.current = null
    }
  }, [config.style])

  // Data: reseeded and resubscribed when the symbol or interval changes.
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return

    const snapshot = engine.getSnapshot()
    const source = snapshot.streams.find((item) => item.definition.id === config.symbolId)
    if (!source) return

    // History carries no timestamps, so walk backwards from the current tick.
    const stepSeconds = snapshot.tick > 0 ? snapshot.time / snapshot.tick / 1000 : 1 / 12
    const points = source.history.map((price, index) => ({
      time: chartTime(snapshot.time) - (source.history.length - 1 - index) * stepSeconds,
      price
    }))

    candlesRef.current = seedCandles(
      createCandleState(config.intervalSeconds, CANDLE_LIMIT),
      points
    )
    applyData(series, candlesRef.current, config.style)
    frameSeededRange(candlesRef.current.candles.length)

    return engine.subscribe(config.symbolId, (updated, tickSnapshot) => {
      const result = pushPrice(candlesRef.current, chartTime(tickSnapshot.time), updated.price)
      candlesRef.current = result.state

      // A new bucket (or a trimmed one) changes the series shape; otherwise patch the tip.
      if (result.structureChanged) {
        applyData(series, result.state, config.style)
        return
      }
      const last = result.state.candles.at(-1)
      if (last) series.update(toPoint(last, config.style))
    })
  }, [config.symbolId, config.intervalSeconds, config.style])

  /**
   * Right-aligns the seeded candles and fills the pane, but never lets a short seed
   * stretch into a handful of enormous bars — fitContent() alone does exactly that.
   */
  function frameSeededRange(count: number): void {
    const chart = chartRef.current
    const container = containerRef.current
    if (!chart || !container) return

    const minSlots = Math.max(20, Math.ceil(container.clientWidth / MAX_BAR_WIDTH))
    const to = count + 3
    chart.timeScale().setVisibleLogicalRange({ from: to - Math.max(count + 3, minSlots), to })
  }

  const change = stream ? streamChange(stream) : null
  const direction = stream ? sessionDirection(stream) : 'flat'

  return (
    <div className="chart">
      <header className="chart__head">
        <span className="chart__symbol">{stream?.definition.symbol ?? config.symbolId.toUpperCase()}</span>
        {stream ? (
          <>
            <span className={`chart__last mkt-${direction}`}>{stream.price.toFixed(2)}</span>
            <span className={`chart__change mkt-${direction}`}>
              {signed(change!.percent)}%
            </span>
          </>
        ) : (
          <span className="mkt-down">NO FEED</span>
        )}
        <span className={`chart__regime chart__regime--${regime}`}>{REGIMES[regime].code}</span>
      </header>

      <div className="chart__canvas" ref={containerRef} />

      <div className="chart__controls">
        <label className="chart__control">
          <span className="chart__control-label">SYM</span>
          <select
            value={config.symbolId}
            onChange={(event) => setConfig({ ...config, symbolId: event.target.value })}
          >
            {DEFAULT_SYMBOLS.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.symbol}
              </option>
            ))}
          </select>
        </label>

        <label className="chart__control">
          <span className="chart__control-label">INT</span>
          <select
            value={config.intervalSeconds}
            onChange={(event) =>
              setConfig({ ...config, intervalSeconds: Number(event.target.value) })
            }
          >
            {INTERVALS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds}S
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="chart__toggle"
          onClick={() =>
            setConfig({ ...config, style: config.style === 'candles' ? 'line' : 'candles' })
          }
        >
          {config.style === 'candles' ? 'CANDLES' : 'LINE'}
        </button>
      </div>
    </div>
  )
}

type AnySeries = ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>

function toPoint(candle: CandleState['candles'][number], style: ChartStyle) {
  const time = candle.time as UTCTimestamp
  return style === 'line'
    ? { time, value: candle.close }
    : { time, open: candle.open, high: candle.high, low: candle.low, close: candle.close }
}

function applyData(series: AnySeries, state: CandleState, style: ChartStyle): void {
  if (style === 'line') {
    ;(series as ISeriesApi<'Line'>).setData(
      closeSeries(state).map((point) => ({ ...point, time: point.time as UTCTimestamp }))
    )
    return
  }
  ;(series as ISeriesApi<'Candlestick'>).setData(
    state.candles.map((candle) => ({ ...candle, time: candle.time as UTCTimestamp }))
  )
}
