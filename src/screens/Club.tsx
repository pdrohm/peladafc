import { useRef, useState, type ChangeEvent } from 'react'
import { useStore, type LeagueData } from '../store'
import { useT } from '../i18n'
import { computePlayerStats, computeStandings, leaders, playerBadges } from '../lib/stats'
import { AVATAR_COLORS, todayISO } from '../lib/util'
import { parsePlayersCsv, playersCsvTemplate } from '../lib/csv'
import { buildCrestSvg, CREST_COLORS, CREST_INK, CREST_PATTERNS, CREST_SECONDARY, CREST_SHAPES, CREST_SYMBOLS, DEFAULT_CREST, shapeClipCss, teamCrest } from '../lib/crest'
import { Confetti, EmptyState, PlayerAvatar, Sheet, Stars, TeamShield } from '../components/ui'
import type { CrestPattern, CrestShape, Player, Team, TeamCrest } from '../types'

type Tab = 'players' | 'teams' | 'season'

export function Club() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('players')
  return (
    <div className="screen">
      <h1 className="display page-title">{t('club.titleA')} <span className="accent">{t('club.titleB')}</span></h1>
      <p className="page-sub">{t('club.sub')}</p>
      <div className="tabs">
        <button className={tab === 'players' ? 'active' : ''} onClick={() => setTab('players')}>{t('clubtabs.players')}</button>
        <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>{t('clubtabs.teams')}</button>
        <button className={tab === 'season' ? 'active' : ''} onClick={() => setTab('season')}>{t('clubtabs.season')}</button>
      </div>
      {tab === 'players' && <PlayersTab />}
      {tab === 'teams' && <TeamsTab />}
      {tab === 'season' && <SeasonTab />}
    </div>
  )
}

/* ── players ── */

function PlayersTab() {
  const t = useT()
  const { players, matches, activeSeasonId, importPlayers } = useStore()
  const [editing, setEditing] = useState<Player | 'new' | null>(null)
  const [profile, setProfile] = useState<Player | null>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const pstats = computePlayerStats(matches, players, activeSeasonId)

  const downloadTemplate = () => {
    const blob = new Blob([playersCsvTemplate()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pelada-fc-players.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const onCsvFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const { players: drafts, skipped } = parsePlayersCsv(await file.text())
    if (drafts.length === 0) {
      window.alert(t('players.csvEmpty'))
      return
    }
    const note = skipped > 0 ? ' ' + t('players.csvSkipped', { n: skipped }) : ''
    if (window.confirm(t('players.csvConfirm', { n: drafts.length }) + note)) {
      importPlayers(drafts, true) // replace — matches the chosen behaviour
    }
  }

  return (
    <>
      <button className="btn btn-volt btn-block" onClick={() => setEditing('new')}>{t('players.signNew')}</button>
      <div className="spacer-sm" />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-ghost btn-sm grow" onClick={() => csvRef.current?.click()}>{t('players.importCsv')}</button>
        <button className="btn btn-ghost btn-sm grow" onClick={downloadTemplate}>{t('players.csvTemplate')}</button>
        <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onCsvFile} />
      </div>
      <div className="spacer" />
      {players.length === 0 ? (
        <EmptyState emoji="👥" title={t('players.emptyTitle')} text={t('players.emptyText')} />
      ) : (
        <div className="card flat">
          {[...players]
            .sort((a, b) => a.nickname.localeCompare(b.nickname))
            .map((p) => {
              const s = pstats.find((x) => x.playerId === p.id)
              return (
                <button
                  key={p.id}
                  className="rank-row"
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', color: 'inherit', textAlign: 'left' }}
                  onClick={() => setProfile(p)}
                >
                  <PlayerAvatar player={p} />
                  <div className="rank-main">
                    <div className="rank-name">{p.nickname} <span className="tiny muted">{p.name}</span></div>
                    <div className="rank-sub">⚽ {s?.goals ?? 0} · 🤝 {s?.assists ?? 0} · 👑 {s?.mvps ?? 0}</div>
                  </div>
                  <Stars value={p.skill} />
                </button>
              )
            })}
        </div>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('players.signTitle') : t('players.editTitle')}>
        {editing !== null && <PlayerForm player={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>

      <Sheet open={!!profile} onClose={() => setProfile(null)} title="">
        {profile && (
          <PlayerProfile
            player={profile}
            onEdit={() => {
              setEditing(profile)
              setProfile(null)
            }}
            onClose={() => setProfile(null)}
          />
        )}
      </Sheet>
    </>
  )
}

function PlayerForm({ player, onDone }: { player: Player | null; onDone: () => void }) {
  const t = useT()
  const { addPlayer, updatePlayer } = useStore()
  const [name, setName] = useState(player?.name ?? '')
  const [nickname, setNickname] = useState(player?.nickname ?? '')
  const [avatarColor, setAvatarColor] = useState(
    player?.avatarColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  )
  const [skill, setSkill] = useState(player?.skill ?? 3)

  // Live monogram preview reflects whatever the form currently holds.
  const previewPlayer: Player = {
    id: player?.id ?? 'preview',
    name,
    nickname,
    avatarColor,
    skill,
    createdAt: '',
  }

  const save = () => {
    const data = { name: name.trim() || nickname.trim(), nickname: nickname.trim() || name.trim(), avatarColor, skill }
    if (!data.name) return
    if (player) updatePlayer(player.id, data)
    else addPlayer(data)
    onDone()
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'center', marginBottom: 14 }}>
        <PlayerAvatar player={previewPlayer} size="lg" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label>{t('form.nickname')}</label>
          <input className="input" placeholder="Pedrão" value={nickname} onChange={(e) => setNickname(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>{t('form.fullName')}</label>
          <input className="input" placeholder="Pedro Marques" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>{t('form.avatarColour')}</label>
        <div className="row wrap">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              className="swatch"
              style={{ background: c, outline: avatarColor === c ? '3px solid var(--chalk)' : '3px solid transparent' }}
              onClick={() => setAvatarColor(c)}
              aria-label={c}
            />
          ))}
        </div>
      </div>
      <div className="field">
        <label>{t('form.skillLevel')}</label>
        <Stars value={skill} onChange={setSkill} />
      </div>
      <button className="btn btn-volt btn-block" onClick={save} disabled={!name.trim() && !nickname.trim()}>
        {player ? t('form.saveChanges') : t('form.signPlayer')}
      </button>
    </div>
  )
}

function PlayerProfile({ player, onEdit, onClose }: { player: Player; onEdit: () => void; onClose: () => void }) {
  const t = useT()
  const { players, matches, activeSeasonId, deletePlayer } = useStore()
  const pstats = computePlayerStats(matches, players, activeSeasonId)
  const s = pstats.find((x) => x.playerId === player.id)
  const badges = s ? playerBadges(s, pstats) : []

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <PlayerAvatar player={player} size="lg" />
        <div className="grow">
          <h3 style={{ marginBottom: 0 }}>{player.nickname}</h3>
          <div className="tiny muted">{player.name}</div>
        </div>
        <Stars value={player.skill} />
      </div>

      {badges.length > 0 && (
        <div className="row wrap" style={{ marginBottom: 16 }}>
          {badges.map((b) => (
            <span key={b.id} className="pill gold" title={t(`badge.${b.id}.hint`)}>{b.emoji} {t(`badge.${b.id}`)}</span>
          ))}
        </div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { k: t('stat.goals'), v: s?.goals ?? 0 },
          { k: t('stat.assists'), v: s?.assists ?? 0 },
          { k: t('stat.mvps'), v: s?.mvps ?? 0 },
          { k: t('stat.played'), v: s?.apps ?? 0 },
          { k: t('stat.wins'), v: s?.wins ?? 0 },
          { k: t('stat.winRate'), v: `${Math.round((s?.winRate ?? 0) * 100)}%` },
        ].map(({ k, v }) => (
          <div className="card flat" style={{ padding: 12, textAlign: 'center' }} key={k}>
            <div className="rank-val" style={{ textAlign: 'center', minWidth: 0 }}>{v}</div>
            <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>{k}</div>
          </div>
        ))}
      </div>

      <div className="spacer" />
      <div className="row">
        <button className="btn btn-ghost grow" onClick={onEdit}>{t('profile.edit')}</button>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm(t('profile.releaseConfirm', { name: player.nickname }))) {
              deletePlayer(player.id)
              onClose()
            }
          }}
        >
          {t('profile.release')}
        </button>
      </div>
    </div>
  )
}

/* ── teams ── */

function TeamsTab() {
  const t = useT()
  const { teams, addTeam } = useStore()
  const [editing, setEditing] = useState<Team | null>(null)

  const createTeam = () => {
    addTeam({
      name: t('teams.defaultName', { n: teams.length + 1 }),
      color: CREST_COLORS[teams.length % CREST_COLORS.length],
      crest: { ...DEFAULT_CREST, symbol: CREST_SYMBOLS[teams.length % CREST_SYMBOLS.length].id },
      motto: t('teams.defaultMotto'),
    })
  }

  return (
    <>
      <div className="stack">
        {teams.map((tm) => (
          <div className="card row" key={tm.id} style={{ borderTop: `3px solid ${tm.color}` }}>
            <TeamShield team={tm} size="lg" />
            <div className="grow">
              <div className="rank-name" style={{ fontSize: 17 }}>{tm.name}</div>
              <div className="tiny muted">“{tm.motto}”</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(tm)}>{t('teams.customize')}</button>
          </div>
        ))}
      </div>
      {teams.length === 0 && (
        <EmptyState emoji="🛡️" title={t('teams.emptyTitle')} text={t('teams.emptyText')} />
      )}
      <div className="spacer" />
      <button className="btn btn-volt btn-block" onClick={createTeam}>{t('teams.foundNew')}</button>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={t('teams.identity')}>
        {editing && <TeamForm team={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  )
}

function TeamForm({ team, onDone }: { team: Team; onDone: () => void }) {
  const t = useT()
  const { updateTeam } = useStore()
  const [name, setName] = useState(team.name)
  const [motto, setMotto] = useState(team.motto)
  const [color, setColor] = useState(team.color)
  const [crest, setCrest] = useState<TeamCrest>(teamCrest(team))

  const setCrestField = <K extends keyof TeamCrest>(k: K, v: TeamCrest[K]) => setCrest((c) => ({ ...c, [k]: v }))
  const preview: Team = { ...team, name, motto, color, crest }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'center', marginBottom: 16 }}>
        <TeamShield team={preview} size="lg" />
      </div>
      <div className="field">
        <label>{t('form.teamName')}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('form.battleCry')}</label>
        <input className="input" value={motto} onChange={(e) => setMotto(e.target.value)} placeholder={t('form.battleCryHint')} />
      </div>

      <div className="field">
        <label>{t('form.symbol')}</label>
        <div className="crest-symbol-grid">
          {CREST_SYMBOLS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`crest-symbol ${crest.symbol === s.id ? 'on' : ''}`}
              onClick={() => setCrestField('symbol', s.id)}
              aria-label={s.id}
              dangerouslySetInnerHTML={{
                __html: `<svg viewBox="0 0 24 24" width="24" height="24">${s.markup.replaceAll('INK', 'currentColor')}</svg>`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <label>{t('form.symbolColour')}</label>
        <div className="row wrap">
          {CREST_INK.map((c) => {
            const on = (crest.symbolColor || 'auto') === c
            return (
              <button
                key={c}
                type="button"
                className={`swatch ${c === 'auto' ? 'auto' : ''}`}
                style={c === 'auto'
                  ? { outline: on ? '3px solid var(--chalk)' : '3px solid transparent' }
                  : { background: c, outline: on ? '3px solid var(--chalk)' : '3px solid transparent' }}
                onClick={() => setCrestField('symbolColor', c)}
                aria-label={c === 'auto' ? 'auto' : c}
              >
                {c === 'auto' ? 'A' : ''}
              </button>
            )
          })}
        </div>
      </div>

      <div className="field">
        <label>{t('form.shape')}</label>
        <div className="row wrap">
          {CREST_SHAPES.map((sh) => (
            <button
              key={sh}
              type="button"
              className={`crest-pattern ${crest.shape === sh ? 'on' : ''}`}
              style={{ clipPath: shapeClipCss(sh) }}
              onClick={() => setCrestField('shape', sh as CrestShape)}
              aria-label={sh}
              dangerouslySetInnerHTML={{ __html: buildCrestSvg({ ...crest, shape: sh }, color) }}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <label>{t('form.pattern')}</label>
        <div className="row wrap">
          {CREST_PATTERNS.map((p) => (
            <button
              key={p}
              type="button"
              className={`crest-pattern ${crest.pattern === p ? 'on' : ''}`}
              style={{ clipPath: shapeClipCss(crest.shape) }}
              onClick={() => setCrestField('pattern', p as CrestPattern)}
              aria-label={p}
              dangerouslySetInnerHTML={{ __html: buildCrestSvg({ ...crest, pattern: p }, color) }}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <label>{t('form.colours')}</label>
        <div className="row wrap">
          {CREST_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch"
              style={{ background: c, outline: color === c ? '3px solid var(--chalk)' : '3px solid transparent' }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <label>{t('form.secondaryColour')}</label>
        <div className="row wrap">
          {CREST_SECONDARY.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch"
              style={{ background: c, outline: crest.secondary === c ? '3px solid var(--chalk)' : '3px solid transparent' }}
              onClick={() => setCrestField('secondary', c)}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <button
        className="btn btn-volt btn-block"
        onClick={() => {
          updateTeam(team.id, { name: name.trim() || team.name, motto, color, crest })
          onDone()
        }}
      >
        {t('form.saveIdentity')}
      </button>
    </div>
  )
}

/* ── season ── */

function SeasonTab() {
  const t = useT()
  const { seasons, activeSeasonId, createSeason, endActiveSeason, resetAll, loadDemo, importData, matches, teams } = useStore()
  const [name, setName] = useState('')
  const [ceremonyId, setCeremonyId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const active = seasons.find((s) => s.id === activeSeasonId && !s.endedAt)

  const championOf = (seasonId: string) => {
    const rows = computeStandings(matches, teams, seasonId).filter((r) => r.played > 0)
    return teams.find((t) => t.id === rows[0]?.teamId)
  }

  const exportLeague = () => {
    const { players, teams, seasons, matches, draw, activeSeasonId } = useStore.getState()
    const payload = { exportedAt: new Date().toISOString(), players, teams, seasons, matches, draw, activeSeasonId }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pelada-fc-backup-${todayISO()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as LeagueData
      if (!Array.isArray(data.players) || !Array.isArray(data.teams) || !Array.isArray(data.seasons) || !Array.isArray(data.matches)) {
        throw new Error('bad shape')
      }
      if (window.confirm(t('season.importConfirm', { p: data.players.length, t: data.teams.length, m: data.matches.length }))) {
        importData(data)
      }
    } catch {
      window.alert(t('season.importBad'))
    }
  }

  return (
    <>
      {active ? (
        <div className="card card-pitch">
          <span className="pill volt">{t('season.active')}</span>
          <h3 className="display" style={{ fontSize: 26, margin: '10px 0 2px' }}>{active.name}</h3>
          <p className="tiny muted">
            {t('season.kickedOff', { date: active.startedAt, n: matches.filter((m) => m.finished && m.seasonId === active.id).length })}
          </p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (window.confirm(t('season.endConfirm'))) {
                endActiveSeason()
                setCeremonyId(active.id)
              }
            }}
          >
            {t('season.endSeason')}
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="field">
            <label>{t('season.newName')}</label>
            <input
              className="input"
              placeholder={t('season.defaultName', { n: seasons.length + 1, year: new Date().getFullYear() })}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button
            className="btn btn-volt btn-block"
            onClick={() => {
              createSeason(name.trim() || t('season.defaultName', { n: seasons.length + 1, year: new Date().getFullYear() }))
              setName('')
            }}
          >
            {t('season.startSeason')}
          </button>
        </div>
      )}

      {seasons.filter((s) => s.endedAt).length > 0 && (
        <>
          <div className="section-title">{t('season.trophyRoom')}</div>
          <div className="card flat">
            {seasons
              .filter((s) => s.endedAt)
              .map((s) => {
                const champ = championOf(s.id)
                return (
                  <button
                    key={s.id}
                    className="rank-row"
                    style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => setCeremonyId(s.id)}
                  >
                    <span className="rank-pos">🏆</span>
                    <div className="rank-main">
                      <div className="rank-name">{s.name}</div>
                      <div className="rank-sub">
                        {champ ? t('season.champions', { team: champ.name }) : t('season.noMatchesPlayed')} · {s.startedAt} → {s.endedAt}
                      </div>
                    </div>
                    <span className="tiny muted">{t('season.relive')}</span>
                  </button>
                )
              })}
          </div>
        </>
      )}

      <div className="section-title">{t('season.backup')}</div>
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={exportLeague}>{t('season.export')}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>{t('season.import')}</button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImportFile} />
      </div>
      <p className="tiny muted">{t('season.backupNote')}</p>

      <div className="section-title">{t('season.dangerZone')}</div>
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={() => window.confirm(t('season.loadDemoConfirm')) && loadDemo()}>
          {t('season.loadDemo')}
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => window.confirm(t('season.resetConfirm')) && resetAll()}
        >
          {t('season.reset')}
        </button>
      </div>

      {ceremonyId && <Ceremony seasonId={ceremonyId} onClose={() => setCeremonyId(null)} />}
    </>
  )
}

/* ── trophy ceremony ── */

function Ceremony({ seasonId, onClose }: { seasonId: string; onClose: () => void }) {
  const t = useT()
  const { matches, teams, players, seasons } = useStore()
  const season = seasons.find((s) => s.id === seasonId)
  const rows = computeStandings(matches, teams, seasonId).filter((r) => r.played > 0)
  const champion = teams.find((tm) => tm.id === rows[0]?.teamId)
  const pstats = computePlayerStats(matches, players, seasonId)
  const playerOf = (id?: string) => players.find((p) => p.id === id)

  const awards = [
    { emoji: '👟', label: t('dash.goldenBoot'), s: leaders(pstats, 'goals')[0], unit: t('units.goals'), key: 'goals' as const },
    { emoji: '🍽️', label: t('dash.theWaiter'), s: leaders(pstats, 'assists')[0], unit: t('units.assists'), key: 'assists' as const },
    { emoji: '👑', label: t('dash.mvpKing'), s: leaders(pstats, 'mvps')[0], unit: t('units.mvps'), key: 'mvps' as const },
  ].filter((a) => a.s)

  return (
    <div className="ceremony" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Confetti />
      <div className="ceremony-card">
        <span className="pill gold">{t('ceremony.seasonComplete')}</span>
        <span className="trophy">🏆</span>
        <h2 className="display" style={{ fontSize: 32, marginBottom: 16 }}>{season?.name}</h2>

        {champion ? (
          <div className="card mvp-card" style={{ marginBottom: 14 }}>
            <div className="row" style={{ justifyContent: 'center' }}>
              <TeamShield team={champion} size="lg" />
              <div style={{ textAlign: 'left' }}>
                <div className="tiny" style={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{t('ceremony.champions')}</div>
                <div className="rank-name" style={{ fontSize: 19 }}>{champion.name}</div>
                <div className="tiny muted">{t('ceremony.record', { pts: rows[0].points, w: rows[0].wins, d: rows[0].draws, l: rows[0].losses })}</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">{t('ceremony.noMatches')}</p>
        )}

        {awards.map(({ emoji, label, s, unit, key }) => {
          const p = playerOf(s!.playerId)
          if (!p) return null
          return (
            <div className="award-row" key={label}>
              <PlayerAvatar player={p} />
              <div className="grow">
                <div className="tiny muted" style={{ fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{emoji} {label}</div>
                <div className="rank-name">{p.nickname}</div>
              </div>
              <span className="rank-val" style={{ fontSize: 24 }}>{s![key]}</span>
              <span className="tiny muted">{unit}</span>
            </div>
          )
        })}

        <div className="spacer" />
        <button className="btn btn-volt btn-block" onClick={onClose}>{t('ceremony.intoHistory')}</button>
      </div>
    </div>
  )
}
