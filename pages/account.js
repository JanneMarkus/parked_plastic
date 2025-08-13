// pages/account.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function Account() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | sold

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
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, statusFilter]);

  const activeCount = useMemo(() => listings.filter(l => !l.is_sold).length, [listings]);
  const soldCount = useMemo(() => listings.filter(l => !!l.is_sold).length, [listings]);

  async function toggleSold(id, current) {
    const { error } = await supabase.from("discs").update({ is_sold: !current }).eq("id", id);
    if (error) return alert("Failed to update: " + error.message);
    setListings(prev => prev.map(l => (l.id === id ? { ...l, is_sold: !current } : l)));
  }

  async function deleteListing(id) {
    if (!confirm("Delete this listing permanently? This cannot be undone.")) return;
    const { error } = await supabase.from("discs").delete().eq("id", id);
    if (error) return alert("Failed to delete: " + error.message);
    setListings(prev => prev.filter(l => l.id !== id));
  }

  if (!ready) return <p style={{ textAlign: "center", marginTop: 40 }}>Checking session…</p>;
  if (!user) return null;

  return (
    <>
      <style>{`
        main { max-width: 1100px; margin: 32px auto 80px; padding: 0 16px; }
        h1 { font-family:'Poppins',sans-serif; font-weight:600; letter-spacing:.5px; color:#141B4D; margin:0 0 16px; }

        .toolbar { display:flex; gap:12px; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .statusTabs { display:flex; gap:8px; flex-wrap: wrap; }
        .tab { border:2px solid #141B4D; background:#fff; color:#141B4D; border-radius:8px; padding:8px 12px; font-weight:700; cursor:pointer; }
        .tab.active { background:#141B4D; color:#fff; }

        .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px; }
        .card { position:relative; background:#fff; border:1px solid #E9E9E9; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.05); overflow:hidden; display:flex; flex-direction:column; }
        .img-wrap { position:relative; overflow:hidden; }
        .img { width:100%; aspect-ratio:4/3; object-fit:cover; background:#E9E9E9; transition: filter .2s ease, opacity .2s ease; }
        .sold .img { filter: grayscale(1) brightness(0.82) contrast(1.1); opacity: 0.8; }
        .sold .img-wrap::after { content:""; position:absolute; inset:0; background: radial-gradient(transparent, rgba(20,27,77,0.22)); pointer-events:none; }

        /* ★ Soft inside SOLD banner */
        .soldBanner {
          position: absolute;
          left: 50%;
          top: 50%;
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

        .content { padding:14px; display:flex; flex-direction:column; gap:8px; }
        .title { font-family:'Poppins',sans-serif; font-weight:600; color:#141B4D; margin:0; font-size:1.05rem; }
        .meta { font-size:.9rem; color:#3A3A3A; }
        .price { font-weight:700; color:#141B4D; }

        .row { display:flex; flex-wrap: wrap; gap:8px; margin-top:auto; }
        .btn { border:none; border-radius:8px; padding:8px 12px; font-weight:700; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
        .btn-primary { background:#279989; color:#fff; }
        .btn-primary:hover { background:#1E7A6F; }
        .btn-outline { background:#fff; color:#141B4D; border:2px solid #141B4D; }
        .btn-outline:hover { background:#141B4D; color:#fff; }

        .empty { text-align:center; color:#3A3A3A; padding:24px; border:1px dashed #E9E9E9; border-radius:12px; background:#FDFDFB; }

        @media (max-width: 540px) {
          .row { gap: 6px; }
          .btn { padding: 8px 10px; }
          .soldBanner{ letter-spacing:.14em; padding:8px 12px; }
        }
      `}</style>

      <main>
        <h1>My Listings</h1>

        <div className="toolbar">
          <div className="statusTabs" role="tablist" aria-label="Filter listings by status">
            <button role="tab" aria-selected={statusFilter === "all"} className={`tab ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
              All ({listings.length})
            </button>
            <button role="tab" aria-selected={statusFilter === "active"} className={`tab ${statusFilter === "active" ? "active" : ""}`} onClick={() => setStatusFilter("active")}>
              Active ({activeCount})
            </button>
            <button role="tab" aria-selected={statusFilter === "sold"} className={`tab ${statusFilter === "sold" ? "active" : ""}`} onClick={() => setStatusFilter("sold")}>
              Sold ({soldCount})
            </button>
          </div>

          <Link href="/create-listing" className="btn btn-primary">Post a Disc</Link>
        </div>

        {loading ? (
          <p>Loading your listings…</p>
        ) : listings.length === 0 ? (
          <div className="empty">You don’t have any listings yet.</div>
        ) : (
          <div className="grid">
            {listings.map((l) => (
              <div key={l.id} className={`card ${l.is_sold ? "sold" : ""}`}>
                <div className="img-wrap">
                  {l.image_urls?.length ? (
                    <img className="img" src={l.image_urls[0]} alt={l.title} />
                  ) : (
                    <div className="img" aria-label="No image" />
                  )}
                  {l.is_sold && <div className="soldBanner" aria-label="Sold">SOLD</div>}
                </div>

                <div className="content">
                  <h3 className="title">{l.title}</h3>
                  <div className="meta">
                    {(l.brand || "—")}{l.mold ? ` • ${l.mold}` : ""}{l.weight ? ` • ${l.weight}g` : ""}
                  </div>
                  {l.price != null && <div className="price">${Number(l.price).toFixed(2)}</div>}

                  <div className="row">
                    <Link href={`/listings/${l.id}`} className="btn btn-outline">View</Link>
                    <Link href={`/listings/${l.id}/edit`} className="btn btn-outline">Edit</Link>
                    <button className="btn btn-primary" onClick={() => toggleSold(l.id, !!l.is_sold)}>
                      {l.is_sold ? "Mark Active" : "Mark Sold"}
                    </button>
                    <button className="btn btn-outline" onClick={() => deleteListing(l.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
