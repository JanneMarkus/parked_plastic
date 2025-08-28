// utils/supabase/server.js
import { createServerClient } from "@supabase/ssr";
import { serialize, parse } from "cookie";

export function createSupabaseServerClient({ req, res }) {
  const isProd = process.env.NODE_ENV === "production";
  const defaults = { path: "/", httpOnly: true, sameSite: "lax", secure: isProd };

  function appendSetCookie(nextCookie) {
    const prev = res.getHeader("Set-Cookie");
    const list = Array.isArray(prev) ? prev : prev ? [prev] : [];
    res.setHeader("Set-Cookie", [...list, nextCookie]); // ← always append
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
          const all = parse(header);
          return all[name];
        },
        set(name, value, options) {
          const cookie = serialize(name, value, { ...defaults, ...options });
          appendSetCookie(cookie);
        },
        remove(name, options) {
          const cookie = serialize(name, "", {
            ...defaults,
            ...options,
            maxAge: 0,
            expires: new Date(0),
          });
          appendSetCookie(cookie);
        },
      },
    }
  );
}
