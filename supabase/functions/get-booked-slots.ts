// get-booked-slots edge function
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TABLE_NAME = "Contact Us Details";

function normalizeDate(val: any) {
  if (!val) return null;
  if (typeof val === "string" && val.includes("T")) return val.split("T")[0];
  return String(val);
}
function normalizeTime(val: any) {
  if (!val) return null;
  const s = String(val);
  const m = s.match(/(\d{2}:\d{2})/);
  return m ? m[1] : s;
}

function matchesRecurringPattern(date: Date, pattern: string): boolean {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  
  if (pattern === "daily") return true;
  if (pattern === "weekly_monday") return dayName === "monday";
  if (pattern === "weekly_tuesday") return dayName === "tuesday";
  if (pattern === "weekly_wednesday") return dayName === "wednesday";
  if (pattern === "weekly_thursday") return dayName === "thursday";
  if (pattern === "weekly_friday") return dayName === "friday";
  if (pattern === "weekly_saturday") return dayName === "saturday";
  if (pattern === "weekly_sunday") return dayName === "sunday";
  if (pattern === "weekdays") return dayName !== "saturday" && dayName !== "sunday";
  if (pattern === "weekends") return dayName === "saturday" || dayName === "sunday";
  
  return false;
}

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "*";
  const requestedHeaders = req.headers.get("access-control-request-headers") ?? "Content-Type, Authorization, X-Client-Info";
  const CORS_HEADERS: Record<string,string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": requestedHeaders,
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json().catch(() => ({}));
    const { start_date, end_date } = body;
    
    console.log(`🔵 get-booked-slots called with: start_date=${start_date}, end_date=${end_date}`);
    
    if (!start_date || !end_date) {
      return new Response(JSON.stringify({ error: "start_date and end_date required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // =============== GET BOOKED SLOTS ===============
    // Simple query that works with PostgREST - no complex filters
    const tablePath = encodeURIComponent(TABLE_NAME);
    const url = `${SUPABASE_URL}/rest/v1/${tablePath}?select=preferred_date,preferred_time,status&preferred_date=gte.${start_date}&preferred_date=lte.${end_date}&limit=1000`;

    console.log(`🌐 Fetching from REST API (simple query)`);
    //console.log(`🔵 get-booked-slots called with: start_date=${start_date}, end_date=${end_date}`);
    //console.log(`🔍 REQUEST HEADERS:`, Object.fromEntries(req.headers.entries()));
    
    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Accept: "application/json",
      },
    });

    const text = await resp.text();
    console.log(`📡 REST API response status: ${resp.status}, body length: ${text.length}`);
    
    if (!resp.ok) {
      console.error(`❌ REST API error: ${text}`);
      return new Response(JSON.stringify({ error: text }), {
        status: resp.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const bookedData = JSON.parse(text || "[]");
    console.log(`📊 Raw booked data from REST API (count: ${(bookedData || []).length}):`, bookedData);
    
    // Filter to only include active bookings (confirmed or meet link generated)
    // AND exclude entries without preferred_time
    // Each consultation blocks only the selected 30-minute slot
    const booked = (bookedData || [])
      .filter((r: any) => {
        const status = String(r.status || '').toLowerCase();
        const hasTime = r.preferred_time && r.preferred_time !== null;
        const isActive = status === 'confirmed' || status === 'meet link generated';
        if (!isActive || !hasTime) {
          console.log(`📝 Filtering out: status=${r.status}, time=${r.preferred_time}, active=${isActive}`);
        }
        return isActive && hasTime;
      })
      .map((r: any) => {
        // Each booking blocks only the selected 30-minute slot
        const date = normalizeDate(r.preferred_date);
        const time = normalizeTime(r.preferred_time);
        
        if (!date || !time) {
          console.log(`⚠️ Skipping - no date or time:`, r);
          return null;
        }
        
        console.log(`📌 Booking at ${date} ${time}`);
        
        // Return only the selected slot
        return { date, time };
      })
      .filter((item) => item !== null && item.date && item.time); // Filter out null values
    
    console.log(`✅ Processed booked slots (count: ${booked.length}):`, booked);

    // =============== GET BLOCKED SLOTS ===============
    const { data: blockedSlots, error: blockedError } = await supabase
      .from("blocked_time_slots")
      .select("*")
      .gte("date", start_date)
      .lte("date", end_date);

    if (blockedError) {
      console.error("Error fetching blocked slots:", blockedError);
      // Continue without blocked slots on error
    }

    // Expand recurring blocked slots and convert time ranges to individual 30-min slots
    // This matches the format used for booked slots
    const blocked: any[] = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    for (const slot of blockedSlots || []) {
      // Generate dates for this slot (either single date or recurring pattern)
      const datesToProcess: string[] = [];
      
      if (!slot.is_recurring) {
        datesToProcess.push(slot.date);
      } else {
        // Generate dates matching the recurring pattern
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          if (matchesRecurringPattern(currentDate, slot.recurring_pattern)) {
            const formattedDate = currentDate.toISOString().split("T")[0];
            datesToProcess.push(formattedDate);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      // For each date, expand the time range into 30-min slots
      for (const date of datesToProcess) {
        // Parse start and end times
        const [startHours, startMins] = slot.start_time.split(':').map(Number);
        const [endHours, endMins] = slot.end_time.split(':').map(Number);
        
        // Convert to minutes since midnight for easier calculation
        const startTotalMins = startHours * 60 + startMins;
        const endTotalMins = endHours * 60 + endMins;
        
        // Generate all 30-min slots within this range
        for (let mins = startTotalMins; mins < endTotalMins; mins += 30) {
          const hours = Math.floor(mins / 60);
          const minutes = mins % 60;
          const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          
          blocked.push({
            date,
            time: timeStr,
            reason: slot.reason,
          });
          
          console.log(`🔒 Blocked slot: ${date} ${timeStr} (reason: ${slot.reason || 'N/A'})`);
        }
      }
    }

    console.log(`🔒 Final blocked slots (count: ${blocked.length}):`, blocked);
    console.log(`📅 Returning response: booked=${booked.length}, blocked=${blocked.length}`);
    
    return new Response(JSON.stringify({ booked, blocked }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
