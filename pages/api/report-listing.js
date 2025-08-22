// /pages/api/report-listing.js
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// optional: simple allow-list of your own domain to avoid abuse (tweak as needed)
const ALLOW_ORIGINS = [/localhost:\d+$/, /parkedplastic\.com$/i];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // (Basic) origin guard
    const origin = req.headers.origin || "";
    if (ALLOW_ORIGINS.length && !ALLOW_ORIGINS.some((r) => r.test(origin))) {
      // still allow on server-side preview where origin may be undefined
    }

    const {
      listingId,
      listingTitle,
      listingUrl,
      reason,
      details,
      reporterEmail,
    } = req.body || {};

    if (!listingId || !reason) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (!resend) {
      return res.status(500).json({ error: "Email service not configured." });
    }

    const subject = `Report: Listing ${listingId} — ${listingTitle || "Untitled"}`;
    const lines = [
      `Listing ID: ${listingId}`,
      listingTitle ? `Title: ${listingTitle}` : null,
      listingUrl ? `URL: ${listingUrl}` : null,
      `Reason: ${reason}`,
      details ? `Details: ${details}` : null,
      reporterEmail ? `Reporter Email: ${reporterEmail}` : null,
      `Received: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    await resend.emails.send({
      from: "team@parkedplastic.com", // change to your verified domain/sender
      to: "janneo011@gmail.com",
      subject,
      text: lines,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send email." });
  }
}
