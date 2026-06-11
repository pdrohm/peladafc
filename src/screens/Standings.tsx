import { useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import { computePlayerStats, computeStandings, leaders, scoreOf, seasonMatches } from '../lib/stats'
import { shareMatchImage } from '../lib/share'
import { formatDate } from '../lib/util'
import { EmptyState, FormDots, TeamShield } from '../components/ui'
import type { Screen } from '../types'

type Tab = 'table' | 'goals' | 'assists' | 'mvps' | 'matches'

export function Standings({ go }: { go: (s: Screen) => void }) {
  const t = useT()
  const { players, teams, matches, seasons, activeSeasonId, deleteMatch } = useStore()
  const [tab, setTab] = useState<Tab>('table')
  const [seasonId, setSeasonId] = useState<string | null>(activeSeasonId)

  const standings = computeStandings(matches, teams, seasonId)
  const pstats = computePlayerStats(matches, players, seasonId)
  const played = [...seasonMatches(matches, seasonId)].reverse()
  const playerOf = (id: string) => players.find((p) => p.id === id)
  const teamOf = (id: string) => teams.find((t) => t.id === id)

  if (played.length === 0 && matches.filter((m) => m.finished).length === 0) {
    return (
      <div className="screen">
        <h1 className="display page-title">{t('table.titleA')} <span className="accent">{t('table.titleB')}</span></h1>
        <EmptyState
          emoji="🏆"
          title={t('table.noHistoryTitle')}
          text={t('table.noHistoryText')}
          action={<button className="btn btn-volt" onClick={() => go('matchday')}>{t('table.playFirst')}</button>}
        />
      </div>
    )
  }

  const rankTab = (key: 'goals' | 'assists' | 'mvps', unit: string, emoji: string) => {
    const rows = leaders(pstats, key)
    if (rows.length === 0) return <EmptyState emoji={emoji} title={t('table.nothingTitle')} text={t('table.nothingText', { unit })} />
    return (
      <div className="card flat">
        {rows.map((s, i) => {
          const p = playerOf(s.playerId)
          if (!p) return null
          return (
            <div className={`rank-row ${i === 0 ? 'first' : ''}`} key={s.playerId}>
              <span className="rank-pos">{i === 0 ? '👑' : i + 1}</span>
              <span className="avatar">{p.emoji}</span>
              <div className="rank-main">
                <div className="rank-name">{p.nickname}</div>
                <div className="rank-sub">{t('rank.appsWin', { apps: s.apps, pct: Math.round(s.winRate * 100) })}</div>
              </div>
              <span className="rank-val">{s[key]}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="row between">
        <h1 className="display page-title">{t('table.titleA')} <span className="accent">{t('table.titleB')}</span></h1>
        {seasons.length > 1 && (
          <select
            className="input"
            style={{ width: 'auto' }}
            value={seasonId ?? ''}
            onChange={(e) => setSeasonId(e.target.value || null)}
          >
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>
      <p className="page-sub">{t('table.sub', { name: seasons.find((s) => s.id === seasonId)?.name ?? t('table.allTime'), n: played.length })}</p>

      <div className="tabs">
        <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>{t('tabs.table')}</button>
        <button className={tab === 'goals' ? 'active' : ''} onClick={() => setTab('goals')}>{t('tabs.goals')}</button>
        <button className={tab === 'assists' ? 'active' : ''} onClick={() => setTab('assists')}>{t('tabs.assists')}</button>
        <button className={tab === 'mvps' ? 'active' : ''} onClick={() => setTab('mvps')}>{t('tabs.mvps')}</button>
        <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>{t('tabs.matches')}</button>
      </div>

      {tab === 'table' && (
        <div className="card flat">
          <div className="table-wrap">
            <table className="league">
              <thead>
                <tr>
                  <th>{t('col.team')}</th><th>{t('col.p')}</th><th>{t('col.w')}</th><th>{t('col.d')}</th><th>{t('col.l')}</th><th>{t('col.gf')}</th><th>{t('col.ga')}</th><th>{t('col.gd')}</th><th>{t('col.pts')}</th><th>{t('col.form')}</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((r, i) => {
                  const tm = teamOf(r.teamId)
                  if (!tm) return null
                  return (
                    <tr key={r.teamId} className={i === 0 && r.played > 0 ? 'leader' : ''}>
                      <td>
                        <span className="row" style={{ gap: 8 }}>
                          <TeamShield team={tm} size="sm" />
                          <span style={{ fontWeight: 700 }}>{tm.name}</span>
                          {i === 0 && r.played > 0 && <span title={t('table.leaders')}>👑</span>}
                        </span>
                      </td>
                      <td>{r.played}</td>
                      <td>{r.wins}</td>
                      <td>{r.draws}</td>
                      <td>{r.losses}</td>
                      <td>{r.gf}</td>
                      <td>{r.ga}</td>
                      <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                      <td className="pts">{r.points}</td>
                      <td><FormDots form={r.form} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'goals' && rankTab('goals', t('units.goals'), '👟')}
      {tab === 'assists' && rankTab('assists', t('units.assists'), '🍽️')}
      {tab === 'mvps' && rankTab('mvps', t('units.mvpAwards'), '👑')}

      {tab === 'matches' && (
        <div className="stack">
          {played.map((m) => {
            const { a, b } = scoreOf(m)
            const ta = teamOf(m.teamAId)
            const tb = teamOf(m.teamBId)
            const mvp = m.mvpId ? playerOf(m.mvpId) : null
            if (!ta || !tb) return null
            return (
              <div className="card flat match-card" key={m.id}>
                <div className="row">
                  <TeamShield team={ta} size="sm" />
                  <span className="match-score grow">{a} – {b}</span>
                  <TeamShield team={tb} size="sm" />
                  <div style={{ textAlign: 'right' }} className="grow">
                    <div className="tiny muted">{formatDate(m.date)} · 📍 {m.location}</div>
                    {mvp && <div className="tiny" style={{ color: 'var(--gold)' }}>👑 {mvp.nickname}</div>}
                  </div>
                  <button className="icon-btn" title={t('match.shareImage')} onClick={() => shareMatchImage(m, teams, players)}>
                    📤
                  </button>
                  <button
                    className="icon-btn"
                    title={t('match.delete')}
                    onClick={() => window.confirm(t('match.deleteConfirm')) && deleteMatch(m.id)}
                  >
                    🗑
                  </button>
                </div>
                {m.goals.length > 0 && (
                  <div className="tiny muted" style={{ marginTop: 8 }}>
                    {m.goals
                      .map((g) => {
                        const s = g.scorerId ? playerOf(g.scorerId)?.nickname : '???'
                        const team = g.teamId === ta.id ? ta.emoji : tb.emoji
                        return `${team} ${s}`
                      })
                      .join(' · ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
