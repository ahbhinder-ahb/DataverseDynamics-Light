import { corsHeaders } from "./cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      name,
      email,
      phone,
      company,
      service_of_interest,
      message,
      preferred_date,
      preferred_time,
    } = await req.json();

    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      throw new Error("Server configuration error: Missing Email API Key");
    }

    // Delay helper (3 seconds)
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    // Format time to AM/PM
    function formatTimeTo12Hour(timeStr: string) {
      if (!timeStr) return "Not provided";

      const [hours = "0", minutes = "0", seconds = "0"] = timeStr.split(":");

      const date = new Date();
      date.setHours(Number(hours), Number(minutes), Number(seconds));

      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    }

    const formattedTime = formatTimeTo12Hour(preferred_time);

    // -------------------------------
    // 1) USER CONFIRMATION EMAIL
    // -------------------------------
    const userEmailHtml = `
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
              <h1 style="color:#fff;margin:0;">Consultation Request</h1>
              <p style="color:#f0f0f0;margin:10px 0 0 0;">Dataverse Dynamics</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p>Hi <strong>${name}</strong>,</p>
              <p>Thank you for contacting <strong><a href="https://dataversedynamics.org" target="_blank" style="color:#2563eb;text-decoration:none;">Dataverse Dynamics (Global)</a></strong>.</p>
              <p>We have received your request for a free consultation regarding <strong>${service_of_interest}</strong>.</p>
              <p>Our team is reviewing your requirements and will be in touch shortly to schedule your session.</p>
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

    const userEmailText = `Hi ${name},

Thank you for contacting Dataverse Dynamics (Global).
We have received your request for a free consultation regarding ${service_of_interest}.
Our team is reviewing your requirements and will be in touch shortly to schedule your session.

Dataverse Dynamics Team`;

    const userEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Dataverse Dynamics <contact@dataversedynamics.org>",
        to: [email],
        subject: "Your Free Consultation Request – Dataverse Dynamics",
        html: userEmailHtml,
        text: userEmailText,
      }),
    });

    if (!userEmailRes.ok) {
      const errorData = await userEmailRes.text();
      console.error("Error sending user email:", errorData);
      throw new Error("User email failed. Admin email cancelled.");
    }

    // Wait 3 seconds before admin email
    await delay(3000);

    // -------------------------------
    // 2) ADMIN NOTIFICATION EMAIL
    // -------------------------------
    const adminEmailHtml = `
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
              <h1 style="color:#fff;margin:0;">New Consultation Request</h1>
              <p style="color:#f0f0f0;margin:10px 0 0 0;">Dataverse Dynamics</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
              <p><strong>Company:</strong> ${company}</p>
              <p><strong>Service of Interest:</strong> ${service_of_interest}</p>
              <p><strong>Date:</strong> ${preferred_date}</p>
              <p><strong>Time:</strong> ${formattedTime}</p>
              <hr style="margin:20px 0;border:0;border-top:1px solid #e2e8f0;" />
              <p><strong>Message:</strong></p>
              <div style="background:#f8fafc;padding:15px;border-radius:6px;">
                ${String(message || "").replace(/\\n/g, "<br>")}
              </div>
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

    const adminEmailText = `New Consultation Request

Name: ${name}
Email: ${email}
Phone: ${phone || "Not provided"}
Company: ${company}
Service of Interest: ${service_of_interest}
Date: ${preferred_date}
Time: ${formattedTime}

Message:
${message || ""}`;

    const adminEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Dataverse Dynamics Request <contact@dataversedynamics.org>",
        to: ["inquiry@dataversedynamics.org"],
        subject: `Consultation Request - ${name} – ${service_of_interest} – ${company}`,
        html: adminEmailHtml,
        text: adminEmailText,
      }),
    });

    if (!adminEmailRes.ok) {
      const errorData = await adminEmailRes.text();
      console.error("Error sending admin email:", errorData);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Emails sent in sequence" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-consultation-emails function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});