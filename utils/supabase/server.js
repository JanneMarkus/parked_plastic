// utils/supabase/server.js
import { createServerClient } from "@supabase/ssr";
import { serialize, parse } from "cookie";

export function createSupabaseServerClient({ req, res }) {
  const isProd = process.env.NODE_ENV === "production";

  // If you want a domain cookie in prod, set it here (optional):
  // const host = req?.headers?.host || "";
  // const rootDomain =
  //   host.endsWith(".yourdomain.com") || host === "yourdomain.com"
  //     ? ".yourdomain.com"
  //     : undefined;

  const baseDefaults = {
    path: "/",
    sameSite: "lax",
    // We will force httpOnly & secure below so they can’t be overridden
    // ...(isProd && rootDomain ? { domain: rootDomain } : {}),
  };

  function appendSetCookie(nextCookie) {
    const prev = res.getHeader("Set-Cookie");
    const list = Array.isArray(prev) ? prev : prev ? [prev] : [];
    res.setHeader("Set-Cookie", Array.from(new Set([...list, nextCookie])));
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          if (req?.cookies && typeof req.cookies[name] !== "undefined") {
            return req.cookies[name];
          }
          const header = req?.headers?.cookie || "";
          return parse(header)[name];
        },
        set(name, value, options) {
          // IMPORTANT: app options first, then defaults, then force flags
          const cookie = serialize(name, value, {
            ...options,
            ...baseDefaults,
            httpOnly: true,                 // force HttpOnly
            secure: isProd,                 // force Secure on HTTPS
          });
          appendSetCookie(cookie);
        },
        remove(name, options) {
          const cookie = serialize(name, "", {
            ...options,
            ...baseDefaults,
            httpOnly: true,                 // force HttpOnly
            secure: isProd,                 // force Secure on HTTPS
            maxAge: 0,
            expires: new Date(0),
          });
          appendSetCookie(cookie);
        },
      },
    }
  );
}
