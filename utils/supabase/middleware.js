// utils/supabase/middleware.js
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function updateSession(request) {
  // Always reply with a mutable response so we can set cookies.
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    // Use the public ANON key consistently for SSR
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // Touch auth to refresh cookies if needed. Ignore errors to avoid blocking navigation.
  try {
    await supabase.auth.getUser();
  } catch {
    // no-op
  }

  return response;
}
