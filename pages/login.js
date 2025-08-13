import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const nextPath = typeof router.query.redirect === "string" ? router.query.redirect : "/";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.replace(nextPath);
    });
  }, [nextPath, router]);

  const signInWithGoogle = async () => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login?redirect=${encodeURIComponent(nextPath)}`
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) alert(error.message);
  };

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "48px auto",
        background: "#fff",
        padding: 24,
        borderRadius: 12,
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
      }}
    >
      <h1 style={{ fontFamily: "'Poppins', sans-serif", color: "#141B4D", marginTop: 0 }}>
        Sign in to Parked Plastic
      </h1>
      <p style={{ color: "#3A3A3A" }}>
        Use Google to continue. You’ll be redirected back to <code>{nextPath}</code>.
      </p>

      <button
        onClick={signInWithGoogle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          background: "#279989",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "12px 16px",
          fontWeight: 600,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E7A6F")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#279989")}
      >
        <span
          aria-hidden
          style={{
            background: "#fff",
            color: "#279989",
            borderRadius: 4,
            padding: 6,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          G
        </span>
        Sign in with Google
      </button>

      <p style={{ fontSize: 12, color: "#555", marginTop: 12 }}>
        Make sure Google is enabled in Supabase Auth providers and the redirect URL is set.
      </p>
    </main>
  );
}
