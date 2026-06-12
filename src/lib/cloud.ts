import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'
import { useStore, type LeagueData } from '../store'

/* ──────────────────────────────────────────────────────────────────────────
   Cloud sync (document model). The whole league is one JSONB row keyed by a
   short shareable code. We push (debounced) on any local change and subscribe
   to realtime row updates, reusing the store's importData() to apply remotes.
   Last-write-wins — fine for a friends group where one person usually records.
   ────────────────────────────────────────────────────────────────────────── */

export type CloudStatus = 'off' | 'connecting' | 'live' | 'error'

type CloudState = {
  leagueId: string | null
  status: CloudStatus
  error: string | null
  lastSyncedAt: string | null
  createLeague: () => Promise<string | null>
  joinLeague: (code: string) => Promise<boolean>
  disconnect: () => void
}

// Per-tab id so we can ignore the realtime echo of our own writes.
const writer = `w_${Math.random().toString(36).slice(2)}`

// Module-level sync machinery (kept out of React state on purpose).
let channel: RealtimeChannel | null = null
let unsubStore: (() => void) | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let applyingRemote = false

/** Codes skip ambiguous characters (0/O, 1/I) so they're easy to share aloud.
 *  Under the public-RLS prototype model the code is effectively the access
 *  secret, so it's drawn from a CSPRNG (not Math.random) with rejection sampling
 *  to avoid modulo bias. 8 chars of a 31-char alphabet ≈ 40 bits of entropy —
 *  short enough to share, unpredictable enough not to be trivially guessable. */
function genCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 31 chars
  const limit = 256 - (256 % alphabet.length) // largest multiple of 31 ≤ 256
  const out: string[] = []
  const buf = new Uint8Array(1)
  while (out.length < 8) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) out.push(alphabet[buf[0] % alphabet.length])
  }
  return out.join('')
}

function snapshot(): LeagueData {
  const s = useStore.getState()
  return { players: s.players, teams: s.teams, seasons: s.seasons, matches: s.matches, draw: s.draw, activeSeasonId: s.activeSeasonId }
}

function applyRemote(data: LeagueData) {
  applyingRemote = true
  useStore.getState().importData(data) // normalizes + replaces local league
  applyingRemote = false
}

async function pushNow(leagueId: string) {
  if (!supabase) return
  const { error } = await supabase
    .from('leagues')
    .upsert({ id: leagueId, data: snapshot(), writer, updated_at: new Date().toISOString() })
  if (error) useCloud.setState({ status: 'error', error: error.message })
  else useCloud.setState({ lastSyncedAt: new Date().toISOString(), status: 'live', error: null })
}

function schedulePush(leagueId: string) {
  if (applyingRemote) return // don't echo a change we just received
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void pushNow(leagueId), 700)
}

async function connect(leagueId: string) {
  if (!supabase) {
    useCloud.setState({ status: 'error', error: 'Supabase not configured' })
    return
  }
  useCloud.setState({ status: 'connecting', error: null })

  // Pull current remote (if any) before we start watching, so we don't push it back.
  const { data, error } = await supabase.from('leagues').select('data').eq('id', leagueId).maybeSingle()
  if (error) {
    useCloud.setState({ status: 'error', error: error.message })
    return
  }
  if (data?.data) applyRemote(data.data as LeagueData)
  else await pushNow(leagueId) // seed an empty remote with our local league

  // Realtime subscription — apply any change written by another device.
  channel?.unsubscribe()
  channel = supabase
    .channel(`league:${leagueId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leagues', filter: `id=eq.${leagueId}` },
      (payload) => {
        const row = payload.new as { data?: LeagueData; writer?: string }
        if (!row.data || row.writer === writer) return // ignore our own echo
        applyRemote(row.data)
        useCloud.setState({ lastSyncedAt: new Date().toISOString() })
      },
    )
    .subscribe((st) => {
      if (st === 'SUBSCRIBED') useCloud.setState({ status: 'live', error: null })
      else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') useCloud.setState({ status: 'error', error: st })
    })

  // Watch local changes and push them up (debounced).
  unsubStore?.()
  unsubStore = useStore.subscribe(() => schedulePush(leagueId))
}

function teardown() {
  channel?.unsubscribe()
  channel = null
  unsubStore?.()
  unsubStore = null
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = null
}

export const useCloud = create<CloudState>()(
  persist(
    (set) => ({
      leagueId: null,
      status: 'off',
      error: null,
      lastSyncedAt: null,

      createLeague: async () => {
        if (!supabase) return null
        // Generate a fresh, non-colliding code and seed it with the local league.
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = genCode()
          const { error } = await supabase.from('leagues').insert({ id: code, data: snapshot(), writer })
          if (!error) {
            set({ leagueId: code })
            await connect(code)
            return code
          }
          if (error.code !== '23505') {
            set({ status: 'error', error: error.message })
            return null
          }
          // 23505 = unique violation → try another code
        }
        set({ status: 'error', error: 'Could not allocate a league code' })
        return null
      },

      joinLeague: async (raw) => {
        if (!supabase) return false
        const code = raw.trim().toUpperCase()
        if (!code) return false
        const { data, error } = await supabase.from('leagues').select('id').eq('id', code).maybeSingle()
        if (error || !data) {
          set({ status: 'error', error: 'League not found' })
          return false
        }
        set({ leagueId: code })
        await connect(code)
        return true
      },

      disconnect: () => {
        teardown()
        set({ leagueId: null, status: 'off', error: null })
      },
    }),
    { name: 'pelada-cloud', partialize: (s) => ({ leagueId: s.leagueId }) },
  ),
)

/** Reconnect to a saved league on app start. Call once. */
export function initCloud() {
  if (!isSupabaseConfigured) return
  const { leagueId } = useCloud.getState()
  if (leagueId) void connect(leagueId)
}
