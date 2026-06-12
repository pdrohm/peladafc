import { useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../store'
import { useT, plural } from '../i18n'
import { balancedDraw, teamSkill } from '../lib/draw'
import { computePlayerRatings, strengthMap } from '../lib/stats'
import { formatDate } from '../lib/util'
import { Confetti, EmptyState, PlayerAvatar, RatingStars, Stepper, TeamShield } from '../components/ui'
import type { Screen } from '../types'

export function DrawScreen({ go }: { go: (s: Screen) => void }) {
  const t = useT()
  const { players, teams, matches, draw, setDraw, movePlayerInDraw, settings, setLockMatchdays, setDrawLock } = useStore()
  const [picking, setPicking] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [celebrate, setCelebrate] = useState(false)
  const ratings = computePlayerRatings(matches, players)
  const strength = strengthMap(matches, players)

  if (players.length < 2 || teams.length < 2) {
    return (
      <div className="screen">
        <h1 className="display page-title">{t('draw.titleA')} <span className="accent">{t('draw.titleB')}</span></h1>
        <EmptyState
          emoji="🎲"
          title={t('draw.notEnoughTitle')}
          text={t('draw.notEnoughText')}
          action={<button className="btn btn-volt" onClick={() => go('club')}>{t('draw.buildClub')}</button>}
        />
      </div>
    )
  }

  const runDraw = (playerIds: string[]) => {
    const pool = players.filter((p) => playerIds.includes(p.id))
    const assignments = balancedDraw(pool, teams.map((t) => t.id), strength)
    setDraw(assignments)
    setPicking(false)
    setCelebrate(true)
    setTimeout(() => setCelebrate(false), 2800)
  }

  const startPicking = () => {
    // preselect everyone who was in the last draw, or everyone
    setSelected(draw ? Object.values(draw.assignments).flat() : players.map((p) => p.id))
    setPicking(true)
  }

  const lockLeft = draw ? Math.max(0, draw.lockMatchdays - draw.matchdaysPlayed) : 0

  return (
    <div className="screen">
      {celebrate && <Confetti />}
      <h1 className="display page-title">{t('draw.titleA')} <span className="accent">{t('draw.titleB')}</span></h1>
      <p className="page-sub">{t('draw.sub')}</p>

      {!picking && draw && (
        <>
          {lockLeft > 0 ? (
            <div className="lock-banner ok">
              {plural(t, 'draw.drawnLocked', lockLeft, { date: formatDate(draw.createdAt.slice(0, 10)) })}
            </div>
          ) : (
            <div className="lock-banner">
              {plural(t, 'draw.playedTogether', draw.matchdaysPlayed)}
            </div>
          )}

          <div className="card flat row lock-setting">
            <div className="grow">
              <div className="rank-name" style={{ fontSize: 14 }}>{t('draw.lockThisLabel')}</div>
              <div className="tiny muted">{t('draw.lockHelp')}</div>
            </div>
            <Stepper value={draw.lockMatchdays} onChange={setDrawLock} />
            <span className="tiny muted" style={{ minWidth: 56 }}>{plural(t, 'draw.unit', draw.lockMatchdays)}</span>
          </div>

          <div className="draw-grid">
            {Object.entries(draw.assignments).map(([teamId, ids]) => {
              const team = teams.find((t) => t.id === teamId)
              if (!team) return null
              const otherTeams = teams.filter((t) => t.id !== teamId && draw.assignments[t.id])
              return (
                <motion.div
                  key={teamId + draw.createdAt}
                  className="card draw-team-card"
                  style={{ ['--team' as string]: team.color }}
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.12 } } }}
                >
                  <div className="row" style={{ marginBottom: 14 }}>
                    <TeamShield team={team} />
                    <div className="grow">
                      <div className="rank-name" style={{ fontSize: 15 }}>{team.name}</div>
                      <div className="tiny muted">{team.motto}</div>
                    </div>
                    <span className="pill volt">{teamSkill(ids, strength)} ⚡</span>
                  </div>
                  {ids.map((pid) => {
                    const p = players.find((x) => x.id === pid)
                    if (!p) return null
                    return (
                      <motion.div
                        key={pid}
                        className="draw-player"
                        variants={{
                          hidden: { opacity: 0, x: -24, scale: 0.9 },
                          show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 22 } },
                        }}
                      >
                        <PlayerAvatar player={p} size="sm" />
                        <span className="nm">{p.nickname}</span>
                        <RatingStars value={ratings.get(pid)?.stars ?? p.skill} size="sm" />
                        {otherTeams[0] && (
                          <button
                            className="icon-btn"
                            title={t('draw.moveTo', { team: otherTeams[0].name })}
                            onClick={() => movePlayerInDraw(pid, otherTeams[0].id)}
                          >
                            ⇄
                          </button>
                        )}
                      </motion.div>
                    )
                  })}
                </motion.div>
              )
            })}
          </div>

          <div className="spacer" />
          <button className="btn btn-ghost btn-block" onClick={startPicking}>{t('draw.newDraw')}</button>
        </>
      )}

      {!picking && !draw && (
        <EmptyState
          emoji="🪄"
          title={t('draw.noDrawTitle')}
          text={t('draw.noDrawText')}
          action={<button className="btn btn-volt" onClick={startPicking}>{t('draw.pickAndDraw')}</button>}
        />
      )}

      {picking && (
        <>
          <div className="section-title">{t('draw.whosIn', { n: selected.length })}</div>
          <div className="chip-grid">
            {players.map((p) => {
              const on = selected.includes(p.id)
              return (
                <button
                  key={p.id}
                  className={`pchip ${on ? 'on' : ''}`}
                  onClick={() => setSelected(on ? selected.filter((x) => x !== p.id) : [...selected, p.id])}
                >
                  <PlayerAvatar player={p} size="sm" />
                  <span>
                    <span className="pname">{p.nickname}</span>
                    <br />
                    <RatingStars value={ratings.get(p.id)?.stars ?? p.skill} size="sm" />
                  </span>
                </button>
              )
            })}
          </div>
          <div className="spacer" />
          <div className="card flat row lock-setting">
            <div className="grow">
              <div className="rank-name" style={{ fontSize: 14 }}>{t('draw.lockLabel')}</div>
              <div className="tiny muted">{t('draw.lockHelp')}</div>
            </div>
            <Stepper value={settings.lockMatchdays} onChange={setLockMatchdays} />
            <span className="tiny muted" style={{ minWidth: 56 }}>{plural(t, 'draw.unit', settings.lockMatchdays)}</span>
          </div>
          <div className="spacer" />
          <div className="row">
            <button className="btn btn-ghost" onClick={() => setPicking(false)}>{t('draw.cancel')}</button>
            <button
              className="btn btn-volt grow"
              disabled={selected.length < teams.length}
              onClick={() => runDraw(selected)}
            >
              {t('draw.drawInto', { n: selected.length, m: teams.length })}
            </button>
          </div>
          {draw && lockLeft > 0 && (
            <p className="tiny muted" style={{ textAlign: 'center' }}>
              {plural(t, 'draw.lockWarning', lockLeft)}
            </p>
          )}
        </>
      )}
    </div>
  )
}
