import type { Player } from '../types'
import { AVATAR_COLORS } from './util'

/* ──────────────────────────────────────────────────────────────────────────
   Player CSV import
   Tolerant parser for a "fill a spreadsheet, upload, create the squad" flow.
   Handles , or ; delimiters (pt-BR Excel uses ;), quoted fields, EN/PT headers,
   and a headerless positional file (nickname, name, skill, color).
   ────────────────────────────────────────────────────────────────────────── */

export type PlayerDraft = Pick<Player, 'name' | 'nickname' | 'avatarColor' | 'skill'>

const TEMPLATE_ROWS: string[][] = [
  ['nickname', 'name', 'skill', 'color'],
  ['Pedrão', 'Pedro Marques', '4', ''],
  ['Rafa', 'Rafael Souza', '5', '#4da3ff'],
  ['Léo', 'Leonardo Lima', '3', ''],
]

/** Template text with a UTF-8 BOM so Excel keeps the accents. */
export function playersCsvTemplate(): string {
  return '﻿' + TEMPLATE_ROWS.map((r) => r.join(',')).join('\n') + '\n'
}

const HEX = /^#[0-9a-fA-F]{6}$/
const HEADER_WORDS = new Set([
  'nickname', 'nick', 'apelido', 'name', 'nome', 'fullname',
  'skill', 'nivel', 'nível', 'overall', 'color', 'colour', 'cor',
])

function detectDelimiter(line: string): string {
  const best = [',', ';', '\t']
    .map((d) => [d, line.split(d).length] as const)
    .sort((a, b) => b[1] - a[1])[0]
  return best[1] > 1 ? best[0] : ','
}

/** Split one CSV line, honouring double-quoted fields and escaped "". */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === delim) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim().replace(/^﻿/, ''))
}

export type ParseResult = { players: PlayerDraft[]; skipped: number }

export function parsePlayersCsv(text: string): ParseResult {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { players: [], skipped: 0 }

  const delim = detectDelimiter(lines[0])
  let rows = lines.map((l) => splitLine(l, delim))

  // Default to positional columns; remap if a recognisable header is present.
  let col = { nickname: 0, name: 1, skill: 2, color: 3 }
  const head = rows[0].map((h) => h.toLowerCase())
  if (head.some((h) => HEADER_WORDS.has(h))) {
    const at = (...names: string[]) => head.findIndex((h) => names.includes(h))
    col = {
      nickname: Math.max(at('nickname', 'nick', 'apelido'), 0),
      name: at('name', 'nome', 'fullname'),
      skill: at('skill', 'nivel', 'nível', 'overall'),
      color: at('color', 'colour', 'cor'),
    }
    rows = rows.slice(1)
  }

  const players: PlayerDraft[] = []
  let skipped = 0
  rows.forEach((r, i) => {
    const nick = (r[col.nickname] ?? '').trim()
    const name = (col.name >= 0 ? r[col.name] ?? '' : '').trim()
    if (!nick && !name) { skipped++; return }

    const rawSkill = parseInt((col.skill >= 0 ? r[col.skill] ?? '' : '').trim(), 10)
    const skill = Number.isNaN(rawSkill) ? 3 : Math.min(5, Math.max(1, rawSkill))

    const rawColor = (col.color >= 0 ? r[col.color] ?? '' : '').trim()
    const avatarColor = HEX.test(rawColor) ? rawColor : AVATAR_COLORS[i % AVATAR_COLORS.length]

    players.push({
      nickname: nick || name,
      name: name || nick,
      skill,
      avatarColor,
    })
  })

  return { players, skipped }
}
