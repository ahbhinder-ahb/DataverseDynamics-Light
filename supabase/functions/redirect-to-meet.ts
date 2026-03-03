import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBSITE_URL = (Deno.env.get("WEBSITE_URL") || "https://dataversedynamics.org").replace(/\/+$/, "");

const CANCEL_ALREADY_URL = `${WEBSITE_URL}/meeting-cancelled?status=already`;
const NOT_CONFIRMED_URL = `${WEBSITE_URL}/meeting-error?status=not-confirmed`;
const ERROR_URL = `${WEBSITE_URL}/meeting-error`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const bookingId = url.searchParams.get("id");
    const checkOnly = url.searchParams.get("check") === "1";

    if (!bookingId) {
      if (checkOnly) {
        return new Response(JSON.stringify({
          success: false,
          can_join: false,
          reason: "missing_id",
        }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      return Response.redirect(ERROR_URL, 302);
    }

    // Query Supabase for the booking
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/Contact%20Us%20Details?id=eq.${bookingId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "apikey": SUPABASE_SERVICE_KEY,
        },
      }
    );

    if (!response.ok) {
      if (checkOnly) {
        return new Response(JSON.stringify({
          success: false,
          can_join: false,
          reason: "lookup_failed",
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      return Response.redirect(ERROR_URL, 302);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      if (checkOnly) {
        return new Response(JSON.stringify({
          success: false,
          can_join: false,
          reason: "booking_not_found",
        }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      return Response.redirect(ERROR_URL, 302);
    }

    const booking = data[0];

    // Check if meeting is cancelled (matches "Cancelled", "Cancelled by Client", "Deleted", etc.)
    if (booking.status && (booking.status.includes("Cancelled") || booking.status.includes("Deleted"))) {
      if (checkOnly) {
        return new Response(JSON.stringify({
          success: true,
          can_join: false,
          reason: "cancelled",
          booking: {
            id: booking.id,
            full_name: booking.full_name,
            email: booking.email,
            preferred_date: booking.preferred_date,
            preferred_time: booking.preferred_time,
            status: booking.status,
          },
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      return Response.redirect(CANCEL_ALREADY_URL, 302);
    }

    const normalizedStatus = typeof booking.status === "string"
      ? booking.status.trim().toLowerCase()
      : "";

    if (normalizedStatus !== "confirmed") {
      if (checkOnly) {
        return new Response(JSON.stringify({
          success: true,
          can_join: false,
          reason: "not_confirmed",
          booking: {
            id: booking.id,
            full_name: booking.full_name,
            email: booking.email,
            preferred_date: booking.preferred_date,
            preferred_time: booking.preferred_time,
            status: booking.status,
          },
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      return Response.redirect(NOT_CONFIRMED_URL, 302);
    }

    // Check if meet link exists
    if (!booking.meet_link) {
      if (checkOnly) {
        return new Response(JSON.stringify({
          success: false,
          can_join: false,
          reason: "missing_meet_link",
          booking: {
            id: booking.id,
            full_name: booking.full_name,
            email: booking.email,
            preferred_date: booking.preferred_date,
            preferred_time: booking.preferred_time,
            status: booking.status,
          },
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      return Response.redirect(ERROR_URL, 302);
    }

    if (checkOnly) {
      return new Response(JSON.stringify({
        success: true,
        can_join: true,
        reason: "confirmed",
        booking: {
          id: booking.id,
          full_name: booking.full_name,
          email: booking.email,
          preferred_date: booking.preferred_date,
          preferred_time: booking.preferred_time,
          status: booking.status,
        },
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Redirect to the actual Google Meet link
    return Response.redirect(booking.meet_link, 302);
  } catch (error) {
    console.error("Error:", error);
    const url = new URL(req.url);
    const checkOnly = url.searchParams.get("check") === "1";
    if (checkOnly) {
      return new Response(JSON.stringify({
        success: false,
        can_join: false,
        reason: "internal_error",
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
    return Response.redirect(ERROR_URL, 302);
  }
});