import { getLang } from '../i18n'

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
  const locale = getLang() === 'pt' ? 'pt-BR' : 'en-GB'
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/* ── player monogram avatars ─────────────────────────────────────────────── */

/** Vibrant palette for the initials monogram. */
export const AVATAR_COLORS = [
  '#ff5c8a', '#4da3ff', '#ffc94b', '#7c5cff', '#2dd4bf', '#ff8a3d',
  '#c8f63c', '#ff6b57', '#a78bfa', '#38bdf8', '#fb7185', '#34d399',
]

/** Stable colour for a player derived from a seed (id), so it never shifts. */
export function avatarColorFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

/** 1–2 letter monogram: initials of a two-word nickname, else first two chars. */
export function playerInitials(p: { nickname?: string; name?: string }): string {
  const src = (p.nickname || p.name || '?').trim()
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}
