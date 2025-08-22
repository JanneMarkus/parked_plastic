// pages/create-listing.js
import { useEffect, useMemo, useState, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import ImageUploader from "@/components/ImageUploader";

export default function CreateListing() {
  const router = useRouter();

  // Auth gate
  const [checking, setChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Flight numbers (REQUIRED)
  const [speed, setSpeed] = useState("");
  const [glide, setGlide] = useState("");
  const [turn, setTurn] = useState("");
  const [fade, setFade] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [mold, setMold] = useState("");
  const [plastic, setPlastic] = useState("");
  const [conditionScore, setConditionScore] = useState(""); // 1–10 (Sleepy Scale)
  const [weight, setWeight] = useState(""); // optional -> NULL if blank
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [isInked, setIsInked] = useState(false);
  const [isGlow, setIsGlow] = useState(false);

  // Images (from new uploader)
  const [imageItems, setImageItems] = useState([]); // full objects from uploader
  const imageUrls = imageItems.filter(i => i.status === "done").map(i => i.url);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ---------- Auth ----------
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setCurrentUser(data?.session?.user ?? null);
      setChecking(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null);
      setChecking(false);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Number helpers for Turn control
  function toHalfStep(n) { return Math.round(n * 2) / 2; }
  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
  function parseLocaleNumber(v) {
    const s = String(v).replace("−", "-").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  function adjustTurn(delta) {
    setTurn((prev) => {
      const cur = prev === "" ? 0 : parseLocaleNumber(prev) || 0;
      const next = clamp(toHalfStep(cur + delta), -5, 1);
      return String(next);
    });
  }
  function sanitizeTurn() {
    setTurn((prev) => {
      if (prev === "") return prev;
      const n = parseLocaleNumber(prev);
      if (!Number.isFinite(n)) return "";
      return String(clamp(toHalfStep(n), -5, 1));
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent("/create-listing")}`);
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Please enter a title.");
      return;
    }

    // ---- Flight number validation (required, ranges, .5 step) ----
    const stepIsValid = (v) =>
      Number.isFinite(v) && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9;
    const numOrNaN = (s) => (s === "" ? NaN : Number(s));
    const s = numOrNaN(speed),
      g = numOrNaN(glide),
      t = numOrNaN(turn),
      f = numOrNaN(fade);
    const flightErrors = [];
    if (!Number.isFinite(s) || s < 0 || s > 15 || !stepIsValid(s))
      flightErrors.push("Speed must be 0–15 in 0.5 steps.");
    if (!Number.isFinite(g) || g < 0 || g > 7 || !stepIsValid(g))
      flightErrors.push("Glide must be 0–7 in 0.5 steps.");
    if (!Number.isFinite(t) || t < -5 || t > 1 || !stepIsValid(t))
      flightErrors.push("Turn must be -5 to 1 in 0.5 steps.");
    if (!Number.isFinite(f) || f < 0 || f > 6 || !stepIsValid(f))
      flightErrors.push("Fade must be 0–6 in 0.5 steps.");
    if (flightErrors.length) {
      setErrorMsg(flightErrors[0]);
      return;
    }

    // Parse optionals
    const weightNum = weight.trim() === "" ? null : Number(weight);
    const priceNum = price.trim() === "" ? null : Number(price);

    // Sleepy Scale condition (optional)
    const condNumRaw = conditionScore.trim() === "" ? null : Number(conditionScore);
    if (condNumRaw !== null) {
      if (!Number.isFinite(condNumRaw)) {
        setErrorMsg("Condition must be a number 1–10.");
        return;
      }
    }
    const condNum = condNumRaw === null ? null : Math.max(1, Math.min(10, Math.round(condNumRaw)));

    setLoading(true);
    try {
      const { error } = await supabase.from("discs").insert([
        {
          title: title.trim(),
          brand: brand.trim() || null,
          mold: mold.trim() || null,
          plastic: plastic.trim() || null,
          condition: condNum, // integer 1–10 (nullable)
          weight: Number.isFinite(weightNum) ? weightNum : null,
          price: Number.isFinite(priceNum) ? priceNum : null,
          description: description.trim() || null,
          image_urls: imageUrls, // from uploader (already uploaded)
          city: null,
          owner: currentUser.id,
          is_sold: false,
          speed: s,
          glide: g,
          turn: t,
          fade: f,
          is_inked: isInked,
          is_glow: isGlow,
        },
      ]);
      if (error) throw error;

      alert("Listing created!");
      router.replace("/");
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to create listing.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = useMemo(
    () => title.trim().length > 0 && !loading,
    [title, loading]
  );

  // ---------- UI ----------
  if (checking) {
    return (
      <main className="wrap">
        <Head>
          <title>Post a Disc — Parked Plastic</title>
          <meta name="robots" content="noindex" />
        </Head>
        <p className="center muted">Checking session…</p>
        <style jsx>{`
          .wrap { max-width: 960px; margin: 32px auto; padding: 0 16px; }
          .center { text-align: center; margin-top: 40px; }
          .muted { color: #3a3a3a; opacity: 0.85; }
        `}</style>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="wrap">
        <Head>
          <title>Post a Disc — Parked Plastic</title>
          <meta
            name="description"
            content="Sign in to post a disc listing on Parked Plastic."
          />
        </Head>
        <style jsx>{styles}</style>
        <div className="panel">
          <h1>Post a Disc</h1>
          <p className="muted">You need to sign in to create a listing.</p>
          <button
            className="btn btn-primary"
            onClick={() =>
              router.push(
                `/login?redirect=${encodeURIComponent("/create-listing")}`
              )
            }
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Head>
        <title>Post a Disc — Parked Plastic</title>
        <meta
          name="description"
          content="Create a disc golf listing. Add clear 4:3 photos, brand, mold, condition, and optional weight."
        />
      </Head>
      <style jsx>{styles}</style>

      <div className="titleRow">
        <h1>Post a Disc</h1>
        <p className="subtle">Detailed listings sell best</p>
      </div>

      {/* Errors / status */}
      <div aria-live="polite" aria-atomic="true" className="statusRegion">
        {errorMsg && <div className="error">{errorMsg}</div>}
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="grid2">
            {/* Images (new uploader) */}
            <div className="field span2">
              <label>Images</label>
              <ImageUploader
                supabase={supabase}
                userId={currentUser.id}
                bucket="listing-images"
                maxFiles={10}
                maxFileMB={12}
                maxEdgePx={1600}
                jpegQuality={0.85}
                onChange={setImageItems}
              />
              <p className="hintRow">
                Tip: Use good light and a clean background. Suggested angles: Front, back, side profile.
              </p>
            </div>

            {/* Title */}
            <div className="field span2">
              <label htmlFor="title">Title*</label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 175g Star Destroyer — Blue"
                autoComplete="off"
                maxLength={120}
              />
            </div>

            {/* Brand | Mold */}
            <div className="field">
              <label htmlFor="brand">Brand*</label>
              <input
                id="brand"
                type="text"
                value={brand}
                required
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Innova, Discraft, MVP…"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="mold">Mold*</label>
              <input
                id="mold"
                type="text"
                value={mold}
                required
                onChange={(e) => setMold(e.target.value)}
                placeholder="Destroyer, Buzzz, Hex…"
                autoComplete="off"
              />
            </div>

            {/* Flight Numbers (REQUIRED) */}
            <div className="field span2">
              <label>Flight Numbers*</label>
              <div className="flightGrid">
                <div className="flightField">
                  <span className="ffLabel">Speed</span>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={15}
                    required
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g., 12"
                  />
                </div>
                <div className="flightField">
                  <span className="ffLabel">Glide</span>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={7}
                    required
                    value={glide}
                    onChange={(e) => setGlide(e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="flightField">
                  <span className="ffLabel">Turn</span>
                  <div className="spin">
                    <button
                      type="button"
                      className="spinBtn"
                      onClick={() => adjustTurn(-0.5)}
                      aria-label="Decrease turn by 0.5"
                    >
                      −0.5
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      min={-5}
                      max={1}
                      required
                      value={turn}
                      onChange={(e) => setTurn(e.target.value)}
                      onBlur={sanitizeTurn}
                      inputMode="decimal"
                      placeholder="e.g., -1"
                    />
                    <button
                      type="button"
                      className="spinBtn"
                      onClick={() => adjustTurn(0.5)}
                      aria-label="Increase turn by 0.5"
                    >
                      +0.5
                    </button>
                  </div>
                </div>
                <div className="flightField">
                  <span className="ffLabel">Fade</span>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={6}
                    required
                    value={fade}
                    onChange={(e) => setFade(e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g., 3"
                  />
                </div>
              </div>
              <p className="hintRow">Use 0.5 increments. Example format: 12 / 5 / -1 / 3</p>
            </div>

            {/* Plastic | Condition */}
            <div className="field">
              <label htmlFor="plastic">Plastic</label>
              <input
                id="plastic"
                type="text"
                value={plastic}
                onChange={(e) => setPlastic(e.target.value)}
                placeholder="Star, Z, Neutron…"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="condition">Condition*</label>
              <input
                id="condition"
                type="number"
                min={1}
                max={10}
                step={1}
                inputMode="numeric"
                placeholder="e.g., 8"
                required
                value={conditionScore}
                onChange={(e) => setConditionScore(e.target.value)}
                onBlur={() => {
                  setConditionScore((prev) => {
                    if (prev === "") return prev;
                    const n = Number(prev);
                    if (!Number.isFinite(n)) return "";
                    return String(Math.max(1, Math.min(10, Math.round(n))));
                  });
                }}
              />
              <p className="hintRow">Sleepy Scale (1-10): 1 = Extremely beat • 10 = Brand new</p>
              <p className="hintRow">
                <a target="_blank" href="https://www.dgcoursereview.com/threads/understanding-the-sleepy-scale-with-pics-and-check-list.89392/">
                  Learn more about Sleepy Scale here
                </a>
              </p>
            </div>

            {/* Weight | Price */}
            <div className="field">
              <label htmlFor="weight">Weight (g)</label>
              <input
                id="weight"
                type="number"
                min={120}
                max={200}
                inputMode="numeric"
                placeholder="e.g., 175"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="price">Price (CAD)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                placeholder="e.g., 25.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            {/* Extras: Inked / Glow */}
            <div className="field span2">
              <label>Extras</label>
              <div className="checks">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={isInked}
                    onChange={(e) => setIsInked(e.target.checked)}
                  />
                  <span>Is it inked?</span>
                </label>

                <label className="check">
                  <input
                    type="checkbox"
                    checked={isGlow}
                    onChange={(e) => setIsGlow(e.target.checked)}
                  />
                  <span>Is it a glow disc?</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="field span2">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about ink, dome, wear, trades…"
              />
            </div>

            {/* Actions */}
            <div className="actions span2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => router.push("/")}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSubmit}
              >
                {loading ? "Posting…" : "Create Listing"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

/* ---- Styled-JSX: mobile-first, brand tokens ---- */
const styles = `
  :root {
    --storm: #141B4D; --teal: #279989; --teal-dark: #1E7A6F;
    --sea: #F8F7EC; --wave: #D6D2C4; --char: #3A3A3A; --cloud: #E9E9E9;
    --tint: #ECF6F4; --coral: #E86A5E;
  }
  .wrap { max-width: 960px; margin: 24px auto 80px; padding: 0 12px; background: var(--sea); }
  .titleRow { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  h1 { font-family: 'Poppins', sans-serif; font-weight: 600; color: var(--storm); letter-spacing: .5px; margin: 0; font-size: 1.6rem; }
  .subtle { color: var(--char); opacity: .85; margin: 0; }
  .statusRegion { min-height: 22px; margin-bottom: 8px; }
  .error, .info { border-radius: 10px; padding: 10px 12px; font-size: .95rem; margin: 8px 0; }
  .error { background: #fff5f4; border: 1px solid #ffd9d5; color: #8c2f28; }
  .info { background: #f4fff9; border: 1px solid #d1f5e5; color: #1a6a58; }
  .panel, .card { background: #fff; border: 1px solid var(--cloud); border-radius: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); padding: 18px; }
  .grid2 { display: grid; grid-template-columns: 1fr; gap: 14px 14px; }
  .span2 { grid-column: 1 / -1; }
  .field label { display: block; font-family: 'Poppins', sans-serif; font-weight: 600; color: var(--storm); font-size: .95rem; margin-bottom: 6px; }
  .hint { font-weight: 500; color: #666; font-size: .8rem; margin-left: 6px; }
  .field input:not([type="file"]), .field textarea { width: 100%; box-sizing: border-box; background: #fff; border: 1px solid var(--cloud); border-radius: 10px; padding: 12px 14px; font-size: 15px; color: var(--char); outline: none; transition: border-color .15s, box-shadow .15s; }
  .field textarea { resize: vertical; min-height: 120px; }
  .field input:not([type="file"]):focus, .field textarea:focus { border-color: var(--teal); box-shadow: 0 0 0 4px var(--tint); }
  .hintRow { color: #666; font-size: .85rem; margin-top: 6px; }
  .flightGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (min-width: 768px) { .flightGrid { grid-template-columns: repeat(4, 1fr); } }
  .flightField { display: grid; gap: 6px; }
  .ffLabel { font-weight: 600; color: var(--storm); font-size: .9rem; }
  .spin { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; }
  .spinBtn { border: 1px solid var(--cloud); background: #fff; border-radius: 8px; padding: 8px 10px; font-weight: 700; cursor: pointer; }
  .spinBtn:active { transform: translateY(1px); }
  .actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 4px; }
  .btn { border: none; border-radius: 10px; padding: 12px 16px; font-weight: 700; cursor: pointer; font-size: 14px; }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { background: var(--teal-dark); }
  .btn-ghost { background: #fff; color: var(--storm); border: 2px solid var(--storm); text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
  .btn-ghost:hover { background: var(--storm); color: #fff; }
  .checks { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .check { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: var(--storm); }
  .check input { transform: translateY(1px); }
  @media (min-width: 768px) { h1 { font-size: 2rem; } .wrap { margin: 32px auto 80px; padding: 0 16px; } .grid2 { grid-template-columns: 1fr 1fr; gap: 16px 16px; } }
`;
