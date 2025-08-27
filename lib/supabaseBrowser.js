// /lib/supabaseBrowser.js
import { createBrowserClient } from "@supabase/ssr";

let _client;

export function getSupabaseBrowser() {
  if (_client) return _client;

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      // These defaults ensure local session stays fresh
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      // IMPORTANT: let @supabase/ssr manage cookies for you.
      // (No explicit cookies adapter needed on the browser; this client
      // will coordinate with the middleware via requests.)
    }
  );

  return _client;
}