// pages/_app.js
import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GlobalStyles from "@/components/GlobalStyles";
import { Poppins, Source_Sans_3 } from "next/font/google";
import "@/styles/globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import Script from "next/script";
import { useRouter } from "next/router";
import { ToastProvider } from "@/components/ToastProvider";


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
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (typeof window.gtag !== "function") return;
      window.gtag("config", "G-NDXLRKC78C", {
        page_path: url,
      });
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

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
    
    <>
      <div className={`${poppins.variable} ${source.variable}`}>
      {/* Google Analytics 4 */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=G-NDXLRKC78C`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-NDXLRKC78C', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
        <SessionContextProvider
          supabaseClient={supabase}
          initialSession={pageProps?.initialSession}
        >
          <ToastProvider>
            <GlobalStyles />
            <div className="layout">
              <Header />
              <main className="layoutMain">
                <Component {...pageProps} />
              </main>
              <Footer />
            </div>
            <Analytics />
          </ToastProvider>
        </SessionContextProvider>
      </div>
    </>
  );
}
