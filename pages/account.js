// pages/account.js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function Account() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | sold
  const [errorMsg, setErrorMsg] = useState("");

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
    return () => { cancelled = true; };
  }, [user?.id, statusFilter]);

  const activeCount = useMemo(() => listings.filter(l => !l.is_sold).length, [listings]);
  const soldCount = useMemo(() => listings.filter(l => !!l.is_sold).length, [listings]);

  async function toggleSold(id, current) {
    setErrorMsg("");
    const prev = listings;
    // optimistic UI
    setListings(prev => prev.map(l => (l.id === id ? { ...l, is_sold: !current } : l)));
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
    // optimistic remove
    setListings(prev => prev.filter(l => l.id !== id));
    const { error } = await supabase.from("discs").delete().eq("id", id);
    if (error) {
      alert("Failed to delete: " + error.message);
      setListings(prev); // revert
    }
  }

  if (!ready) {
    return (
      <main className="wrap">
        <Head>
          <title>My Listings — Parked Plastic</title>
          <meta name="robots" content="noindex" />
        </Head>
        <p className="center muted">Checking session…</p>
        <style jsx>{`
          .wrap { max-width: 1100px; margin: 32px auto; padding: 0 16px; }
          .center { text-align: center; margin-top: 40px; }
          .muted { color: #3A3A3A; opacity: .85; }
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

      <style jsx>{styles}</style>

      <main className="wrap">
        <div className="titleRow">
          <h1>My Listings</h1>
          <Link href="/create-listing" className="btn btn-primary">Post a Disc</Link>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="statusTabs" role="tablist" aria-label="Filter listings by status">
            <button
              role="tab"
              aria-selected={statusFilter === "all"}
              className={`tab ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All <span className="chip">{listings.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={statusFilter === "active"}
              className={`tab ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Active <span className="chip">{activeCount}</span>
            </button>
            <button
              role="tab"
              aria-selected={statusFilter === "sold"}
              className={`tab ${statusFilter === "sold" ? "active" : ""}`}
              onClick={() => setStatusFilter("sold")}
            >
              Sold <span className="chip">{soldCount}</span>
            </button>
          </div>
        </div>

        {/* Status / errors */}
        <div aria-live="polite" aria-atomic="true" className="statusRegion">
          {errorMsg && <div className="error">{errorMsg}</div>}
          {loading && <div className="info">Loading your listings…</div>}
        </div>

        {/* Grid */}
        {!loading && listings.length === 0 ? (
          <div className="empty">
            You don’t have any listings yet.
            <div className="emptyActions">
              <Link href="/create-listing" className="btn btn-primary">Post a Disc</Link>
            </div>
          </div>
        ) : (
          <div className="grid" role="list">
            {listings.map((l) => (
              <article key={l.id} className={`card ${l.is_sold ? "sold" : ""}`} role="listitem">
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
                  {l.is_sold && <div className="soldBanner" aria-label="Sold">SOLD</div>}
                </div>

                <div className="content">
                  <h3 className="title">{l.title}</h3>
                  <div className="meta">
                    {(l.brand || "—")}{l.mold ? ` • ${l.mold}` : ""}{l.weight ? ` • ${l.weight} g` : ""}
                  </div>
                  {l.price != null && <div className="price">${Number(l.price).toFixed(2)}</div>}

                  <div className="row">
                    <Link href={`/listings/${l.id}`} className="btn btn-outline" aria-label={`View ${l.title}`}>View</Link>
                    <Link href={`/listings/${l.id}/edit`} className="btn btn-outline" aria-label={`Edit ${l.title}`}>Edit</Link>
                    <button
                      className="btn btn-primary"
                      onClick={() => toggleSold(l.id, !!l.is_sold)}
                      aria-pressed={l.is_sold}
                    >
                      {l.is_sold ? "Mark Active" : "Mark Sold"}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => deleteListing(l.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

/* ---- Styled-JSX: brand tokens + mobile-first ---- */
const styles = `
  :root {
    --storm: #141B4D;     /* Primary Dark */
    --teal: #279989;      /* Primary Accent */
    --teal-dark: #1E7A6F;
    --sea: #F8F7EC;       /* Page background */
    --wave: #D6D2C4;      /* Secondary BG (unused here) */
    --char: #3A3A3A;      /* Neutral Text */
    --cloud: #E9E9E9;     /* Borders */
    --tint: #ECF6F4;      /* Accent focus glow */
    --coral: #E86A5E;     /* Attention */
  }

  .wrap { max-width: 1100px; margin: 24px auto 80px; padding: 0 12px; background: var(--sea); }

  .titleRow {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 12px;
  }
  h1 {
    font-family: 'Poppins', sans-serif; font-weight: 600; letter-spacing: .5px;
    color: var(--storm); margin: 0; font-size: 1.6rem;
  }

  .toolbar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 8px; flex-wrap: wrap;
  }

  .statusTabs { display: flex; gap: 8px; flex-wrap: wrap; }
  .tab {
    border: 2px solid var(--storm);
    background: #fff;
    color: var(--storm);
    border-radius: 8px;
    padding: 8px 12px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 8px;
  }
  .tab:focus { outline: none; box-shadow: 0 0 0 4px var(--tint); }
  .tab.active { background: var(--storm); color: #fff; }
  .chip {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 22px; height: 22px; padding: 0 6px;
    border-radius: 999px;
    background: var(--cloud);
    color: var(--storm); font-weight: 700; font-size: .85rem;
  }
  .tab.active .chip { background: rgba(255,255,255,0.2); color: #fff; }

  .statusRegion { min-height: 22px; margin: 8px 0; }
  .error, .info {
    border-radius: 10px; padding: 10px 12px; font-size: .95rem; margin: 8px 0;
  }
  .error { background: #fff5f4; border: 1px solid #ffd9d5; color: #8c2f28; }
  .info { background: #f4fff9; border: 1px solid #d1f5e5; color: #1a6a58; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .card {
    position: relative;
    background: #fff;
    border: 1px solid var(--cloud);
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .img-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: var(--cloud);
  }
  .img { /* next/image gets inline style for object-fit */ }
  .placeholder { width: 100%; height: 100%; }

  /* SOLD banner (soft glassy) */
  .sold .img { filter: grayscale(1) brightness(0.82) contrast(1.1); opacity: 0.9; }
  .sold .img-wrap::after {
    content:""; position:absolute; inset:0;
    background: radial-gradient(transparent, rgba(20,27,77,0.22));
    pointer-events:none;
  }
  .soldBanner {
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    padding: 10px 18px;
    border-radius: 14px;
    font-family: 'Poppins', sans-serif;
    font-weight: 800;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: #fff;
    background: rgba(20,27,77,0.88);
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 10px 24px rgba(20,27,77,0.25);
    backdrop-filter: blur(2px);
    z-index: 2;
  }

  .content { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
  .title { font-family: 'Poppins', sans-serif; font-weight: 600; color: var(--storm); margin: 0; font-size: 1.05rem; }
  .meta { font-size: .9rem; color: var(--char); }
  .price { font-weight: 700; color: var(--storm); }

  .row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
  .btn {
    border: none; border-radius: 8px; padding: 10px 12px;
    font-weight: 700; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .btn:focus { outline: none; box-shadow: 0 0 0 4px var(--tint); }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { background: var(--teal-dark); }
  .btn-outline { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
  .btn-outline:hover { background: var(--storm); color: #fff; }

  .empty {
    text-align: center; color: var(--char); padding: 24px;
    border: 1px dashed var(--cloud); border-radius: 12px; background: #FDFDFB;
  }
  .emptyActions { margin-top: 12px; display: flex; justify-content: center; }

  @media (min-width: 768px) {
    h1 { font-size: 2rem; }
    .wrap { margin: 32px auto 80px; padding: 0 16px; }
  }
`;
