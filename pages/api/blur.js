// pages/api/blur.js
// Returns a Base64 data URL of a tiny transformed Supabase image.
// Usage: /api/blur?url=<public-image-url>
export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing ?url" });
    }

    // Ask Supabase's image transformer for a tiny version we can base64.
    // Tweak size/quality as you like — keep it small.
    const tinyUrl = `${url}${url.includes("?") ? "&" : "?"}width=24&height=18&fit=cover&format=webp&quality=40`;

    const r = await fetch(tinyUrl, { headers: { Accept: "image/*" } });
    if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const base64 = buf.toString("base64");

    // Long CDN cache + SWR for Vercel/CDN; client can also re-use indefinitely.
    res.setHeader("Cache-Control", "public, s-maxage=31536000, stale-while-revalidate=86400, max-age=31536000");
    res.status(200).json({ base64: `data:image/webp;base64,${base64}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Blur generation failed" });
  }
}
