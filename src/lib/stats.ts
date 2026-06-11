import type { Match, Player, Team } from '../types'

export type StandingRow = {
  teamId: string
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  gd: number
  points: number
  form: ('W' | 'D' | 'L')[] // most recent last
}

export type PlayerStats = {
  playerId: string
  apps: number
  goals: number
  assists: number
  mvps: number
  wins: number
  draws: number
  losses: number
  winRate: number // 0..1
}

export function scoreOf(match: Match): { a: number; b: number } {
  let a = 0
  let b = 0
  for (const g of match.goals) {
    if (g.teamId === match.teamAId) a++
    else if (g.teamId === match.teamBId) b++
  }
  return { a, b }
}

export function seasonMatches(matches: Match[], seasonId: string | null): Match[] {
  return matches
    .filter((m) => m.finished && (!seasonId || m.seasonId === seasonId))
    .sort((x, y) => x.date.localeCompare(y.date))
}

export function computeStandings(matches: Match[], teams: Team[], seasonId: string | null): StandingRow[] {
  const rows = new Map<string, StandingRow>()
  for (const t of teams) {
    rows.set(t.id, { teamId: t.id, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0, form: [] })
  }
  for (const m of seasonMatches(matches, seasonId)) {
    const ra = rows.get(m.teamAId)
    const rb = rows.get(m.teamBId)
    if (!ra || !rb) continue
    const { a, b } = scoreOf(m)
    ra.played++
    rb.played++
    ra.gf += a
    ra.ga += b
    rb.gf += b
    rb.ga += a
    if (a > b) {
      ra.wins++
      rb.losses++
      ra.points += 3
      ra.form.push('W')
      rb.form.push('L')
    } else if (b > a) {
      rb.wins++
      ra.losses++
      rb.points += 3
      rb.form.push('W')
      ra.form.push('L')
    } else {
      ra.draws++
      rb.draws++
      ra.points++
      rb.points++
      ra.form.push('D')
      rb.form.push('D')
    }
  }
  for (const r of rows.values()) {
    r.gd = r.gf - r.ga
    r.form = r.form.slice(-5)
  }
  return [...rows.values()].sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf)
}

export function computePlayerStats(matches: Match[], players: Player[], seasonId: string | null): PlayerStats[] {
  const stats = new Map<string, PlayerStats>()
  for (const p of players) {
    stats.set(p.id, { playerId: p.id, apps: 0, goals: 0, assists: 0, mvps: 0, wins: 0, draws: 0, losses: 0, winRate: 0 })
  }
  for (const m of seasonMatches(matches, seasonId)) {
    const { a, b } = scoreOf(m)
    const outcome = (teamId: string): 'W' | 'D' | 'L' => {
      if (a === b) return 'D'
      const winner = a > b ? m.teamAId : m.teamBId
      return teamId === winner ? 'W' : 'L'
    }
    for (const [teamId, ids] of Object.entries(m.lineups)) {
      for (const pid of ids) {
        const s = stats.get(pid)
        if (!s) continue
        s.apps++
        const o = outcome(teamId)
        if (o === 'W') s.wins++
        else if (o === 'D') s.draws++
        else s.losses++
      }
    }
    for (const g of m.goals) {
      if (g.scorerId) {
        const s = stats.get(g.scorerId)
        if (s) s.goals++
      }
      if (g.assistId) {
        const s = stats.get(g.assistId)
        if (s) s.assists++
      }
    }
    if (m.mvpId) {
      const s = stats.get(m.mvpId)
      if (s) s.mvps++
    }
  }
  for (const s of stats.values()) {
    s.winRate = s.apps > 0 ? s.wins / s.apps : 0
  }
  return [...stats.values()]
}

/** `id` maps to i18n keys `badge.<id>` (label) and `badge.<id>.hint`. */
export type Badge = { emoji: string; id: string }

/** Fun computed badges for a player, relative to the rest of the league. */
export function playerBadges(stats: PlayerStats, all: PlayerStats[]): Badge[] {
  const badges: Badge[] = []
  const active = all.filter((s) => s.apps > 0)
  if (stats.apps === 0) return badges
  const max = (key: keyof PlayerStats) => Math.max(...active.map((s) => s[key] as number))

  if (stats.goals > 0 && stats.goals === max('goals')) {
    badges.push({ emoji: '👟', id: 'goldenBoot' })
  }
  if (stats.assists > 0 && stats.assists === max('assists')) {
    badges.push({ emoji: '🍽️', id: 'waiter' })
  }
  if (stats.mvps > 0 && stats.mvps === max('mvps')) {
    badges.push({ emoji: '👑', id: 'mvpMagnet' })
  }
  if (stats.apps === max('apps') && stats.apps >= 3) {
    badges.push({ emoji: '🦾', id: 'ironMan' })
  }
  if (stats.apps >= 3 && stats.winRate >= 0.7) {
    badges.push({ emoji: '🍀', id: 'luckyCharm' })
  }
  if (stats.apps >= 3 && stats.goals === 0 && stats.assists === 0) {
    badges.push({ emoji: '🧱', id: 'theWall' })
  }
  return badges
}

export function leaders(stats: PlayerStats[], key: 'goals' | 'assists' | 'mvps'): PlayerStats[] {
  return stats
    .filter((s) => s[key] > 0)
    .sort((a, b) => b[key] - a[key] || b.apps - a.apps)
}
