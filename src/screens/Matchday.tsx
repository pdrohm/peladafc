import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { scoreOf } from '../lib/stats'
import { shareMatchImage } from '../lib/share'
import { todayISO, uid } from '../lib/util'
import { Confetti, EmptyState, PlayerAvatar, Sheet, TeamShield } from '../components/ui'
import type { GoalEvent, Match, Screen, Team } from '../types'

export function Matchday({ go }: { go: (s: Screen) => void }) {
  const t = useT()
  const { matches, teams, activeSeasonId } = useStore()
  const [savedId, setSavedId] = useState<string | null>(null)
  const saved = matches.find((m) => m.id === savedId)

  if (saved) return <FullTime match={saved} go={go} onDone={() => setSavedId(null)} />

  if (teams.length < 2) {
    return (
      <div className="screen">
        <h1 className="display page-title">{t('rec.titleA')} <span className="accent">{t('rec.titleB')}</span></h1>
        <EmptyState
          emoji="🥅"
          title={t('md.needTeamsTitle')}
          text={t('md.needTeamsText')}
          action={<button className="btn btn-volt" onClick={() => go('club')}>{t('md.goToClub')}</button>}
        />
      </div>
    )
  }
  if (!activeSeasonId) {
    return (
      <div className="screen">
        <h1 className="display page-title">{t('rec.titleA')} <span className="accent">{t('rec.titleB')}</span></h1>
        <EmptyState
          emoji="📅"
          title={t('md.noSeasonTitle')}
          text={t('md.noSeasonText')}
          action={<button className="btn btn-volt" onClick={() => go('club')}>{t('md.startSeason')}</button>}
        />
      </div>
    )
  }
  return <RecordForm onSaved={setSavedId} />
}

/* ── record a finished match (entered after the game) ── */

function RecordForm({ onSaved }: { onSaved: (id: string) => void }) {
  const t = useT()
  const { teams, players, draw, matches, recordMatch } = useStore()
  const drawTeamIds = draw ? Object.keys(draw.assignments) : []
  const lastLocation = [...matches].reverse().find((m) => m.location)?.location ?? ''

  const [date, setDate] = useState(todayISO())
  const [location, setLocation] = useState(lastLocation)
  const [teamAId, setTeamAId] = useState(drawTeamIds[0] ?? teams[0]?.id ?? '')
  const [teamBId, setTeamBId] = useState(drawTeamIds[1] ?? teams[1]?.id ?? '')
  const [goals, setGoals] = useState<GoalEvent[]>([])
  const [mvpId, setMvpId] = useState<string | null>(null)
  const [lineups, setLineups] = useState<Record<string, string[]>>({})
  const [goalFor, setGoalFor] = useState<Team | null>(null)
  const [mvpOpen, setMvpOpen] = useState(false)
  const [lineupOpen, setLineupOpen] = useState(false)

  const teamA = teams.find((tm) => tm.id === teamAId)
  const teamB = teams.find((tm) => tm.id === teamBId)
  const valid = !!teamA && !!teamB && teamAId !== teamBId
  const playerOf = (id: string | null) => players.find((p) => p.id === id)

  // Lineup defaults to the team's drawn squad until the user edits it.
  const lineupOf = (teamId: string): string[] =>
    lineups[teamId] ?? (draw?.assignments[teamId] ? [...draw.assignments[teamId]] : [])

  const ensureIn = (teamId: string, pid: string) =>
    setLineups((prev) => {
      const base = prev[teamId] ?? (draw?.assignments[teamId] ? [...draw.assignments[teamId]] : [])
      return base.includes(pid) ? { ...prev, [teamId]: base } : { ...prev, [teamId]: [...base, pid] }
    })

  const toggleLineup = (teamId: string, pid: string) =>
    setLineups((prev) => {
      const base = prev[teamId] ?? (draw?.assignments[teamId] ? [...draw.assignments[teamId]] : [])
      const next = base.includes(pid) ? base.filter((x) => x !== pid) : [...base, pid]
      return { ...prev, [teamId]: next }
    })

  // Candidates for scorer/assist: the team's lineup, or everyone if none set yet.
  const candidatesFor = (teamId: string): string[] => {
    const l = lineupOf(teamId)
    return l.length ? l : players.map((p) => p.id)
  }

  const liveGoals = useMemo(
    () => goals.filter((g) => g.teamId === teamAId || g.teamId === teamBId),
    [goals, teamAId, teamBId],
  )
  const a = liveGoals.filter((g) => g.teamId === teamAId).length
  const b = liveGoals.filter((g) => g.teamId === teamBId).length

  const addGoal = (scorerId: string | null, assistId: string | null) => {
    if (!goalFor) return
    setGoals((g) => [...g, { id: uid(), teamId: goalFor.id, scorerId, assistId }])
    if (scorerId) ensureIn(goalFor.id, scorerId)
    if (assistId) ensureIn(goalFor.id, assistId)
    setGoalFor(null)
  }

  const everyone = valid ? [...lineupOf(teamAId), ...lineupOf(teamBId)] : []
  const mvp = playerOf(mvpId)

  const save = () => {
    if (!valid) return
    const id = recordMatch({
      date,
      location: location || t('kickoff.usualPitch'),
      teamAId,
      teamBId,
      goals: liveGoals.map(({ teamId, scorerId, assistId }) => ({ teamId, scorerId, assistId })),
      lineups: { [teamAId]: lineupOf(teamAId), [teamBId]: lineupOf(teamBId) },
      mvpId: mvpId && everyone.includes(mvpId) ? mvpId : null,
    })
    onSaved(id)
  }

  return (
    <div className="screen">
      <h1 className="display page-title">{t('rec.titleA')} <span className="accent">{t('rec.titleB')}</span></h1>
      <p className="page-sub">{t('rec.sub')}</p>

      {/* setup */}
      <div className="section-title">{t('rec.setup')}</div>
      <div className="card">
        <div className="grid-2">
          <div className="field">
            <label>{t('field.date')}</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('field.location')}</label>
            <input className="input" placeholder="Arena Vila Nova" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>{t('field.homeSide')}</label>
            <select className="input" value={teamAId} onChange={(e) => setTeamAId(e.target.value)}>
              {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t('field.awaySide')}</label>
            <select className="input" value={teamBId} onChange={(e) => setTeamBId(e.target.value)}>
              {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </div>
        </div>
        {!valid && <p className="tiny" style={{ color: 'var(--red)', margin: 0 }}>{t('kickoff.pickTwo')}</p>}
      </div>

      {valid && teamA && teamB && (
        <>
          {/* score */}
          <div className="section-title">{t('rec.scoreLabel')}</div>
          <div className="card card-pitch">
            <div className="scoreboard">
              <div className="team-col">
                <TeamShield team={teamA} size="lg" />
                <span className="tname">{teamA.name}</span>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <span className="score-num">{a}</span>
                <span className="score-divider">–</span>
                <span className="score-num">{b}</span>
              </div>
              <div className="team-col">
                <TeamShield team={teamB} size="lg" />
                <span className="tname">{teamB.name}</span>
              </div>
            </div>
            <div className="spacer" />
            <div className="grid-2">
              <button className="btn btn-volt" onClick={() => setGoalFor(teamA)}>{t('live.goal')} · {teamA.name}</button>
              <button className="btn btn-volt" onClick={() => setGoalFor(teamB)}>{t('live.goal')} · {teamB.name}</button>
            </div>
            {liveGoals.length === 0 && <p className="tiny muted" style={{ marginBottom: 0, textAlign: 'center' }}>{t('rec.scoreHint')}</p>}
          </div>

          {/* goal feed */}
          {liveGoals.length > 0 && (
            <>
              <div className="section-title">{t('live.goalFeed')}</div>
              <div className="card flat">
                {liveGoals.map((g) => {
                  const scorer = playerOf(g.scorerId)
                  const assist = playerOf(g.assistId)
                  const team = g.teamId === teamA.id ? teamA : teamB
                  return (
                    <div className="goal-row" key={g.id}>
                      <TeamShield team={team} size="sm" />
                      <span className="who">⚽ {scorer ? scorer.nickname : t('live.mysteryGoal')}</span>
                      {assist && <span className="assist">🤝 {assist.nickname}</span>}
                      <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setGoals((gs) => gs.filter((x) => x.id !== g.id))} title={t('live.removeGoal')}>✕</button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* mvp */}
          <div className="section-title">{t('live.matchAwards')}</div>
          <div className={`card flat row ${mvp ? 'mvp-card' : ''}`}>
            {mvp ? <PlayerAvatar player={mvp} size="lg" /> : <span className="avatar lg">👑</span>}
            <div className="grow">
              <div className="tiny muted" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                <span className="crown">👑</span> {t('live.matchMvp')}
              </div>
              <div className="rank-name" style={{ fontSize: 16 }}>{mvp ? mvp.nickname : t('live.notChosen')}</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setMvpOpen(true)}>{mvp ? t('live.change') : t('live.pickMvp')}</button>
          </div>

          {/* save */}
          <div className="spacer" />
          <div className="row">
            <button className="btn btn-ghost grow" onClick={() => setLineupOpen(true)}>{t('live.whoPlayed')}</button>
            <button className="btn btn-volt grow" onClick={save}>{t('rec.save')}</button>
          </div>

          {/* goal sheet */}
          <Sheet open={!!goalFor} onClose={() => setGoalFor(null)} title={t('goal.goalFor', { team: goalFor?.name ?? '' })}>
            {goalFor && (
              <GoalForm
                playerIds={candidatesFor(goalFor.id)}
                onSave={addGoal}
              />
            )}
          </Sheet>

          {/* mvp sheet */}
          <Sheet open={mvpOpen} onClose={() => setMvpOpen(false)} title={t('mvp.crown')}>
            <div className="chip-grid">
              {everyone.map((pid) => {
                const p = playerOf(pid)
                if (!p) return null
                return (
                  <button
                    key={pid}
                    className={`pchip ${mvpId === pid ? 'on' : ''}`}
                    onClick={() => {
                      setMvpId(mvpId === pid ? null : pid)
                      setMvpOpen(false)
                    }}
                  >
                    <PlayerAvatar player={p} size="sm" />
                    <span><span className="pname">{p.nickname}</span></span>
                  </button>
                )
              })}
            </div>
          </Sheet>

          {/* lineup sheet */}
          <Sheet open={lineupOpen} onClose={() => setLineupOpen(false)} title={t('lineup.whoPlayedToday')}>
            {[teamA, teamB].map((team) => (
              <div key={team.id}>
                <div className="section-title row" style={{ gap: 8, alignItems: 'center' }}>
                  <TeamShield team={team} size="sm" /> {team.name}
                </div>
                <div className="chip-grid">
                  {players.map((p) => {
                    const inTeam = lineupOf(team.id).includes(p.id)
                    const inOther = everyone.includes(p.id) && !inTeam
                    if (inOther) return null
                    return (
                      <button
                        key={p.id}
                        className={`pchip ${inTeam ? 'on' : ''}`}
                        onClick={() => toggleLineup(team.id, p.id)}
                      >
                        <PlayerAvatar player={p} size="sm" />
                        <span><span className="pname">{p.nickname}</span></span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="spacer" />
            <button className="btn btn-volt btn-block" onClick={() => setLineupOpen(false)}>{t('common.done')}</button>
          </Sheet>
        </>
      )}
    </div>
  )
}

function GoalForm({ playerIds, onSave }: {
  playerIds: string[]
  onSave: (scorerId: string | null, assistId: string | null) => void
}) {
  const t = useT()
  const { players } = useStore()
  const [scorerId, setScorerId] = useState<string | null>(null)
  const [assistId, setAssistId] = useState<string | null>(null)
  const squad = playerIds.map((id) => players.find((p) => p.id === id)).filter((p) => !!p)

  return (
    <div>
      <div className="section-title" style={{ marginTop: 0 }}>{t('goal.whoScored')}</div>
      <div className="chip-grid">
        {squad.map((p) => (
          <button key={p.id} className={`pchip ${scorerId === p.id ? 'on' : ''}`} onClick={() => setScorerId(scorerId === p.id ? null : p.id)}>
            <PlayerAvatar player={p} size="sm" />
            <span><span className="pname">{p.nickname}</span></span>
          </button>
        ))}
      </div>
      <div className="section-title">{t('goal.assistOptional')}</div>
      <div className="chip-grid">
        {squad.filter((p) => p.id !== scorerId).map((p) => (
          <button key={p.id} className={`pchip ${assistId === p.id ? 'on' : ''}`} onClick={() => setAssistId(assistId === p.id ? null : p.id)}>
            <PlayerAvatar player={p} size="sm" />
            <span><span className="pname">{p.nickname}</span></span>
          </button>
        ))}
      </div>
      <div className="spacer" />
      <button className="btn btn-volt btn-block" onClick={() => onSave(scorerId, assistId === scorerId ? null : assistId)}>
        {t('goal.itsAGoal')}
      </button>
    </div>
  )
}

/* ── post-save summary ── */

function FullTime({ match, go, onDone }: { match: Match; go: (s: Screen) => void; onDone: () => void }) {
  const t = useT()
  const { teams, players } = useStore()
  const teamA = teams.find((tm) => tm.id === match.teamAId)
  const teamB = teams.find((tm) => tm.id === match.teamBId)
  const { a, b } = scoreOf(match)
  const mvp = players.find((p) => p.id === match.mvpId)
  if (!teamA || !teamB) return null
  const winner = a === b ? null : a > b ? teamA : teamB

  return (
    <div className="screen" style={{ textAlign: 'center' }}>
      <Confetti />
      <p className="pill volt" style={{ marginTop: 30 }}>{t('ft.fullTime')}</p>
      <h1 className="display page-title" style={{ marginTop: 18 }}>
        {winner ? <>{t('ft.takesItA', { team: winner.name })}<br /><span className="accent">{t('ft.takesItB')}</span></> : <>{t('ft.allSquareA')}<br /><span className="accent">{t('ft.allSquareB')}</span></>}
      </h1>
      <div className="card card-pitch" style={{ marginTop: 18 }}>
        <div className="scoreboard">
          <div className="team-col">
            <TeamShield team={teamA} size="lg" />
            <span className="tname">{teamA.name}</span>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <span className="score-num">{a}</span>
            <span className="score-divider">–</span>
            <span className="score-num">{b}</span>
          </div>
          <div className="team-col">
            <TeamShield team={teamB} size="lg" />
            <span className="tname">{teamB.name}</span>
          </div>
        </div>
        {mvp && (
          <p style={{ marginBottom: 0 }}>
            <span className="pill gold"><span className="crown">👑</span> {t('ft.mvp')} · {mvp.nickname}</span>
          </p>
        )}
      </div>
      <div className="spacer" />
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={() => shareMatchImage(match, teams, players)}>{t('ft.shareResult')}</button>
        <button className="btn btn-ghost" onClick={onDone}>{t('rec.another')}</button>
        <button className="btn btn-volt" onClick={() => { onDone(); go('table') }}>{t('ft.seeTable')}</button>
      </div>
    </div>
  )
}
