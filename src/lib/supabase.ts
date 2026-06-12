import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Both are public-safe, client-side values. Newer Supabase projects issue a
// "publishable" key (sb_publishable_…); older ones an "anon" key — accept either.
// When the key is missing the app stays fully local — cloud features just hide.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined

export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string, { auth: { persistSession: false } })
  : null
