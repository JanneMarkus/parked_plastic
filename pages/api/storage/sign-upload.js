// pages/api/storage/sign-upload.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  // Never cache auth-sensitive responses
  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = createSupabaseServerClient({ req, res });

    // Who is calling? (uses httpOnly cookies)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return res.status(401).json({ error: "Not authenticated" });

    const { bucket = "listing-images", contentType = "image/jpeg" } = req.body || {};

    // Build a key that satisfies your RLS: first folder = auth.uid()
    const now = new Date();
    const base = `${user.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(now.getDate()).padStart(2, "0")}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.jpg`;

    // Create a signed upload URL for this path
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(base);
    if (error) return res.status(400).json({ error: error.message });

    // Public URL (you’re using public buckets)
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(base);

    return res.status(200).json({
      key: data.path, // storage object key
      token: data.token, // one-time upload token
      publicUrl: pub?.publicUrl || null,
      contentType, // echo
      bucket,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("sign-upload error", e);
    return res.status(500).json({ error: "Failed to create signed upload URL" });
  }
}
