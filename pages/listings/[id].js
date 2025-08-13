// pages/listings/[id].js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import ChatWindow from "@/components/ChatWindow";

export default function ListingDetail() {
  const router = useRouter();
  const { id, openChat } = router.query;

  const [disc, setDisc] = useState(null);
  const [seller, setSeller] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [mainIdx, setMainIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data: d, error } = await supabase.from("discs").select("*").eq("id", id).single();
        if (error) throw error;
        if (!active) return;
        setDisc(d || null);

        if (d?.owner) {
          const { data: p } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", d.owner)
            .single();
          if (active) setSeller(p || { id: d.owner, full_name: null, avatar_url: null });
        }

        const { data: sess } = await supabase.auth.getSession();
        if (active) setCurrentUser(sess?.session?.user ?? null);
        if (active && openChat && (sess?.session?.user?.id ?? null) && d?.owner) setShowChat(true);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, openChat]);

  const priceText = useMemo(() => {
    if (disc?.price == null) return "Contact";
    const n = Number(disc.price);
    return Number.isFinite(n) ? `$${n.toFixed(2)}` : "Contact";
  }, [disc?.price]);

  const imgs = Array.isArray(disc?.image_urls) ? disc.image_urls.filter(Boolean) : [];
  const mainImg = imgs[mainIdx] || null;

  const handleMessageClick = () => {
    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent(`/listings/${id}?openChat=1`)}`);
      return;
    }
    if (currentUser.id === disc.owner) return;
    setShowChat(true);
    setTimeout(() => document.getElementById("chat-panel")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 1100, margin: "32px auto", padding: "0 16px" }}>
        <p style={{ textAlign: "center", marginTop: 40 }}>Loading listing…</p>
      </main>
    );
  }
  if (!disc) {
    return (
      <main style={{ maxWidth: 1100, margin: "32px auto", padding: "0 16px" }}>
        <p style={{ textAlign: "center", marginTop: 40 }}>Listing not found.</p>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{disc.title ? `${disc.title} — Parked Plastic` : "Listing — Parked Plastic"}</title>
        <meta name="description" content={disc.description || `${disc.brand || ""} ${disc.mold || ""} disc`} />
      </Head>

      <style jsx>{`
        main { max-width: 1100px; margin: 32px auto 80px; padding: 0 16px; }
        .top { display:grid; grid-template-columns: 1.2fr 1fr; gap: 24px; }

        .gallery { background:#fff; border:1px solid #E9E9E9; border-radius:12px; padding: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; }
        .mainwrap { position: relative; overflow:hidden; }
        .mainimg { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px; background:#E9E9E9; transition: transform .25s ease, box-shadow .25s ease, filter .2s ease, opacity .2s ease; }
        .mainimg:hover { transform: scale(1.02); box-shadow: 0 8px 22px rgba(0,0,0,0.12); }
        .sold .mainimg { filter: grayscale(1) brightness(0.82) contrast(1.1); opacity: 0.8; }
        .sold .mainwrap::after { content:""; position:absolute; inset:0; background: radial-gradient(transparent, rgba(20,27,77,0.22)); pointer-events:none; }

        /* ★ Soft inside SOLD banner */
        .soldBanner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          padding: 12px 22px;
          border-radius: 16px;
          font-family: 'Poppins', sans-serif;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #fff;
          background: rgba(20,27,77,0.9);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 12px 28px rgba(20,27,77,0.25);
          backdrop-filter: blur(2px);
          z-index: 2;
        }

        .thumbs { display:flex; gap:10px; margin-top:10px; overflow-x:auto; padding-bottom: 4px; }
        .thumb { width: 88px; height: 66px; border-radius: 8px; object-fit: cover; border: 2px solid transparent; cursor: pointer; background:#E9E9E9; flex: 0 0 auto; }
        .thumb.active { border-color: #279989; }
        .thumb:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-1px); }

        .panel { background:#fff; border:1px solid #E9E9E9; border-radius:12px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .title { font-family: 'Poppins', sans-serif; color:#141B4D; margin: 0 0 6px; font-size: 1.8rem; letter-spacing: .5px; }
        .meta { color:#3A3A3A; margin-bottom: 10px; }
        .pricebadge { display:inline-block; background:#E86A5E; color:#fff; border-radius: 8px; padding: 8px 12px; font-weight: 700; box-shadow: 0 4px 10px rgba(232,106,94,0.35); }
        .condition { display:inline-block; margin-left: 10px; background:#D6D2C4; color:#141B4D; border-radius: 8px; padding: 6px 10px; font-weight: 600; }
        .specs { display:grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin: 16px 0 8px; }
        .spec { background:#F8F7EC; border:1px solid #E9E9E9; border-radius: 10px; padding: 10px 12px; }
        .spec label { display:block; font-size: 12px; color:#141B4D; font-weight: 700; font-family:'Poppins', sans-serif; margin-bottom: 4px; }
        .spec div { font-size: 15px; color:#3A3A3A; }

        .seller { display:flex; align-items:center; gap:12px; margin-top: 14px; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(0,0,0,0.05); background:#D6D2C4; }
        .sellername { font-weight: 700; color:#141B4D; }
        .ctaRow { display:flex; gap:12px; margin-top: 16px; }
        .btn { border:none; border-radius:8px; padding: 10px 16px; font-weight:700; cursor:pointer; }
        .btn-primary { background:#279989; color:#fff; }
        .btn-primary:hover { background:#1E7A6F; }
        .btn-secondary { background:#fff; color:#141B4D; border:2px solid #141B4D; }
        .btn-secondary:hover { background:#141B4D; color:#fff; }

        .desc { background:#fff; border:1px solid #E9E9E9; border-radius:12px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-top: 24px; }
        .desctitle { font-family:'Poppins', sans-serif; color:#141B4D; margin:0 0 10px; }
        .desc p { margin: 0; color:#3A3A3A; }

        .chatwrap { background:#fff; border:1px solid #E9E9E9; border-radius:12px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-top: 24px; }
        .muted { color:#666; font-size: 14px; }

        @media (max-width: 980px) { .top { grid-template-columns: 1fr; } }
        @media (max-width: 540px) { .soldBanner{ letter-spacing:.16em; padding:10px 16px; } }
      `}</style>

      <main>
        <section className="top">
          <div className={`gallery ${disc.is_sold ? "sold" : ""}`}>
            <div className="mainwrap">
              {mainImg ? (
                <img className="mainimg" src={mainImg} alt={disc.title} />
              ) : (
                <div className="mainimg" aria-label="No image available" />
              )}
              {disc.is_sold && <div className="soldBanner" aria-label="Sold">SOLD</div>}
            </div>
            {imgs.length > 1 && (
              <div className="thumbs">
                {imgs.map((url, i) => (
                  <img
                    key={url}
                    src={url}
                    alt={`Thumbnail ${i + 1}`}
                    className={`thumb ${i === mainIdx ? "active" : ""}`}
                    onClick={() => setMainIdx(i)}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="panel">
            <h1 className="title">{disc.title}</h1>
            <div className="meta">
              {(disc.brand || "—")}{disc.mold ? ` • ${disc.mold}` : ""}{disc.plastic ? ` • ${disc.plastic}` : ""}
            </div>
            <div>
              <span className="pricebadge">{priceText}</span>
              {disc.condition && <span className="condition">{disc.condition}</span>}
            </div>

            <div className="specs">
              <div className="spec"><label>Brand</label><div>{disc.brand || "—"}</div></div>
              <div className="spec"><label>Mold</label><div>{disc.mold || "—"}</div></div>
              <div className="spec"><label>Plastic</label><div>{disc.plastic || "—"}</div></div>
              <div className="spec"><label>Weight</label>
              <div>{disc.weight != null ? `${disc.weight} g` : "N/A"}</div></div>
              <div className="spec"><label>Condition</label><div>{disc.condition || "—"}</div></div>
              <div className="spec"><label>City</label><div>{disc.city || "Local"}</div></div>
            </div>

            <div className="seller">
              {seller?.avatar_url ? <img className="avatar" src={seller.avatar_url} alt={seller.full_name || "Seller"} /> : <div className="avatar" />}
              <div>
                <div className="sellername">{seller?.full_name || "Seller"}</div>
                <div className="muted">Posted {new Date(disc.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="ctaRow">
              {currentUser?.id === disc.owner ? (
                <button className="btn btn-secondary" onClick={() => router.push("/account")}>Manage listing</button>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={handleMessageClick} disabled={disc.is_sold}>
                    {disc.is_sold ? "Sold — messaging disabled" : "Message seller"}
                  </button>
                  <button className="btn btn-secondary" onClick={() => router.push("/")}>Back to listings</button>
                </>
              )}
            </div>
          </aside>
        </section>

        {(disc.description && disc.description.trim()) ? (
          <section className="desc" aria-label="Description">
            <h3 className="desctitle">Description</h3>
            <p>{disc.description}</p>
          </section>
        ) : null}

        <section className="chatwrap" id="chat-panel" aria-label="Chat with seller">
          {currentUser ? (
            currentUser.id === disc.owner ? (
              <p className="muted">This is your listing.</p>
            ) : (
              <>
                {showChat ? (
                  <ChatWindow currentUserId={currentUser.id} otherUserId={disc.owner} listingId={id} />
                ) : (
                  <>
                    <p className="muted" style={{ marginBottom: 12 }}>
                      Want to ask about ink, dome, or trades? Start a conversation with the seller.
                    </p>
                    <button className="btn btn-primary" onClick={handleMessageClick} disabled={disc.is_sold}>
                      {disc.is_sold ? "Sold — messaging disabled" : "Start conversation"}
                    </button>
                  </>
                )}
              </>
            )
          ) : (
            <>
              <p className="muted" style={{ marginBottom: 12 }}>Sign in to message the seller.</p>
              <button
                className="btn btn-primary"
                onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/listings/${id}?openChat=1`)}`)}
              >
                Sign in with Google
              </button>
            </>
          )}
        </section>
      </main>
    </>
  );
}
