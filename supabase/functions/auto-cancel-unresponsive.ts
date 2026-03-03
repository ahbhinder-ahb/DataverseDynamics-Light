// supabase/functions/auto-cancel-unresponsive/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY2")!

const SERVICE_ACCOUNT_EMAIL = Deno.env.get("SERVICE_ACCOUNT_EMAIL")!
const SERVICE_ACCOUNT_KEY = Deno.env.get("SERVICE_ACCOUNT_KEY")!
const SERVICE_ACCOUNT_KEY_ID = Deno.env.get("SERVICE_ACCOUNT_KEY_ID")!

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "")

  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function createJWT(): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: SERVICE_ACCOUNT_KEY_ID,
  }

  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600

  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: exp,
    iat: iat,
  }

  const headerEncoded = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")

  const payloadEncoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")

  const signatureInput = `${headerEncoded}.${payloadEncoded}`

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(SERVICE_ACCOUNT_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signatureInput)
  )

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")

  return `${signatureInput}.${signatureEncoded}`
}

async function getGoogleAccessToken(): Promise<string> {
  const jwt = await createJWT()
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await response.json()
  return data.access_token
}

async function deleteCalendarEvent(accessToken: string, eventId: string) {
  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
    console.log(`✅ Deleted calendar event: ${eventId}`)
  } catch (error) {
    console.error(`❌ Failed to delete calendar event ${eventId}:`, error.message)
  }
}

async function sendEmail(to: string, subject: string, html: string, text?: string) {
  try {
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
    })
    console.log(`✅ Email sent to ${to}: ${subject}`)
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message)
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    console.log("🔍 Starting auto-cancel check for unresponsive meetings...")

    // Get all meetings that meet auto-cancel criteria:
    // - Status is "Meet Link Generated" (no confirm/cancel response)
    // - reminder_sent = true (reminder email was already sent)
    // - Event ID exists (calendar event is created)
    // - Meeting time is less than 12 hours away
    const { data: records, error } = await supabase
      .from("Contact Us Details")
      .select("*")
      .eq("status", "Meet Link Generated")
      .eq("reminder_sent", true)
      .not("event_id", "is", null)
      .not("preferred_date", "is", null)
      .not("preferred_time", "is", null)

    if (error) {
      console.error("❌ Database query error:", error.message)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!records || records.length === 0) {
      console.log("ℹ️ No unresponsive meetings found")
      console.log("📝 Query filters applied:")
      console.log("   - status = 'Meet Link Generated'")
      console.log("   - reminder_sent = true")
      console.log("   - event_id NOT NULL")
      console.log("   - preferred_date NOT NULL")
      console.log("   - preferred_time NOT NULL")
      return new Response(JSON.stringify({ message: "No unresponsive meetings to cancel", count: 0, fetched: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log(`📋 Found ${records.length} potential candidates for auto-cancel`)
    
    // Log details of fetched records
    for (const rec of records) {
      console.log(`   - ${rec.full_name}: ${rec.preferred_date} ${rec.preferred_time} (reminder_sent: ${rec.reminder_sent}, event_id: ${rec.event_id})`)
    }

    let cancelledCount = 0
    const accessToken = await getGoogleAccessToken()

    for (const record of records) {
      try {
        // Calculate hours until meeting
        // Times are stored as GMT+5 in database
        // Parse without explicit timezone, then subtract 5 hours to get actual UTC equivalent
        const meetingDateTimeAsUTC = new Date(`${record.preferred_date}T${record.preferred_time}:00`)
        const gmtPlus5OffsetMs = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
        const meetingDateTime = new Date(meetingDateTimeAsUTC.getTime() - gmtPlus5OffsetMs)
        const now = new Date()
        const hoursUntilMeeting = (meetingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

        console.log(`⏰ ${record.full_name} - Meeting in ${hoursUntilMeeting.toFixed(1)} hours (Status: ${record.status})`)

        // Only auto-cancel if less than 12 hours away
        if (hoursUntilMeeting < 12 && hoursUntilMeeting >= 0) {
          console.log(`✅ ELIGIBLE FOR AUTO-CANCEL: ${record.full_name} (${hoursUntilMeeting.toFixed(1)} hours)`)
          console.log(`🚫 Auto-cancelling unresponsive meeting for ${record.full_name}`)

          // Delete calendar event
          await deleteCalendarEvent(accessToken, record.event_id)

          // Format date for email
          const formattedDate = new Date(record.preferred_date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })

          // Send cancellation email to user
          const userCancelHTML = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#e74c3c 0%,#c0392b 100%);padding:30px;text-align:center;">
              <h1 style="color:#fff;margin:0;">Meeting Cancelled</h1>
              <p style="color:#f0f0f0;margin:10px 0 0 0;">Dataverse Dynamics</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p>Hi <strong>${record.full_name}</strong>,</p>
              <p>We have automatically cancelled your scheduled consultation as we did not receive a confirmation from you.</p>
              <p><strong>Cancelled Meeting Details:</strong></p>
              <p>
                <strong>Date:</strong> ${formattedDate}<br/>
                <strong>Time:</strong> ${record.preferred_time}<br/>
                <strong>Service:</strong> ${record.service_of_interest}<br/>
                <strong>Company:</strong> ${record.company}
              </p>
              <p>No action is needed on your part. If you wish to reschedule your consultation, please visit our website to book a new time slot.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center">
                    <a href="https://dataversedynamics.org" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:bold;">
                      Book a New Consultation
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
          `

          const userCancelText = `Hi ${record.full_name},

We have automatically cancelled your scheduled consultation as we did not receive a confirmation from you.

Cancelled Meeting Details:
Date: ${formattedDate}
Time: ${record.preferred_time}
Service: ${record.service_of_interest}
Company: ${record.company}

No action is needed on your part. If you wish to reschedule your consultation, please visit our website to book a new time slot.

https://dataversedynamics.org

Dataverse Dynamics Team`

          await sendEmail(
            record.email,
            "Meeting Cancelled - No Response - Dataverse Dynamics",
            userCancelHTML,
            userCancelText
          )

          // Send notification to admin
          const adminNotifyHTML = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#e74c3c;padding:30px;text-align:center;color:#fff;">
              <h2 style="margin:0;">Auto-Cancelled: No Response</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p><strong>Name:</strong> ${record.full_name}</p>
              <p><strong>Email:</strong> ${record.email}</p>
              <p><strong>Company:</strong> ${record.company}</p>
              <p><strong>Service:</strong> ${record.service_of_interest}</p>
              <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
              <p><strong>Scheduled Time:</strong> ${record.preferred_time}</p>
              <p><strong>Reason:</strong> No response to confirmation/cancellation request. Auto-cancelled by system.</p>
              <p><strong>Meeting Link:</strong> ${record.meet_link || "N/A"}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `

          await sendEmail(
            "meeting@dataversedynamics.org",
            `Auto-Cancelled - No Response - ${record.company}`,
            adminNotifyHTML
          )

          // Update database with cancellation details
          await supabase
            .from("Contact Us Details")
            .update({
              status: "Cancelled - No Response",
              cancelled_reason: "Auto-cancelled due to no response after reminder",
              preferred_date: null,
              preferred_time: null,
            })
            .eq("id", record.id)

          cancelledCount++
          console.log(`✅ Successfully auto-cancelled meeting for ${record.full_name}`)
        } else if (hoursUntilMeeting >= 12) {
          console.log(`⏳ TOO FAR AWAY: ${record.full_name} (${hoursUntilMeeting.toFixed(1)} hours >= 12 hours threshold)`)
        } else if (hoursUntilMeeting < 0) {
          console.log(`⏭️ ALREADY PASSED: ${record.full_name} (meeting time ${hoursUntilMeeting.toFixed(1)} hours in the past)`)
        }
      } catch (error) {
        console.error(`❌ Error processing ${record.full_name}:`, error.message)
      }
    }

    console.log(`✅ Auto-cancel check completed. Cancelled ${cancelledCount} meetings.`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-cancelled ${cancelledCount} unresponsive meetings`,
        count: cancelledCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("❌ Unexpected error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
