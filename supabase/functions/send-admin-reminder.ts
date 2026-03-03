import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY2");
const WEBSITE_URL = Deno.env.get("WEBSITE_URL") || "https://dataversedynamics.org";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
  console.error("Missing required environment variables");
  Deno.exit(1);
}

async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Dataverse Dynamics <meeting@dataversedynamics.org>",
      to: [to],
      subject: subject,
      html: html,
      text: text || "",
      reply_to: "meeting@dataversedynamics.org",
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.statusText}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("📋 Handling CORS preflight OPTIONS request");
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      },
    });
  }

  try {
    console.log(`📨 Received request method: ${req.method}, URL: ${req.url}`);
    console.log(`🔑 Environment check:`, {
      hasURL: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_KEY,
      hasResendKey: !!RESEND_API_KEY
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log(`✅ Supabase client created successfully`);
    
    if (req.method !== "POST") {
      console.error(`❌ Invalid method: ${req.method}`);
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    let requestBody = {};
    
    try {
      const bodyText = await req.text();
      console.log(`📦 Raw request body (${bodyText.length} chars):`, bodyText);
      
      if (bodyText && bodyText.length > 0) {
        try {
          requestBody = JSON.parse(bodyText);
          console.log(`✅ Successfully parsed JSON:`, JSON.stringify(requestBody));
        } catch (parseErr) {
          console.error(`❌ JSON parse error:`, parseErr.message);
          console.log(`📄 Attempted to parse:`, bodyText.substring(0, 200));
        }
      } else {
        console.warn(`⚠️ Request body is empty`);
      }
    } catch (readErr) {
      console.error(`❌ Error reading request body:`, readErr.message);
    }
    
    const bookingId = requestBody.booking_id;
    console.log(`🔑 Looking for booking_id, found:`, bookingId, `(type: ${typeof bookingId})`);

    if (!bookingId) {
      console.error("❌ No booking_id provided in request");
      return new Response(JSON.stringify({ error: "missing_booking_id", received: requestBody }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    console.log(`🔍 Fetching booking ${bookingId} for admin reminder...`);

    // Fetch the specific booking
    const { data: bookings, error: fetchError } = await supabase
      .from("Contact Us Details")
      .select("*")
      .eq("id", bookingId);

    if (fetchError) {
      console.error("Error fetching booking:", fetchError);
      return new Response(JSON.stringify({ error: "fetch_error", detail: fetchError.message }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (!bookings || bookings.length === 0) {
      console.error(`❌ Booking ${bookingId} not found`);
      return new Response(JSON.stringify({ error: "booking_not_found" }), {
        status: 404,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const booking = bookings[0];

    // Validate required fields
    if (!booking.email || !booking.preferred_date || !booking.preferred_time) {
      console.error(`❌ Booking ${bookingId} missing required contact information`);
      return new Response(JSON.stringify({ error: "incomplete_booking_data" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    console.log(`✅ Found booking for ${booking.full_name} - sending reminder...`);

    // Format date and time for email
    const formattedDate = new Date(booking.preferred_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formattedTime = new Date(`${booking.preferred_date}T${booking.preferred_time}`)
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const confirmLink = `${SUPABASE_URL}/functions/v1/confirm-meeting?action=confirm&id=${booking.id}`;
    const cancelLink = `${SUPABASE_URL}/functions/v1/confirm-meeting?action=cancel&id=${booking.id}`;
    const meetLink = `${WEBSITE_URL}/meeting-room/${booking.id}?source=client`;

    // Reminder email HTML
    const reminderEmailHTML = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;">
              <h1 style="color:#fff;margin:0;">📢 Consultation Reminder</h1>
              <p style="color:#f0f0f0;margin:10px 0 0 0;">Dataverse Dynamics</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p>Hi <strong>${booking.full_name}</strong>,</p>
              <p>This is a reminder that your consultation is coming up soon!</p>
              <p><strong>Date:</strong> ${formattedDate}<br/>
                 <strong>Time:</strong> ${formattedTime}<br/>
                 <strong>Service:</strong> ${booking.service_of_interest}<br/>
                 <strong>Company:</strong> ${booking.company}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center">
                    <a href="${meetLink}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:bold;">
                      Join Google Meet
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td align="left">
                    <a href="${confirmLink}" style="display:inline-block;background:#27ae60;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
                      ✅ Confirm Meeting
                    </a>
                  </td>
                  <td align="right">
                    <a href="${cancelLink}" style="display:inline-block;background:#e74c3c;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
                      ❌ Cancel Meeting
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9fa;padding:20px;text-align:center;color:#666;">
              Dataverse Dynamics Team
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const reminderEmailText = `Hi ${booking.full_name},

This is a reminder that your consultation is coming up soon!

Date: ${formattedDate}
Time: ${formattedTime}
Service: ${booking.service_of_interest}
Company: ${booking.company}

Meet Link: ${meetLink}

Confirm: ${confirmLink}
Cancel: ${cancelLink}

Dataverse Dynamics Team`;

    // Send reminder email
    await sendEmail(
      booking.email,
      `⏰ Reminder: Your Consultation is Coming Soon - ${booking.company}`,
      reminderEmailHTML,
      reminderEmailText
    );

    console.log(`📧 Email sent to ${booking.email}`);

    // Update reminder_sent flag
    const { error: updateError } = await supabase
      .from("Contact Us Details")
      .update({ reminder_sent: true })
      .eq("id", booking.id);

    if (updateError) {
      console.error(`Error updating reminder_sent for booking ${booking.id}:`, updateError);
      return new Response(
        JSON.stringify({
          error: "update_error",
          detail: "Email sent but failed to update database flag",
        }),
        {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`✅ Reminder successfully sent for booking ${booking.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reminder email sent successfully to ${booking.full_name}`,
        booking_id: booking.id,
        email: booking.email,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error in send-admin-reminder:", error);
    console.error(`📋 Error stack:`, error instanceof Error ? error.stack : "No stack trace");
    console.error(`📋 Error details:`, {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    
    return new Response(
      JSON.stringify({
        error: "internal_error",
        detail: String(error),
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
