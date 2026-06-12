import { useState } from 'react'
import { useStore } from '../store'
import { useT, plural } from '../i18n'
import { computePlayerStats, computeStandings, leaders, scoreOf, seasonMatches, strengthMap } from '../lib/stats'
import { formatDate } from '../lib/util'
import { teamSkill } from '../lib/draw'
import { EmptyState, FormDots, PlayerAvatar, TeamShield } from '../components/ui'
import { RateSquadSheet } from '../components/RateSquad'
import type { Match, Screen } from '../types'

export function Dashboard({ go }: { go: (s: Screen) => void }) {
  const t = useT()
  const { players, teams, matches, draw, activeSeasonId, loadDemo } = useStore()
  const [rateMatch, setRateMatch] = useState<Match | null>(null)

  const isEmpty = players.length === 0 && teams.length === 0
  if (isEmpty) {
    return (
      <div className="screen">
        <h1 className="display page-title">
          {t('dash.emptyTitleA')}<br />
          <span className="accent">{t('dash.emptyTitleB')}</span>
        </h1>
        <p className="page-sub">{t('dash.emptySub')}</p>
        <EmptyState
          emoji="⚽"
          title={t('dash.pitchEmptyTitle')}
          text={t('dash.pitchEmptyText')}
          action={
            <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
              <button className="btn btn-volt" onClick={loadDemo}>{t('dash.loadDemo')}</button>
              <button className="btn btn-ghost" onClick={() => go('club')}>{t('dash.startScratch')}</button>
            </div>
          }
        />
      </div>
    )
  }

  const standings = computeStandings(matches, teams, activeSeasonId)
  const pstats = computePlayerStats(matches, players, activeSeasonId)
  const strength = strengthMap(matches, players)
  const played = seasonMatches(matches, activeSeasonId)
  const recent = [...played].reverse().slice(0, 3)
  const topScorers = leaders(pstats, 'goals')
  const topAssists = leaders(pstats, 'assists')
  const topMvps = leaders(pstats, 'mvps')
  const playerOf = (id: string | null | undefined) => players.find((p) => p.id === id)
  const teamOf = (id: string) => teams.find((t) => t.id === id)

  const drawTeams = draw ? Object.keys(draw.assignments).map(teamOf).filter(Boolean) : []
  const lockLeft = draw ? Math.max(0, draw.lockMatchdays - draw.matchdaysPlayed) : 0

  const tickerItems: string[] = [
    ...recent.map((m) => {
      const { a, b } = scoreOf(m)
      return `${teamOf(m.teamAId)?.name ?? '?'} ${a}–${b} ${teamOf(m.teamBId)?.name ?? '?'}`
    }),
    topScorers[0] ? `${t('ticker.goldenBoot')} · ${playerOf(topScorers[0].playerId)?.nickname} (${topScorers[0].goals})` : '',
    topAssists[0] ? `${t('ticker.waiter')} · ${playerOf(topAssists[0].playerId)?.nickname} (${topAssists[0].assists})` : '',
    topMvps[0] ? `${t('ticker.mvpKing')} · ${playerOf(topMvps[0].playerId)?.nickname} (${topMvps[0].mvps})` : '',
  ].filter(Boolean)

  return (
    <div className="screen">
      <h1 className="display page-title">
        {t('dash.titleA')}<br /><span className="accent">{t('dash.titleB')}</span>
      </h1>
      <p className="page-sub">{t('dash.sub', { n: played.length, m: players.length })}</p>

      {tickerItems.length > 0 && (
        <div className="ticker">
          <div className="ticker-track">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i}>
                <span className="hl">●</span>&nbsp;&nbsp;{t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* next match / current draw */}
      <div className="section-title">{t('dash.nextMatchday')}</div>
      {draw && drawTeams.length >= 2 ? (
        <div className="card card-pitch">
          <div className="hero-vs">
            <div className="team-col">
              <TeamShield team={drawTeams[0]!} size="lg" />
              <span className="tname">{drawTeams[0]!.name}</span>
              <span className="pill">{teamSkill(draw.assignments[drawTeams[0]!.id], strength)} {t('dash.skill')}</span>
            </div>
            <span className="vs">{t('dash.vs')}</span>
            <div className="team-col">
              <TeamShield team={drawTeams[1]!} size="lg" />
              <span className="tname">{drawTeams[1]!.name}</span>
              <span className="pill">{teamSkill(draw.assignments[drawTeams[1]!.id], strength)} {t('dash.skill')}</span>
            </div>
          </div>
          <div className="spacer" />
          {lockLeft > 0 ? (
            <div className="lock-banner ok">{plural(t, 'dash.locked', lockLeft)}</div>
          ) : (
            <div className="lock-banner">
              {plural(t, 'dash.unlocked', draw.matchdaysPlayed)}
              <button className="btn btn-sm btn-ghost" onClick={() => go('draw')} style={{ marginLeft: 'auto' }}>{t('dash.redraw')}</button>
            </div>
          )}
          <div className="spacer" />
          <button className="btn btn-volt btn-block" onClick={() => go('matchday')}>{t('dash.startMatchday')}</button>
        </div>
      ) : (
        <EmptyState
          emoji="🎲"
          title={t('dash.noDrawTitle')}
          text={t('dash.noDrawText')}
          action={<button className="btn btn-volt" onClick={() => go('draw')}>{t('dash.drawTeams')}</button>}
        />
      )}

      <div className="grid-2-desk">
        <div>
          {/* mini table */}
          <div className="section-title">{t('dash.seasonTable')}</div>
          <div className="card flat">
            {standings.filter((r) => r.played > 0).length === 0 ? (
              <p className="muted tiny" style={{ margin: 0 }}>{t('dash.noMatchesSeason')}</p>
            ) : (
              standings.map((r, i) => {
                const tm = teamOf(r.teamId)
                if (!tm || r.played === 0) return null
                return (
                  <div className="rank-row" key={r.teamId}>
                    <span className="rank-pos">{i + 1}</span>
                    <TeamShield team={tm} size="sm" />
                    <div className="rank-main">
                      <div className="rank-name">{tm.name}</div>
                      <div className="rank-sub">{r.wins}{t('col.w')} · {r.draws}{t('col.d')} · {r.losses}{t('col.l')} · {t('col.gd')} {r.gd > 0 ? '+' : ''}{r.gd}</div>
                    </div>
                    <FormDots form={r.form} />
                    <span className="rank-val">{r.points}</span>
                  </div>
                )
              })
            )}
            <div className="spacer" />
            <button className="btn btn-ghost btn-sm btn-block" onClick={() => go('table')}>{t('dash.fullTable')}</button>
          </div>
        </div>

        <div>
          {/* leaders */}
          <div className="section-title">{t('dash.hallOfFlame')}</div>
          <div className="stack">
            {[
              { id: 'goldenBoot', label: t('dash.goldenBoot'), emoji: '👟', s: topScorers[0], val: topScorers[0]?.goals, unit: t('units.goals') },
              { id: 'waiter', label: t('dash.theWaiter'), emoji: '🍽️', s: topAssists[0], val: topAssists[0]?.assists, unit: t('units.assists') },
              { id: 'mvpKing', label: t('dash.mvpKing'), emoji: '👑', s: topMvps[0], val: topMvps[0]?.mvps, unit: t('units.mvps') },
            ].map(({ id, label, emoji, s, val, unit }) => {
              const ply = s ? playerOf(s.playerId) : null
              return s && ply ? (
                <div className={`card flat row ${id === 'mvpKing' ? 'mvp-card' : ''}`} key={id}>
                  <PlayerAvatar player={ply} size="lg" />
                  <div className="grow">
                    <div className="tiny muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800 }}>
                      {id === 'mvpKing' ? <span className="crown">{emoji}</span> : emoji} {label}
                    </div>
                    <div className="rank-name" style={{ fontSize: 16 }}>{ply.nickname}</div>
                  </div>
                  <div className="rank-val" style={{ fontSize: 34 }}>{val}</div>
                  <span className="tiny muted">{unit}</span>
                </div>
              ) : null
            })}
            {topScorers.length === 0 && (
              <p className="muted tiny">{t('dash.crownFirst')}</p>
            )}
          </div>

          {/* recent results */}
          {recent.length > 0 && (
            <>
              <div className="section-title">{t('dash.latestResults')}</div>
              <div className="stack">
                {recent.map((m) => {
                  const { a, b } = scoreOf(m)
                  const ta = teamOf(m.teamAId)
                  const tb = teamOf(m.teamBId)
                  if (!ta || !tb) return null
                  const rated = Object.keys(m.ratings ?? {}).length
                  return (
                    <button
                      className="card flat match-card row"
                      key={m.id}
                      onClick={() => setRateMatch(m)}
                      style={{ width: '100%', textAlign: 'left', color: 'inherit', cursor: 'pointer' }}
                    >
                      <TeamShield team={ta} size="sm" />
                      <span className="match-score grow">{a} – {b}</span>
                      <TeamShield team={tb} size="sm" />
                      <div style={{ textAlign: 'right' }}>
                        <div className="tiny muted">{formatDate(m.date)}</div>
                        {rated > 0
                          ? <div className="tiny" style={{ color: 'var(--volt)', fontWeight: 700 }}>⭐ {rated}</div>
                          : <div className="tiny muted">{t('dash.rate')}</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <RateSquadSheet match={rateMatch} open={!!rateMatch} onClose={() => setRateMatch(null)} />
    </div>
  )
}
