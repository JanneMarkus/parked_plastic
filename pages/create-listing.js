// pages/create-listing.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function CreateListing() {
  const router = useRouter();

  // Auth gate
  const [checking, setChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Form state
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [mold, setMold] = useState("");
  const [plastic, setPlastic] = useState("");
  const [condition, setCondition] = useState("");
  const [weight, setWeight] = useState(""); // optional -> NULL if blank
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // ---------- Image previews ----------
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  const handleFileChange = (e) => {
    const f = Array.from(e.target.files || []);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setFiles(f);
    setPreviews(f.map((file) => URL.createObjectURL(file)));
  };

  async function uploadToBucket(file, userId) {
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;
    const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(filePath);
    return pub?.publicUrl || null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent("/create-listing")}`);
      return;
    }
    setLoading(true);
    try {
      // Upload images
      const image_urls = [];
      for (const f of files) {
        const url = await uploadToBucket(f, currentUser.id);
        if (url) image_urls.push(url);
      }

      // Parse optionals
      const weightNum = weight.trim() === "" ? null : Number(weight);
      const priceNum = price.trim() === "" ? null : Number(price);

      const { error } = await supabase.from("discs").insert([{
        title,
        brand: brand || null,
        mold: mold || null,
        plastic: plastic || null,
        condition: condition || null,
        weight: Number.isFinite(weightNum) ? weightNum : null,
        price: Number.isFinite(priceNum) ? priceNum : null,
        description: description || null,
        image_urls,
        city: null,
        owner: currentUser.id,
        is_sold: false
      }]);
      if (error) throw error;

      alert("Listing created!");
      router.replace("/");
    } catch (err) {
      console.error(err);
      alert("Failed to create listing: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = useMemo(() => title.trim().length > 0 && !loading, [title, loading]);

  // ---------- UI ----------
  if (checking) {
    return (
      <main className="wrap">
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
      <style jsx>{styles}</style>

      <div className="titleRow">
        <h1>Post a Disc</h1>
        <p className="subtle">Fields marked “optional” can be left blank</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Strict 2-col grid. Every row is ordered and predictable */}
          <div className="grid2">
            {/* Row 1: Title (span 2) */}
            <div className="field span2">
              <label htmlFor="title">Title*</label>
              <input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 175g Star Destroyer — Blue"
              />
            </div>

            {/* Row 2: Brand | Mold */}
            <div className="field">
              <label htmlFor="brand">Brand</label>
              <input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Innova, Discraft, MVP…"
              />
            </div>
            <div className="field">
              <label htmlFor="mold">Mold</label>
              <input
                id="mold"
                value={mold}
                onChange={(e) => setMold(e.target.value)}
                placeholder="Destroyer, Buzzz, Hex…"
              />
            </div>

            {/* Row 3: Plastic | Condition */}
            <div className="field">
              <label htmlFor="plastic">Plastic</label>
              <input
                id="plastic"
                value={plastic}
                onChange={(e) => setPlastic(e.target.value)}
                placeholder="Star, Z, Neutron…"
              />
            </div>
            <div className="field">
              <label htmlFor="condition">Condition</label>
              <input
                id="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="Like New, Excellent, Good…"
              />
            </div>

            {/* Row 4: Weight | Price */}
            <div className="field">
              <label htmlFor="weight">Weight (g) <span className="hint">(optional)</span></label>
              <input
                id="weight"
                type="number"
                min={120}
                max={200}
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
                placeholder="e.g., 25.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            {/* Row 5: Description (span 2) */}
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

            {/* Row 6: Images (span 2) */}
            <div className="field span2">
              <label htmlFor="images">Images</label>
              <div className="uploader">
                <input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
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
                  <p className="hintRow">Tip: Clear 4:3 photos on a clean background look best.</p>
                </>
              )}
            </div>

            {/* Row 7: Actions (span 2) */}
            <div className="actions span2">
              <button type="button" className="btn btn-ghost" onClick={() => router.push("/")}>
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

/* ---- Styled-JSX: strict 2-column grid, brand colors ---- */
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
  }

  .wrap { max-width: 960px; margin: 32px auto 80px; padding: 0 16px; }

  .titleRow {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 12px; margin-bottom: 16px;
  }
  h1 {
    font-family: 'Poppins', sans-serif; font-weight: 600;
    color: var(--storm); letter-spacing: .5px; margin: 0;
  }
  .subtle { color: var(--char); opacity: .85; margin: 0; }

  .panel, .card {
    background: #fff;
    border: 1px solid var(--cloud);
    border-radius: 14px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    padding: 22px;
  }

  /* Strict 2-column grid */
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 16px;
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

  .field input[type="text"],
  .field input[type="number"],
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

  .field input:focus,
  .field textarea:focus {
    border-color: var(--teal);
    box-shadow: 0 0 0 4px var(--tint);
  }

  .uploader {
    border: 1px dashed var(--cloud);
    border-radius: 10px;
    padding: 12px;
    background: #fff;
  }

  .previews {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
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

  @media (max-width: 760px) {
    .grid2 { grid-template-columns: 1fr; }
  }
`;
