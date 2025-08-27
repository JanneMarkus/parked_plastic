// pages/account.js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import ContactInfoCard from "@/components/ContactInfoCard";
import { createServerClient } from "@supabase/ssr";
import { serialize } from "cookie";

/* ------------------------- Small helpers/components ------------------------ */
const supabase = getSupabaseBrowser();

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export async function getServerSideProps(ctx) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return ctx.req.cookies[name];
        },
        set(name, value, options) {
          const cookie = serialize(name, value, options);
          let existing = ctx.res.getHeader("Set-Cookie") ?? [];
          if (!Array.isArray(existing)) existing = [existing];
          ctx.res.setHeader("Set-Cookie", [...existing, cookie]);
        },
        remove(name, options) {
          const cookie = serialize(name, "", { ...options, maxAge: 0 });
          let existing = ctx.res.getHeader("Set-Cookie") ?? [];
          if (!Array.isArray(existing)) existing = [existing];
          ctx.res.setHeader("Set-Cookie", [...existing, cookie]);
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return {
      redirect: {
        destination: `/login?redirect=${encodeURIComponent(ctx.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      initialSession: null,
      user: data.user,
    },
  };
}

function StatusTabs({ value, counts, onChange }) {
  return (
    <div className="pp-tabs" role="tablist" aria-label="Filter listings by status">
      {[
        { key: "all", label: "All", count: counts.all },
        { key: "active", label: "Active", count: counts.active },
        { key: "pending", label: "Pending", count: counts.pending },
        { key: "sold", label: "Sold", count: counts.sold },
      ].map(({ key, label, count }) => {
        const active = value === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            className={`pp-tab ${active ? "is-active" : ""}`}
            onClick={() => onChange(key)}
          >
            {label} <span className="chip">{count}</span>
          </button>
        );
      })}
      <style jsx>{`
        .pp-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pp-tab {
          border: 2px solid var(--storm, #141b4d);
          background: #fff;
          color: var(--storm, #141b4d);
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .pp-tab:focus {
          outline: none;
          box-shadow: 0 0 0 4px var(--tint, #ecf6f4);
        }
        .pp-tab.is-active {
          background: var(--storm, #141b4d);
          color: #fff;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          background: var(--cloud, #e9e9e9);
          color: var(--storm, #141b4d);
          font-weight: 700;
          font-size: 0.85rem;
        }
        .pp-tab.is-active .chip {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }
      `}</style>
    </div>
  );
}

function ListingCard({ l, onToggleStatus, onDelete }) {
  const price =
    l.price != null && Number.isFinite(Number(l.price))
      ? CAD.format(Number(l.price))
      : null;

  return (
    <article
      className={`pp-card ${
        l.status === "sold" ? "is-sold" : l.status === "pending" ? "is-pending" : ""
      }`}
      role="listitem"
    >
      <div className="img-wrap">
        {l.image_urls?.length ? (
          <Image
            className="img"
            src={l.image_urls[0]}
            alt={l.title}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw"
            priority={false}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="img placeholder" aria-label="No image" />
        )}
        {l.status === "sold" && <div className="soldBanner">SOLD</div>}
        {l.status === "pending" && <div className="pendingBanner">PENDING</div>}
      </div>

      <div className="content">
        <h3 className="title">{l.title}</h3>
        <div className="meta">
          {l.brand || "—"}
          {l.mold ? ` • ${l.mold}` : ""}
          {l.weight ? ` • ${l.weight} g` : ""}
        </div>
        {price && <div className="price">{price}</div>}

        <div className="row">
          <Link href={`/listings/${l.id}`} className="btn btn-outline" aria-label={`View ${l.title}`}>
            View
          </Link>
          <Link href={`/listings/${l.id}/edit`} className="btn btn-outline" aria-label={`Edit ${l.title}`}>
            Edit
          </Link>
          <button
            className="btn btn-primary"
            onClick={() => onToggleStatus(l.id, l.status)}
            aria-pressed={l.status !== "active"}
          >
            {l.status === "active"
              ? "Mark Pending"
              : l.status === "pending"
              ? "Mark Sold"
              : "Mark Active"}
          </button>
          <button className="btn btn-outline" onClick={() => onDelete(l.id)}>
            Delete
          </button>
        </div>
      </div>

      <style jsx>{`
        .pp-card {
          position: relative;
          background: #fff;
          border: 1px solid var(--cloud, #e9e9e9);
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: var(--cloud, #e9e9e9);
        }
        .pp-card.is-sold .img {
          filter: grayscale(1) brightness(0.82) contrast(1.1);
          opacity: 0.9;
        }
        .pp-card.is-sold .img-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(transparent, rgba(20, 27, 77, 0.22));
          pointer-events: none;
        }
        .soldBanner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          padding: 10px 18px;
          border-radius: 14px;
          font-family: "Poppins", sans-serif;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #fff;
          background: rgba(20, 27, 77, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 24px rgba(20, 27, 77, 0.25);
        }

        .content {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .title {
          font-family: "Poppins", sans-serif;
          font-weight: 600;
          color: var(--storm, #141b4d);
          margin: 0;
          font-size: 1.05rem;
        }
        .meta {
          font-size: 0.9rem;
          color: var(--char, #3a3a3a);
        }
        .price {
          font-weight: 700;
          color: var(--storm, #141b4d);
        }
        .row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: auto;
        }
      `}</style>
    </article>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function Account({ user }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | pending | sold
  const [errorMsg, setErrorMsg] = useState("");

  // Centralized stale-session escape hatch
  async function handleAuthStaleRedirect() {
    try {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      await fetch("/api/auth/clear", { method: "POST", credentials: "include" }).catch(() => {});
    } finally {
      if (typeof window !== "undefined") {
        const redirect = encodeURIComponent(window.location.pathname);
        window.location.replace(`/login?redirect=${redirect}`);
      }
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        let q = supabase
          .from("discs")
          .select("*")
          .eq("owner", user.id)
          .order("created_at", { ascending: false });
        if (statusFilter !== "all") q = q.eq("status", statusFilter);
        const { data, error } = await q;
        if (error) throw error;
        if (!cancelled) setListings(data || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        const msg = String(e?.message || "");
        const code = e?.code || e?.status;
        // If auth looks stale/broken, hard reset to login
        if (
          code === 401 ||
          /JWT|Auth|Invalid token|refresh|expired/i.test(msg)
        ) {
          await handleAuthStaleRedirect();
          return;
        }
        if (!cancelled) {
          setErrorMsg("Failed to load your listings.");
          setListings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, statusFilter]);

  const counts = useMemo(
    () => ({
      all: listings.length,
      active: listings.filter((l) => l.status === "active").length,
      pending: listings.filter((l) => l.status === "pending").length,
      sold: listings.filter((l) => l.status === "sold").length,
    }),
    [listings]
  );

  // Mutations (optimistic)
  async function toggleStatus(id, currentStatus) {
    setErrorMsg("");
    const prev = listings;
    let nextStatus = "active";
    if (currentStatus === "active") nextStatus = "pending";
    else if (currentStatus === "pending") nextStatus = "sold";
    else if (currentStatus === "sold") nextStatus = "active";

    setListings((p) => p.map((l) => (l.id === id ? { ...l, status: nextStatus } : l)));
    const { error } = await supabase.from("discs").update({ status: nextStatus }).eq("id", id);
    if (error) {
      const msg = String(error?.message || "");
      const code = error?.code || error?.status;
      if (code === 401 || /JWT|Auth|Invalid token|refresh|expired/i.test(msg)) {
        await handleAuthStaleRedirect();
        return;
      }
      alert("Failed to update: " + error.message);
      setListings(prev); // revert
    }
  }

  async function deleteListing(id) {
    if (!confirm("Delete this listing permanently? This cannot be undone.")) return;
    setErrorMsg("");
    const prev = listings;
    setListings((p) => p.filter((l) => l.id !== id));
    const { error } = await supabase.from("discs").delete().eq("id", id);
    if (error) {
      const msg = String(error?.message || "");
      const code = error?.code || error?.status;
      if (code === 401 || /JWT|Auth|Invalid token|refresh|expired/i.test(msg)) {
        await handleAuthStaleRedirect();
        return;
      }
      alert("Failed to delete: " + error.message);
      setListings(prev); // revert
    }
  }

  return (
    <>
      <Head>
        <title>My Listings — Parked Plastic</title>
        <meta
          name="description"
          content="Manage your disc listings: edit, mark pending/sold, or delete."
        />
      </Head>

      <main className="pp-wrap">
        <div className="bar">
          <h1 className="pp-title">My Listings</h1>
          <div className="actions">
            <Link href="/create-listing" className="btn btn-primary">
              Post a Disc
            </Link>
          </div>
        </div>

        <div className="contactCard">
          <ContactInfoCard userId={user.id} />
        </div>

        <div className="toolbar">
          <StatusTabs value={statusFilter} counts={counts} onChange={(v) => setStatusFilter(v)} />
        </div>

        <div aria-live="polite" aria-atomic="true" className="statusRegion">
          {errorMsg && <div className="alert error">{errorMsg}</div>}
          {loading && <div className="alert info">Loading your listings…</div>}
        </div>

        {!loading && listings.length === 0 ? (
          <div className="empty">
            You don’t have any listings yet.
            <div className="emptyActions">
              <Link href="/create-listing" className="btn btn-primary">
                Post a Disc
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid" role="list">
            {listings.map((l) => (
              <ListingCard key={l.id} l={l} onToggleStatus={toggleStatus} onDelete={deleteListing} />
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        .bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 8px 0 6px;
          flex-wrap: wrap;
        }
        .statusRegion {
          min-height: 22px;
          margin: 6px 0 14px;
        }
        .alert {
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.95rem;
        }
        .alert.error {
          background: #fff5f4;
          border: 1px solid #ffd9d5;
          color: #8c2f28;
        }
        .alert.info {
          background: #f4fff9;
          border: 1px solid #d1f5e5;
          color: #1a6a58;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .empty {
          text-align: center;
          color: var(--char, #3a3a3a);
          padding: 24px;
          border: 1px dashed var(--cloud, #e9e9e9);
          border-radius: 12px;
          background: #fdfdfb;
        }
        .emptyActions {
          margin-top: 12px;
          display: flex;
          justify-content: center;
        }
        .contactCard {
          margin: 8px 0 14px;
        }

        @media (min-width: 768px) {
          .pp-title {
            font-size: 2rem;
          }
        }

        /* Pending tint (lighter than Sold) */
        .pp-card.is-pending .img-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(transparent, rgba(232, 176, 46, 0.18));
          pointer-events: none;
        }

        .pendingBanner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          padding: 10px 18px;
          border-radius: 14px;
          font-family: "Poppins", sans-serif;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #2b1c00;
          background: rgba(255, 208, 85, 0.95);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 10px 24px rgba(232, 176, 46, 0.3);
        }

        /* Keep grayscale only for sold */
        .pp-card.is-sold .img {
          filter: grayscale(1) brightness(0.82) contrast(1.1);
          opacity: 0.9;
        }
      `}</style>
    </>
  );
}
