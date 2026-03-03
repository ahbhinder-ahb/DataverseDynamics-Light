// supabase/functions/monitor-responses/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const SERVICE_ACCOUNT_EMAIL = Deno.env.get("SERVICE_ACCOUNT_EMAIL")!
const SERVICE_ACCOUNT_KEY = Deno.env.get("SERVICE_ACCOUNT_KEY")!
const SERVICE_ACCOUNT_KEY_ID = Deno.env.get("SERVICE_ACCOUNT_KEY_ID")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY2")!

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

async function getEventDetails(accessToken: string, eventId: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  return response.json()
}

async function deleteCalendarEvent(accessToken: string, eventId: string) {
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
}

async function sendEmail(to: string, subject: string, body: string) {
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
      text: body,
    }),
  })
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const accessToken = await getGoogleAccessToken()

    // Get all records with event_id and status "Meet Link Generated"
    const { data: records } = await supabase
      .from("Contact Us Details")
      .select("*")
      .eq("status", "Meet Link Generated")
      .not("event_id", "is", null)

    console.log(`📋 Checking ${records?.length || 0} meetings`)

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ message: "No meetings to check" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    for (const record of records) {
      try {
        const event = await getEventDetails(accessToken, record.event_id)

        if (!event.attendees) continue

        const attendeeStatus = event.attendees[0]?.responseStatus || "needsAction"
        let readableStatus = "Meet Link Generated"

        if (attendeeStatus === "accepted") readableStatus = "Accepted"
        if (attendeeStatus === "declined") readableStatus = "Declined"
        if (attendeeStatus === "tentative") readableStatus = "Tentative"

        console.log(`${record.full_name}: ${readableStatus}`)

        // SCENARIO 1: Accepted
        if (readableStatus === "Accepted") {
          await supabase
            .from("Contact Us Details")
            .update({ status: "Accepted" })
            .eq("id", record.id)

          await sendEmail(
            "meeting@dataversedynamics.org",
            `Accepted - ${record.company} - ${record.service_of_interest}`,
            `Meeting accepted by ${record.full_name}\nEmail: ${record.email}`
          )
        }

        // SCENARIO 2: Tentative
        if (readableStatus === "Tentative") {
          await supabase
            .from("Contact Us Details")
            .update({ status: "Tentative" })
            .eq("id", record.id)
        }

        // SCENARIO 3: Declined
        if (readableStatus === "Declined") {
          await deleteCalendarEvent(accessToken, record.event_id)

          await sendEmail(
            record.email,
            "Meeting Cancelled - Declined",
            `Hi ${record.full_name},\n\nThank you for your response. Since you declined, the meeting has been cancelled.\n\nFeel free to book again anytime.\n\nBest regards,\nDataverse Dynamics`
          )

          await sendEmail(
            "meeting@dataversedynamics.org",
            `Cancelled - Declined - ${record.company}`,
            `Meeting cancelled. Client declined.\n\nName: ${record.full_name}\nEmail: ${record.email}`
          )

          await supabase
            .from("Contact Us Details")
            .update({
              status: "Cancelled - Declined",
              preferred_date: null,
              preferred_time: null,
              cancelled_reason: "Declined",
            })
            .eq("id", record.id)
        }

        // SCENARIO 4: Auto-cancel (12 hours before)
        const meetingTime = new Date(record.preferred_date)
        meetingTime.setHours(new Date(record.preferred_time).getHours())
        const hoursLeft = (meetingTime.getTime() - Date.now()) / (1000 * 60 * 60)

        if (hoursLeft <= 12 && readableStatus === "Meet Link Generated") {
          await deleteCalendarEvent(accessToken, record.event_id)

          await sendEmail(
            record.email,
            "Meeting Cancelled - No Response",
            `Hi ${record.full_name},\n\nWe didn't receive confirmation for your meeting. It has been automatically cancelled.\n\nFeel free to book again.\n\nBest regards,\nDataverse Dynamics`
          )

          await sendEmail(
            "meeting@dataversedynamics.org",
            `Cancelled - No Response - ${record.company}`,
            `Auto-cancelled due to no response.\n\nName: ${record.full_name}\nEmail: ${record.email}`
          )

          await supabase
            .from("Contact Us Details")
            .update({
              status: "Cancelled - No Response",
              preferred_date: null,
              preferred_time: null,
              cancelled_reason: "No Response",
            })
            .eq("id", record.id)
        }

        // SCENARIO 5: Reminder (12-24 hours before)
        if (
          hoursLeft <= 24 &&
          hoursLeft > 12 &&
          !record.reminder_sent &&
          readableStatus === "Meet Link Generated"
        ) {
          await sendEmail(
            record.email,
            `Reminder: ${record.company} - ${record.service_of_interest}`,
            `Hi ${record.full_name},\n\nReminder: Your meeting is coming up soon.\n\n🔗 Join: ${record.meet_link}\n\nBest regards,\nDataverse Dynamics`
          )

          await supabase
            .from("Contact Us Details")
            .update({ reminder_sent: true })
            .eq("id", record.id)
        }
      } catch (err) {
        console.error(`Error processing ${record.full_name}:`, err)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("❌ Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})