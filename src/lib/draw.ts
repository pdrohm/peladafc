import type { Player } from '../types'
import { shuffle } from './util'

/**
 * Balanced random draw: many random serpentine attempts, keep the one with
 * the lowest spread of total skill between teams. Random enough to feel like
 * a draw, balanced enough to avoid a 5-0 season.
 */
export function balancedDraw(players: Player[], teamIds: string[]): Record<string, string[]> {
  const n = teamIds.length
  let best: Record<string, string[]> | null = null
  let bestSpread = Infinity

  for (let attempt = 0; attempt < 250; attempt++) {
    // Shuffle first so equal-skill players land in random order, then sort by skill.
    const pool = shuffle(players).sort((a, b) => b.skill - a.skill)
    const buckets: Player[][] = teamIds.map(() => [])
    pool.forEach((p, i) => {
      const round = Math.floor(i / n)
      const idx = round % 2 === 0 ? i % n : n - 1 - (i % n) // serpentine
      buckets[idx].push(p)
    })
    const totals = buckets.map((b) => b.reduce((sum, p) => sum + p.skill, 0))
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

export function teamSkill(playerIds: string[], players: Player[]): number {
  return playerIds.reduce((sum, id) => sum + (players.find((p) => p.id === id)?.skill ?? 0), 0)
}
