import { describe, expect, it } from 'vitest'
import { DEFAULT_SYMBOLS } from '@renderer/engine'
import { createStreamState } from '@renderer/engine/streams'
import { heatIntensity, sectorSummaries } from './sectors'
import type { StreamState } from '@renderer/engine'

const move = (index: number, factor: number): StreamState => {
  const definition = DEFAULT_SYMBOLS[index]!
  return { ...createStreamState(definition), price: definition.basePrice * factor }
}

describe('sectorSummaries', () => {
  it('returns one entry per sector in catalogue order', () => {
    const streams = DEFAULT_SYMBOLS.map((definition) => createStreamState(definition))
    const summaries = sectorSummaries(streams)
    const expected = [...new Set(DEFAULT_SYMBOLS.map((definition) => definition.sector))]

    expect(summaries.map((summary) => summary.sector)).toEqual(expected)
  })

  it('averages the moves inside a sector', () => {
    // QVNX and AXLM are both QUANT.
    const summaries = sectorSummaries([move(0, 1.1), move(7, 0.9)])
    const quant = summaries.find((summary) => summary.sector === 'QUANT')!

    expect(quant.count).toBe(2)
    expect(quant.percent).toBeCloseTo(0, 6)
    expect(quant.breadth).toBeCloseTo(0.5, 6)
  })

  it('reports full breadth when every member is up', () => {
    const summaries = sectorSummaries([move(0, 1.05), move(7, 1.02)])
    expect(summaries[0]!.breadth).toBe(1)
    expect(summaries[0]!.percent).toBeGreaterThan(0)
  })

  it('returns nothing for an empty book', () => {
    expect(sectorSummaries([])).toEqual([])
  })
})

describe('heatIntensity', () => {
  it('is zero when flat and saturates at the scale', () => {
    expect(heatIntensity(0)).toBe(0)
    expect(heatIntensity(4)).toBe(1)
    expect(heatIntensity(-9)).toBe(1)
  })

  it('is symmetric and proportional between the bounds', () => {
    expect(heatIntensity(2)).toBeCloseTo(0.5, 6)
    expect(heatIntensity(-2)).toBeCloseTo(0.5, 6)
  })
})
