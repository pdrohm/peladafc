import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Draw, GoalEvent, Match, Player, Season, Team } from './types'
import { todayISO, uid } from './lib/util'

export type LeagueData = {
  players: Player[]
  teams: Team[]
  seasons: Season[]
  matches: Match[]
  draw: Draw | null
  activeSeasonId: string | null
}

export type Settings = {
  lockMatchdays: number // how many matchdays drawn teams stay together before a reshuffle is suggested
}

type State = LeagueData & {
  settings: Settings
  setLockMatchdays: (n: number) => void
  setDrawLock: (n: number) => void

  addPlayer: (p: Omit<Player, 'id' | 'createdAt'>) => void
  updatePlayer: (id: string, patch: Partial<Player>) => void
  deletePlayer: (id: string) => void

  addTeam: (t: Omit<Team, 'id'>) => void
  updateTeam: (id: string, patch: Partial<Team>) => void

  createSeason: (name: string) => void
  endActiveSeason: () => void
  setActiveSeason: (id: string) => void

  setDraw: (assignments: Record<string, string[]>) => void
  clearDraw: () => void
  movePlayerInDraw: (playerId: string, toTeamId: string) => void

  recordMatch: (data: {
    date: string
    location: string
    teamAId: string
    teamBId: string
    goals: Omit<GoalEvent, 'id'>[]
    lineups: Record<string, string[]>
    mvpId: string | null
  }) => string
  deleteMatch: (matchId: string) => void

  loadDemo: () => void
  resetAll: () => void
  importData: (data: LeagueData) => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      players: [],
      teams: [],
      seasons: [],
      matches: [],
      draw: null,
      activeSeasonId: null,
      settings: { lockMatchdays: 4 },

      setLockMatchdays: (n) =>
        set((s) => ({ settings: { ...s.settings, lockMatchdays: clampLock(n) } })),
      setDrawLock: (n) =>
        set((s) => ({ draw: s.draw ? { ...s.draw, lockMatchdays: clampLock(n) } : null })),

      addPlayer: (p) =>
        set((s) => ({ players: [...s.players, { ...p, id: uid(), createdAt: new Date().toISOString() }] })),
      updatePlayer: (id, patch) =>
        set((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deletePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
          draw: s.draw
            ? {
                ...s.draw,
                assignments: Object.fromEntries(
                  Object.entries(s.draw.assignments).map(([t, ids]) => [t, ids.filter((x) => x !== id)]),
                ),
              }
            : null,
        })),

      addTeam: (t) => set((s) => ({ teams: [...s.teams, { ...t, id: uid() }] })),
      updateTeam: (id, patch) =>
        set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      createSeason: (name) =>
        set((s) => {
          const season: Season = { id: uid(), name, startedAt: todayISO(), endedAt: null }
          return {
            seasons: [...s.seasons.map((x) => (x.endedAt ? x : { ...x, endedAt: todayISO() })), season],
            activeSeasonId: season.id,
          }
        }),
      endActiveSeason: () =>
        set((s) => ({
          seasons: s.seasons.map((x) => (x.id === s.activeSeasonId ? { ...x, endedAt: todayISO() } : x)),
        })),
      setActiveSeason: (id) => set({ activeSeasonId: id }),

      setDraw: (assignments) =>
        set((s) => ({
          draw: {
            createdAt: new Date().toISOString(),
            assignments,
            lockMatchdays: s.settings.lockMatchdays,
            matchdaysPlayed: 0,
          },
        })),
      clearDraw: () => set({ draw: null }),
      movePlayerInDraw: (playerId, toTeamId) =>
        set((s) => {
          if (!s.draw) return s
          const assignments = Object.fromEntries(
            Object.entries(s.draw.assignments).map(([t, ids]) => [t, ids.filter((x) => x !== playerId)]),
          )
          assignments[toTeamId] = [...(assignments[toTeamId] ?? []), playerId]
          return { draw: { ...s.draw, assignments } }
        }),

      recordMatch: ({ date, location, teamAId, teamBId, goals, lineups, mvpId }) => {
        const s = get()
        const id = uid()
        const match: Match = {
          id,
          seasonId: s.activeSeasonId ?? '',
          date,
          location,
          teamAId,
          teamBId,
          goals: goals.map((g) => ({ ...g, id: uid() })),
          lineups,
          mvpId,
          finished: true,
        }
        // Count a played matchday against the draw lock only when the recorded
        // match was between two teams that belong to the current draw.
        const drawTeams = s.draw ? Object.keys(s.draw.assignments) : []
        const countsForDraw = s.draw && drawTeams.includes(teamAId) && drawTeams.includes(teamBId)
        set({
          matches: [...s.matches, match],
          draw: countsForDraw ? { ...s.draw!, matchdaysPlayed: s.draw!.matchdaysPlayed + 1 } : s.draw,
        })
        return id
      },
      deleteMatch: (matchId) => set((s) => ({ matches: s.matches.filter((m) => m.id !== matchId) })),

      loadDemo: () => set(buildDemo()),
      resetAll: () =>
        set({ players: [], teams: [], seasons: [], matches: [], draw: null, activeSeasonId: null }),
      importData: (data) =>
        set({
          players: data.players ?? [],
          teams: data.teams ?? [],
          seasons: data.seasons ?? [],
          matches: data.matches ?? [],
          draw: data.draw ?? null,
          activeSeasonId: data.activeSeasonId ?? null,
        }),
    }),
    { name: 'pelada-fc', version: 1 },
  ),
)

function clampLock(n: number): number {
  if (Number.isNaN(n)) return 4
  return Math.min(12, Math.max(1, Math.round(n)))
}

// ---------- demo league ----------

function buildDemo() {
  const mk = (name: string, nickname: string, emoji: string, skill: number): Player => ({
    id: uid(),
    name,
    nickname,
    emoji,
    skill,
    createdAt: new Date().toISOString(),
  })
  const players = [
    mk('Pedro Marques', 'Pedrão', '🦊', 4),
    mk('Rafael Souza', 'Rafa', '🐆', 5),
    mk('Leonardo Lima', 'Léo', '🦅', 3),
    mk('Eduardo Alves', 'Dudu', '🐙', 4),
    mk('Guilherme Costa', 'Gui', '🐺', 2),
    mk('Matheus Rocha', 'Teteus', '🦁', 3),
    mk('Vinícius Prado', 'Vini', '⚡', 4),
    mk('Caio Mendes', 'Caioba', '🐢', 2),
    mk('Tiago Nunes', 'Tigrão', '🐯', 3),
    mk('Bruno Dias', 'Bruninho', '🦈', 5),
    mk('Felipe Ramos', 'Pipo', '🦉', 3),
    mk('Marcos Vieira', 'Marcão', '🐻', 2),
  ]
  const teams: Team[] = [
    { id: uid(), name: 'Real Madruga', color: '#c8f63c', emoji: '🌙', motto: 'Late nights, early goals' },
    { id: uid(), name: 'Borussia Brewery', color: '#ff8a3d', emoji: '🍺', motto: 'We never run dry' },
  ]
  const season: Season = { id: uid(), name: 'Season 1 · 2026', startedAt: '2026-05-07', endedAt: null }

  const [tA, tB] = teams
  const half = Math.ceil(players.length / 2)
  const sideA = players.filter((_, i) => i % 2 === 0).slice(0, half)
  const sideB = players.filter((_, i) => i % 2 === 1)
  const lineups = { [tA.id]: sideA.map((p) => p.id), [tB.id]: sideB.map((p) => p.id) }

  const goal = (teamId: string, scorer?: Player, assist?: Player): GoalEvent => ({
    id: uid(),
    teamId,
    scorerId: scorer?.id ?? null,
    assistId: assist?.id ?? null,
  })
  const p = (i: number) => players[i]

  const matches: Match[] = [
    {
      id: uid(),
      seasonId: season.id,
      date: '2026-05-14',
      location: 'Arena Vila Nova',
      teamAId: tA.id,
      teamBId: tB.id,
      goals: [goal(tA.id, p(0), p(6)), goal(tA.id, p(6)), goal(tB.id, p(9), p(1)), goal(tB.id, p(1)), goal(tB.id, p(9))],
      lineups,
      mvpId: p(9).id,
      finished: true,
    },
    {
      id: uid(),
      seasonId: season.id,
      date: '2026-05-21',
      location: 'Arena Vila Nova',
      teamAId: tA.id,
      teamBId: tB.id,
      goals: [goal(tA.id, p(0), p(2)), goal(tA.id, p(4)), goal(tA.id, p(0)), goal(tB.id, p(3), p(9))],
      lineups,
      mvpId: p(0).id,
      finished: true,
    },
    {
      id: uid(),
      seasonId: season.id,
      date: '2026-05-28',
      location: 'Quadra do Parque',
      teamAId: tA.id,
      teamBId: tB.id,
      goals: [goal(tA.id, p(6), p(0)), goal(tB.id, p(1), p(5)), goal(tB.id, p(9))],
      lineups,
      mvpId: p(1).id,
      finished: true,
    },
    {
      id: uid(),
      seasonId: season.id,
      date: '2026-06-04',
      location: 'Arena Vila Nova',
      teamAId: tA.id,
      teamBId: tB.id,
      goals: [goal(tA.id, p(0), p(6)), goal(tA.id, p(2)), goal(tB.id, p(9), p(1))],
      lineups,
      mvpId: p(0).id,
      finished: true,
    },
  ]

  const draw: Draw = {
    createdAt: '2026-05-14T20:00:00.000Z',
    assignments: lineups,
    lockMatchdays: 4,
    matchdaysPlayed: 4,
  }

  return { players, teams, seasons: [season], matches, draw, activeSeasonId: season.id }
}
