// /lib/supabaseBrowser.js
import { createBrowserClient } from "@supabase/ssr";

/**
 * Standard browser client (PKCE) — keep for normal app auth.
 */
export function getSupabaseBrowser() {
  if (typeof window === "undefined") return null;

  if (!window.__supabase_pkce) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      // eslint-disable-next-line no-console
      console.error(
        "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }

    window.__supabase_pkce = createBrowserClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // We don’t rely on URL parsing for PKCE flows
        detectSessionInUrl: false,
        flowType: "pkce",
      },
      global: {
        headers: { "X-Client-Info": "parked-plastic-web" },
      },
    });
  }

  return window.__supabase_pkce;
}
