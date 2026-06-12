import { useEffect, useRef, type ReactNode } from 'react'
import type { Player, Team } from '../types'
import { buildCrestSvg, shapeClipCss, teamCrest } from '../lib/crest'
import { avatarColorFor, playerInitials } from '../lib/util'

export function Sheet({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="sheet-grab" />
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function TeamShield({ team, size }: { team: Team; size?: 'sm' | 'lg' }) {
  const crest = teamCrest(team)
  const svg = buildCrestSvg(crest, team.color)
  return (
    <span
      className={`badge-shield ${size ?? ''}`}
      style={{ ['--team' as string]: team.color, clipPath: shapeClipCss(crest.shape) }}
      title={team.name}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/** Initials monogram avatar for a player, coloured from their avatarColor. */
export function PlayerAvatar({ player, size }: { player: Player; size?: 'sm' | 'lg' }) {
  const color = player.avatarColor || avatarColorFor(player.id)
  return (
    <span className={`avatar mono ${size ?? ''}`} style={{ ['--ava' as string]: color }} title={player.nickname}>
      {playerInitials(player)}
    </span>
  )
}

export function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <span className={`stars ${onChange ? '' : 'readonly'}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" className={i <= value ? 'on' : ''} onClick={() => onChange?.(i)}>
          ⭐
        </button>
      ))}
    </span>
  )
}

/** Read-only star meter that supports half-stars — `value` is 0..5 in 0.5 steps. */
export function RatingStars({ value, size }: { value: number; size?: 'sm' }) {
  return (
    <span className={`stars meter ${size ?? ''}`} aria-label={`${value} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i)) // 0..1 of this star
        return (
          <span key={i} className="star-slot">
            <span className="s-bg">⭐</span>
            <span className="s-fg" style={{ width: `${fill * 100}%` }}>⭐</span>
          </span>
        )
      })}
    </span>
  )
}

/** Small form-direction arrow. Renders nothing when flat. */
export function TrendArrow({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'flat') return null
  return <span className={`trend ${trend}`} aria-label={trend}>{trend === 'up' ? '▲' : '▼'}</span>
}

export function Stepper({ value, onChange, min = 1, max = 12 }: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="−">−</button>
      <span className="stepper-val">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="+">+</button>
    </span>
  )
}

export function FormDots({ form }: { form: ('W' | 'D' | 'L')[] }) {
  if (form.length === 0) return <span className="tiny muted">—</span>
  return (
    <span className="row" style={{ gap: 4 }}>
      {form.map((f, i) => (
        <span key={i} className={`form-dot ${f}`}>{f}</span>
      ))}
    </span>
  )
}

export function EmptyState({ emoji, title, text, action }: {
  emoji: string
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="big">{emoji}</span>
      <h4>{title}</h4>
      <p>{text}</p>
      {action}
    </div>
  )
}

const CONFETTI_COLORS = ['#c8f63c', '#ff5c8a', '#ffc94b', '#4da3ff', '#eef7ec']

export function Confetti({ pieces = 90 }: { pieces?: number }) {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: pieces }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${Math.random() * 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${Math.random() * 0.7}s`,
            animationDuration: `${2 + Math.random() * 1.6}s`,
          }}
        />
      ))}
    </div>
  )
}
