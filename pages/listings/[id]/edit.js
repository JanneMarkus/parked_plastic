// pages/listings/[id]/edit.js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import ImageUploader from "@/components/ImageUploader";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const supabase = getSupabaseBrowser();

export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServerClient({ req: ctx.req, res: ctx.res });

  // 1) Require login
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const user = userRes?.user || null;
  if (userErr || !user) {
    return {
      redirect: {
        destination: `/login?redirect=${encodeURIComponent(ctx.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  // 2) Load disc
  const id = ctx.params?.id;
  const { data: disc, error: discErr } = await supabase
    .from("discs")
    .select("*")
    .eq("id", id)
    .single();

  if (discErr || !disc) {
    return { redirect: { destination: "/account", permanent: false } };
  }

  // 3) Ownership guard
  if (disc.owner !== user.id) {
    return { redirect: { destination: `/listings/${id}`, permanent: false } };
  }

  // 4) Hand minimal props to the page
  return {
    props: {
      initialUser: { id: user.id, email: user.email ?? null },
      initialDisc: disc,
    },
  };
}

export default function EditListing({ initialUser, initialDisc }) {
  const router = useRouter();

  // Gate & fetch
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listing & form state
  const [disc, setDisc] = useState(null);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [mold, setMold] = useState("");
  const [plastic, setPlastic] = useState("");
  const [conditionScore, setConditionScore] = useState(""); // 1–10
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("Thunder Bay");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active"); // 'active' | 'pending' | 'sold'

  // Flight numbers
  const [speed, setSpeed] = useState("");
  const [glide, setGlide] = useState("");
  const [turn, setTurn] = useState("");
  const [fade, setFade] = useState("");
  const [isInked, setIsInked] = useState(false);
  const [isGlow, setIsGlow] = useState(false);

  // New uploader state (child reports here)
  const [imageItems, setImageItems] = useState([]); // from ImageUploader onChange

  // UI state
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Number helpers for Turn control
  function toHalfStep(n) {
    return Math.round(n * 2) / 2;
  }
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }
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

  // Seed from SSR (already authenticated & owner-checked)
  useEffect(() => {
    if (initialUser) setUser(initialUser);
    if (initialDisc) {
      setDisc(initialDisc);

      setTitle(initialDisc.title || "");
      setBrand(initialDisc.brand || "");
      setMold(initialDisc.mold || "");
      setPlastic(initialDisc.plastic || "");
      setConditionScore(initialDisc.condition ?? "");
      setWeight(initialDisc.weight ?? "");
      setPrice(initialDisc.price ?? "");
      setCity(initialDisc.city || "Thunder Bay");
      setDescription(initialDisc.description || "");
      setStatus(initialDisc.status || "active");

      setSpeed(initialDisc.speed ?? "");
      setGlide(initialDisc.glide ?? "");
      setTurn(initialDisc.turn ?? "");
      setFade(initialDisc.fade ?? "");
      setIsInked(Boolean(initialDisc.is_inked ?? initialDisc.inked ?? false));
      setIsGlow(Boolean(initialDisc.is_glow ?? false));

      // Pre-hydrate uploader preview items if images exist
      const existing = (initialDisc.image_urls || [])
        .filter(Boolean)
        .map((url) => ({ url }));
      if (existing.length) setImageItems(existing);
    }

    setLoading(false);
  }, [initialUser, initialDisc]);

  function sanitizeTurn() {
    setTurn((prev) => {
      if (prev === "") return prev;
      const n = parseLocaleNumber(prev);
      if (!Number.isFinite(n)) return "";
      return String(clamp(toHalfStep(n), -5, 1));
    });
  }

  // ---------- Save ----------
  async function onSave(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!user || !disc) return;

    if (!title.trim()) {
      setErrorMsg("Please enter a title.");
      return;
    }

    // Flight validation
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

    // Validate numbers
    const weightNum = weight === "" ? null : Number(weight);
    if (
      weight !== "" &&
      (Number.isNaN(weightNum) || weightNum < 120 || weightNum > 200)
    ) {
      setErrorMsg("Weight should be between 120 and 200 grams.");
      return;
    }
    const priceNum = price === "" ? null : Number(price);
    if (price !== "" && (Number.isNaN(priceNum) || priceNum < 0)) {
      setErrorMsg("Price must be non-negative.");
      return;
    }

    // Sleepy Scale condition (optional)
    const condRaw = conditionScore === "" ? null : Number(conditionScore);
    if (condRaw !== null && !Number.isFinite(condRaw)) {
      setErrorMsg("Condition must be a number 1–10.");
      return;
    }
    const condNum =
      condRaw === null ? null : Math.max(1, Math.min(10, Math.round(condRaw)));

    // Status validation (just in case)
    const cleanStatus = ["active", "pending", "sold"].includes(status)
      ? status
      : "active";

    // Keep existing images if user didn't change anything in this session
    const finalImageUrls =
      imageItems && imageItems.length
        ? imageItems
            .filter((i) => (i.status ? i.status === "done" : true) && i.url)
            .map((i) => i.url)
        : disc?.image_urls || [];

    setSaving(true);
    try {
      const { error } = await supabase
        .from("discs")
        .update({
          title: title.trim(),
          brand: brand.trim() || null,
          mold: mold.trim() || null,
          plastic: plastic.trim() || null,
          condition: condNum,
          weight: Number.isFinite(weightNum) ? weightNum : null,
          price: Number.isFinite(priceNum) ? priceNum : null,
          city: city.trim() || null,
          description: description.trim() || null,
          image_urls: finalImageUrls,
          status: cleanStatus,
          speed: s,
          glide: g,
          turn: t,
          fade: f,
          is_inked: isInked,
          is_glow: isGlow,
        })
        .eq("id", disc.id);

      if (error) throw error;

      alert("Saved!");
      router.push("/account");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setErrorMsg(err?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = useMemo(
    () => title.trim().length > 0 && !saving,
    [title, saving]
  );

  // ---------- UI ----------
  if (loading) {
    return (
      <main className="wrap">
        <Head>
          <title>Edit Listing — Parked Plastic</title>
          <meta name="robots" content="noindex" />
        </Head>
        <p className="center muted">Loading…</p>
        <style jsx>{`
          .wrap {
            max-width: 960px;
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
  // user is guaranteed by SSR; no null return needed

  return (
    <main className="wrap">
      <Head>
        <title>Edit Listing — Parked Plastic</title>
        <meta
          name="description"
          content="Edit your Parked Plastic disc listing."
        />
      </Head>
      <style jsx>{styles}</style>

      <div className="titleRow">
        <h1>Edit Listing</h1>
        <p className="subtle">
          Make changes and save. Leave fields blank if not applicable.
        </p>
      </div>

      {/* Errors / status */}
      <div aria-live="polite" aria-atomic="true" className="statusRegion">
        {errorMsg && <div className="error">{errorMsg}</div>}
      </div>

      <div className="card">
        <form onSubmit={onSave}>
          <div className="grid2">
            {/* Images (new uploader) */}
            <div className="field span2">
              <label>Images</label>
              <ImageUploader
                key={disc?.id || "edit-uploader"} // force remount when listing loads
                supabase={supabase}
                userId={user.id}
                bucket="listing-images"
                maxFiles={10}
                maxFileMB={12}
                maxEdgePx={1600}
                jpegQuality={0.85}
                initialItems={(disc?.image_urls || []).map((url) => ({ url }))}
                onChange={setImageItems}
              />
              <p className="hintRow">
                Photos update immediately when added/removed.
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
              <label htmlFor="brand">Brand</label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Innova, Discraft, MVP…"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="mold">Mold</label>
              <input
                id="mold"
                type="text"
                value={mold}
                onChange={(e) => setMold(e.target.value)}
                placeholder="Destroyer, Buzzz, Hex…"
                autoComplete="off"
              />
            </div>

            {/* Flight Numbers */}
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
                  />
                </div>
              </div>
              <p className="hintRow">
                Use 0.5 increments. Example: 12 / 5 / -1 / 3
              </p>
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
              <label htmlFor="condition">Condition (Sleepy Scale 1–10)</label>
              <input
                id="condition"
                type="number"
                min={1}
                max={10}
                step={1}
                inputMode="numeric"
                placeholder="e.g., 8"
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
              <p className="hintRow">
                Sleepy Scale (1-10): 1 = Extremely beat • 10 = Brand new
              </p>
              <p className="hintRow">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://www.dgcoursereview.com/threads/understanding-the-sleepy-scale-with-pics-and-check-list.89392/"
                >
                  Learn more about Sleepy Scale here
                </a>
              </p>
            </div>

            {/* Weight | Price */}
            <div className="field">
              <label htmlFor="weight">
                Weight (g) <span className="hint">(optional)</span>
              </label>
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

            {/* Extras */}
            <div className="field span2">
              <div className="checks">
                <label className="check">
                  <span>Is it inked?</span>
                  <input
                    type="checkbox"
                    checked={isInked}
                    onChange={(e) => setIsInked(e.target.checked)}
                  />
                </label>

                <label className="check">
                  <span>Is it a glow disc?</span>
                  <input
                    type="checkbox"
                    checked={isGlow}
                    onChange={(e) => setIsGlow(e.target.checked)}
                  />
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

            {/* Status */}
            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="pending">Pending (Pending Sold)</option>
                <option value="sold">Sold</option>
              </select>
              <p className="hintRow">
                Use <strong>Pending</strong> when a buyer has committed, but the
                sale isn’t final yet.
              </p>
            </div>

            {/* Actions */}
            <div className="actions span2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => router.push("/account")}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSubmit}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

/* ---- Styled-JSX: match create-listing ---- */
const styles = `
  :root {
    --storm: #141B4D; --teal: #279989; --teal-dark: #1E7A6F;
    --sea: #F8F7EC; --wave: #D6D2C4; --char: #3A3A3A; --cloud: #E9E9E9; --tint: #ECF6F4; --coral: #E86A5E;
  }
  .wrap { max-width: 960px; margin: 24px auto 80px; padding: 0 12px; background: var(--sea); }
  .titleRow { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  h1 { font-family: 'Poppins', sans-serif; font-weight: 600; color: var(--storm); letter-spacing: .5px; margin: 0; font-size: 1.6rem; }
  .subtle { color: var(--char); opacity: .85; margin: 0; }
  .statusRegion { min-height: 22px; margin: 8px 0; }
  .error, .info { border-radius: 10px; padding: 10px 12px; font-size: .95rem; margin: 8px 0; }
  .error { background: #fff5f4; border: 1px solid #ffd9d5; color: #8c2f28; }
  .info { background: #f4fff9; border: 1px solid #d1f5e5; color: #1a6a58; }
  .card { background: #fff; border: 1px solid var(--cloud); border-radius: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); padding: 18px; margin-top: 12px; }
  .grid2 { display: grid; grid-template-columns: 1fr; gap: 14px 14px; }
  .span2 { grid-column: 1 / -1; }
  .field label { display: block; font-family: 'Poppins', sans-serif; font-weight: 600; color: var(--storm); font-size: .95rem; margin-bottom: 6px; }
  .hint { font-weight: 500; color: #666; font-size: .8rem; margin-left: 6px; }
  .field input:not([type="file"]), .field textarea, .field select { width: 100%; box-sizing: border-box; background: #fff; border: 1px solid var(--cloud); border-radius: 10px; padding: 12px 14px; font-size: 15px; color: var(--char); outline: none; transition: border-color .15s, box-shadow .15s; }
  .field textarea { resize: vertical; min-height: 120px; }
  .field input:not([type="file"]):focus, .field textarea:focus, .field select:focus { border-color: var(--teal); box-shadow: 0 0 0 4px var(--tint); }
  .checkbox { display: inline-flex; align-items: center; gap: 10px; user-select: none; font-weight: 600; color: var(--storm); }
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
  .btn-ghost { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
  .btn-ghost:hover { background: var(--storm); color: #fff; }
  .checks { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .check { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: var(--storm); }
  .check input { transform: translateY(1px); }
  @media (min-width: 768px) { h1 { font-size: 2rem; } .wrap { margin: 32px auto 80px; padding: 0 16px; } .grid2 { grid-template-columns: 1fr 1fr; gap: 16px 16px; } }
`;
