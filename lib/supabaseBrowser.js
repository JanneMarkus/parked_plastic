// /lib/supabaseBrowser.js
import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns a single browser-side Supabase client per window.
 * - Persists/refreshes the session automatically
 * - Ensures Storage/API requests include the user's access token
 */
export function getSupabaseBrowser() {
  if (typeof window === "undefined") {
    // Called server-side by mistake; return null and let callers guard.
    return null;
  }

  if (!window.__supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      // Helpful dev log; in prod this will just throw later.
      // eslint-disable-next-line no-console
      console.error(
        "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }

    window.__supabase = createBrowserClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      // Optional: add a header so you can spot requests in logs
      global: {
        headers: { "X-Client-Info": "parked-plastic-web" },
      },
    });
  }

  return window.__supabase;
}
