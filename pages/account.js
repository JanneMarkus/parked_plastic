// pages/account.js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import ContactInfoCard from "@/components/ContactInfoCard";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import PlaceholderDisc from "@/components/PlaceholderDisc";

/* ------------------- SSR: gate page via httpOnly cookies ------------------- */
export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServerClient({ req: ctx.req, res: ctx.res });
  const { data: { user } = {}, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      redirect: {
        destination: `/login?redirect=${encodeURIComponent(ctx.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: { id: user.id, email: user.email ?? null },
    },
  };
}

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

// Match index.tsx mapping exactly
function conditionClass(cond) {
  const n = Number(cond);
  if (!Number.isFinite(n)) return "";
  if (n >= 10) return "cond--gold";
  if (n >= 8) return "cond--green-rich";
  if (n >= 6) return "cond--green";
  if (n >= 4) return "cond--orange";
  return "cond--red";
}

function StatusTabs({ value, counts, onChange }) {
  return (
    <div
      className="pp-tabs"
      role="tablist"
      aria-label="Filter listings by status"
    >
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
          border: 2px solid var(--storm);
          background: #fff;
          color: var(--storm);
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .pp-tab:focus-visible {
          outline: 2px solid var(--teal);
          box-shadow: 0 0 0 4px var(--tint);
        }
        .pp-tab.is-active {
          background: var(--storm);
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
          background: var(--cloud);
          color: var(--storm);
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
  const isSold = l.status === "sold";
  const isPending = l.status === "pending";
  const condCls = l.condition != null ? conditionClass(l.condition) : "";

  // Next action in your cycle
  const nextLabel =
    l.status === "active"
      ? "Mark Pending"
      : l.status === "pending"
      ? "Mark Sold"
      : "Mark Active";

  return (
    // Use the same shell class as index cards for visual parity
    <article
      className={`pp-card listing-card ${
        isSold ? "is-sold" : isPending ? "is-pending" : ""
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
          <PlaceholderDisc className="img placeholder" />
        )}

        {/* Over-image pills to match index */}
        {price && (
          <span className="pp-pill pill--price" aria-label="Price">
            {price}
          </span>
        )}
        {l.condition != null && (
          <span
            className={`pp-pill pill--cond ${condCls}`}
            aria-label={`Condition ${l.condition}/10`}
          >
            {l.condition}/10
          </span>
        )}

        {isSold && <div className="soldBanner">SOLD</div>}
        {isPending && <div className="pendingBanner">PENDING</div>}
      </div>

      <div className="content">
        <h2 className="cardTitle">{l.title}</h2>

        {/* Flight numbers (if present) */}
        {l.speed != null &&
          l.glide != null &&
          l.turn != null &&
          l.fade != null && (
            <div className="flightline" aria-label="Flight numbers">
              {l.speed} / {l.glide} / {l.turn} / {l.fade}
            </div>
          )}

        <div className="meta">
          {l.brand || "—"}
          {l.mold ? ` • ${l.mold}` : ""}
        </div>

        <div className="specs">
          {l.weight && <span>{l.weight} g</span>}
          {l.is_glow && <span>Glow</span>}
          {l.is_inked && <span>Inked</span>}
        </div>

        {/* Owner actions */}
        <div className="actionsWrap">
          <div className="rowTop">
            <Link
              href={`/listings/${l.id}`}
              className="btn btn-outline"
              aria-label={`View ${l.title}`}
              title={`View ${l.title}`}
            >
              View
            </Link>
            <Link
              href={`/listings/${l.id}/edit`}
              className="btn btn-outline"
              aria-label={`Edit ${l.title}`}
              title={`Edit ${l.title}`}
            >
              Edit
            </Link>
          </div>

          <div className="rowBottom">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onToggleStatus(l.id, l.status)}
              aria-pressed={l.status !== "active"}
              title={nextLabel}
            >
              {nextLabel}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete(l.id)}
              title="Delete listing"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Page-scoped polish specifically for owner actions;
          core card styles (hover, pills, banners) come from GlobalStyles + index parity */}
      <style jsx>{`
        .actionsWrap {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }
        .rowTop,
        .rowBottom {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Buttons — consistent with tokens */
        .btn {
          appearance: none;
          border-radius: 10px;
          padding: 8px 12px;
          font-weight: 700;
          font-size: 0.92rem;
          cursor: pointer;
          line-height: 1;
          text-decoration: none;
          transition: transform 120ms ease, box-shadow 120ms ease,
            background 120ms ease, color 120ms ease, border-color 120ms ease;
          border: 1.5px solid var(--cloud);
          background: #fff;
          color: var(--storm);
          box-shadow: var(--shadow-sm);
          height: 36px;
          display: inline-flex;
          align-items: center;
        }
        .btn:hover {
          transform: none;
          box-shadow: var(--shadow-md);
          text-decoration: none;
        }
        .btn:focus-visible {
          outline: 2px solid var(--teal);
          box-shadow: 0 0 0 4px var(--tint);
        }

        .btn-outline {
          /* reserved for future, keeps API consistent */
        }

        .btn-primary {
          background: var(--teal);
          border-color: var(--teal);
          color: #fff;
        }
        .btn-primary:hover {
          background: var(--teal-d);
          border-color: var(--teal-d);
        }

        /* Use coral for destructive, matching token guidance */
        .btn-danger {
          border-color: var(--coral);
          color: var(--coral);
          background: #fff;
        }
        .btn-danger:hover {
          background: var(--coral);
          color: #fff;
          border-color: var(--coral);
        }

        /* Sold/pending image treatments */
        :global(.listing-card.is-sold) .img {
          filter: grayscale(1) brightness(0.82) contrast(1.1);
          opacity: 0.9;
        }
        :global(.listing-card.is-pending) .img-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(transparent, rgba(232, 176, 46, 0.18));
          pointer-events: none;
        }

        .soldBanner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          padding: 10px 18px;
          border-radius: 14px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #fff;
          background: rgba(20, 27, 77, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 24px rgba(20, 27, 77, 0.25);
        }
        .pendingBanner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          padding: 10px 18px;
          border-radius: 14px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #2b1c00;
          background: rgba(255, 208, 85, 0.95);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 10px 24px rgba(232, 176, 46, 0.3);
        }
        .img.placeholder {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        
      `}</style>
    </article>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function Account({ user }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [errorMsg, setErrorMsg] = useState("");

  function redirectToLogin() {
    const redirect =
      typeof window !== "undefined"
        ? encodeURIComponent(window.location.pathname)
        : "/account";
    window.location.replace(`/login?redirect=${redirect}`);
  }

  // Load listings from server API
  async function loadListings(status = statusFilter) {
    setLoading(true);
    setErrorMsg("");
    try {
      const qs =
        status && status !== "all"
          ? `?status=${encodeURIComponent(status)}`
          : "";
      const res = await fetch(`/api/discs/list-mine${qs}`, {
        credentials: "include",
      });
      if (res.status === 401) return redirectToLogin();
      if (!res.ok) throw new Error("Failed to load listings");
      const json = await res.json();
      setListings(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setErrorMsg("Failed to load your listings.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const counts = useMemo(
    () => ({
      all: listings.length,
      active: listings.filter((l) => l.status === "active").length,
      pending: listings.filter((l) => l.status === "pending").length,
      sold: listings.filter((l) => l.status === "sold").length,
    }),
    [listings]
  );

  async function toggleStatus(id, currentStatus) {
    const next =
      currentStatus === "active"
        ? "pending"
        : currentStatus === "pending"
        ? "sold"
        : "active";
    const prev = listings;
    setListings((p) =>
      p.map((l) => (l.id === id ? { ...l, status: next } : l))
    );

    try {
      const res = await fetch("/api/discs/update-status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (res.status === 401) return redirectToLogin();
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert("Failed to update status.");
      setListings(prev); // revert
    }
  }

  async function deleteListing(id) {
    if (!confirm("Delete this listing permanently? This cannot be undone."))
      return;

    const prev = listings;
    setListings((p) => p.filter((l) => l.id !== id));

    try {
      const res = await fetch("/api/discs/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.status === 401) return redirectToLogin();
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert("Failed to delete.");
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
        </div>

        <div className="contactCard">
          <ContactInfoCard userId={user.id} />
        </div>

        <div className="toolbar">
          <StatusTabs
            value={statusFilter}
            counts={counts}
            onChange={(v) => setStatusFilter(v)}
          />
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
              <ListingCard
                key={l.id}
                l={l}
                onToggleStatus={toggleStatus}
                onDelete={deleteListing}
              />
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
          gap: 16px;
          grid-template-columns: repeat(3, 1fr); /* 3 across on large screens */
        }

        .empty {
          text-align: center;
          color: var(--char);
          padding: 24px;
          border: 1px dashed var(--cloud);
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

        /* Match index’s responsive drop */
        @media (max-width: 1100px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        .pp-wrap {
        padding-bottom: 48px;}
      `}</style>
    </>
  );
}
