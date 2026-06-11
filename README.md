# ⚽ PELADA FC — league of friends

A playful, mobile-first web app for managing your weekly football matches with friends:
seasons, balanced team draws, live matchday scoring (goals / assists / MVP), standings,
top-scorer & assist rankings, player profiles with fun badges, winner-stays rotation for
3+ teams, shareable result images, season trophy ceremonies, and JSON backup/restore.

*Pelada* (Brazilian Portuguese): the sacred weekly kickabout with your friends.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

First open: hit **"Load demo league"** on the home screen to explore with sample data,
or **"Start from scratch"** to build your own club.

## Stack

- **Vite + React 18 + TypeScript (strict)** — no backend
- **zustand + persist** — the whole league lives in `localStorage` (key `pelada-fc`, versioned)
- **motion** — team draw reveal animation
- All stats (standings, scorers, win rates, badges) are **derived from match events**, never stored

## Structure

```
src/
  store.ts          # persisted state + all actions + demo league
  types.ts          # Player / Team / Season / Match / GoalEvent / Draw
  lib/stats.ts      # standings, player stats, badges (pure functions)
  lib/draw.ts       # balanced random draw (best-of-250 serpentine)
  screens/          # Dashboard, Matchday, DrawScreen, Standings, Club
  components/ui.tsx # Sheet, TeamShield, Stars, EmptyState, Confetti…
  styles.css        # "floodlit night pitch" design system
scripts/smoke.ts    # logic smoke tests (esbuild + node)
```

## Logic smoke tests

```bash
npx esbuild scripts/smoke.ts --bundle --format=esm --outfile=/tmp/pelada-smoke.mjs && node /tmp/pelada-smoke.mjs
```

## Team draw rules

- Select who's playing → algorithm splits them into the existing teams
- Balanced by skill stars (1–5 per player) but still random — *"nobody can blame the algorithm"*
- Teams stay locked together for **4 matchdays**; the app then suggests a reshuffle
- Manual reshuffle anytime; swap individual players after the draw with ⇄
- With 3+ teams drawn, full time offers **"winner stays"** — the resting team comes on instantly

## Sharing & backup

- **📤 Share result** (full-time screen or match history) renders a 1080×1080 PNG result
  card via the Canvas API and opens the native share sheet (falls back to download)
- **🏆 End season** hands out trophies — champion, Golden Boot, The Waiter, MVP King —
  and archives the season in the Trophy Room (Club → Season), where ceremonies can be relived
- **💾 Export / 📂 Import** (Club → Season → Backup) moves the whole league as a JSON file
# peladafc
