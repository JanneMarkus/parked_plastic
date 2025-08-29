// pages/api/discs/create.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Never cache auth-sensitive responses
  res.setHeader("Cache-Control", "no-store");
  // Make sure clients send/expect JSON
  if (!/application\/json/i.test(req.headers["content-type"] || "")) {
    // not fatal, but helps surface client issues early
    // (Supabase will still accept JS objects if Next parsed it)
  }

  try {
    // 0) Build a server-side Supabase client bound to req/res so cookies flow through
    const supabase = createSupabaseServerClient({ req, res });

    // 1) Must be signed in (httpOnly cookies tell Supabase who you are)
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = userRes.user;

    // 2) Input
    const { record } = req.body || {};
    if (!record || typeof record !== "object") {
      return res.status(400).json({ error: "Missing record payload" });
    }

    // 3) Whitelist fields we accept from the client (aligns with your schema)
    const allowed = ({
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
      status, // optional (enum disc_status); defaults to 'active' server-side
    }) => ({
      title,
      brand: brand ?? null,
      mold: mold ?? null,
      plastic: plastic ?? null,
      condition: typeof condition === "number" ? condition : (condition ?? null),
      weight: typeof weight === "number" ? weight : (weight ?? null),
      price: typeof price === "number" ? price : (price ?? null),
      description: description ?? null,
      image_urls: Array.isArray(image_urls) ? image_urls : [],
      city: city ?? null,
      is_sold: Boolean(is_sold ?? false),
      speed: typeof speed === "number" ? speed : (speed ?? null),
      glide: typeof glide === "number" ? glide : (glide ?? null),
      turn: typeof turn === "number" ? turn : (turn ?? null),
      fade: typeof fade === "number" ? fade : (fade ?? null),
      is_inked: Boolean(is_inked ?? false),
      is_glow: Boolean(is_glow ?? false),
      ...(typeof status !== "undefined" ? { status } : {}), // optional; leave out to use default
    });

    const clean = allowed(record);

    // 4) Enforce ownership server-side for RLS policies (your column is "owner")
    clean.owner = user.id;

    // 5) Insert under the user's session (RLS sees auth.uid())
    // Return the inserted row so the UI can verify success immediately.
    const { data: row, error } = await supabase
      .from("discs")
      .insert([clean])
      .select("*")
      .single();

    if (error) {
      // Bubble up a clearer hint for common RLS failures
      const isRls = /row[-\s]?level security/i.test(error.message || "");
      const msg = isRls
        ? "Insert blocked by RLS. Ensure a policy allows INSERT when owner = auth.uid()."
        : (error.message || "Insert failed");
      return res.status(400).json({ error: msg, code: error.code });
    }

    // 201 Created with the new resource
    return res.status(201).json({ ok: true, data: row });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Discs create error:", e);
    return res.status(500).json({ error: "Server error creating listing" });
  }
}
