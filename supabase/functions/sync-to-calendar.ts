// supabase/functions/sync-to-calendar/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req) => {
  try {
    const body = await req.json();

    if (body.type !== "INSERT") {
      return new Response(JSON.stringify({ message: "Not an INSERT event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const record = body.record;

    // Update status to "Pending Calendar"
    // Apps Script will pick up this change and create the calendar event
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/Contact%20Us%20Details?id=eq.${record.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "apikey": SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({ status: "Pending Calendar" }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update status: ${updateResponse.status} ${errorText}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Status updated to Pending Calendar. Apps Script will create calendar event." 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Sync-to-calendar error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});