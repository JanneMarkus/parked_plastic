import { useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import ContactSeller from "@/components/ContactSeller";
import PlaceholderDisc from "@/components/PlaceholderDisc";
import { createSupabaseServerClient } from "@/utils/supabase/server";

// Locale/timezone-stable formatter (prevents SSR/CSR drift)
function formatDatePretty(input) {
  try {
    const d = input instanceof Date ? input : new Date(input);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  } catch {
    return "";
  }
}

// 3-color map: Green 7–10, Yellow 5–6, Red ≤4
function conditionClass(cond) {
  const n = Number(cond);
  if (!Number.isFinite(n)) return "";
  if (n >= 7) return "cond--good";   // Green
  if (n >= 5) return "cond--warn";   // Yellow
  return "cond--bad";                // Red
}

export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServerClient({ req: ctx.req, res: ctx.res });
  const id = ctx.params?.id;

  // Optional viewer (don’t redirect if not signed in)
  const { data: { user } = {} } = await supabase.auth.getUser();

  // Attempt to read the disc. RLS controls visibility:
  // - Public can read active/pending.
  // - Owners can read their own rows regardless of status.
  const { data: disc, error } = await supabase
    .from("discs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !disc) {
    return { notFound: true };
  }

  // Minimal public seller profile (if any)
  let seller = null;
  if (disc.owner) {
    const { data: p } = await supabase
      .from("profiles")
      .select("id, full_name, public_email, phone, messenger, home_course")
      .eq("id", disc.owner)
      .maybeSingle();
    seller = p || null;
  }

  return {
    props: {
      initialUser: user ? { id: user.id, email: user.email ?? null } : null,
      initialDisc: disc,
      initialSeller: seller,
    },
  };
}

export default function ListingDetail({
  initialUser,
  initialDisc,
  initialSeller,
}) {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;

  // State from SSR (no client DB fetch)
  const [disc] = useState(initialDisc || null);
  const [seller] = useState(initialSeller || null);
  const [errorMsg] = useState("");
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
  const isOwner = useMemo(
    () =>
      Boolean(initialUser?.id && disc?.owner && initialUser.id === disc.owner),
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

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam / scam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportEmail, setReportEmail] = useState(""); // optional reporter email
  const [reportSending, setReportSending] = useState(false);
  const [reportStatus, setReportStatus] = useState(""); // success/error

  async function submitReport(e) {
    e.preventDefault();
    if (!id) return;
    setReportSending(true);
    setReportStatus("");

    try {
      // Server-backed report: rely on your API route only
      const res = await fetch("/api/report-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          listingId: id,
          listingTitle: disc?.title || "Disc listing",
          listingUrl,
          reason: reportReason,
          details: reportDetails || "",
          reporterEmail: reportEmail || "",
        }),
      });

      if (!res.ok) throw new Error("Failed to send report.");
      setReportStatus("Thanks — your report was sent.");
      toast.success("Thanks — your report was sent.");
      setReportDetails("");
      setReportEmail("");
      setReportReason("Spam / scam");
      setTimeout(() => setReportOpen(false), 1200);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setReportStatus("Could not send the report. Please try again.");
      toast.error("Could not send the report. Please try again.");
    } finally {
      setReportSending(false);
    }
  }

  if (!disc) {
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
        <div
          className={`gallery ${isSold ? "sold" : isPending ? "pending" : ""}`}
        >
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
              <span
                className={`condition ${conditionClass(disc.condition)}`}
                aria-label={`Condition ${disc.condition}/10`}
                title={`Condition ${disc.condition}/10`}
              >
                {disc.condition}/10
              </span>
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
            <div className="sellername">
              {seller?.id ? (
                <Link
                  href={`/?seller=${seller.id}`}
                  title="View this seller's listings"
                >
                  {seller.full_name || "Seller"}
                </Link>
              ) : (
                seller?.full_name || "Seller"
              )}
            </div>
            <div className="muted">
              Posted {formatDatePretty(disc.created_at)}
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
                      if (!el) return;
                      e.preventDefault();
                      // Center it and always draw attention
                      el.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      // Restart highlight animation
                      el.classList.remove("is-highlight");
                      void el.offsetWidth; // reflow to restart animation
                      el.classList.add("is-highlight");
                      // Clean up the class after the animation ends
                      setTimeout(
                        () => el.classList.remove("is-highlight"),
                        1200
                      );
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
            homeCourse={seller?.home_course || null}
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

  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
  .crumb { color: var(--storm); text-decoration: none; font-weight: 600; }
  .crumb:hover { text-decoration: underline; }

  .btn { border: none; border-radius: 8px; padding: 10px 16px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
  .btn:focus { outline: none; box-shadow: 0 0 0 4px var(--tint); }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { background: var(--teal-dark); }
  .btn-primary[disabled] { opacity:.6; cursor: not-allowed; }
  .btn-secondary { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
  .btn-secondary:hover { background: var(--storm); color: #fff; }
  .btn-outline { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
  .btn-outline:hover { background: var(--storm); color: #fff; }

  .top { display: grid; grid-template-columns: 1fr; gap: 16px; }

  /* --- Report modal --- */
  .modalOverlay { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.28); display: grid; place-items: center; padding: 16px; }
  .modalCard { width: 100%; max-width: 560px; background: #fff; border: 1px solid var(--cloud); border-radius: 14px; box-shadow: 0 14px 38px rgba(0,0,0,.18); }
  .modalHead { display:flex; align-items:center; justify-content:space-between; padding: 14px 16px; border-bottom: 1px solid var(--cloud); }
  .modalHead h3 { margin: 0; font-family: 'Poppins', sans-serif; color: var(--storm); }
  .modalHead .x { border:none; background:#fff; color: var(--storm); font-size: 22px; line-height: 1; cursor: pointer; width: 34px; height: 34px; border-radius: 8px; }
  .modalHead .x:hover { background: var(--tint); }

  .modalBody { padding: 14px 16px 16px; }
  .modalBody .field { margin-bottom: 12px; }
  .modalBody label { display:block; font-family: 'Poppins', sans-serif; font-weight: 600; color: var(--storm); margin-bottom: 6px; }
  .modalBody .hint { color: #666; font-weight: 500; margin-left: 6px; font-size: .85rem; }
  .modalBody input, .modalBody textarea, .modalBody select { width: 100%; box-sizing: border-box; background: #fff; border: 1px solid var(--cloud); border-radius: 10px; padding: 10px 12px; font-size: 15px; color: var(--char); outline: none; transition: border-color .15s, box-shadow .15s; }
  .modalBody input:focus, .modalBody textarea:focus, .modalBody select:focus { border-color: var(--teal); box-shadow: 0 0 0 4px var(--tint); }
  .modalBody textarea { resize: vertical; min-height: 96px; }

  .modalBody .actions { display:flex; justify-content:flex-end; gap: 10px; margin-top: 6px; }
  .btn-ghost { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
  .btn-ghost:hover { background: var(--storm); color: #fff; }

  .status { margin-top: 10px; font-size: .95rem; }
  .status.ok { color: #1a6a58; }
  .status.err { color: #8c2f28; }

  /* Gallery */
  .gallery { background:#fff; border:1px solid var(--cloud); border-radius:12px; padding: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; }
  .hero { position: relative; width: 100%; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 10px; background: var(--cloud); }
  .thumbs { display:flex; gap:10px; margin-top:10px; overflow-x:auto; padding-bottom: 4px; }
  .thumb { position: relative; width: 112px; height: 84px; border-radius: 8px; overflow: hidden; border: 2px solid transparent; cursor: pointer; background: var(--cloud); flex: 0 0 auto; }
  .thumb:focus { outline: none; box-shadow: 0 0 0 4px var(--tint); }
  .thumb.active { border-color: var(--teal); }

  /* SOLD/PENDING overlays */
  .sold .hero::after { content:""; position:absolute; inset:0; background: radial-gradient(transparent, rgba(20,27,77,0.22)); pointer-events:none; }
  .pending .hero::after { content:""; position:absolute; inset:0; background: radial-gradient(transparent, rgba(232,176,46,0.20)); pointer-events:none; }

  .soldBanner,
  .pendingBanner {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    padding: 12px 22px; border-radius: 16px; font-family: 'Poppins', sans-serif;
    font-weight: 800; letter-spacing: .2em; text-transform: uppercase;
    border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 12px 28px rgba(20,27,77,0.25);
    backdrop-filter: blur(2px); z-index: 2;
  }
  .soldBanner { color: #fff; background: rgba(20,27,77,0.9); }
  .pendingBanner { color: #fff; background: rgba(20,27,77,0.9); border-color: rgba(0,0,0,0.06); box-shadow: 0 12px 28px rgba(232,176,46,0.35); }

  /* Panel / details */
  .panel { background:#fff; border:1px solid var(--cloud); border-radius:12px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
  .title { font-family: 'Poppins', sans-serif; color:#141B4D; margin: 0 0 6px; font-size: 1.6rem; letter-spacing: .5px; }
  .meta { color: var(--char); margin-bottom: 10px; }

  .priceRow { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
  .priceText { font-family: 'Poppins', sans-serif; font-weight: 600; color: var(--storm); font-size: 1.2rem; }

  /* Condition pill (3-color) */
  .condition {
    display: inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    font-weight: 800;
    font-size: .95rem;
    letter-spacing: .2px;
    color: #fff;
    box-shadow: 0 2px 10px rgba(0,0,0,.06);
    border: 1px solid rgba(0,0,0,0.08);
  }
  .condition.cond--good { background: #2e7d32; color: #fff; }   /* 7–10 */
  .condition.cond--warn { background: #f6c445; color: #3A3A3A; }/* 5–6  */
  .condition.cond--bad  { background: #d64545; color: #fff; }   /* ≤4   */

  .specs { display:grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin: 16px 0 8px; }
  .spec { background: var(--sea); border:1px solid var(--cloud); border-radius: 10px; padding: 10px 12px; }
  .spec label { display:block; font-size: 12px; color: var(--storm); font-weight: 700; font-family:'Poppins', sans-serif; margin-bottom: 4px; }
  .spec div { font-size: 15px; color: var(--char); }

  .seller { display:flex; flex-direction:column; gap:2px; margin-top: 14px; }
  .sellername { font-weight: 700; color: var(--storm); }
  .muted { color:#666; font-size: 14px; }

  .ctaRow { display:flex; gap:12px; margin-top: 16px; flex-wrap: wrap; }

  .desc { background:#fff; border:1px solid var(--cloud); border-radius:12px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-top: 24px; }
  .desctitle { font-family:'Poppins', sans-serif; color: var(--storm); margin:0 0 10px; }
  .desc p { margin: 0; color: var(--char); }

  .chatwrap { background:#fff; border:1px solid var(--cloud); border-radius:12px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-top: 24px; }
  /* Attention pulse when user clicks "Contact seller" */
  .chatwrap.is-highlight { animation: contactGlow 1.2s ease-out; }
  @keyframes contactGlow {
    0%   { box-shadow: 0 0 0 0 rgba(39,153,137,0.00), 0 0 0 0 rgba(39,153,137,0.00); outline: 0 solid rgba(39,153,137,0.00); }
    18%  { outline: 3px solid var(--teal); box-shadow: 0 0 0 6px rgba(39,153,137,0.25); }
    100% { outline: 0 solid transparent; box-shadow: 0 0 0 0 rgba(39,153,137,0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .chatwrap.is-highlight { animation: none; outline: 3px solid var(--teal); }
  }
  @media (min-width: 980px) {
    .top { grid-template-columns: 1.2fr 1fr; gap: 24px; }
    .title { font-size: 1.8rem; }
  }

  .img.placeholder { position: absolute; inset: 0; width: 100%; height: 100%; }

  @media (min-width: 768px) {
    .wrap { margin: 32px auto 100px; padding: 0 16px; }
  }
`;
