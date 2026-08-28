import { describe, expect, it } from 'vitest'
import { createRng, hashSeed } from './rng'

const drawUniforms = (seed: number, count: number): number[] => {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => rng.next())
}

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(drawUniforms(42, 50)).toEqual(drawUniforms(42, 50))
  })

  it('produces a different sequence for a different seed', () => {
    expect(drawUniforms(42, 50)).not.toEqual(drawUniforms(43, 50))
  })

  it('stays within [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 5000; i += 1) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('draws normals with roughly zero mean and unit variance', () => {
    const rng = createRng(99)
    const samples = Array.from({ length: 20000 }, () => rng.normal())
    const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length
    const variance =
      samples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (samples.length - 1)

    expect(Math.abs(mean)).toBeLessThan(0.05)
    expect(variance).toBeGreaterThan(0.9)
    expect(variance).toBeLessThan(1.1)
  })

  it('keeps int and range inside their bounds', () => {
    const rng = createRng(3)
    for (let i = 0; i < 1000; i += 1) {
      expect(rng.int(10)).toBeLessThan(10)
      expect(rng.int(10)).toBeGreaterThanOrEqual(0)
      const value = rng.range(5, 9)
      expect(value).toBeGreaterThanOrEqual(5)
      expect(value).toBeLessThan(9)
    }
  })

  it('hashes seed strings deterministically', () => {
    expect(hashSeed('larp')).toBe(hashSeed('larp'))
    expect(hashSeed('larp')).not.toBe(hashSeed('terminal'))
  })
})
