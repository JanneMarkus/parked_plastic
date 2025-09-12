// components/Header.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import BrandLogo from "@/components/BrandLogo";

const supabase = getSupabaseBrowser();

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ full_name: null, avatar_url: null });
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authReady, setAuthReady] = useState(false); // SSR/CSR consistency gate
  const [displayNameStable, setDisplayNameStable] = useState(null); // last known good name

  // Ensure server and pre-hydration client render the same markup
  useEffect(() => { setMounted(true); }, []);

  // components/Header.js (only the auth bits need to change)
useEffect(() => {
  let alive = true;

  async function refreshFromServerCookie() {
    try {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      const j = await res.json();
      if (!alive) return;
      const u = j?.user || null;
      setUser(u);
      if (u) {
        // Load profile via anon client, filtered by user.id (RLS will allow the row for owner)
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", u.id)
          .maybeSingle();
        setProfile({
          full_name:
            p?.full_name ||
            u?.user_metadata?.full_name ||
            u?.user_metadata?.name ||
            (typeof u?.email === "string" ? u.email.split("@")[0] : null) ||
            null,
          avatar_url: p?.avatar_url || u?.user_metadata?.avatar_url || null,
        });
        // Preserve a stable display label to prevent email "flash" on later refreshes
          setDisplayNameStable((prev) => {
            const next =
              p?.full_name ||
              u?.user_metadata?.full_name ||
              u?.user_metadata?.name ||
              (typeof u?.email === "string" ? u.email.split("@")[0] : null) ||
              prev ||
              null;
            return next;
          });
      } else {
        setProfile({ full_name: null, avatar_url: null });
      }
    } catch {
      if (alive) {
        setUser(null);
        setProfile({ full_name: null, avatar_url: null });
      }
    } finally {
        if (alive) setAuthReady(true); // unblock rendering (SSR/CSR now aligned)
    }
  }

  // Initial read from server cookie (httpOnly)
  refreshFromServerCookie();

  // Stay in sync for client-initiated changes and token refresh/expiry
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      // For long-idle tabs: defer to server cookie as truth when tab becomes visible.
      // But keep UI snappy for explicit client events.
      if (evt === "SIGNED_IN" || evt === "USER_UPDATED" || evt === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
      }
      if (evt === "SIGNED_OUT") {
        setUser(null);
        setProfile({ full_name: null, avatar_url: null });
        setDisplayNameStable(null);
      }
    });

  // Also refresh when tab becomes visible (session may have rotated server-side)
  const onVis = () => {
    if (document.visibilityState === "visible") refreshFromServerCookie();
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    alive = false;
    sub?.subscription?.unsubscribe?.();
    document.removeEventListener("visibilitychange", onVis);
  };
}, []);

  const displayName = useMemo(() => {
    // Prefer stable, human-friendly name. Fall back to profile or email only after authReady.
    if (displayNameStable) return displayNameStable;
    if (!authReady) return ""; // avoid mismatched SSR/CSR text during first paint
    if (profile.full_name) return profile.full_name;
    if (user?.email) return user.email;
    return "User";
  }, [displayNameStable, authReady, profile.full_name, user?.email]);

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
    else
      router.push(`/login?redirect=${encodeURIComponent("/create-listing")}`);
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

  function handleAvatarClick() {
    setMenuOpen(false);
    if (user) router.push("/account");
    else router.push(`/login?redirect=${encodeURIComponent("/account")}`);
  }

  // Resilient "force sign out": clears local session AND server cookies and reloads cleanly
  async function handleSignOut() {
    try {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      await fetch("/api/auth/clear", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    } finally {
      setMenuOpen(false);
      window.location.replace("/");
    }
  }

  return (
    <header className="header">
      {/* Left: Logo */}
      <div className="left">
        <Link
          href="/"
          aria-label="Go to Parked Plastic home"
          className="logoLink"
        >
          <BrandLogo />
        </Link>
      </div>

      {/* Center nav (desktop only) */}
      <nav className="center" aria-label="Primary">
        <button className="linkButton navLink" onClick={handleBrowseClick}>
          Browse
        </button>
        <button className="linkButton navLink" onClick={handleManageClick}>
          Manage Listings
        </button>
      </nav>

      {/* Mobile CTA sits in the middle row on small screens */}
      <button className="btnPrimary mobileCTA" onClick={handlePostClick}>
        Post a Disc
      </button>

      {/* Right cluster */}
      <div className="right">
        {/* Desktop CTA */}
        <button className="btnPrimary desktopCTA" onClick={handlePostClick}>
          Post a Disc
        </button>

        {authReady && user ? (
          <div className="account">
            <button
              type="button"
              className="avatarButton"
              onClick={handleAvatarClick}
              aria-label="Go to Manage Listings"
              title={`${displayName} — Manage Listings`}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="avatar"
                  width={36}
                  height={36}
                />
              ) : (
                <div className="avatar initials" aria-hidden="true">
                  {initials}
                </div>
              )}
            </button>
            <div className="who">
              <div className="whoHint">Signed in as</div>
              <div className="whoName">{displayName}</div>
            </div>
            <button className="btnOutline" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <Link href="/login" className="btnOutline desktopOnly">
            Sign in
          </Link>
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
          <Link
            href="/"
            className="mobileLink"
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </Link>
          <Link
            href="/account"
            className="mobileLink"
            onClick={() => setMenuOpen(false)}
          >
            Manage Listings
          </Link>

          <div className="mobileDivider" />

          {authReady && user ? (
            <>
              <div className="mobileUser">
                <button
                  type="button"
                  className="avatarButton"
                  onClick={handleAvatarClick}
                  aria-label="Go to Manage Listings"
                  title={`${displayName} — Manage Listings`}
                >
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="avatar"
                      width={36}
                      height={36}
                    />
                  ) : (
                    <div className="avatar initials" aria-hidden="true">
                      {initials}
                    </div>
                  )}
                </button>
                <div className="who mobileWho">
                  <div className="whoHint">Signed in as</div>
                  <div className="whoName">{displayName}</div>
                </div>
              </div>
              <button className="btnOutline full" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : authReady ? (
          <Link href="/login" className="btnOutline desktopOnly">Sign in</Link>
        ) : null}
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
          gap: 10px;
          padding: 0 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          font-family: var(--font-poppins, Poppins), system-ui, sans-serif;
        }

        .left {
          display: flex;
          align-items: center;
        }
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
        .center {
          display: none;
        }

        /* MOBILE CTA (visible <768px, sits in the middle column) */
        .mobileCTA {
          justify-self: center;
          background: var(--caribbean-sea);
          color: #fff;
          border-radius: 8px;
          padding: 8px 14px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .mobileCTA:hover {
          background: #1e7a6f;
        }
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
        .desktopCTA {
          display: none;
        }

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
        .btnPrimary:hover {
          background: #1e7a6f;
        }
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
        .btnOutline:hover {
          background: #fff;
          color: var(--storm-blue);
        }
        .btnOutline:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px var(--light-teal-tint);
        }
        .btnOutline.full {
          width: 100%;
        }
        .desktopOnly {
          display: none;
        }

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
          border: 2px solid rgba(255, 255, 255, 0.5);
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
        .avatarButton {
          padding: 0;
          margin: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .avatarButton:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px var(--light-teal-tint);
        }
        .who {
          line-height: 1.1;
        }
        .whoHint {
          font-size: 11px;
          opacity: 0.7;
        }
        .whoName {
          font-size: 14px;
          font-weight: 600;
        }

        /* Hamburger (mobile only) */
        .hamburger {
          display: inline-flex;
          flex-direction: column;
          gap: 3px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
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
          .mobileMenu {
            transition: none;
          }
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

        /* Mobile menu color fixes */
        .mobileMenu,
        .mobileInner {
          color: var(--storm-blue);
        }
        .mobileUser .whoHint {
          color: var(--soft-charcoal);
          opacity: 0.9;
        }
        .mobileUser .whoName {
          color: var(--storm-blue);
        }

        /* Mobile links and buttons inside sheet */
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
        .mobileLink:hover {
          background: #fdfdfb;
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

        /* Override the dark-header .btnOutline style ONLY inside the mobile sheet */
        .mobileMenu :global(.btnOutline) {
          border-color: var(--storm-blue);
          color: var(--storm-blue);
          background: #fff;
        }
        .mobileMenu :global(.btnOutline:hover) {
          background: var(--storm-blue);
          color: #fff;
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
        .mobileWho .whoName {
          font-size: 15px;
        }

        /* DESKTOP ≥768px */
        @media (min-width: 768px) {
          .header {
            grid-template-columns: auto 1fr auto;
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
          .navLink:hover {
            text-decoration: underline;
          }
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

          .account {
            display: inline-flex;
          }
          .desktopCTA {
            display: inline-flex;
          }
          .desktopOnly {
            display: inline-flex;
          }
          .mobileCTA {
            display: none;
          }
          .hamburger {
            display: none;
          }
          .mobileMenu {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
