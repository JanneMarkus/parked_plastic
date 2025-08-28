// pages/listings/[id].js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import ContactSeller from "@/components/ContactSeller";
import PlaceholderDisc from "@/components/PlaceholderDisc";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const supabase = getSupabaseBrowser();

export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServerClient({ req: ctx.req, res: ctx.res });
  // Require login
  const { data: { user } = {}, error } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      redirect: {
        destination: `/login?redirect=${encodeURIComponent(ctx.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  // Authenticated: pass minimal user info (used for owner UI)
  return {
    props: {
      initialUser: { id: user.id, email: user.email ?? null },
    },
  };
};

export default function ListingDetail({ initialUser }) {
  const router = useRouter();
  const { id } = router.query;

  const [disc, setDisc] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [mainIdx, setMainIdx] = useState(0);

  const listingUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.origin + router.asPath;
    }
    if (process.env.NEXT_PUBLIC_SITE_URL && id) {
      const base = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
      return `${base}/listings/${id}`;
    }
    return "";
  }, [id, router.asPath]);

  const editUrl = useMemo(
    () => (id ? `/listings/${id}/edit` : "/account"),
    [id]
  );

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam / scam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportEmail, setReportEmail] = useState(""); // optional reporter email
  const [reportSending, setReportSending] = useState(false);
  const [reportStatus, setReportStatus] = useState(""); // success/error message

  // Load listing + seller profile
  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        // Listing
        const { data: d, error: dErr } = await supabase
          .from("discs")
          .select("*")
          .eq("id", id)
          .single();
        if (dErr || !d) throw dErr || new Error("Listing not found.");
        if (!active) return;
        setDisc(d);

        // Seller profile (may not exist yet)
        if (d.owner) {
          const { data: p } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, public_email, phone, messenger")
            .eq("id", d.owner)
            .maybeSingle();
          if (active) {
            setSeller(
              p || {
                id: d.owner,
                full_name: null,
                avatar_url: null,
                public_email: null,
                phone: null,
                messenger: null,
              }
            );
          }
        }
      } catch (e) {
        console.error(e);
        if (active) setErrorMsg("This listing could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const isOwner = useMemo(
    () => Boolean(initialUser?.id && disc?.owner && initialUser.id === disc.owner),
    [initialUser?.id, disc?.owner]
  );

  const priceText = useMemo(() => {
    if (disc?.price == null) return "Contact";
    const n = Number(disc.price);
    if (!Number.isFinite(n)) return "Contact";
    try {
      return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
      }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  }, [disc?.price]);

  const imgs = Array.isArray(disc?.image_urls)
    ? disc.image_urls.filter(Boolean)
    : [];
  const mainImg = imgs[mainIdx] || null;
  const flightLine =
    disc &&
    disc.speed != null &&
    disc.glide != null &&
    disc.turn != null &&
    disc.fade != null
      ? `${disc.speed} / ${disc.glide} / ${disc.turn} / ${disc.fade}`
      : null;

  // Loading / error guards
  if (loading) {
    return (
      <main className="wrap">
        <Head>
          <title>Loading… — Parked Plastic</title>
          <meta name="robots" content="noindex" />
        </Head>
        <p className="center muted">Loading listing…</p>
        <style jsx>{`
          .wrap {
            max-width: 1100px;
            margin: 32px auto;
            padding: 0 16px;
          }
          .center {
            text-align: center;
            margin-top: 40px;
          }
          .muted {
            color: #3a3a3a;
            opacity: 0.85;
          }
        `}</style>
      </main>
    );
  }

  if (errorMsg || !disc) {
    return (
      <main className="wrap">
        <Head>
          <title>Listing not found — Parked Plastic</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="errorCard">
          <p className="errorMsg">{errorMsg || "Listing not found."}</p>
          <div className="errorActions">
            <Link href="/" className="btn btn-outline">
              Back to Browse
            </Link>
          </div>
        </div>
        <style jsx>{`
          .wrap {
            max-width: 1100px;
            margin: 32px auto 80px;
            padding: 0 16px;
          }
          .errorCard {
            background: #fff;
            border: 1px solid #e9e9e9;
            border-radius: 14px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            padding: 22px;
            text-align: center;
          }
          .errorMsg {
            color: #8c2f28;
            margin: 0 0 10px;
          }
          .btn {
            border: 2px solid #141b4d;
            color: #141b4d;
            padding: 10px 14px;
            border-radius: 8px;
            font-weight: 700;
            text-decoration: none;
          }
          .btn:hover {
            background: #141b4d;
            color: #fff;
          }
          .btn-outline {
            background: #fff;
          }
        `}</style>
      </main>
    );
  }

  async function submitReport(e) {
    e.preventDefault();
    if (!id) return;
    setReportSending(true);
    setReportStatus("");

    try {
      // Try to persist to Supabase too (optional)
      try {
        await supabase.from("listing_reports").insert({
          listing_id: id,
          reason: reportReason,
          details: reportDetails || null,
          reporter_email: reportEmail || null,
        });
      } catch (_) {
        // non-fatal if the table doesn't exist
      }

      const res = await fetch("/api/report-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: id,
          listingTitle: disc?.title || "Disc listing",
          listingUrl,
          reason: reportReason,
          details: reportDetails,
          reporterEmail: reportEmail,
        }),
      });

      if (!res.ok) throw new Error("Failed to send report.");

      setReportStatus("Thanks — your report was sent.");
      setReportDetails("");
      setReportEmail("");
      setReportReason("Spam / scam");
      setTimeout(() => setReportOpen(false), 1200);
    } catch (err) {
      console.error(err);
      setReportStatus("Could not send the report. Please try again.");
    } finally {
      setReportSending(false);
    }
  }

  const metaTitle = disc.title
    ? `${disc.title} — Parked Plastic`
    : "Listing — Parked Plastic";
  const metaDesc = (() => {
    const parts = [
      disc.brand,
      disc.mold,
      disc.weight != null ? `${disc.weight}g` : null,
      disc.condition,
      disc.city,
    ].filter(Boolean);
    const prefix = parts.length ? `${parts.join(" • ")} — ` : "";
    return (disc.description || "").trim() || `${prefix}Disc listing.`;
  })();

  const status = disc.status || "active";
  const isSold = status === "sold";
  const isPending = status === "pending";

  return (
    <main className="wrap">
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc.slice(0, 160)} />
        {/* Basic OG tags (CSR for now) */}
        <meta property="og:title" content={disc.title} />
        {imgs[0] && <meta property="og:image" content={imgs[0]} />}
        <meta property="og:description" content={metaDesc.slice(0, 200)} />
      </Head>

      <style jsx>{styles}</style>

      {/* Top breadcrumb / optional owner action */}
      <div className="topbar">
        <Link href="/" className="crumb" aria-label="Back to Browse">
          ← Back to Browse
        </Link>
        {isOwner && (
          <Link href={"/account"} className="btn btn-outline">
            Manage my listings
          </Link>
        )}
      </div>

      <section className="top">
        {/* Gallery */}
        <div className={`gallery ${isSold ? "sold" : isPending ? "pending" : ""}`}>
          <div className="hero">
            {mainImg ? (
              <Image
                key={mainImg}
                src={mainImg}
                alt={disc.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1100px) 60vw, 700px"
                priority={false}
                style={{ objectFit: "cover" }}
              />
            ) : (
              <PlaceholderDisc className="hero placeholder" />
            )}
            {isSold && (
              <div className="soldBanner" aria-label="Sold">
                SOLD
              </div>
            )}
            {isPending && (
              <div className="pendingBanner" aria-label="Pending">
                SALE PENDING
              </div>
            )}
          </div>

          {imgs.length > 1 && (
            <div className="thumbs" role="tablist" aria-label="Select image">
              {imgs.map((url, i) => (
                <button
                  key={url + i}
                  role="tab"
                  aria-selected={i === mainIdx}
                  className={`thumb ${i === mainIdx ? "active" : ""}`}
                  onClick={() => setMainIdx(i)}
                >
                  <Image
                    src={url}
                    alt={`Thumbnail ${i + 1}`}
                    width={112}
                    height={84}
                    sizes="112px"
                    style={{ objectFit: "cover" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details panel */}
        <aside className="panel">
          <h1 className="title">{disc.title}</h1>
          <div className="meta"></div>

          <div className="priceRow">
            <span className="priceText">{priceText}</span>
            {disc.condition && (
              <span className="condition">{disc.condition}</span>
            )}
          </div>

          <div className="specs">
            <div className="spec">
              <label>Brand</label>
              <div>{disc.brand || "—"}</div>
            </div>
            <div className="spec">
              <label>Mold</label>
              <div>{disc.mold || "—"}</div>
            </div>
            <div className="spec">
              <label>Plastic</label>
              <div>{disc.plastic || "—"}</div>
            </div>
            {flightLine && (
              <div className="spec">
                <label>Flight Numbers</label>
                <div aria-label="Flight numbers">{flightLine}</div>
              </div>
            )}
            <div className="spec">
              <label>Weight</label>
              <div>{disc.weight != null ? `${disc.weight} g` : "N/A"}</div>
            </div>
            <div className="spec">
              <label>
                Condition (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://www.dgcoursereview.com/threads/understanding-the-sleepy-scale-with-pics-and-check-list.89392/"
                >
                  Sleepy Scale
                </a>
                )
              </label>
              <div>{disc.condition || "—"}</div>
            </div>
            <div className="spec">
              <label>Glow Disc?</label>
              <div>
                {disc.is_glow == true
                  ? "Yes"
                  : disc.is_glow == false
                  ? "No"
                  : "Not Specified"}
              </div>
            </div>
            <div className="spec">
              <label>Inked?</label>
              <div>
                {disc.is_inked == true
                  ? "Yes"
                  : disc.is_inked == false
                  ? "No"
                  : "Not Specified"}
              </div>
            </div>
          </div>

          <div className="seller">
            {seller?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="avatar"
                src={seller.avatar_url}
                alt={seller.full_name || "Seller"}
              />
            ) : (
              <div className="avatar" aria-hidden="true" />
            )}
            <div>
              <div className="sellername">{seller?.full_name || "Seller"}</div>
              <div className="muted">
                Posted {new Date(disc.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="ctaRow">
            {isOwner ? (
              <Link className="btn btn-secondary" href={editUrl}>
                Manage this listing
              </Link>
            ) : (
              <>
                {!isSold ? (
                  <a
                    className="btn btn-primary"
                    href="#contact"
                    onClick={(e) => {
                      const el = document.getElementById("contact");
                      if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    {isPending ? "Contact seller (pending)" : "Contact seller"}
                  </a>
                ) : (
                  <button className="btn btn-primary" disabled>
                    Sold — contact unavailable
                  </button>
                )}
                <Link className="btn btn-secondary" href="/">
                  Back to listings
                </Link>
                <button
                  type="button"
                  className="btn btn-coral"
                  onClick={() => setReportOpen(true)}
                >
                  Report listing
                </button>
              </>
            )}
          </div>
        </aside>
      </section>

      {disc.description && disc.description.trim() ? (
        <section className="desc" aria-label="Description">
          <h3 className="desctitle">Description</h3>
          <p>{disc.description}</p>
        </section>
      ) : null}

      {!isOwner && status !== "sold" && (
        <section className="chatwrap" aria-label="Contact" id="contact">
          <ContactSeller
            listingId={disc.id}
            listingTitle={disc.title || "Disc listing"}
            listingUrl={listingUrl}
            allowSMS={true}
            showCopy={true}
            size="md"
          />
        </section>
      )}
      {reportOpen && (
        <div
          className="modalOverlay"
          role="dialog"
          id="report-dialog"
          aria-modal="true"
          aria-labelledby="report-title"
        >
          <div className="modalCard">
            <div className="modalHead">
              <h3 id="report-title">Report listing</h3>
              <button
                className="x"
                onClick={() => setReportOpen(false)}
                aria-label="Close report form"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitReport} className="modalBody">
              <div className="field">
                <label htmlFor="reason">Reason</label>
                <select
                  id="reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  <option>Spam / scam</option>
                  <option>Inappropriate content</option>
                  <option>Incorrect / misleading</option>
                  <option>Counterfeit / prohibited</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="details">
                  Details <span className="hint">(optional)</span>
                </label>
                <textarea
                  id="details"
                  rows={4}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Add any helpful info…"
                />
              </div>

              <div className="field">
                <label htmlFor="reporterEmail">
                  Your email <span className="hint">(optional)</span>
                </label>
                <input
                  id="reporterEmail"
                  type="email"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setReportOpen(false)}
                  disabled={reportSending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reportSending}
                >
                  {reportSending ? "Sending…" : "Send report"}
                </button>
              </div>

              {reportStatus && (
                <p
                  className={`status ${
                    /Thanks/.test(reportStatus) ? "ok" : "err"
                  }`}
                >
                  {reportStatus}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---- Styled-JSX: brand tokens + mobile-first ---- */
const styles = `
  :root {
    --storm: #141B4D;     /* Primary Dark */
    --teal: #279989;      /* Primary Accent */
    --teal-dark: #1E7A6F;
    --sea: #F8F7EC;       /* Page background */
    --wave: #D6D2C4;      /* Secondary BG */
    --char: #3A3A3A;      /* Neutral Text */
    --cloud: #E9E9E9;     /* Borders */
    --tint: #ECF6F4;      /* Accent focus glow */
    --coral: #E86A5E;     /* Attention */
  }

  .wrap { max-width: 1100px; margin: 24px auto 90px; padding: 0 12px; background: var(--sea); }

  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
  }

  .crumb {
    color: var(--storm); text-decoration: none; font-weight: 600;
  }
  .crumb:hover { text-decoration: underline; }

  .btn {
    border: none; border-radius: 8px; padding: 10px 16px;
    font-weight: 700; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .btn:focus { outline: none; box-shadow: 0 0 0 4px var(--tint); }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { background: var(--teal-dark); }
  .btn-primary[disabled] { opacity:.6; cursor: not-allowed; }
  .btn-secondary { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
  .btn-secondary:hover { background: var(--storm); color: #fff; }
  .btn-outline { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
  .btn-outline:hover { background: var(--storm); color: #fff; }

  .top {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* --- Report modal --- */
  .modalOverlay {
    position: fixed; inset: 0; z-index: 60;
    background: rgba(0,0,0,0.28);
    display: grid; place-items: center;
    padding: 16px;
  }
  .modalCard {
    width: 100%; max-width: 560px;
    background: #fff; border: 1px solid var(--cloud);
    border-radius: 14px; box-shadow: 0 14px 38px rgba(0,0,0,.18);
  }
  .modalHead {
    display:flex; align-items:center; justify-content:space-between;
    padding: 14px 16px; border-bottom: 1px solid var(--cloud);
  }
  .modalHead h3 {
    margin: 0; font-family: 'Poppins', sans-serif; color: var(--storm);
  }
  .modalHead .x {
    border:none; background:#fff; color: var(--storm);
    font-size: 22px; line-height: 1; cursor: pointer;
    width: 34px; height: 34px; border-radius: 8px;
  }
  .modalHead .x:hover { background: var(--tint); }

  .modalBody { padding: 14px 16px 16px; }
  .modalBody .field { margin-bottom: 12px; }
  .modalBody label {
    display:block; font-family: 'Poppins', sans-serif; font-weight: 600;
    color: var(--storm); margin-bottom: 6px;
  }
  .modalBody .hint { color: #666; font-weight: 500; margin-left: 6px; font-size: .85rem; }
  .modalBody input, .modalBody textarea, .modalBody select {
    width: 100%; box-sizing: border-box; background: #fff;
    border: 1px solid var(--cloud); border-radius: 10px;
    padding: 10px 12px; font-size: 15px; color: var(--char);
    outline: none; transition: border-color .15s, box-shadow .15s;
  }
  .modalBody input:focus, .modalBody textarea:focus, .modalBody select:focus {
    border-color: var(--teal); box-shadow: 0 0 0 4px var(--tint);
  }
  .modalBody textarea { resize: vertical; min-height: 96px; }

  .modalBody .actions {
    display:flex; justify-content:flex-end; gap: 10px; margin-top: 6px;
  }
  .btn-ghost { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
  .btn-ghost:hover { background: var(--storm); color: #fff; }

  .status { margin-top: 10px; font-size: .95rem; }
  .status.ok { color: #1a6a58; }
  .status.err { color: #8c2f28; }

  /* Gallery */
  .gallery {
    background:#fff; border:1px solid var(--cloud); border-radius:12px;
    padding: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    position: relative;
  }
  .hero {
    position: relative; width: 100%; aspect-ratio: 4 / 3;
    overflow: hidden; border-radius: 10px; background: var(--cloud);
  }
  .thumbs {
    display:flex; gap:10px; margin-top:10px; overflow-x:auto; padding-bottom: 4px;
  }
  .thumb {
    position: relative;
    width: 112px; height: 84px; border-radius: 8px; overflow: hidden;
    border: 2px solid transparent; cursor: pointer; background: var(--cloud);
    flex: 0 0 auto;
  }
  .thumb:focus { outline: none; box-shadow: 0 0 0 4px var(--tint); }
  .thumb.active { border-color: var(--teal); }

  /* SOLD/PENDING overlays */
  .sold .hero::after {
    content:""; position:absolute; inset:0;
    background: radial-gradient(transparent, rgba(20,27,77,0.22));
    pointer-events:none;
  }
  .pending .hero::after {
    content:""; position:absolute; inset:0;
    background: radial-gradient(transparent, rgba(232,176,46,0.20)); /* amber glow */
    pointer-events:none;
  }

  .soldBanner,
  .pendingBanner {
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
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 12px 28px rgba(20,27,77,0.25);
    backdrop-filter: blur(2px);
    z-index: 2;
  }
  .soldBanner {
    color: #fff;
    background: rgba(20,27,77,0.9);
  }
  .pendingBanner {
    color: #2b1c00;
    background: rgba(255,208,85,.95);
    border-color: rgba(0,0,0,0.06);
    box-shadow: 0 12px 28px rgba(232,176,46,0.35);
  }

  /* Panel / details */
  .panel {
    background:#fff; border:1px solid var(--cloud); border-radius:12px;
    padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  }
  .title {
    font-family: 'Poppins', sans-serif;
    color:#141B4D; margin: 0 0 6px; font-size: 1.6rem; letter-spacing: .5px;
  }
  .meta { color: var(--char); margin-bottom: 10px; }

  .priceRow { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
  .priceText { font-family: 'Poppins', sans-serif; font-weight: 600; color: var(--storm); font-size: 1.2rem; }
  .condition {
    display:inline-block; background: var(--wave); color: var(--storm);
    border-radius: 8px; padding: 6px 10px; font-weight: 600;
  }

  .specs {
    display:grid; grid-template-columns: 1fr 1fr;
    gap: 10px 16px; margin: 16px 0 8px;
  }
  .spec {
    background: var(--sea); border:1px solid var(--cloud);
    border-radius: 10px; padding: 10px 12px;
  }
  .spec label {
    display:block; font-size: 12px; color: var(--storm);
    font-weight: 700; font-family:'Poppins', sans-serif; margin-bottom: 4px;
  }
  .spec div { font-size: 15px; color: var(--char); }

  .seller { display:flex; align-items:center; gap:12px; margin-top: 14px; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(0,0,0,0.05); background: var(--wave); }
  .sellername { font-weight: 700; color: var(--storm); }
  .muted { color:#666; font-size: 14px; }

  .ctaRow { display:flex; gap:12px; margin-top: 16px; flex-wrap: wrap; }

  .desc {
    background:#fff; border:1px solid var(--cloud); border-radius:12px;
    padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-top: 24px;
  }
  .desctitle { font-family:'Poppins', sans-serif; color: var(--storm); margin:0 0 10px; }
  .desc p { margin: 0; color: var(--char); }

  .chatwrap {
    background:#fff; border:1px solid var(--cloud); border-radius:12px;
    padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-top: 24px;
  }

  /* Layout ≥ 980px: split columns */
  @media (min-width: 980px) {
    .top { grid-template-columns: 1.2fr 1fr; gap: 24px; }
    .title { font-size: 1.8rem; }
  }

  .img.placeholder {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  @media (min-width: 768px) {
    .wrap { margin: 32px auto 100px; padding: 0 16px; }
  }
`;
