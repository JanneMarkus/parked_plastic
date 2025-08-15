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
  const [menuOpen, setMenuOpen] = useState(false);

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

  function handlePostClick() {
    setMenuOpen(false);
    if (user) router.push("/create-listing");
    else router.push(`/login?redirect=${encodeURIComponent("/create-listing")}`);
  }

  function handleManageClick() {
    setMenuOpen(false);
    if (user) router.push("/account");
    else router.push(`/login?redirect=${encodeURIComponent("/account")}`);
  }

  function handleBrowseClick() {
    setMenuOpen(false);
    router.push("/");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <header className="header">
      {/* Left: Logo */}
      <div className="left">
        <Link href="/" aria-label="Go to Parked Plastic home" className="logoLink">
          <BrandLogo />
        </Link>
      </div>

      {/* Center nav (desktop only) */}
      <nav className="center" aria-label="Primary">
        <button className="linkButton navLink" onClick={handleBrowseClick}>Browse</button>
        <button className="linkButton navLink" onClick={handleManageClick}>Manage Listings</button>
      </nav>

      {/* Mobile CTA sits in the middle row on small screens */}
      <button className="btnPrimary mobileCTA" onClick={handlePostClick}>
        Post a Disc
      </button>

      {/* Right cluster */}
      <div className="right">
        {/* Desktop CTA */}
        <button className="btnPrimary desktopCTA" onClick={handlePostClick}>Post a Disc</button>

        {user ? (
          <div className="account">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="avatar"
                width={36}
                height={36}
              />
            ) : (
              <div className="avatar initials" aria-label="User avatar" title={displayName}>
                {initials}
              </div>
            )}
            <div className="who">
              <div className="whoHint">Signed in as</div>
              <div className="whoName">{displayName}</div>
            </div>
            <button className="btnOutline" onClick={handleSignOut}>Sign out</button>
          </div>
        ) : (
          <Link href="/login" className="btnOutline desktopOnly">Sign in</Link>
        )}

        {/* Hamburger (mobile only) */}
        <button
          className="hamburger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((s) => !s)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>

      {/* Mobile menu sheet */}
      <div
        id="mobile-menu"
        className={`mobileMenu ${menuOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="mobileInner">
          <Link href="/" className="mobileLink" onClick={() => setMenuOpen(false)}>
            Browse
          </Link>
          <button className="mobileLink asButton" onClick={handlePostClick}>
            Post a Disc
          </button>

          <div className="mobileDivider" />

          {user ? (
            <>
              <div className="mobileUser">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="avatar"
                    width={36}
                    height={36}
                  />
                ) : (
                  <div className="avatar initials" aria-label="User avatar" title={displayName}>
                    {initials}
                  </div>
                )}
                <div className="who mobileWho">
                  <div className="whoHint">Signed in as</div>
                  <div className="whoName">{displayName}</div>
                </div>
              </div>
              <button className="btnOutline full" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btnOutline full" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Brand tokens */
        :root {
          --storm-blue: #141b4d;
          --caribbean-sea: #279989;
          --sea-mist: #f8f7ec;
          --wave-crest: #d6d2c4;
          --soft-charcoal: #3a3a3a;
          --cloud-grey: #e9e9e9;
          --highlight-coral: #e86a5e;
          --light-teal-tint: #ecf6f4;
        }

        /* MOBILE-FIRST HEADER */
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 64px; /* Brand spec */
          background: var(--storm-blue);
          color: #fff;
          display: grid;
          grid-template-columns: auto 1fr auto; /* Logo | center grows | right (hamburger) */
          align-items: center;
          gap: 10px; /* breathing room between items */
          padding: 0 10px; /* tighter side padding on narrow screens */
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          font-family: var(--font-poppins, Poppins), system-ui, sans-serif;
        }

        .left { display: flex; align-items: center; }
        .logoLink {
          display: inline-flex;
          align-items: center;
          color: #fff;
          text-decoration: none;
          outline: none;
          white-space: nowrap;
        }
        .logoLink:focus-visible {
          box-shadow: 0 0 0 4px var(--light-teal-tint);
          border-radius: 8px;
        }

        /* Center nav hidden on mobile; we repurpose the middle slot for mobile CTA */
        .center { display: none; }

        /* MOBILE CTA (visible <768px, sits in the middle column) */
        .mobileCTA {
          justify-self: center;
          background: var(--caribbean-sea);
          color: #fff;
          border-radius: 8px;
          padding: 8px 14px; /* slightly smaller on mobile */
          font-weight: 700;
          border: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .mobileCTA:hover { background: #1e7a6f; }
        .mobileCTA:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px var(--light-teal-tint);
        }

        /* Right cluster */
        .right {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        /* Desktop CTA hidden on mobile */
        .desktopCTA { display: none; }

        /* Buttons (shared) */
        .btnPrimary {
          background: var(--caribbean-sea);
          color: #fff;
          border-radius: 8px;
          padding: 10px 18px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .btnPrimary:hover { background: #1e7a6f; }
        .btnPrimary:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px var(--light-teal-tint);
        }

        .btnOutline {
          background: transparent;
          border: 2px solid #fff;
          color: #fff;
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }
        .btnOutline:hover { background: #fff; color: var(--storm-blue); }
        .btnOutline:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px var(--light-teal-tint);
        }
        .btnOutline.full { width: 100%; }
        .desktopOnly { display: none; }

        /* Account cluster (hidden on mobile) */
        .account {
          display: none;
          align-items: center;
          gap: 10px;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255,255,255,0.5);
          background: var(--caribbean-sea);
          flex: 0 0 auto;
        }
        .avatar.initials {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        .who { line-height: 1.1; }
        .whoHint { font-size: 11px; opacity: 0.7; }
        .whoName { font-size: 14px; font-weight: 600; }

        /* Hamburger (mobile only) */
        .hamburger {
          display: inline-flex;
          flex-direction: column;
          gap: 3px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          background: transparent;
          cursor: pointer;
        }
        .hamburger:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px var(--light-teal-tint);
        }
        .bar {
          width: 18px;
          height: 2px;
          background: #fff;
        }

        /* Mobile menu sheet */
        .mobileMenu {
          position: fixed;
          inset: 64px 0 0 0; /* below header */
          background: var(--sea-mist);
          transform: translateY(-8px);
          opacity: 0;
          pointer-events: none;
          transition: transform 160ms ease, opacity 160ms ease;
          border-top: 1px solid var(--cloud-grey);
        }
        @media (prefers-reduced-motion: reduce) {
          .mobileMenu { transition: none; }
        }
        .mobileMenu.open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
        .mobileInner {
          padding: 16px;
          display: grid;
          gap: 12px;
          max-width: 640px;
          margin: 0 auto;
        }
        .mobileLink {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: var(--storm-blue);
          text-decoration: none;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--cloud-grey);
          background: #fff;
        }
        .mobileLink.asButton {
          cursor: pointer;
          border: 2px solid var(--caribbean-sea);
          color: var(--caribbean-sea);
          background: #fff;
        }
        .mobileLink:focus-visible,
        .mobileLink.asButton:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px var(--light-teal-tint);
        }
        .mobileDivider {
          height: 1px;
          background: var(--cloud-grey);
          margin: 8px 0;
        }
        .mobileUser {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0 12px;
        }
        .mobileWho .whoName { font-size: 15px; }

        /* DESKTOP ≥768px */
        @media (min-width: 768px) {
          .header {
            grid-template-columns: auto 1fr auto; /* same, but we show desktop bits */
            padding: 0 24px;
            gap: 16px;
          }
          .center {
            display: flex;
            justify-content: center;
            gap: 24px;
            font-weight: 500;
          }
          .navLink {
            color: #fff;
            text-decoration: none;
            outline: none;
          }
          .navLink:hover { text-decoration: underline; }
          .navLink:focus-visible {
            box-shadow: 0 0 0 4px var(--light-teal-tint);
            border-radius: 6px;
          }
          .linkButton {
            background: transparent;
            border: none;
            padding: 0;
            font: inherit;
            cursor: pointer;
            color: inherit;
          }

          .account { display: inline-flex; }
          .desktopCTA { display: inline-flex; }
          .desktopOnly { display: inline-flex; }
          .mobileCTA { display: none; }
          .hamburger { display: none; }
          .mobileMenu { display: none; }
        }
      `}</style>
    </header>
  );
}
