// pages/_app.js
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import GlobalStyles from "@/components/GlobalStyles";
import { Poppins, Source_Sans_3 } from "next/font/google";
import "@/styles/globals.css";
import { Analytics } from "@vercel/analytics/next"

<Analytics />

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

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      if (!user) return;

      // With email/password, user_metadata may be mostly empty.
      // Fall back to a sensible display name from email.
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
        // Non-blocking: avoid crashing the app on profile upsert hiccups.
        // eslint-disable-next-line no-console
        console.warn("Failed to upsert profile", e);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className={`${poppins.variable} ${source.variable}`}>
      <GlobalStyles />
      <Header />
      <Component {...pageProps} />
    </div>
  );
}
