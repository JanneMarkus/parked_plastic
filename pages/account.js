// pages/account.js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import ContactInfoCard from "@/components/ContactInfoCard";

/* ------------------------- Small helpers/components ------------------------ */

function StatusTabs({ value, counts, onChange }) {
  return (
    <div className="pp-tabs" role="tablist" aria-label="Filter listings by status">
      {[
        { key: "all", label: "All", count: counts.all },
        { key: "active", label: "Active", count: counts.active },
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
          border: 2px solid var(--storm, #141B4D);
          background: #fff;
          color: var(--storm, #141B4D);
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
          box-shadow: 0 0 0 4px var(--tint, #ECF6F4);
        }
        .pp-tab.is-active {
          background: var(--storm, #141B4D);
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
          background: var(--cloud, #E9E9E9);
          color: var(--storm, #141B4D);
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

function ListingCard({ l, onToggleSold, onDelete }) {
  const price =
    l.price != null && Number.isFinite(Number(l.price))
      ? `$${Number(l.price).toFixed(2)}`
      : null;

  return (
    <article className={`pp-card ${l.is_sold ? "is-sold" : ""}`} role="listitem">
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
        {l.is_sold && <div className="soldBanner">SOLD</div>}
      </div>

      <div className="content">
        <h3 className="title">{l.title}</h3>
        <div className="meta">
          {(l.brand || "—")}
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
            onClick={() => onToggleSold(l.id, !!l.is_sold)}
            aria-pressed={l.is_sold}
          >
            {l.is_sold ? "Mark Active" : "Mark Sold"}
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
          border: 1px solid var(--cloud, #E9E9E9);
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
          background: var(--cloud, #E9E9E9);
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
          color: var(--storm, #141B4D);
          margin: 0;
          font-size: 1.05rem;
        }
        .meta {
          font-size: 0.9rem;
          color: var(--char, #3A3A3A);
        }
        .price {
          font-weight: 700;
          color: var(--storm, #141B4D);
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

export default function Account() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | sold
  const [errorMsg, setErrorMsg] = useState("");

  // Auth gate
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const u = data?.session?.user ?? null;
      setUser(u);
      setReady(true);
      if (!u) router.replace(`/login?redirect=${encodeURIComponent("/account")}`);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, [router]);

  // Load listings
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
        if (statusFilter === "active") q = q.eq("is_sold", false);
        if (statusFilter === "sold") q = q.eq("is_sold", true);
        const { data, error } = await q;
        if (error) throw error;
        if (!cancelled) setListings(data || []);
      } catch (e) {
        console.error(e);
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
      active: listings.filter((l) => !l.is_sold).length,
      sold: listings.filter((l) => !!l.is_sold).length,
    }),
    [listings]
  );

  // Mutations (optimistic)
  async function toggleSold(id, current) {
    setErrorMsg("");
    const prev = listings;
    setListings((p) => p.map((l) => (l.id === id ? { ...l, is_sold: !current } : l)));
    const { error } = await supabase.from("discs").update({ is_sold: !current }).eq("id", id);
    if (error) {
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
      alert("Failed to delete: " + error.message);
      setListings(prev); // revert
    }
  }

  // Guards
  if (!ready) {
    return (
      <main className="pp-wrap">
        <Head>
          <title>My Listings — Parked Plastic</title>
          <meta name="robots" content="noindex" />
        </Head>
        <p className="center muted">Checking session…</p>
        <style jsx>{`
          .center {
            text-align: center;
            margin-top: 40px;
          }
          .muted {
            color: var(--char, #3A3A3A);
            opacity: 0.85;
          }
        `}</style>
      </main>
    );
  }
  if (!user) return null;

  return (
    <>
      <Head>
        <title>My Listings — Parked Plastic</title>
        <meta name="description" content="Manage your disc listings: edit, mark sold, or delete." />
      </Head>

      <main className="pp-wrap">
        {/* Title + quick actions */}
        <div className="bar">
          <h1 className="pp-title">My Listings</h1>
          <div className="actions">
            <Link href="/create-listing" className="btn btn-primary">
              Post a Disc
            </Link>
          </div>
        </div>

        {/* Contact info settings */}
        <div className="contactCard">
          <ContactInfoCard userId={user.id} />
        </div>

        {/* Tabs */}
        <div className="toolbar">
          <StatusTabs
            value={statusFilter}
            counts={counts}
            onChange={(v) => setStatusFilter(v)}
          />
        </div>

        {/* Status / errors */}
        <div aria-live="polite" aria-atomic="true" className="statusRegion">
          {errorMsg && <div className="alert error">{errorMsg}</div>}
          {loading && <div className="alert info">Loading your listings…</div>}
        </div>

        {/* Grid */}
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
              <ListingCard key={l.id} l={l} onToggleSold={toggleSold} onDelete={deleteListing} />
            ))}
          </div>
        )}
      </main>

      {/* Minimal page CSS (everything else: tiny globals) */}
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
          color: var(--char, #3A3A3A);
          padding: 24px;
          border: 1px dashed var(--cloud, #E9E9E9);
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
      `}</style>
    </>
  );
}
