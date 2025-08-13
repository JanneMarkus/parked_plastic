// lib/blurClient.js
const cache = new Map();

export async function getBlurDataURL(src) {
  if (!src) return null;
  if (cache.has(src)) return cache.get(src);

  try {
    const u = new URL("/api/blur", window.location.origin);
    u.searchParams.set("url", src);

    const r = await fetch(u.toString());
    if (!r.ok) throw new Error("blur api failed");
    const { base64 } = await r.json();
    cache.set(src, base64);
    return base64;
  } catch {
    // Fallback: tiny transparent pixel to avoid layout shift
    const px = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    cache.set(src, px);
    return px;
  }
}
