// supabase/functions/confirm-meeting/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY2")!
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")!

const APPS_SCRIPT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbwZe68HrKerx258yuIZDiAnVQ1JWI6HjCKaKpni5ZpLp2DFz5wxrrhiOzsZ2HSqxd-txg/exec"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function sendEmail(to: string, subject: string, html: string, text?: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Dataverse Dynamics <meeting@dataversedynamics.org>",
      to: [to],
      subject,
      html,
      text: text || "",
      reply_to: "meeting@dataversedynamics.org",
    }),
  })
}

/**
 * Generates Base64 HMAC-SHA256 signature.
 * Must match Apps Script's Utilities.computeHmacSha256Signature + base64Encode.
 */
async function generateHmacBase64(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
  const signatureBytes = new Uint8Array(signatureBuffer)

  // Convert to Base64
  let binary = ""
  for (const b of signatureBytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary)
}

const CONFIRM_URL = "https://dataversedynamics.org/meeting-confirmed"
const CONFIRM_ALREADY_URL = "https://dataversedynamics.org/meeting-confirmed?status=already"
const CANCEL_URL = "https://dataversedynamics.org/meeting-cancelled"
const CANCEL_ALREADY_URL = "https://dataversedynamics.org/meeting-cancelled?status=already"
const ERROR_URL = "https://dataversedynamics.org/meeting-error"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      },
    });
  }

  try {
    const url = new URL(req.url);
    
    // Get parameters from either query string (GET) or body (POST)
    let action = url.searchParams.get("action");
    let recordId = url.searchParams.get("id");
    let source = url.searchParams.get("source");

    // If POST request, extract from body
    if (req.method === "POST") {
      try {
        const body = await req.json();
        action = body.action || action;
        recordId = body.id || recordId;
        source = body.source || source;
      } catch (e) {
        console.log("Could not parse body as JSON");
      }
    }

    const isAdminCancel = source === "admin";

    if (!action || !recordId) {
      return new Response(JSON.stringify({ error: "Missing action or id" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
        },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: record, error: fetchError } = await supabase
      .from("Contact Us Details")
      .select("*")
      .eq("id", recordId)
      .single()

    if (fetchError || !record) {
      return new Response(JSON.stringify({ error: "Record not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
        },
      });
    }

    const isCancelled =
      !record.preferred_date ||
      !record.preferred_time ||
      (record.status && record.status.toLowerCase().includes("cancel"))

    if (action === "confirm") {
      if (isCancelled) {
        if (req.method === "POST") {
          return new Response(JSON.stringify({ error: "Meeting already cancelled", status: "already_cancelled" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
            },
          });
        }
        return Response.redirect(CONFIRM_ALREADY_URL, 302);
      }

      if (record.status === "Confirmed") {
        if (req.method === "POST") {
          return new Response(JSON.stringify({ error: "Meeting already confirmed", status: "already_confirmed" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
            },
          });
        }
        return Response.redirect(CONFIRM_ALREADY_URL, 302);
      }

      // Call Apps Script webhook with HMAC signature
      if (record.event_id) {
        try {
          const message = `confirm${record.event_id}${record.email}`
          const signature = await generateHmacBase64(message, WEBHOOK_SECRET)

          const webhookUrl =
            `${APPS_SCRIPT_WEBHOOK_URL}` +
            `?action=confirm` +
            `&event_id=${encodeURIComponent(record.event_id)}` +
            `&attendee_email=${encodeURIComponent(record.email)}` +
            `&signature=${encodeURIComponent(signature)}`

          const webhookResponse = await fetch(webhookUrl, { method: "GET" })
          const webhookText = await webhookResponse.text()
          console.log(`Webhook response: ${webhookText}`)
        } catch (error) {
          console.error(`Error calling webhook: ${error.message}`)
        }
      }

      await supabase.from("Contact Us Details").update({ status: "Confirmed" }).eq("id", recordId)

      const formattedDate = new Date(record.preferred_date).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      })

      const teamEmailHTML = `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif;">
  <h2>Meeting Confirmed</h2>
  <p><strong>${record.full_name}</strong> confirmed the meeting.</p>
  <p>Date: ${formattedDate} | Time: ${record.preferred_time}</p>
  <p>Meet Link: <a href="${record.meet_link}">${record.meet_link}</a></p>
</body></html>`

      await sendEmail("meeting@dataversedynamics.org", `Meeting Confirmed - ${record.company}`, teamEmailHTML)
      await sleep(2200)

      if (req.method === "POST") {
        return new Response(JSON.stringify({ success: true, message: "Meeting confirmed" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
          },
        });
      }
      return Response.redirect(CONFIRM_URL, 302)
    }

    if (action === "cancel") {
      if (isCancelled) {
        if (req.method === "POST") {
          return new Response(JSON.stringify({ error: "Meeting already cancelled", status: "already_cancelled" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
            },
          });
        }
        return Response.redirect(CANCEL_ALREADY_URL, 302)
      }

      // Call Apps Script webhook with HMAC signature
      if (record.event_id) {
        try {
          const message = `cancel${record.event_id}${record.email}`
          const signature = await generateHmacBase64(message, WEBHOOK_SECRET)

          const webhookUrl =
            `${APPS_SCRIPT_WEBHOOK_URL}` +
            `?action=cancel` +
            `&event_id=${encodeURIComponent(record.event_id)}` +
            `&attendee_email=${encodeURIComponent(record.email)}` +
            `&signature=${encodeURIComponent(signature)}`

          const webhookResponse = await fetch(webhookUrl, { method: "GET" })
          const webhookText = await webhookResponse.text()
          console.log(`Webhook response: ${webhookText}`)
        } catch (error) {
          console.error(`Error calling webhook: ${error.message}`)
        }
      }

      await supabase.from("Contact Us Details").update({
        status: isAdminCancel ? "Cancelled by Admin" : "Cancelled by Client",
        cancelled_reason: isAdminCancel
          ? "Cancelled by Admin"
          : "Client cancelled via email link",
        preferred_date: null,
        preferred_time: null,
      }).eq("id", recordId)

      const teamEmailHTML = `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif;">
  <h2>Meeting Cancelled</h2>
  <p><strong>${record.full_name}</strong> ${isAdminCancel ? "was cancelled by admin" : "cancelled the meeting"}.</p>
</body></html>`

      await sendEmail("meeting@dataversedynamics.org", `Meeting Cancelled - ${record.company}`, teamEmailHTML)
      await sleep(2200)

      const clientCancelHTML = `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif;">
  <h2>Meeting Cancelled</h2>
  <p>Your consultation meeting has been cancelled${isAdminCancel ? " by the admin" : " as requested"}.</p>
</body></html>`

      await sendEmail(record.email, "Meeting Cancelled - Dataverse Dynamics", clientCancelHTML)

      if (req.method === "POST") {
        return new Response(JSON.stringify({ success: true, message: "Meeting cancelled" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
          },
        });
      }
      return Response.redirect(CANCEL_URL, 302)
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", detail: String(error) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      },
    });
  }
})