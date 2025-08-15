// pages/_app.js
import { useEffect } from "react";
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

async function upsertProfile(user) {
  const payload = {
    id: user.id,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
  };
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      if (user) {
        try { await upsertProfile(user); }
        catch (e) { console.warn("Profile upsert failed:", e?.message || e); }
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
