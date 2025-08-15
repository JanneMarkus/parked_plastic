// pages/_app.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import GlobalStyles from "@/components/GlobalStyles";
import { Poppins, Source_Sans_3 } from "next/font/google";
import "@/styles/globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

const source = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-source",
});

// Same sanitizer you used on /login
function sanitizeRedirectPath(raw) {
  if (typeof raw !== "string") return "/";
  if (raw.startsWith("//")) return "/";
  if (/^[a-zA-Z]+:\/\//.test(raw)) return "/";
  return raw.startsWith("/") ? raw : "/";
}

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Universal OAuth return handler:
  // Exchanges ?code=... (PKCE) or #access_token=... (implicit) for a Supabase session,
  // then cleans the URL and navigates to the intended path.
  useEffect(() => {
    let active = true;
    (async () => {
      if (typeof window === "undefined") return;

      const url = new URL(window.location.href);
      const next = sanitizeRedirectPath(url.searchParams.get("redirect") || "/");

      // 1) PKCE flow (?code=...)
      const code = url.searchParams.get("code");
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession({ code });
        } catch (e) {
          console.warn("exchangeCodeForSession failed", e);
        } finally {
          if (!active) return;
          // Clean URL & go to next path without reloading
          window.history.replaceState({}, "", next);
        }
        return; // stop; handled
      }

      // 2) Implicit flow (#access_token=...)
      if (window.location.hash && window.location.hash.includes("access_token")) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (access_token && refresh_token) {
          try {
            await supabase.auth.setSession({ access_token, refresh_token });
          } catch (e) {
            console.warn("setSession failed", e);
          } finally {
            if (!active) return;
            window.history.replaceState({}, "", next);
          }
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [router.asPath]);

  // Upsert minimal profile on sign-in (runs whenever the session changes)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        });
      }
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  return (
    <div className={`${poppins.variable} ${source.variable}`}>
      <GlobalStyles />
      <Header />
      <Component {...pageProps} />
    </div>
  );
}
