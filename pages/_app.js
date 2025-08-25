// pages/_app.js
import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import Header from "@/components/Header";
import GlobalStyles from "@/components/GlobalStyles";
import { Poppins, Source_Sans_3 } from "next/font/google";
import "@/styles/globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";

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

const supabase = getSupabaseBrowser();

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user;
      if (!user) return;
      if (event !== "SIGNED_IN" && event !== "USER_UPDATED") return;

      const emailName =
        typeof user.email === "string" ? user.email.split("@")[0] : null;

      try {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            emailName ||
            null,
          avatar_url: user.user_metadata?.avatar_url || null,
        });
      } catch (e) {
        console.warn("Failed to upsert profile", e);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className={`${poppins.variable} ${source.variable}`}>
      <SessionContextProvider
        supabaseClient={supabase}
        initialSession={pageProps?.initialSession}
      >
        <GlobalStyles />
        <Header />
        <Component {...pageProps} />
        <Analytics />
      </SessionContextProvider>
    </div>
  );
}
