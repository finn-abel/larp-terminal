import { streamChange, type StreamState } from '@renderer/engine'

export interface SectorSummary {
  readonly sector: string
  /** Average session move of the sector's members, in percent. */
  readonly percent: number
  /** Members, for the cell subtitle. */
  readonly count: number
  /** Share of the sector's members that are up on the session. */
  readonly breadth: number
}

/** Aggregates streams into sector cells for the heatmap. Order is stable. */
export function sectorSummaries(streams: readonly StreamState[]): readonly SectorSummary[] {
  const order: string[] = []
  const groups = new Map<string, StreamState[]>()

  for (const stream of streams) {
    const { sector } = stream.definition
    const members = groups.get(sector)
    if (members) {
      members.push(stream)
      continue
    }
    order.push(sector)
    groups.set(sector, [stream])
  }

  return order.map((sector) => {
    const members = groups.get(sector)!
    const total = members.reduce((sum, stream) => sum + streamChange(stream).percent, 0)
    const advancers = members.filter((stream) => stream.price >= stream.open).length

    return {
      sector,
      percent: total / members.length,
      count: members.length,
      breadth: advancers / members.length
    }
  })
}

/** Maps a percentage move onto 0-1 intensity for the cell tint. */
export function heatIntensity(percent: number, scale = 4): number {
  return Math.min(1, Math.abs(percent) / scale)
}
