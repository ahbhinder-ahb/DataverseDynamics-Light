// supabase/functions/sync-to-sheets/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"

const SERVICE_ACCOUNT_EMAIL = Deno.env.get("SERVICE_ACCOUNT_EMAIL")!
const SERVICE_ACCOUNT_KEY = Deno.env.get("SERVICE_ACCOUNT_KEY")!
const SERVICE_ACCOUNT_KEY_ID = Deno.env.get("SERVICE_ACCOUNT_KEY_ID")!
const GOOGLE_SHEETS_ID = Deno.env.get("GOOGLE_SHEETS_ID")!

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "") // remove all line breaks/spaces

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
    scope: "https://www.googleapis.com/auth/spreadsheets",
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

async function addRowToSheet(formData: any) {
  const accessToken = await getGoogleAccessToken()

  const values = [
    [
      formData.created_at || "",
      formData.full_name || "",
      formData.email || "",
      formData.company || "",
      formData.service_of_interest || "",
      formData.message || "",
      formData.preferred_date || "",
      formData.preferred_time || "",
      "",
      "",
      "",
      "",
      formData.phone_number || "",
      formData.id || "",
    ],
  ]

  const response = await fetch(
    `${GOOGLE_SHEETS_API}/${GOOGLE_SHEETS_ID}/values/Sheet1!A:N:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  )

  return response.json()
}

serve(async (req) => {
  try {
    const body = await req.json()
    const record = body.record

    console.log("📨 New record received:", record)

    if (body.type !== "INSERT") {
      return new Response(
        JSON.stringify({ message: "Not an INSERT event, skipping" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const sheetResult = await addRowToSheet(record)
    console.log("✅ Row added to Google Sheet:", sheetResult)

    return new Response(
      JSON.stringify({ success: true, result: sheetResult }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("❌ Error:", error)

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})