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

  // Universal OAuth return handler
  useEffect(() => {
    let active = true;
    (async () => {
      if (typeof window === "undefined") return;

      const url = new URL(window.location.href);
      const next = sanitizeRedirectPath(url.searchParams.get("redirect") || "/");
      const hasCode = !!url.searchParams.get("code");
      const hasHashTokens = window.location.hash.includes("access_token") || window.location.hash.includes("error");

      try {
        if (hasCode) {
          // PKCE code flow
          const { error } = await supabase.auth.exchangeCodeForSession({ code: url.searchParams.get("code") });
          if (error) console.warn("exchangeCodeForSession error:", error.message);
        } else if (hasHashTokens) {
          // Implicit flow (hash tokens) — let Supabase parse & store them
          // This handles access_token/refresh_token in the hash and persists the session.
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) console.warn("getSessionFromUrl error:", error.message);
        } else {
          return; // nothing to do
        }
      } catch (e) {
        console.warn("OAuth return handling failed:", e);
      } finally {
        if (!active) return;
        // Clean the URL (remove code/hash) and go to intended path
        window.history.replaceState({}, "", next);
      }
    })();
    return () => {
      active = false;
    };
  }, []); // run once on first mount

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
