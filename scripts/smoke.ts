/* Logic smoke test: run with
   npx esbuild scripts/smoke.ts --bundle --format=esm --outfile=/tmp/pelada-smoke.mjs && node /tmp/pelada-smoke.mjs */
import { computePlayerStats, computeStandings, scoreOf } from '../src/lib/stats'
import { balancedDraw, teamSkill } from '../src/lib/draw'
import type { Match, Player, Team } from '../src/types'

let failures = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✅' : '❌'} ${name}`)
  if (!cond) failures++
}

const players: Player[] = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  nickname: `P${i}`,
  emoji: '⚽',
  skill: (i % 5) + 1,
  createdAt: '',
}))
const teams: Team[] = [
  { id: 'tA', name: 'A', color: '#fff', emoji: 'A', motto: '' },
  { id: 'tB', name: 'B', color: '#000', emoji: 'B', motto: '' },
]
const lineups = { tA: ['p0', 'p1', 'p2'], tB: ['p3', 'p4', 'p5'] }
const matches: Match[] = [
  {
    id: 'm1', seasonId: 's1', date: '2026-06-01', location: 'x', teamAId: 'tA', teamBId: 'tB',
    goals: [
      { id: 'g1', teamId: 'tA', scorerId: 'p0', assistId: 'p1' },
      { id: 'g2', teamId: 'tA', scorerId: 'p0', assistId: null },
      { id: 'g3', teamId: 'tB', scorerId: 'p3', assistId: 'p4' },
    ],
    lineups, mvpId: 'p0', finished: true,
  },
  {
    id: 'm2', seasonId: 's1', date: '2026-06-08', location: 'x', teamAId: 'tA', teamBId: 'tB',
    goals: [{ id: 'g4', teamId: 'tB', scorerId: 'p3', assistId: null }],
    lineups, mvpId: 'p3', finished: true,
  },
]

const m1 = scoreOf(matches[0])
check('scoreOf m1 = 2-1', m1.a === 2 && m1.b === 1)

const table = computeStandings(matches, teams, 's1')
check('both teams on 3 pts (1W 1L each)', table[0].points === 3 && table[1].points === 3)
check('dead level: both GD 0, GF 2', table[0].gd === 0 && table[1].gd === 0 && table[0].gf === 2)
check('played counts', table[0].played === 2 && table[1].played === 2)
check('form tracked', table[0].form.join('') === 'WL' && table[1].form.join('') === 'LW')

const pstats = computePlayerStats(matches, players, 's1')
const p0 = pstats.find((s) => s.playerId === 'p0')!
const p3 = pstats.find((s) => s.playerId === 'p3')!
check('p0: 2 goals, 1 mvp, 2 apps, 1 win', p0.goals === 2 && p0.mvps === 1 && p0.apps === 2 && p0.wins === 1)
check('p1: 1 assist', pstats.find((s) => s.playerId === 'p1')!.assists === 1)
check('p3: 2 goals, 1 mvp, 50% win rate', p3.goals === 2 && p3.mvps === 1 && p3.winRate === 0.5)

const draw = balancedDraw(players, ['tA', 'tB'])
const sizeA = draw.tA.length
const sizeB = draw.tB.length
check('draw covers all 10 players', sizeA + sizeB === 10)
check('draw sizes balanced (5v5)', Math.abs(sizeA - sizeB) <= 1)
const spread = Math.abs(teamSkill(draw.tA, players) - teamSkill(draw.tB, players))
check(`draw skill spread ≤ 1 (got ${spread})`, spread <= 1)

const odd = balancedDraw(players.slice(0, 9), ['tA', 'tB'])
check('odd player count splits 5v4', Math.abs(odd.tA.length - odd.tB.length) === 1)

process.exit(failures > 0 ? 1 : 0)
