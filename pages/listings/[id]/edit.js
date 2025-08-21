// pages/listings/[id]/edit.js
import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

const MAX_FILES = 10;
const MAX_FILE_MB = 12;
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

export default function EditListing() {
  const router = useRouter();
  const { id } = router.query;

  // Gate & fetch
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listing & form state
  const [disc, setDisc] = useState(null);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [mold, setMold] = useState("");
  const [plastic, setPlastic] = useState("");
  const [condition, setCondition] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("Thunder Bay");
  const [description, setDescription] = useState("");
  const [isSold, setIsSold] = useState(false);
  // Flight numbers
  const [speed, setSpeed] = useState("");
  const [glide, setGlide] = useState("");
  const [turn, setTurn] = useState("");
  const [fade, setFade] = useState("");
  const [isInked, setIsInked] = useState(false);
  const [isGlow, setIsGlow] = useState(false);

  // Images
  const [existingImages, setExistingImages] = useState([]); // from current listing
  const [files, setFiles] = useState([]); // new uploads (optional)
  const [previews, setPreviews] = useState([]); // object URLs for new uploads

  // UI state
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  // ---------- Auth + load listing ----------
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const u = data?.session?.user ?? null;
      setUser(u);
      setChecking(false);

      if (!u) {
        // Defer redirect until we know id to preserve return path
        if (id)
          router.replace(
            `/login?redirect=${encodeURIComponent(`/listings/${id}/edit`)}`
          );
        return;
      }
      if (!id) return;

      setLoading(true);
      const { data: d, error } = await supabase
        .from("discs")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !d) {
        alert("Listing not found.");
        router.push("/account");
        return;
      }
      if (!active) return;

      // Ownership check
      if (d.owner !== u.id) {
        alert("You can only edit your own listings.");
        router.push(`/listings/${id}`);
        return;
      }

      setDisc(d);
      setTitle(d.title || "");
      setBrand(d.brand || "");
      setMold(d.mold || "");
      setPlastic(d.plastic || "");
      setCondition(d.condition || "");
      setWeight(d.weight ?? "");
      setPrice(d.price ?? "");
      setCity(d.city || "Thunder Bay");
      setDescription(d.description || "");
      setIsSold(!!d.is_sold);
      setExistingImages(d.image_urls || []);
      // Seed flight numbers (may be null on legacy rows)
      setSpeed(d.speed ?? "");
      setGlide(d.glide ?? "");
      setTurn(d.turn ?? "");
      setFade(d.fade ?? "");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, router]);

  // Cleanup previews
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  // ---- Image helpers (same pipeline as create) ----
  async function fileToImageBitmap(file) {
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(file);
      } catch {
        /* fallback */
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

  async function resizeIfNeeded(
    file,
    maxEdge = MAX_EDGE_PX,
    quality = JPEG_QUALITY
  ) {
    try {
      const img = await fileToImageBitmap(file);
      const w = img.width,
        h = img.height;
      if (!w || !h) return file;
      const maxCurrent = Math.max(w, h);
      if (maxCurrent <= maxEdge) return file;

      const scale = maxEdge / maxCurrent;
      const outW = Math.round(w * scale);
      const outH = Math.round(h * scale);

      if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(outW, outH);
        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.drawImage(img, 0, 0, outW, outH);
        const blob = await canvas.convertToBlob({
          type: "image/jpeg",
          quality,
        });
        const outName = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], outName, { type: "image/jpeg" });
      } else {
        const c = document.createElement("canvas");
        c.width = outW;
        c.height = outH;
        const ctx = c.getContext("2d", { alpha: false });
        ctx.drawImage(img, 0, 0, outW, outH);
        const blob = await new Promise((res) =>
          c.toBlob(res, "image/jpeg", quality)
        );
        const outName = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], outName, { type: "image/jpeg" });
      }
    } catch (err) {
      console.warn("Resize failed; using original file:", err);
      return file;
    }
  }

  const convertHeicIfNeeded = useCallback(async (file) => {
    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      /\.(heic|heif)$/i.test(file.name || "");
    if (!isHeic) return file;

    try {
      const heic2any = (await import("heic2any")).default;
      const blob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      const outName =
        (file.name || "image").replace(/\.(heic|heif)$/i, "") + ".jpg";
      return new File([blob], outName, { type: "image/jpeg" });
    } catch (e) {
      console.warn("HEIC conversion failed; using original file", e);
      return file;
    }
  }, []);

  const processPickedFiles = useCallback(
    async (pickedList) => {
      setErrorMsg("");
      const picked = Array.from(pickedList || []);
      if (!picked.length) return;

      const converted = await Promise.all(picked.map(convertHeicIfNeeded));

      const resized = [];
      for (const f of converted) {
        resized.push(await resizeIfNeeded(f));
      }

      let combined = [...resized]; // replace mode; user is explicitly choosing new images
      if (combined.length > MAX_FILES) {
        setErrorMsg(
          `You selected ${combined.length} files. Max is ${MAX_FILES}. Extra files were ignored.`
        );
        combined = combined.slice(0, MAX_FILES);
      }
      const filtered = combined.filter(
        (f) => f.size <= MAX_FILE_MB * 1024 * 1024
      );
      if (filtered.length < combined.length) {
        setErrorMsg(`Some files were skipped for exceeding ${MAX_FILE_MB}MB.`);
      }

      previews.forEach((u) => URL.revokeObjectURL(u));
      setFiles(filtered);
      setPreviews(filtered.map((f) => URL.createObjectURL(f)));
    },
    [previews, convertHeicIfNeeded]
  );

  const handleFileChange = async (e) => {
    await processPickedFiles(e.target.files);
    e.target.value = "";
  };

  // Drag-and-drop
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length)
      await processPickedFiles(e.dataTransfer.files);
  };

  // ---------- Upload + save ----------
  async function uploadToBucket(file, userId) {
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("listing-images")
      .upload(path, file, {
        cacheControl: "31536000, immutable",
        upsert: false,
      });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function onSave(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!user || !disc) return;

    if (!title.trim()) {
      setErrorMsg("Please enter a title.");
      return;
    }

    // Flight validation (required if missing; always validated for correctness)
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
      setErrorMsg("Price must be non‑negative.");
      return;
    }

    setSaving(true);
    try {
      let image_urls = existingImages;
      // If user chose files, we replace the images
      if (files.length > 0) {
        image_urls = [];
        for (let i = 0; i < files.length; i++) {
          setUploadMsg(`Uploading ${i + 1} of ${files.length}…`);
          const url = await uploadToBucket(files[i], user.id);
          if (url) image_urls.push(url);
        }
      }

      const { error } = await supabase
        .from("discs")
        .update({
          title: title.trim(),
          brand: brand.trim() || null,
          mold: mold.trim() || null,
          plastic: plastic.trim() || null,
          condition: condition.trim() || null,
          weight: Number.isFinite(weightNum) ? weightNum : null,
          price: Number.isFinite(priceNum) ? priceNum : null,
          city: city.trim() || null,
          description: description.trim() || null,
          image_urls,
          is_sold: !!isSold,
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
      console.error(err);
      setErrorMsg(err?.message || "Failed to save changes.");
    } finally {
      setUploadMsg("");
      setSaving(false);
    }
  }

  const canSubmit = useMemo(
    () => title.trim().length > 0 && !saving,
    [title, saving]
  );

  // ---------- UI ----------
  if (checking || loading) {
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
  if (!user) return null;

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

      {/* Existing images (readonly preview) */}
      {existingImages?.length > 0 && files.length === 0 && (
        <div className="card">
          <div className="previews">
            {existingImages.map((src) => (
              <div className="thumb" key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Current image" />
              </div>
            ))}
          </div>
          <p className="hintRow">
            Selecting new images below will replace these.
          </p>
        </div>
      )}

      {/* Errors / status */}
      <div aria-live="polite" aria-atomic="true" className="statusRegion">
        {errorMsg && <div className="error">{errorMsg}</div>}
        {uploadMsg && <div className="info">{uploadMsg}</div>}
      </div>

      <div className="card">
        <form onSubmit={onSave}>
          <div className="grid2">
            {/* Replace images (optional) */}
            <div className="field span2">
              <label htmlFor="images">Replace Images (optional)</label>
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
                  Drag & drop or click to upload • Up to {MAX_FILES} photos •
                  Each ≤ {MAX_FILE_MB}MB • 4:3 ratio looks best • HEIC
                  auto‑converted • Large images auto‑downsized
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

              {/* Flight Numbers (REQUIRED to add if missing on legacy) */}
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
                    <input
                      type="number"
                      step="0.5"
                      min={-5}
                      max={1}
                      required
                      value={turn}
                      onChange={(e) => setTurn(e.target.value)}
                      inputMode="decimal"
                    />
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

              {/* Plastic | Condition (text to mirror create form) */}
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

              {/* City
              <div className="field span2">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Where the disc is located"
                  autoComplete="off"
                />
              </div> */}

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

              {previews.length > 0 && (
                <>
                  <div className="previews">
                    {previews.map((src) => (
                      <div className="thumb" key={src}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Selected preview" />
                      </div>
                    ))}
                  </div>
                  <p className="hintRow">
                    New images will replace current ones on save.
                  </p>
                </>
              )}
            </div>

            {/* Sold toggle */}
            <div>
              <label className="checkbox">
                <input
                  id="sold"
                  type="checkbox"
                  checked={isSold}
                  onChange={(e) => setIsSold(e.target.checked)}
                />
                <span>Mark as sold</span>
              </label>
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
    --storm: #141B4D;
    --teal: #279989;
    --teal-dark: #1E7A6F;
    --sea: #F8F7EC;
    --wave: #D6D2C4;
    --char: #3A3A3A;
    --cloud: #E9E9E9;
    --tint: #ECF6F4;
    --coral: #E86A5E;
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

  .statusRegion { min-height: 22px; margin: 8px 0; }
  .error, .info {
    border-radius: 10px; padding: 10px 12px; font-size: .95rem; margin: 8px 0;
  }
  .error { background: #fff5f4; border: 1px solid #ffd9d5; color: #8c2f28; }
  .info { background: #f4fff9; border: 1px solid #d1f5e5; color: #1a6a58; }

  .card {
    background: #fff;
    border: 1px solid var(--cloud);
    border-radius: 14px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    padding: 18px;
    margin-top: 12px;
  }

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

  .field input:not([type="file"]),
  .field textarea,
  .field select {
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

  .field input:not([type="file"]):focus,
  .field textarea:focus,
  .field select:focus {
    border-color: var(--teal);
    box-shadow: 0 0 0 4px var(--tint);
  }

  .checkbox {
    display: inline-flex; align-items: center; gap: 10px; user-select: none;
    font-weight: 600; color: var(--storm);
  }

  /* Uploader */
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

  .checks { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.check { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: var(--storm); }
.check input { transform: translateY(1px); }

  @media (min-width: 768px) {
    h1 { font-size: 2rem; }
    .wrap { margin: 32px auto 80px; padding: 0 16px; }
    .grid2 { grid-template-columns: 1fr 1fr; gap: 16px 16px; }
  }
`;
