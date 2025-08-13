// components/Header.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import BrandLogo from "@/components/BrandLogo";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ full_name: null, avatar_url: null });

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      if (!mounted) return;
      setUser(u);

      if (u) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", u.id)
          .single();

        setProfile({
          full_name:
            p?.full_name ||
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            null,
          avatar_url: p?.avatar_url || u.user_metadata?.avatar_url || null,
        });
      } else {
        setProfile({ full_name: null, avatar_url: null });
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", u.id)
          .single();

        setProfile({
          full_name:
            p?.full_name ||
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            null,
          avatar_url: p?.avatar_url || u.user_metadata?.avatar_url || null,
        });
      } else {
        setProfile({ full_name: null, avatar_url: null });
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const displayName = useMemo(() => {
    if (profile.full_name) return profile.full_name;
    if (user?.email) return user.email;
    return "User";
  }, [profile.full_name, user?.email]);

  const initials = useMemo(() => {
    const source =
      profile.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      "";
    const clean = String(source).trim();
    if (!clean) return "PP";
    const parts = clean.split(/\s+/);
    const a = parts[0]?.[0] || "";
    const b = parts.length > 1 ? parts[1][0] : "";
    return (a + b).toUpperCase() || clean[0]?.toUpperCase() || "PP";
  }, [profile.full_name, user]);

  const handlePostClick = () => {
    if (user) router.push("/create-listing");
    else router.push(`/login?redirect=${encodeURIComponent("/create-listing")}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header
      style={{
        height: 64,
        background: "#141B4D", // Storm Blue
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        fontFamily: "'Poppins', sans-serif",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo + brand */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          color: "#fff",
          textDecoration: "none",
        }}
        aria-label="Go to Parked Plastic home"
      >
        <BrandLogo />
      </Link>

      {/* Center nav */}
      <nav style={{ display: "flex", gap: 24, fontWeight: 500 }}>
        <Link href="/" style={{ color: "#fff", textDecoration: "none" }}>
          Browse
        </Link>
        <a
          onClick={handlePostClick}
          style={{ color: "#fff", textDecoration: "none", cursor: "pointer" }}
        >
          Post a Disc
        </a>
      </nav>

      {/* Right actions: CTA + Account */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={handlePostClick}
          style={{
            background: "#279989", // Caribbean Sea
            color: "#fff",
            borderRadius: 8,
            padding: "10px 18px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E7A6F")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#279989")}
        >
          Post a Disc
        </button>

        {user ? (
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                referrerPolicy="no-referrer"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid rgba(255,255,255,0.5)",
                }}
                />
                
            ) : (
              <div
                aria-label="User avatar"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#279989",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "2px solid rgba(255,255,255,0.5)",
                }}
                title={displayName}
              >
                {initials}
              </div>
            )}

            {/* Signed in as */}
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Signed in as</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{displayName}</div>
            </div>

            <button
              onClick={handleSignOut}
              style={{
                background: "transparent",
                border: "2px solid #fff",
                color: "#fff",
                borderRadius: 8,
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            style={{
              background: "transparent",
              border: "2px solid #fff",
              color: "#fff",
              borderRadius: 8,
              padding: "8px 12px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}