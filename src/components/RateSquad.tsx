import { useState } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { Match } from '../types'
import { PlayerAvatar, Sheet, TeamShield } from './ui'

/** Admin panel to score every player who featured in a match 1–10. Optional:
 *  untouched players carry no note and simply don't move anyone's stars. */
export function RateSquadSheet({ match, open, onClose }: { match: Match | null; open: boolean; onClose: () => void }) {
  const t = useT()
  return (
    <Sheet open={open && !!match} onClose={onClose} title={t('rate.title')}>
      {match && <RateSquadForm key={match.id} match={match} onDone={onClose} />}
    </Sheet>
  )
}

function RateSquadForm({ match, onDone }: { match: Match; onDone: () => void }) {
  const t = useT()
  const { players, teams, setMatchRatings } = useStore()
  const [notes, setNotes] = useState<Record<string, number>>(() => ({ ...match.ratings }))

  const sides = [match.teamAId, match.teamBId]
    .map((id) => teams.find((tm) => tm.id === id))
    .filter((tm): tm is NonNullable<typeof tm> => !!tm)

  // Tap a number to set it; tap the active one again to clear (back to unrated).
  const setNote = (pid: string, n: number) =>
    setNotes((prev) => {
      const next = { ...prev }
      if (prev[pid] === n) delete next[pid]
      else next[pid] = n
      return next
    })

  const rated = Object.keys(notes).length

  return (
    <div>
      <p className="tiny muted" style={{ marginTop: 0 }}>{t('rate.sub')}</p>
      {sides.map((team) => {
        const squad = (match.lineups[team.id] ?? [])
          .map((id) => players.find((p) => p.id === id))
          .filter((p): p is NonNullable<typeof p> => !!p)
        if (squad.length === 0) return null
        return (
          <div key={team.id}>
            <div className="section-title row" style={{ gap: 8, alignItems: 'center' }}>
              <TeamShield team={team} size="sm" /> {team.name}
            </div>
            <div className="card flat" style={{ padding: 10 }}>
              {squad.map((p) => (
                <div className="rate-row" key={p.id}>
                  <PlayerAvatar player={p} size="sm" />
                  <span className="rate-name grow">{p.nickname}</span>
                  <span className={`rate-val ${notes[p.id] != null ? 'set' : ''}`}>
                    {notes[p.id] != null ? notes[p.id] : t('rate.dash')}
                  </span>
                  <RatingScale value={notes[p.id] ?? null} onChange={(n) => setNote(p.id, n)} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <div className="spacer" />
      <button className="btn btn-volt btn-block" onClick={() => { setMatchRatings(match.id, notes); onDone() }}>
        {rated > 0 ? t('rate.saveN', { n: rated }) : t('rate.save')}
      </button>
    </div>
  )
}

function RatingScale({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <span className="rate-scale" role="group">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={`rate-pip ${value != null && n <= value ? 'on' : ''}`}
          onClick={() => onChange(n)}
          aria-label={String(n)}
        >
          {n}
        </button>
      ))}
    </span>
  )
}
