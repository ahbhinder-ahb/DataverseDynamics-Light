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
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch all qualifying bookings for cron execution
    let query = supabase
      .from("Contact Us Details")
      .select("*")
      .in("status", ["Meet Link Generated", "Confirmed"])
      .eq("initial_email_sent", true)
      .eq("reminder_sent", false)
      .not("preferred_date", "is", null)
      .not("preferred_time", "is", null);

    const { data: bookings, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching bookings:", fetchError);
      return new Response(JSON.stringify({ error: "fetch_error", detail: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!bookings || bookings.length === 0) {
      console.log("✅ No bookings found that need reminders");
      return new Response(JSON.stringify({ success: true, message: "No reminders to send" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`📋 Checking ${bookings.length} booking(s) for reminders...`);

    let remindersSent = 0;
    const now = new Date();

    for (const booking of bookings) {
      try {
        // Parse meeting date and time (both stored as GMT+5 in database)
        // Parse without explicit timezone, then subtract 5 hours to get actual UTC equivalent
        const meetingDateTimeAsUTC = new Date(`${booking.preferred_date}T${booking.preferred_time}:00`);
        const gmtPlus5OffsetMs = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
        const meetingDateTimeInUTC = new Date(meetingDateTimeAsUTC.getTime() - gmtPlus5OffsetMs);
        
        // Calculate hours until meeting
        const hoursUntilMeeting = (meetingDateTimeInUTC.getTime() - now.getTime()) / (1000 * 60 * 60);

        console.log(`📅 Booking ${booking.id}: ${hoursUntilMeeting.toFixed(1)} hours until meeting`);

        // Skip if reminder already sent
        if (booking.reminder_sent) {
          console.log(`⏭️ Booking ${booking.id} already has reminder sent - skipping`);
          continue;
        }

        // Check if within 24-12 hour window
        if (hoursUntilMeeting > 12 && hoursUntilMeeting <= 24) {
          console.log(`✅ Booking ${booking.id} qualifies for reminder (${hoursUntilMeeting.toFixed(1)} hours)`);

          // Format date and time for email
          const dateObj = new Date(`${booking.preferred_date}T00:00:00Z`);
          const formattedDate = dateObj.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          // Format time directly from the string (already in GMT+5)
          const [hours, minutes] = booking.preferred_time.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          const formattedTime = `${displayHour}:${minutes} ${ampm}`;

          const confirmLink = `${SUPABASE_URL}/functions/v1/confirm-meeting?action=confirm&id=${booking.id}`;
          const cancelLink = `${SUPABASE_URL}/functions/v1/confirm-meeting?action=cancel&id=${booking.id}`;
          const meetLink = `${WEBSITE_URL}/meeting-room/${booking.id}?source=client`;

          // Determine email content based on booking status
          const isConfirmed = booking.status === "Confirmed";
          const statusLabel = isConfirmed ? "Confirmed" : "Tentative";

          // Reminder email HTML with status-specific content
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
              ${isConfirmed 
                ? `<p>This is a reminder that your confirmed consultation is happening soon!</p>`
                : `<p>This is a reminder about your upcoming consultation. Please confirm your attendance!</p>`
              }
              <p><strong>Date:</strong> ${formattedDate}<br/>
                 <strong>Time:</strong> ${formattedTime}<br/>
                 <strong>Service:</strong> ${booking.service_of_interest}<br/>
                 <strong>Company:</strong> ${booking.company}<br/>
                 <strong>Status:</strong> <span style="color:#667eea;font-weight:bold;">${statusLabel}</span></p>

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

              ${!isConfirmed 
                ? `<p style="color:#666;font-size:12px;margin-top:16px;border-top:1px solid #eee;padding-top:16px;">
                     Please confirm your attendance by clicking the "Confirm Meeting" button above. 
                     If you are unable to attend, please let us know by clicking "Cancel Meeting".
                   </p>`
                : `<p style="color:#666;font-size:12px;margin-top:16px;border-top:1px solid #eee;padding-top:16px;">
                     Your attendance has been confirmed. See you soon!
                   </p>`
              }
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

${isConfirmed 
  ? 'This is a reminder that your confirmed consultation is happening soon!'
  : 'This is a reminder about your upcoming consultation. Please confirm your attendance!'
}

Date: ${formattedDate}
Time: ${formattedTime}
Service: ${booking.service_of_interest}
Company: ${booking.company}
Status: ${statusLabel}

Meet Link: ${meetLink}

Confirm: ${confirmLink}
Cancel: ${cancelLink}

${!isConfirmed 
  ? 'Please confirm your attendance by clicking the Confirm Meeting link above. If you are unable to attend, please let us know by clicking the Cancel Meeting link.'
  : 'Your attendance has been confirmed. See you soon!'
}

Dataverse Dynamics Team`;

          // Send reminder email
          await sendEmail(
            booking.email,
            `⏰ Reminder: Your ${statusLabel} Consultation is Coming Soon - ${booking.company}`,
            reminderEmailHTML,
            reminderEmailText
          );

          // Update reminder_sent flag
          const { error: updateError } = await supabase
            .from("Contact Us Details")
            .update({ reminder_sent: true })
            .eq("id", booking.id);

          if (updateError) {
            console.error(`Error updating reminder_sent for booking ${booking.id}:`, updateError);
          } else {
            console.log(`✅ Reminder sent for booking ${booking.id}`);
            remindersSent++;
          }
        } else if (hoursUntilMeeting <= 12) {
          console.log(
            `⏭️ Booking ${booking.id} is too close (${hoursUntilMeeting.toFixed(1)} hours) - skipping reminder`
          );
        } else {
          console.log(
            `⏳ Booking ${booking.id} is too far away (${hoursUntilMeeting.toFixed(1)} hours) - checking next time`
          );
        }
      } catch (err) {
        console.error(`Error processing booking ${booking.id}:`, err);
      }
    }

    console.log(`✅ Reminder email task completed. Sent ${remindersSent} reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reminder emails sent successfully`,
        reminders_sent: remindersSent,
        bookings_checked: bookings.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in send-reminder-email:", error);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        detail: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
