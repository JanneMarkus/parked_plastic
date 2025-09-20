// utils/supabase/middleware.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const defaults = { httpOnly: true, sameSite: "lax", path: "/" };

export async function updateSession(request) {
  const res = NextResponse.next();
  const secure = process.env.NODE_ENV === "production";
  const domain = secure ? ".parkedplastic.com" : undefined; // <- match server adapter

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...defaults, secure, domain, ...options });
        },
        remove(name, options) {
          res.cookies.set({
            name,
            value: "",
            maxAge: 0,
            ...defaults,
            secure,
            domain,
            ...options,
          });
        },
      },
    }
  );

  // Touch the session (passive); avoids redirects and lets refresh rotation happen.
  try {
    await supabase.auth.getUser();
  } catch {}

  // Non-cacheable + vary on cookies
  if (!res.headers.get("Cache-Control")) res.headers.set("Cache-Control", "no-store");
  const vary = res.headers.get("Vary") || "";
  if (!/\bCookie\b/i.test(vary)) res.headers.set("Vary", vary ? `${vary}, Cookie` : "Cookie");

  return res;
}
