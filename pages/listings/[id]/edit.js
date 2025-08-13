// pages/listings/[id]/edit.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

const CONDITION_OPTIONS = ["New", "Like New", "Excellent", "Good", "Used", "Beat"];

export default function EditListing() {
  const router = useRouter();
  const { id } = router.query;

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [disc, setDisc] = useState(null);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [mold, setMold] = useState("");
  const [plastic, setPlastic] = useState("");
  const [weight, setWeight] = useState("");
  const [condition, setCondition] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("Thunder Bay");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]); // new uploads (optional)
  const [isSold, setIsSold] = useState(false);

  // Gate & load listing
  useEffect(() => {
    let active = true;
    (async () => {
      // fast gate
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user ?? null;
      if (!active) return;
      setUser(u);
      setReady(true);
      if (!u) {
        router.replace(`/login?redirect=${encodeURIComponent(`/listings/${id}/edit`)}`);
        return;
      }
      if (!id) return;

      // fetch listing
      setLoading(true);
      const { data: d, error } = await supabase.from("discs").select("*").eq("id", id).single();
      if (error) {
        alert("Listing not found"); router.push("/account"); return;
      }
      if (!active) return;

      // only owner can edit
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
      setWeight(d.weight || "");
      setCondition(d.condition || "");
      setPrice(d.price ?? "");
      setCity(d.city || "Thunder Bay");
      setDescription(d.description || "");
      setIsSold(!!d.is_sold);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id, router]);

  const handleFileChange = (e) => setFiles(Array.from(e.target.files));

  async function onSave(e) {
    e.preventDefault();
    if (!user || !disc) return;

    const weightNum = weight ? Number(weight) : null;
    if (weight && (Number.isNaN(weightNum) || weightNum < 120 || weightNum > 200)) {
      return alert("Weight should be between 120 and 200 grams.");
    }
    const priceNum = price !== "" ? Number(price) : null;
    if (price !== "" && (Number.isNaN(priceNum) || priceNum < 0)) {
      return alert("Price must be non-negative.");
    }

    let image_urls = disc.image_urls || [];
    if (files.length > 0) {
      // replace images with new uploads
      image_urls = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("listing-images").upload(filePath, file);
        if (uploadError) { alert("Upload failed: " + uploadError.message); return; }
        const { data: urlData, error: urlErr } = supabase.storage.from("listing-images").getPublicUrl(filePath);
        if (urlErr || !urlData?.publicUrl) { alert("Failed to get public URL for an image."); return; }
        image_urls.push(urlData.publicUrl);
      }
    }

    const { error } = await supabase
      .from("discs")
      .update({
        title, brand, mold, plastic,
        weight: weightNum, condition: condition || null,
        price: priceNum, city, description: description || null,
        image_urls, is_sold: isSold
      })
      .eq("id", disc.id);

    if (error) return alert("Failed to save: " + error.message);
    alert("Saved!");
    router.push("/account");
  }

  if (!ready || loading) return <p style={{ textAlign: "center", marginTop: 40 }}>Loading…</p>;
  if (!user) return null;

  return (
    <form
      onSubmit={onSave}
      style={{
        maxWidth: 560, margin: "24px auto", background: "#fff", padding: 20,
        borderRadius: 12, boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
      }}
    >
      <h2 style={{ fontFamily: "'Poppins', sans-serif", color: "#141B4D", marginTop: 0 }}>
        Edit Listing
      </h2>

      <label style={{ display: "block", margin: "12px 0 6px" }}>Title*</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} required
             style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #E9E9E9" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Brand</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)}
                 style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #E9E9E9" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Mold</label>
          <input value={mold} onChange={(e) => setMold(e.target.value)}
                 style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #E9E9E9" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Plastic</label>
          <input value={plastic} onChange={(e) => setPlastic(e.target.value)}
                 style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #E9E9E9" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Weight (g)</label>
          <input type="number" min={120} max={200} step={1} value={weight}
                 onChange={(e) => setWeight(e.target.value)}
                 style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #E9E9E9" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}
                  style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #E9E9E9" }}>
            <option value="">(Select)</option>
            {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Price (CAD)</label>
          <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
                 style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #E9E9E9" }} />
        </div>
      </div>

      <label style={{ display: "block", margin: "12px 0 6px" }}>City</label>
      <input value={city} onChange={(e) => setCity(e.target.value)}
             style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #E9E9E9" }} />

      <label style={{ display: "block", margin: "12px 0 6px" }}>Description</label>
      <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes, dome/flat, ink, stability, etc."
                style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid #E9E9E9", resize:"vertical" }} />

      <label style={{ display: "block", margin: "12px 0 6px" }}>Replace Images (optional)</label>
      <input type="file" accept="image/*" multiple onChange={handleFileChange} />
      {files.length > 0 && <p style={{ marginTop: 8 }}>{files.length} new image(s) will replace current ones.</p>}

      <div style={{ display:"flex", alignItems:"center", gap:10, marginTop: 12 }}>
        <input id="sold" type="checkbox" checked={isSold} onChange={(e) => setIsSold(e.target.checked)} />
        <label htmlFor="sold">Mark as sold</label>
      </div>

      <div style={{ display:"flex", gap:12, marginTop:16 }}>
        <button type="submit"
          style={{ background:"#279989", color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:700, cursor:"pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E7A6F")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#279989")}
        >
          Save changes
        </button>
        <button type="button" onClick={() => router.push("/account")}
          style={{ background:"#fff", color:"#141B4D", border:"2px solid #141B4D", borderRadius:8, padding:"10px 16px", fontWeight:700, cursor:"pointer" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
