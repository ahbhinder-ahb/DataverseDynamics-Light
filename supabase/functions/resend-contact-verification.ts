// resend-contact-verification/index.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY2")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")!;
const SITE_NAME = Deno.env.get("SITE_NAME") ?? "Dataverse Dynamics";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function randomSixDigits() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sha256Hex(input: string) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sendEmail(to: string, code: string, name?: string) {
  const payload = {
    from: FROM_EMAIL,
    to: [to],
    subject: `${SITE_NAME} — Your verification code`,
    html: `
      <p>Hello ${name ?? ''},</p>
      <p>Your 6-digit verification code is: <strong>${code}</strong></p>
      <p>This code expires in 15 minutes.</p>
      <p>If you did not request this, ignore this email.</p>
      <br/>
      <p>— ${SITE_NAME}</p>
    `
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error: ${res.status} ${text}`);
  }
}

async function safeParseJson(req: Request) {
  let payload: any = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      const text = await req.text();
      payload = text ? JSON.parse(text) : {};
    }
  } catch {
    payload = {};
  }
  return payload;
}

serve(async (req) => {
  // Echo origin and requested headers for preflight
  const origin = req.headers.get("origin") ?? "*";
  const requestedHeaders = req.headers.get("access-control-request-headers") ?? "Content-Type, Authorization, X-Client-Info";
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": requestedHeaders,
    "Access-Control-Allow-Credentials": "true",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const payload = await safeParseJson(req);

  try {
    const verification_id = payload?.verification_id;
    if (!verification_id) return new Response(JSON.stringify({ error: "verification_id_required" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });

    const { data: row, error } = await supabase
      .from("contact_verifications")
      .select("*")
      .eq("id", verification_id)
      .limit(1)
      .single();

    if (error || !row) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    if (row.used) return new Response(JSON.stringify({ error: "already_used" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });

    const code = randomSixDigits();
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from("contact_verifications")
      .update({ code_hash: codeHash, expires_at: expiresAt })
      .eq("id", verification_id);

    await sendEmail(row.email, code, row.payload?.name);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("resend-contact-verification error:", err);
    return new Response(JSON.stringify({ error: "internal_error", detail: String(err) }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }
});