import type { CrestPattern, CrestShape, Team, TeamCrest } from '../types'

/* ──────────────────────────────────────────────────────────────────────────
   Crest engine
   One pure builder (buildCrestSvg) renders a team badge as an SVG string that
   works in three places: the React <TeamShield>, the crest picker preview, and
   the canvas share-image (rasterised via an <img>). No animal emojis in sight.
   ────────────────────────────────────────────────────────────────────────── */

/** Primary colours — the badge "field". */
export const CREST_COLORS = [
  '#c8f63c', '#ff8a3d', '#4da3ff', '#ff5c8a',
  '#ffc94b', '#7c5cff', '#2dd4bf', '#ff6b57',
  '#f4fbef', '#38bdf8', '#a3e635', '#fb7185',
  '#16181d',
]

/** Secondary colours — patterns & accents. Dark/ink first (most crest-like). */
export const CREST_SECONDARY = [
  '#0c1610', '#f4fbef', '#ff5c8a', '#4da3ff',
  '#ffc94b', '#7c5cff', '#2dd4bf', '#ff6b57',
]

/** Symbol (ink) colours. 'auto' picks dark/light to contrast the field. */
export const CREST_INK = [
  'auto', '#0c1610', '#f4fbef', '#c8f63c',
  '#ff5c8a', '#4da3ff', '#ffc94b', '#7c5cff',
]

export const CREST_PATTERNS: CrestPattern[] = ['solid', 'halves', 'stripes', 'sash', 'chevron', 'hoops']

export const CREST_SHAPES: CrestShape[] = ['shield', 'circle', 'hexagon', 'diamond', 'pentagon', 'banner']

/**
 * Each shape is a polygon in normalised 0–1 space (top-left origin). The same
 * points feed a CSS `polygon()` clip-path AND an SVG <polygon> in viewBox units,
 * so the silhouette is identical on screen and on the canvas share-image.
 * `circle` is the exception — an ellipse that fills the box.
 */
const SHAPE_POLY: Record<Exclude<CrestShape, 'circle'>, [number, number][]> = {
  shield: [[0.5, 0], [1, 0.12], [1, 0.62], [0.5, 1], [0, 0.62], [0, 0.12]],
  hexagon: [[0.5, 0.02], [1, 0.27], [1, 0.73], [0.5, 0.98], [0, 0.73], [0, 0.27]],
  diamond: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
  pentagon: [[0.5, 0], [1, 0.38], [0.81, 1], [0.19, 1], [0, 0.38]],
  banner: [[0.04, 0.02], [0.96, 0.02], [0.96, 0.55], [0.5, 1], [0.04, 0.55]],
}

/** CSS clip-path value for a shape (drives the React badge + picker previews). */
export function shapeClipCss(shape: CrestShape): string {
  if (shape === 'circle') return 'ellipse(50% 50% at 50% 50%)'
  const pts = SHAPE_POLY[shape].map(([x, y]) => `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`)
  return `polygon(${pts.join(', ')})`
}

/**
 * Symbols are drawn in a 24×24 box. `INK` is a placeholder replaced at build
 * time with a colour that contrasts the field, so each glyph reads on any team.
 */
export const CREST_SYMBOLS: { id: string; markup: string }[] = [
  { id: 'bolt', markup: '<path d="M13 1 L4 13 H10 L9 23 L20 9 H13 Z" fill="INK"/>' },
  { id: 'flame', markup: '<path d="M12 23 C7.5 23 4 19.5 4 15 C4 11 7 8.5 8.5 5 C9 8 11 9 11 11 C12.5 10 13 8 12.5 6 C16 8.5 20 11.5 20 16 C20 20 16.5 23 12 23 Z" fill="INK"/>' },
  { id: 'star', markup: '<path d="M12 2 L14.6 8.6 L21.5 9.2 L16.2 13.8 L17.9 20.5 L12 16.9 L6.1 20.5 L7.8 13.8 L2.5 9.2 L9.4 8.6 Z" fill="INK"/>' },
  { id: 'crown', markup: '<path d="M2 7 L6.5 11 L12 3 L17.5 11 L22 7 L20 18.5 H4 Z" fill="INK"/><rect x="4" y="19.5" width="16" height="2.6" fill="INK"/>' },
  { id: 'shield', markup: '<path d="M12 2 L20 5 V11 C20 16 16.5 19.5 12 22 C7.5 19.5 4 16 4 11 V5 Z" fill="INK"/>' },
  { id: 'diamond', markup: '<path d="M5 3 H19 L22 9 L12 22 L2 9 Z" fill="INK"/>' },
  { id: 'mountain', markup: '<path d="M2 20 L8.5 8 L12 14 L15 9 L22 20 Z" fill="INK"/>' },
  { id: 'moon', markup: '<path d="M21 13 A9 9 0 1 1 11 3 A7 7 0 0 0 21 13 Z" fill="INK"/>' },
  { id: 'sun', markup: '<g fill="none" stroke="INK" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.4"/><path d="M12 1.5V4 M12 20V22.5 M1.5 12H4 M20 12H22.5 M4.6 4.6l1.7 1.7 M17.7 17.7l1.7 1.7 M19.4 4.6l-1.7 1.7 M6.3 17.7l-1.7 1.7"/></g>' },
  { id: 'skull', markup: '<path fill="INK" fill-rule="evenodd" d="M12 2 C7 2 3.5 5.6 3.5 10.5 C3.5 13.3 4.8 15.2 6.5 16.5 V19.6 H9 V17.6 H10.5 V19.6 H13.5 V17.6 H15 V19.6 H17.5 V16.5 C19.2 15.2 20.5 13.3 20.5 10.5 C20.5 5.6 17 2 12 2 Z M8.6 9.6 A1.8 1.8 0 1 0 8.6 13.2 A1.8 1.8 0 0 0 8.6 9.6 Z M15.4 9.6 A1.8 1.8 0 1 0 15.4 13.2 A1.8 1.8 0 0 0 15.4 9.6 Z"/>' },
  { id: 'swords', markup: '<g fill="none" stroke="INK" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3 L17 17"/><path d="M19 3 L7 17"/><path d="M14.5 3 H19 V7.5"/><path d="M9.5 3 H5 V7.5"/><path d="M6 16 L9 19 M18 16 L15 19"/></g>' },
  { id: 'ball', markup: '<circle cx="12" cy="12" r="9.2" fill="none" stroke="INK" stroke-width="1.7"/><path d="M12 7 L15.6 9.6 L14.2 13.8 H9.8 L8.4 9.6 Z" fill="INK"/>' },
  { id: 'anchor', markup: '<g fill="none" stroke="INK" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="2"/><path d="M12 6.5 V21"/><path d="M7 11 H17"/><path d="M4 14 C4 18 7.6 21 12 21 C16.4 21 20 18 20 14"/></g>' },
  { id: 'trophy', markup: '<path fill="INK" d="M7 3 H17 V8 A5 5 0 0 1 7 8 Z"/><path fill="none" stroke="INK" stroke-width="2" d="M7 5 H4 V6 A3 3 0 0 0 7 9 M17 5 H20 V6 A3 3 0 0 1 17 9"/><rect x="10.6" y="13" width="2.8" height="3.4" fill="INK"/><rect x="9.4" y="16.4" width="5.2" height="2" fill="INK"/><rect x="7.6" y="19.4" width="8.8" height="2.4" rx="1" fill="INK"/>' },
  { id: 'target', markup: '<g fill="none" stroke="INK" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></g><circle cx="12" cy="12" r="1.8" fill="INK"/>' },
  { id: 'heart', markup: '<path fill="INK" d="M12 21 C12 21 3 14.6 3 8.8 C3 5.6 5.4 3.5 8 3.5 C9.8 3.5 11.2 4.5 12 5.8 C12.8 4.5 14.2 3.5 16 3.5 C18.6 3.5 21 5.6 21 8.8 C21 14.6 12 21 12 21 Z"/>' },
]

export const DEFAULT_CREST: TeamCrest = { shape: 'shield', pattern: 'sash', symbol: 'bolt', symbolColor: 'auto', secondary: '#0c1610' }

const W = 48
const H = 53

/** SVG clip markup for a shape in viewBox (48×53) user space — used for the canvas/standalone badge. */
function shapeSvgClip(shape: CrestShape, id: string): { defs: string; attr: string } {
  const inner =
    shape === 'circle'
      ? `<ellipse cx="${W / 2}" cy="${H / 2}" rx="${W / 2}" ry="${H / 2}"/>`
      : `<polygon points="${SHAPE_POLY[shape].map(([x, y]) => `${(x * W).toFixed(2)},${(y * H).toFixed(2)}`).join(' ')}"/>`
  return { defs: `<defs><clipPath id="${id}">${inner}</clipPath></defs>`, attr: `clip-path="url(#${id})"` }
}

/** Only ever embed colours we can vouch for — hex, or a safe fallback.
 *  Stops a malicious imported backup from injecting markup via a colour field. */
function safeColor(c: string, fallback: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fallback
}

function luminance(hex: string): number {
  const c = hex.replace('#', '')
  if (c.length < 6) return 0.5
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Ink colour for the symbol — dark glyph on light fields, light glyph on dark. */
function inkFor(primary: string): string {
  return luminance(primary) > 0.55 ? '#0c1610' : '#f6fcf1'
}

function patternMarkup(pattern: CrestPattern, primary: string, secondary: string): string {
  const base = `<rect width="${W}" height="${H}" fill="${primary}"/>`
  const s = secondary
  switch (pattern) {
    case 'halves':
      return base + `<rect x="${W / 2}" width="${W / 2}" height="${H}" fill="${s}"/>`
    case 'stripes':
      return base + `<g fill="${s}"><rect x="5" width="6.5" height="${H}"/><rect x="20.75" width="6.5" height="${H}"/><rect x="36.5" width="6.5" height="${H}"/></g>`
    case 'sash':
      return base + `<path d="M-6 40 L40 -6 L54 8 L8 54 Z" fill="${s}"/>`
    case 'chevron':
      return base + `<path d="M0 4 L24 24 L48 4 L48 17 L24 37 L0 17 Z" fill="${s}"/>`
    case 'hoops':
      return base + `<g fill="${s}"><rect y="7" width="${W}" height="7"/><rect y="23" width="${W}" height="7"/><rect y="39" width="${W}" height="7"/></g>`
    case 'solid':
    default:
      return base
  }
}

/**
 * Build a crest SVG string.
 * @param shield  draw the hexagon silhouette inside the SVG (for canvas/standalone).
 *                Leave false in React where CSS clip-path already shapes the badge.
 * @param px      pixel size; omit for a fluid 100%×100% badge.
 */
export function buildCrestSvg(
  crest: TeamCrest,
  primary: string,
  opts: { shield?: boolean; px?: number } = {},
): string {
  const { shield = false, px } = opts
  primary = safeColor(primary, '#c8f63c')
  const secondary = safeColor(crest.secondary || '#0c1610', '#0c1610')
  const ink =
    !crest.symbolColor || crest.symbolColor === 'auto'
      ? inkFor(primary)
      : safeColor(crest.symbolColor, inkFor(primary))
  const sym = CREST_SYMBOLS.find((x) => x.id === crest.symbol) ?? CREST_SYMBOLS[0]
  const symbol = sym.markup.replaceAll('INK', ink)

  const field =
    patternMarkup(crest.pattern, primary, secondary) +
    `<rect width="${W}" height="${H * 0.5}" fill="rgba(255,255,255,0.10)"/>` +
    `<rect y="${H * 0.6}" width="${W}" height="${H * 0.4}" fill="rgba(0,0,0,0.22)"/>`

  // A unique-ish id so multiple shielded SVGs on one page don't clash.
  const shape = crest.shape || 'shield'
  const clipId = `cs-${shape}-${crest.pattern}-${crest.symbol}`
  const clip = shield ? shapeSvgClip(shape, clipId) : null
  const defs = clip ? clip.defs : ''
  const fieldGroup = clip ? `<g ${clip.attr}>${field}</g>` : field

  const sizeAttr = px ? `width="${px}" height="${Math.round((px * H) / W)}"` : 'width="100%" height="100%"'

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ${sizeAttr} viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
    defs +
    fieldGroup +
    `<svg x="11" y="11" width="26" height="29" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">${symbol}</svg>` +
    `</svg>`
  )
}

/* ── legacy data tolerance ───────────────────────────────────────────────── */

const LEGACY_EMOJI: Record<string, string> = {
  '🌙': 'moon', '🍺': 'trophy', '⚡': 'bolt', '🔥': 'flame', '🌊': 'target',
  '🦁': 'crown', '👻': 'skull', '🚀': 'star', '🌵': 'mountain', '🎩': 'diamond',
  '🐉': 'flame', '🛡️': 'shield', '🛡': 'shield',
}

/** Guarantee a team has a valid crest, deriving one from a legacy emoji if needed. */
export function teamCrest(team: Team | { crest?: TeamCrest; emoji?: string }): TeamCrest {
  const c = (team as { crest?: TeamCrest }).crest
  if (c && c.pattern && c.symbol) {
    return { ...c, secondary: c.secondary || '#0c1610', shape: c.shape || 'shield', symbolColor: c.symbolColor || 'auto' }
  }
  const emoji = (team as { emoji?: string }).emoji
  return { ...DEFAULT_CREST, symbol: (emoji && LEGACY_EMOJI[emoji]) || 'shield' }
}
