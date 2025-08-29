// pages/api/discs/update.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (!["PATCH", "PUT"].includes(req.method)) {
    res.setHeader("Allow", "PATCH, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Never cache auth-sensitive responses
  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = createSupabaseServerClient({ req, res });

    // Must be signed in (cookie session)
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = userRes.user;

    // Expect: { id, patch }
    const { id, patch } = req.body || {};
    if (!id || !patch || typeof patch !== "object") {
      return res.status(400).json({ error: "Missing id or patch" });
    }

    // Whitelist fields (mirror your create route)
    const filterAllowed = ({
      title,
      brand,
      mold,
      plastic,
      condition,
      weight,
      price,
      description,
      image_urls,
      city,
      is_sold,
      speed,
      glide,
      turn,
      fade,
      is_inked,
      is_glow,
      status, // optional enum
      // NOTE: id/owner/created_at are intentionally NOT accepted from client
    }) => ({
      ...(typeof title !== "undefined" ? { title } : {}),
      ...(typeof brand !== "undefined" ? { brand: brand ?? null } : {}),
      ...(typeof mold !== "undefined" ? { mold: mold ?? null } : {}),
      ...(typeof plastic !== "undefined" ? { plastic: plastic ?? null } : {}),
      ...(typeof condition !== "undefined" ? { condition } : {}),
      ...(typeof weight !== "undefined" ? { weight } : {}),
      ...(typeof price !== "undefined" ? { price } : {}),
      ...(typeof description !== "undefined" ? { description: description ?? null } : {}),
      ...(typeof image_urls !== "undefined"
        ? { image_urls: Array.isArray(image_urls) ? image_urls : [] }
        : {}),
      ...(typeof city !== "undefined" ? { city: city ?? null } : {}),
      ...(typeof is_sold !== "undefined" ? { is_sold: Boolean(is_sold) } : {}),
      ...(typeof speed !== "undefined" ? { speed } : {}),
      ...(typeof glide !== "undefined" ? { glide } : {}),
      ...(typeof turn !== "undefined" ? { turn } : {}),
      ...(typeof fade !== "undefined" ? { fade } : {}),
      ...(typeof is_inked !== "undefined" ? { is_inked: Boolean(is_inked) } : {}),
      ...(typeof is_glow !== "undefined" ? { is_glow: Boolean(is_glow) } : {}),
      ...(typeof status !== "undefined" ? { status } : {}),
    });

    const cleanPatch = filterAllowed(patch);

    // If nothing allowed remains, bail early
    if (Object.keys(cleanPatch).length === 0) {
      return res.status(400).json({ error: "No updatable fields in patch" });
    }

    // Guard against client trying to change protected fields
    delete cleanPatch.id;
    delete cleanPatch.owner;
    delete cleanPatch.created_at;

    // Update with ownership guard; return the updated row
    const { data, error } = await supabase
      .from("discs")
      .update(cleanPatch)
      .eq("id", id)
      .eq("owner", user.id)
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ error: error.message, code: error.code });
    }

    // If no row matched (RLS/ownership or bad id), .single() would have errored;
    // but we keep a defensive check:
    if (!data) {
      return res.status(404).json({ error: "Not found or not allowed" });
    }

    return res.status(200).json({ ok: true, data });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Discs update error:", e);
    return res.status(500).json({ error: "Server error updating listing" });
  }
}
