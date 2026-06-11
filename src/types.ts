export type Player = {
  id: string
  name: string
  nickname: string
  avatarColor: string // hex — drives the initials monogram
  skill: number // 1..5
  createdAt: string
}

export type CrestPattern = 'solid' | 'halves' | 'stripes' | 'sash' | 'chevron' | 'hoops'

export type CrestShape = 'shield' | 'circle' | 'hexagon' | 'diamond' | 'pentagon' | 'banner'

export type TeamCrest = {
  shape: CrestShape
  pattern: CrestPattern
  symbol: string // key into CREST_SYMBOLS
  symbolColor: string // hex, or 'auto' to contrast the field automatically
  secondary: string // hex — pattern / accent colour
}

export type Team = {
  id: string
  name: string
  color: string // primary colour (the field)
  crest: TeamCrest
  motto: string
}

export type GoalEvent = {
  id: string
  teamId: string
  scorerId: string | null // null = own goal / unclaimed
  assistId: string | null
}

export type Match = {
  id: string
  seasonId: string
  date: string // ISO
  location: string
  teamAId: string
  teamBId: string
  goals: GoalEvent[]
  lineups: Record<string, string[]> // teamId -> playerIds
  mvpId: string | null
  finished: boolean
}

export type Season = {
  id: string
  name: string
  startedAt: string
  endedAt: string | null
}

export type Draw = {
  createdAt: string
  assignments: Record<string, string[]> // teamId -> playerIds
  lockMatchdays: number
  matchdaysPlayed: number
}

export type Screen = 'home' | 'matchday' | 'draw' | 'table' | 'club'
