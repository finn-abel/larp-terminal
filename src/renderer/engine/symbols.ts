import type { StreamDefinition } from './types'

/**
 * Invented tickers. Nothing here maps to a real instrument — that is the entire point
 * of the app, and it keeps the prop from being mistaken for a live feed.
 *
 * Betas are spread on purpose. TESR and AXLM are the momentum names that scream in a
 * rally and bleed in a crash; NVLQ barely notices the market at all; GRVN is the hedge
 * and trades against it. That spread is why the screen never goes uniformly red.
 */
export const DEFAULT_SYMBOLS: readonly StreamDefinition[] = [
  { id: 'qvnx', symbol: 'QVNX', name: 'Quantivex Holdings', sector: 'QUANT', basePrice: 412.5, drift: 0.00003, vol: 0.0016, beta: 1.15, sectorBeta: 1 },
  { id: 'zphr', symbol: 'ZPHR', name: 'Zephyr Logistics', sector: 'LOGIS', basePrice: 88.2, drift: 0.00002, vol: 0.0012, beta: 0.85, sectorBeta: 1.05 },
  { id: 'hlxr', symbol: 'HLXR', name: 'Helixar Biosciences', sector: 'BIOTX', basePrice: 27.9, drift: 0.00005, vol: 0.0031, beta: 1.35, sectorBeta: 1.2 },
  { id: 'orbx', symbol: 'ORBX', name: 'Orbex Dynamics', sector: 'AEROS', basePrice: 156.4, drift: 0.00002, vol: 0.002, beta: 1.05, sectorBeta: 0.9 },
  { id: 'krtz', symbol: 'KRTZ', name: 'Kortez Energy', sector: 'ENRGY', basePrice: 63.75, drift: -0.00001, vol: 0.0018, beta: 0.55, sectorBeta: 1.35 },
  { id: 'vnta', symbol: 'VNTA', name: 'Ventra Synthetics', sector: 'SYNTH', basePrice: 209.1, drift: 0.00004, vol: 0.0023, beta: 1.25, sectorBeta: 1.1 },
  { id: 'mrdn', symbol: 'MRDN', name: 'Meridian Capital', sector: 'FINCL', basePrice: 341.8, drift: 0.00002, vol: 0.001, beta: 0.95, sectorBeta: 1 },
  { id: 'axlm', symbol: 'AXLM', name: 'Axiom Lumen', sector: 'QUANT', basePrice: 74.6, drift: 0.00003, vol: 0.0026, beta: 1.45, sectorBeta: 0.8 },
  { id: 'tesr', symbol: 'TESR', name: 'Tesserax Compute', sector: 'SYNTH', basePrice: 588.3, drift: 0.00006, vol: 0.0032, beta: 1.6, sectorBeta: 1.15 },
  { id: 'nvlq', symbol: 'NVLQ', name: 'Nivelo Liquidity', sector: 'FINCL', basePrice: 19.45, drift: 0.00001, vol: 0.0009, beta: 0.15, sectorBeta: 0.5 },
  { id: 'sblr', symbol: 'SBLR', name: 'Sablier Freight', sector: 'LOGIS', basePrice: 122.05, drift: 0.00002, vol: 0.0014, beta: 0.7, sectorBeta: 1 },
  { id: 'grvn', symbol: 'GRVN', name: 'Graviton Reserve', sector: 'ENRGY', basePrice: 967.4, drift: 0.00002, vol: 0.0015, beta: -0.75, sectorBeta: 0.35 }
]

/** Distinct sectors, in catalogue order — the market factor draws one shock per sector. */
export const SECTORS: readonly string[] = [
  ...new Set(DEFAULT_SYMBOLS.map((definition) => definition.sector))
]
