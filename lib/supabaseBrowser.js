import { createBrowserClient } from '@supabase/ssr'

let _client
export function getSupabaseBrowser() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return _client
}
