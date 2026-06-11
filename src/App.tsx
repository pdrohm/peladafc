import { useState } from 'react'
import { useStore } from './store'
import { useT, useLang } from './i18n'
import { Dashboard } from './screens/Dashboard'
import { Matchday } from './screens/Matchday'
import { DrawScreen } from './screens/DrawScreen'
import { Standings } from './screens/Standings'
import { Club } from './screens/Club'
import type { Screen } from './types'

const NAV: { id: Screen; labelKey: string; ico: string; cta?: boolean }[] = [
  { id: 'home', labelKey: 'nav.home', ico: '🏟️' },
  { id: 'table', labelKey: 'nav.table', ico: '🏆' },
  { id: 'matchday', labelKey: 'nav.play', ico: '⚽', cta: true },
  { id: 'draw', labelKey: 'nav.draw', ico: '🎲' },
  { id: 'club', labelKey: 'nav.club', ico: '👥' },
]

function Wordmark() {
  const t = useT()
  return (
    <div className="wordmark">
      PELADA<span className="dot">●</span>FC
      <small>{t('brand.tagline')}</small>
    </div>
  )
}

function LangToggle() {
  const t = useT()
  const toggle = useLang((s) => s.toggle)
  return (
    <button className="lang-toggle" onClick={toggle} title={t('lang.label')} aria-label={t('lang.label')}>
      🌐 {t('lang.switch')}
    </button>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const t = useT()
  const { seasons, activeSeasonId } = useStore()
  const season = seasons.find((s) => s.id === activeSeasonId && !s.endedAt)

  return (
    <div className="app">
      <div className="topbar">
        <Wordmark />
        <div className="row" style={{ gap: 8 }}>
          {season && <span className="season-chip">{season.name}</span>}
          <LangToggle />
        </div>
      </div>

      <main key={screen}>
        {screen === 'home' && <Dashboard go={setScreen} />}
        {screen === 'matchday' && <Matchday go={setScreen} />}
        {screen === 'draw' && <DrawScreen go={setScreen} />}
        {screen === 'table' && <Standings go={setScreen} />}
        {screen === 'club' && <Club />}
      </main>

      <nav className="nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-btn ${n.cta ? 'cta' : ''} ${screen === n.id ? 'active' : ''}`}
            onClick={() => setScreen(n.id)}
          >
            <span className="ico">{n.ico}</span>
            {t(n.labelKey)}
          </button>
        ))}
      </nav>
    </div>
  )
}
