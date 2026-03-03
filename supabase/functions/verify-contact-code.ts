// verify-contact-code/index.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sha256Hex(input: string) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function safeParseJson(req: Request) {
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return await req.json();
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

serve(async (req) => {
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

  try {
    const payload = await safeParseJson(req);

    // Basic validation
    const verificationIdRaw = payload?.verification_id ?? payload?.id;
    const codeRaw = payload?.code ?? payload?.verification_code;
    if (!verificationIdRaw || !codeRaw) {
      return new Response(JSON.stringify({ success: false, error: "missing_fields" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    const verificationId = String(verificationIdRaw).trim();
    const code = String(codeRaw).trim();

    // fetch verification record (ensure not used and not expired)
    const { data: ver, error: verErr } = await supabase
      .from("contact_verifications")
      .select("id, code_hash, payload, expires_at, used")
      .eq("id", verificationId)
      .maybeSingle();

    if (verErr) {
      console.error("DB fetch error:", verErr);
      return new Response(JSON.stringify({ success: false, error: "db_error" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (!ver) {
      return new Response(JSON.stringify({ success: false, error: "not_found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (ver.used) {
      return new Response(JSON.stringify({ success: false, error: "already_used" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (ver.expires_at && new Date(ver.expires_at) < new Date()) {
      return new Response(JSON.stringify({ success: false, error: "expired" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    const codeHash = await sha256Hex(code);
    if (codeHash !== ver.code_hash) {
      // Log for debugging (avoid logging real codes in prod)
      console.warn("Invalid code attempt", { verificationId, codeHashReceived: codeHash, storedHashSample: ver.code_hash?.slice(0,8) });
      return new Response(JSON.stringify({ success: false, error: "invalid_code" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // Insert contact into "Contact Us Details" table using stored payload
    const contactPayload = ver.payload ?? {};
    const contactRow = {
      full_name: contactPayload.name ?? contactPayload.fullName ?? contactPayload.full_name ?? null,
      email: contactPayload.email ?? null,
      company: contactPayload.company ?? contactPayload.companyName ?? contactPayload.company_name ?? null,
      phone_number: contactPayload.phone ?? contactPayload.phone_number ?? null,
      service_of_interest: contactPayload.service_of_interest ?? contactPayload.service ?? null,
      message: contactPayload.message ?? null,
      preferred_date: contactPayload.preferred_date ?? null,
      preferred_time: contactPayload.preferred_time ?? null,
    };

    const { data: insertData, error: insertErr } = await supabase
      .from("Contact Us Details")
      .insert([contactRow])
      .select()
      .single();

    if (insertErr) {
      console.error("Insert contact error:", insertErr);
      return new Response(JSON.stringify({ success: false, error: "db_insert_error" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // Mark verification as used
    await supabase.from("contact_verifications").update({ used: true, used_at: new Date().toISOString() }).eq("id", verificationId);

    return new Response(JSON.stringify({ success: true, contact: insertData }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("verify-contact-code error:", err);
    return new Response(JSON.stringify({ success: false, error: "internal_error", detail: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
});