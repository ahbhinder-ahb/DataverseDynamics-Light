import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY2")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBSITE_URL = Deno.env.get("WEBSITE_URL") || "https://dataversedynamics.org";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
}

serve(async (req) => {
  try {
    const body = await req.json();

    if (body.type !== "UPDATE") {
      return new Response("Not update", { status: 200 });
    }

    const record = body.record;
    const oldRecord = body.old_record;

    if (!record.meet_link) {
      return new Response("No meet link", { status: 200 });
    }

    if (record.initial_email_sent) {
      return new Response("Already emailed", { status: 200 });
    }

    if (oldRecord && oldRecord.meet_link === record.meet_link) {
      return new Response("Meet link unchanged", { status: 200 });
    }

    const formattedDate = new Date(record.preferred_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formattedTime = new Date(record.preferred_date + "T" + record.preferred_time)
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const confirmLink = `${SUPABASE_URL}/functions/v1/confirm-meeting?action=confirm&id=${record.id}`;
    const cancelLink = `${SUPABASE_URL}/functions/v1/confirm-meeting?action=cancel&id=${record.id}`;
    const meetLink = `${WEBSITE_URL}/meeting-room/${record.id}?source=client`;

    const emailHTML = `
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
              <h1 style="color:#fff;margin:0;">Consultation Booking</h1>
              <p style="color:#f0f0f0;margin:10px 0 0 0;">Dataverse Dynamics</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p>Hi <strong>${record.full_name}</strong>,</p>
              <p>Your consultation has been scheduled:</p>
              <p><strong>Date:</strong> ${formattedDate}<br/>
                 <strong>Time:</strong> ${formattedTime}<br/>
                 <strong>Service:</strong> ${record.service_of_interest}<br/>
                 <strong>Company:</strong> ${record.company}</p>

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

    const emailText = `Hi ${record.full_name},

Your consultation is scheduled:
Date: ${formattedDate}
Time: ${formattedTime}
Service: ${record.service_of_interest}
Company: ${record.company}

Meet Link: ${meetLink}

Confirm: ${confirmLink}
Cancel: ${cancelLink}

Dataverse Dynamics Team`;

    await sendEmail(
      record.email,
      `Consultation Booking - ${record.company}`,
      emailHTML,
      emailText
    );

    await sleep(2200);

    const teamEmailHTML = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;">
  <h2>New Consultation Booking</h2>
  <p><strong>Name:</strong> ${record.full_name}</p>
  <p><strong>Email:</strong> ${record.email}</p>
  <p><strong>Company:</strong> ${record.company}</p>
  <p><strong>Service:</strong> ${record.service_of_interest}</p>
  <p><strong>Date:</strong> ${formattedDate}</p>
  <p><strong>Time:</strong> ${formattedTime}</p>
  <p><strong>Meet Link:</strong> <a href="${meetLink}">${meetLink}</a></p>
</body></html>
    `;

    await sendEmail(
      "meeting@dataversedynamics.org",
      `New Booking - ${record.company}`,
      teamEmailHTML
    );

    // Mark email as sent
    await fetch(
      `${SUPABASE_URL}/rest/v1/Contact%20Us%20Details?id=eq.${record.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "apikey": SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({ initial_email_sent: true }),
      }
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});