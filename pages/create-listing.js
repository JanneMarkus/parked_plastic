// pages/create-listing.js
import { useEffect, useMemo, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

const MAX_FILES = 10;
const MAX_FILE_MB = 12;
// Resize settings (tweak as you like)
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

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
  const [condition, setCondition] = useState("");
  const [weight, setWeight] = useState(""); // optional -> NULL if blank
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // Images
  const [files, setFiles] = useState([]);       // normalized, converted & possibly resized
  const [previews, setPreviews] = useState([]); // objectURL previews
  const [uploadMsg, setUploadMsg] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

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

  // ---------- Image previews cleanup ----------
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  // ---- Helpers: decode + resize (client-side) ----
  async function fileToImageBitmap(file) {
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(file);
      } catch {
        // fall through to HTMLImageElement
      }
    }
    const dataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
      el.decoding = "async";
      el.loading = "eager";
    });
    return img;
  }

  async function resizeIfNeeded(file, maxEdge = MAX_EDGE_PX, quality = JPEG_QUALITY) {
    try {
      const img = await fileToImageBitmap(file);
      const w = img.width, h = img.height;
      if (!w || !h) return file;

      const maxCurrent = Math.max(w, h);
      if (maxCurrent <= maxEdge) return file;

      const scale = maxEdge / maxCurrent;
      const outW = Math.round(w * scale);
      const outH = Math.round(h * scale);

      // Use OffscreenCanvas where available
      if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(outW, outH);
        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.drawImage(img, 0, 0, outW, outH);
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
        const outName = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], outName, { type: "image/jpeg" });
      } else {
        const c = document.createElement("canvas");
        c.width = outW; c.height = outH;
        const ctx = c.getContext("2d", { alpha: false });
        ctx.drawImage(img, 0, 0, outW, outH);
        const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
        const outName = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], outName, { type: "image/jpeg" });
      }
    } catch (err) {
      console.warn("Resize failed; using original file:", err);
      return file; // Graceful fallback
    }
  }

  // HEIC/HEIF → JPEG
  const convertHeicIfNeeded = useCallback(async (file) => {
    const isHeicType =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      /\.(heic|heif)$/i.test(file.name || "");

    if (!isHeicType) return file;

    try {
      const heic2any = (await import("heic2any")).default;
      const resultBlob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      const outName = (file.name || "image").replace(/\.(heic|heif)$/i, "") + ".jpg";
      return new File([resultBlob], outName, { type: "image/jpeg" });
    } catch (err) {
      console.warn("HEIC conversion failed, using original file:", err);
      return file; // graceful fallback
    }
  }, []);

  // Normalize/guard picked files (input or drop): HEIC→JPEG, then downscale
  const processPickedFiles = useCallback(
    async (pickedList) => {
      setErrorMsg("");

      const picked = Array.from(pickedList || []);
      if (!picked.length) return;

      // 1) Convert HEIC if needed
      const converted = await Promise.all(picked.map((f) => convertHeicIfNeeded(f)));

      // 2) Downscale if oversized (sequential for mobile friendliness)
      const resized = [];
      for (const f of converted) {
        const toUse = await resizeIfNeeded(f, MAX_EDGE_PX, JPEG_QUALITY);
        resized.push(toUse);
      }

      // 3) Combine with existing selection
      let combined = [...files, ...resized];

      // 4) Enforce count and size limits
      if (combined.length > MAX_FILES) {
        setErrorMsg(`You selected ${combined.length} files. Max is ${MAX_FILES}. Extra files were ignored.`);
        combined = combined.slice(0, MAX_FILES);
      }
      const filtered = combined.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
      if (filtered.length < combined.length) {
        setErrorMsg(`Some files were skipped for exceeding ${MAX_FILE_MB}MB.`);
      }

      // Reset previous previews
      previews.forEach((u) => URL.revokeObjectURL(u));

      setFiles(filtered);
      setPreviews(filtered.map((file) => URL.createObjectURL(file)));
    },
    [files, previews, convertHeicIfNeeded]
  );

  // File input change
  const handleFileChange = async (e) => {
    await processPickedFiles(e.target.files);
    e.target.value = ""; // allow re-picking same files
  };

  // Drag-and-drop handlers
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const onDrop = async (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer?.files?.length) await processPickedFiles(e.dataTransfer.files);
  };

  async function uploadToBucket(file, userId) {
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(filePath, file, { cacheControl: "31536000, immutable", upsert: false });
    if (uploadError) throw uploadError;
    const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(filePath);
    return pub?.publicUrl || null;
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
    const stepIsValid = (v) => Number.isFinite(v) && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9;
    const numOrNaN = (s) => (s === "" ? NaN : Number(s));
    const s = numOrNaN(speed), g = numOrNaN(glide), t = numOrNaN(turn), f = numOrNaN(fade);
    const flightErrors = [];
    if (!Number.isFinite(s) || s < 0 || s > 15 || !stepIsValid(s)) flightErrors.push("Speed must be 0–15 in 0.5 steps.");
    if (!Number.isFinite(g) || g < 0 || g > 7 || !stepIsValid(g))  flightErrors.push("Glide must be 0–7 in 0.5 steps.");
    if (!Number.isFinite(t) || t < -5 || t > 5 || !stepIsValid(t)) flightErrors.push("Turn must be -5 to 5 in 0.5 steps.");
    if (!Number.isFinite(f) || f < 0 || f > 5 || !stepIsValid(f))  flightErrors.push("Fade must be 0–5 in 0.5 steps.");
    if (flightErrors.length) {
      setErrorMsg(flightErrors[0]);
      return;
    }

    setLoading(true);
    try {
      // Upload images (sequential; keeps memory & bandwidth friendly)
      const image_urls = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setUploadMsg(`Uploading ${i + 1} of ${files.length}…`);
        const url = await uploadToBucket(f, currentUser.id);
        if (url) image_urls.push(url);
      }

      // Parse optionals
      const weightNum = weight.trim() === "" ? null : Number(weight);
      const priceNum = price.trim() === "" ? null : Number(price);

      const { error } = await supabase.from("discs").insert([
        {
          title: title.trim(),
          brand: brand.trim() || null,
          mold: mold.trim() || null,
          plastic: plastic.trim() || null,
          condition: condition.trim() || null,
          weight: Number.isFinite(weightNum) ? weightNum : null,
          price: Number.isFinite(priceNum) ? priceNum : null,
          description: description.trim() || null,
          image_urls,
          city: null,
          owner: currentUser.id,
          is_sold: false,
          speed: s,
          glide: g,
          turn: t,
          fade: f,
        },
      ]);
      if (error) throw error;

      alert("Listing created!");
      router.replace("/");
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to create listing.");
    } finally {
      setUploadMsg("");
      setLoading(false);
    }
  }

  const canSubmit = useMemo(() => title.trim().length > 0 && !loading, [title, loading]);
  // (We also gate in onSubmit; canSubmit keeps the button UX snappy)

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
          .muted { color: #3A3A3A; opacity: .85; }
        `}</style>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="wrap">
        <Head>
          <title>Post a Disc — Parked Plastic</title>
          <meta name="description" content="Sign in to post a disc listing on Parked Plastic." />
        </Head>
        <style jsx>{styles}</style>
        <div className="panel">
          <h1>Post a Disc</h1>
          <p className="muted">You need to sign in to create a listing.</p>
          <button
            className="btn btn-primary"
            onClick={() => router.push(`/login?redirect=${encodeURIComponent("/create-listing")}`)}
          >
            Sign in with Google
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
        <p className="subtle">Fields marked “optional” can be left blank</p>
      </div>

      {/* Errors / status */}
      <div aria-live="polite" aria-atomic="true" className="statusRegion">
        {errorMsg && <div className="error">{errorMsg}</div>}
        {uploadMsg && <div className="info">{uploadMsg}</div>}
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Mobile-first grid; becomes 2-col ≥768px */}
          <div className="grid2">

            {/* Images — with drag & drop */}
            <div className="field span2">
              <label htmlFor="images">Images</label>
              <div
                className={`uploader ${isDragging ? "dragging" : ""}`}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <input
                  id="images"
                  type="file"
                  accept="image/*,.heic,.heif"
                  capture="environment"
                  multiple
                  onChange={handleFileChange}
                />
                <p className="uploaderHint">
                  Drag & drop or click to upload • Up to {MAX_FILES} photos • Each ≤ {MAX_FILE_MB}MB • 4:3 ratio
                  looks best • HEIC auto‑converted • Large images auto‑downsized
                </p>
              </div>

              {previews.length > 0 && (
                <>
                  <div className="previews">
                    {previews.map((src) => (
                      <div className="thumb" key={src}>
                        <img src={src} alt="Selected preview" />
                      </div>
                    ))}
                  </div>
                  <p className="hintRow">
                    Tip: Use good light and a clean background. Slight angle helps show dome.
                  </p>
                </>
              )}
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

            {/* Flight Numbers (REQUIRED) */}
            <div className="field span2">
              <label>Flight Numbers*</label>
              <div className="flightGrid">
                <div className="flightField">
                  <span className="ffLabel">Speed</span>
                  <input
                    type="number" step="0.5" min={0} max={15} required
                    value={speed} onChange={(e)=>setSpeed(e.target.value)} inputMode="decimal" placeholder="e.g., 12"
                  />
                </div>
                <div className="flightField">
                  <span className="ffLabel">Glide</span>
                  <input
                    type="number" step="0.5" min={0} max={7} required
                    value={glide} onChange={(e)=>setGlide(e.target.value)} inputMode="decimal" placeholder="e.g., 5"
                  />
                </div>
                <div className="flightField">
                  <span className="ffLabel">Turn</span>
                  <input
                    type="number" step="0.5" min={-5} max={5} required
                    value={turn} onChange={(e)=>setTurn(e.target.value)} inputMode="decimal" placeholder="e.g., -1"
                  />
                </div>
                <div className="flightField">
                  <span className="ffLabel">Fade</span>
                  <input
                    type="number" step="0.5" min={0} max={5} required
                    value={fade} onChange={(e)=>setFade(e.target.value)} inputMode="decimal" placeholder="e.g., 3"
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
              <label htmlFor="condition">Condition</label>
              <input
                id="condition"
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="Like New, Excellent, Good…"
                autoComplete="off"
              />
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
              <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
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
    --storm: #141B4D;         /* Primary Dark */
    --teal: #279989;          /* Primary Accent */
    --teal-dark: #1E7A6F;
    --sea: #F8F7EC;           /* Background */
    --wave: #D6D2C4;          /* Secondary BG */
    --char: #3A3A3A;          /* Neutral Text */
    --cloud: #E9E9E9;         /* Borders */
    --tint: #ECF6F4;          /* Accent Tint */
    --coral: #E86A5E;         /* Attention */
  }

  .wrap { max-width: 960px; margin: 24px auto 80px; padding: 0 12px; background: var(--sea); }

  .titleRow {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 12px; margin-bottom: 12px;
  }
  h1 {
    font-family: 'Poppins', sans-serif; font-weight: 600;
    color: var(--storm); letter-spacing: .5px; margin: 0; font-size: 1.6rem;
  }
  .subtle { color: var(--char); opacity: .85; margin: 0; }

  .statusRegion { min-height: 22px; margin-bottom: 8px; }
  .error, .info {
    border-radius: 10px; padding: 10px 12px; font-size: .95rem; margin: 8px 0;
  }
  .error { background: #fff5f4; border: 1px solid #ffd9d5; color: #8c2f28; }
  .info { background: #f4fff9; border: 1px solid #d1f5e5; color: #1a6a58; }

  .panel, .card {
    background: #fff;
    border: 1px solid var(--cloud);
    border-radius: 14px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    padding: 18px;
  }

  /* Mobile-first: 1 column; switch to 2 columns ≥768px */
  .grid2 {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px 14px;
  }
  .span2 { grid-column: 1 / -1; }

  .field label {
    display: block;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    color: var(--storm);
    font-size: .95rem;
    margin-bottom: 6px;
  }
  .hint { font-weight: 500; color: #666; font-size: .8rem; margin-left: 6px; }

  /* Style ALL non-file inputs + textarea */
  .field input:not([type="file"]),
  .field textarea {
    width: 100%;
    box-sizing: border-box;
    background: #fff;
    border: 1px solid var(--cloud);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 15px;
    color: var(--char);
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .field textarea { resize: vertical; min-height: 120px; }

  /* Focus rings for the same set */
  .field input:not([type="file"]):focus,
  .field textarea:focus {
    border-color: var(--teal);
    box-shadow: 0 0 0 4px var(--tint);
  }

  .uploader {
    border: 2px dashed var(--cloud);
    border-radius: 10px;
    padding: 14px;
    background: #fff;
    transition: border-color .15s, box-shadow .15s, background .15s;
  }
  .uploader.dragging {
    border-color: var(--teal);
    box-shadow: 0 0 0 4px var(--tint);
    background: #fff;
  }
  .uploaderHint { font-size: .85rem; color: #666; margin: 6px 0 0; }

  .previews {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
    margin-top: 12px;
  }
  .thumb {
    position: relative;
    border-radius: 10px;
    overflow: hidden;
    background: var(--cloud);
    border: 1px solid var(--cloud);
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  }
  .thumb img {
    width: 100%;
    aspect-ratio: 4/3;
    object-fit: cover;
    display: block;
  }
  .hintRow { color: #666; font-size: .85rem; margin-top: 6px; }

  /* Flight numbers grid */
  .flightGrid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  @media (min-width: 768px) {
    .flightGrid { grid-template-columns: repeat(4, 1fr); }
  }
  .flightField { display: grid; gap: 6px; }
  .ffLabel {
    font-weight: 600; color: var(--storm); font-size: .9rem;
  }

  .actions {
    display: flex; gap: 12px; justify-content: flex-end;
    margin-top: 4px;
  }
  .btn {
    border: none; border-radius: 10px; padding: 12px 16px;
    font-weight: 700; cursor: pointer; font-size: 14px;
  }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { background: var(--teal-dark); }
  .btn-ghost { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
  .btn-ghost:hover { background: var(--storm); color: #fff; }

  /* Desktop tweaks */
  @media (min-width: 768px) {
    h1 { font-size: 2rem; }
    .wrap { margin: 32px auto 80px; padding: 0 16px; }
    .grid2 { grid-template-columns: 1fr 1fr; gap: 16px 16px; }
  }
`;
