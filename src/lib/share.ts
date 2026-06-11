import type { Match, Player, Team } from '../types'
import { scoreOf } from './stats'
import { formatDate } from './util'
import { buildCrestSvg, teamCrest } from './crest'
import { t } from '../i18n'

/** Rasterise a team crest SVG into an <img> we can drawImage onto the canvas. */
function loadCrest(team: Team, px: number): Promise<HTMLImageElement> {
  const svg = buildCrestSvg(teamCrest(team), team.color, { shield: true, px })
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/** Render a 1080×1080 result card and open the native share sheet (or download). */
export async function shareMatchImage(match: Match, teams: Team[], players: Player[]): Promise<void> {
  const teamA = teams.find((t) => t.id === match.teamAId)
  const teamB = teams.find((t) => t.id === match.teamBId)
  if (!teamA || !teamB) return
  const { a, b } = scoreOf(match)
  const mvp = players.find((p) => p.id === match.mvpId)

  await document.fonts.ready

  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // pitch-at-night background
  ctx.fillStyle = '#0a120d'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, -120, 60, W / 2, -120, 1000)
  glow.addColorStop(0, 'rgba(200,246,60,0.18)')
  glow.addColorStop(1, 'rgba(200,246,60,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // chalk centre circle + halfway line
  ctx.strokeStyle = 'rgba(238,247,236,0.09)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(W / 2, H + 40, 320, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, H - 160)
  ctx.lineTo(W, H - 160)
  ctx.stroke()

  ctx.textAlign = 'center'

  // header
  ctx.fillStyle = '#c8f63c'
  ctx.font = '800 30px Sora, sans-serif'
  const spaced = (s: string) => s.split('').join(' ')
  ctx.fillText(`P E L A D A  F C   ●   ${spaced(t('share.fullTime'))}`, W / 2, 110)
  ctx.fillStyle = '#8da695'
  ctx.font = '600 28px Sora, sans-serif'
  ctx.fillText(`${formatDate(match.date)}  ·  ${match.location}`, W / 2, 162)

  // team crests + names
  const [crestA, crestB] = await Promise.all([loadCrest(teamA, 150), loadCrest(teamB, 150)])
  const drawTeam = (team: Team, img: HTMLImageElement, x: number) => {
    const cw = 150
    const ch = Math.round((cw * 53) / 48)
    ctx.drawImage(img, x - cw / 2, 296, cw, ch)
    ctx.fillStyle = '#eef7ec'
    let size = 34
    ctx.font = `800 ${size}px Sora, sans-serif`
    const name = team.name.toUpperCase()
    while (ctx.measureText(name).width > 330 && size > 20) {
      size -= 2
      ctx.font = `800 ${size}px Sora, sans-serif`
    }
    ctx.fillText(name, x, 505)
    ctx.fillStyle = team.color
    ctx.fillRect(x - 60, 524, 120, 8)
  }
  drawTeam(teamA, crestA, W * 0.21)
  drawTeam(teamB, crestB, W * 0.79)

  // score
  ctx.fillStyle = '#eef7ec'
  ctx.font = '400 230px Anton, sans-serif'
  ctx.fillText(`${a}`, W / 2 - 130, 470)
  ctx.fillText(`${b}`, W / 2 + 130, 470)
  ctx.fillStyle = '#5d7264'
  ctx.font = '400 90px Anton, sans-serif'
  ctx.fillText('–', W / 2, 430)

  // MVP
  let y = 640
  if (mvp) {
    ctx.fillStyle = '#ffc94b'
    ctx.font = '700 36px Sora, sans-serif'
    ctx.fillText(`👑  MVP · ${mvp.nickname}`, W / 2, y)
    y += 80
  }

  // scorers (aggregated) — coloured by their team
  const counts = new Map<string, { label: string; n: number; color: string }>()
  for (const g of match.goals) {
    const team = g.teamId === teamA.id ? teamA : teamB
    const nick = g.scorerId ? (players.find((p) => p.id === g.scorerId)?.nickname ?? '???') : t('live.mysteryGoal')
    const key = `${team.id}:${nick}`
    const cur = counts.get(key)
    if (cur) cur.n++
    else counts.set(key, { label: `⚽ ${nick}`, n: 1, color: team.color })
  }
  ctx.font = '600 30px Sora, sans-serif'
  const lines = [...counts.values()].slice(0, 7)
  for (const line of lines) {
    ctx.fillStyle = line.color
    ctx.fillText(line.n > 1 ? `${line.label} ×${line.n}` : line.label, W / 2, y)
    y += 50
  }

  // footer
  ctx.fillStyle = '#c8f63c'
  ctx.font = '400 44px Anton, sans-serif'
  ctx.fillText('PELADA ● FC', W / 2, H - 70)
  ctx.fillStyle = '#5d7264'
  ctx.font = '600 22px Sora, sans-serif'
  ctx.fillText(t('brand.tagline'), W / 2, H - 36)

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  const file = new File([blob], `pelada-${match.date}.png`, { type: 'image/png' })

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: t('share.title') })
      return
    } catch {
      // user cancelled the share sheet — fall through to download
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  URL.revokeObjectURL(url)
}
