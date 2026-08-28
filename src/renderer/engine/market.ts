import type { Rng } from './rng'
import type { MarketPulse, RegimeProfile } from './types'

/** Baseline per-second log drift of the market factor, before regime multipliers. */
const MARKET_DRIFT = 0.00006
/** Baseline market volatility, per sqrt(second). */
const MARKET_VOL = 0.0015
/** Sector factor volatility. Smaller than the market factor, larger than nothing. */
const SECTOR_VOL = 0.0011

/**
 * One shared shock per tick, plus one per sector.
 *
 * This is what stops the screen from being uniformly red: a stream's move is
 * `beta * market + sectorBeta * sector + idiosyncratic`, so a name with a low or
 * negative beta can rise while the market factor is falling. Nothing is clamped —
 * the dispersion comes from the structure of the returns, not from a limit.
 */
export function createPulse(
  profile: RegimeProfile,
  dtSeconds: number,
  sectors: readonly string[],
  rng: Rng
): MarketPulse {
  const vol = MARKET_VOL * profile.volMultiplier
  const sectorVol = SECTOR_VOL * profile.volMultiplier
  const scale = Math.sqrt(dtSeconds)

  const sectorShocks: Record<string, number> = {}
  for (const sector of sectors) {
    sectorShocks[sector] = sectorVol * scale * rng.normal()
  }

  return {
    drift: MARKET_DRIFT * profile.driftMultiplier,
    shock: vol * scale * rng.normal(),
    vol,
    sectorVol,
    sectorShocks
  }
}
