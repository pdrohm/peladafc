import type { Player } from '../types'
import { shuffle } from './util'

// Live rating (1–10) drives the draw so teams auto-rebalance as form shifts.
// Falls back to the player's seed (skill ×2) when no rating is supplied.
const strengthOf = (p: Player, strength?: Map<string, number>) => strength?.get(p.id) ?? p.skill * 2

/**
 * Balanced random draw: many random serpentine attempts, keep the one with
 * the lowest spread of total strength between teams. Random enough to feel like
 * a draw, balanced enough to avoid a 5-0 season.
 */
export function balancedDraw(
  players: Player[],
  teamIds: string[],
  strength?: Map<string, number>,
): Record<string, string[]> {
  const n = teamIds.length
  let best: Record<string, string[]> | null = null
  let bestSpread = Infinity

  for (let attempt = 0; attempt < 250; attempt++) {
    // Shuffle first so equal-strength players land in random order, then sort.
    const pool = shuffle(players).sort((a, b) => strengthOf(b, strength) - strengthOf(a, strength))
    const buckets: Player[][] = teamIds.map(() => [])
    pool.forEach((p, i) => {
      const round = Math.floor(i / n)
      const idx = round % 2 === 0 ? i % n : n - 1 - (i % n) // serpentine
      buckets[idx].push(p)
    })
    const totals = buckets.map((b) => b.reduce((sum, p) => sum + strengthOf(p, strength), 0))
    const spread = Math.max(...totals) - Math.min(...totals)
    const sizes = buckets.map((b) => b.length)
    const sizeSpread = Math.max(...sizes) - Math.min(...sizes)
    const score = spread + sizeSpread * 10
    if (score < bestSpread) {
      bestSpread = score
      best = Object.fromEntries(teamIds.map((id, i) => [id, buckets[i].map((p) => p.id)]))
    }
  }
  return best ?? Object.fromEntries(teamIds.map((id) => [id, []]))
}

/** Total live strength of a side (sum of 1–10 ratings), rounded for display. */
export function teamSkill(playerIds: string[], strength: Map<string, number>): number {
  return Math.round(playerIds.reduce((sum, id) => sum + (strength.get(id) ?? 0), 0))
}
