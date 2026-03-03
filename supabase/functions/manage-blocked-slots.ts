import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
}

// Constants for business hours: 8:00 AM to 5:30 PM (17:30)
const BUSINESS_HOURS_START = "08:00"
const BUSINESS_HOURS_END = "17:30"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const body = await req.json()
    const action = body.action

    // ==================== GET ALL BLOCKED SLOTS (next 2 months) ====================
    if (action === "list") {
      // Calculate date range for next 2 months
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const twoMonthsLater = new Date(today)
      twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2)
      
      const startDate = today.toISOString().split("T")[0]
      const endDate = twoMonthsLater.toISOString().split("T")[0]

      const { data: blockedSlots, error } = await supabase
        .from("blocked_time_slots")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch blocked slots: ${error.message}`)
      }

      return new Response(JSON.stringify({ success: true, data: blockedSlots }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ==================== GET BLOCKED SLOTS FOR SPECIFIC DATE ====================
    if (action === "get_by_date") {
      const { date } = body

      if (!date) {
        throw new Error("Missing 'date' parameter")
      }

      const { data: blockedSlots, error } = await supabase
        .from("blocked_time_slots")
        .select("*")
        .eq("date", date)
        .order("start_time", { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch blocked slots: ${error.message}`)
      }

      return new Response(JSON.stringify({ success: true, data: blockedSlots }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ==================== CREATE BLOCKED SLOT ====================
    if (action === "create") {
      const { date, start_time, end_time, is_recurring, recurring_pattern, reason } = body

      // Validation
      if (!date || !start_time || !end_time) {
        throw new Error("Missing required fields: date, start_time, end_time")
      }

      if (end_time <= start_time) {
        throw new Error("end_time must be after start_time")
      }

      // Validate times are within business hours (8:00 AM - 5:30 PM)
      if (start_time < BUSINESS_HOURS_START || start_time > BUSINESS_HOURS_END) {
        throw new Error(`start_time must be between ${BUSINESS_HOURS_START} and ${BUSINESS_HOURS_END}`)
      }
      
      if (end_time < BUSINESS_HOURS_START || end_time > BUSINESS_HOURS_END) {
        throw new Error(`end_time must be between ${BUSINESS_HOURS_START} and ${BUSINESS_HOURS_END}`)
      }

      if (is_recurring && !recurring_pattern) {
        throw new Error("recurring_pattern is required when is_recurring is true")
      }

      // Check for existing blocked slot with same date and time range
      const { data: existingSlots, error: checkError } = await supabase
        .from("blocked_time_slots")
        .select("*")
        .eq("date", date)
        .eq("start_time", start_time)
        .eq("end_time", end_time)
        .eq("is_recurring", is_recurring || false)

      if (checkError) {
        throw new Error(`Failed to check for existing slots: ${checkError.message}`)
      }

      if (existingSlots && existingSlots.length > 0) {
        throw new Error(`This time slot (${start_time} - ${end_time}) is already blocked on ${date}`)
      }

      const { data: blockedSlot, error } = await supabase
        .from("blocked_time_slots")
        .insert([
          {
            date,
            start_time,
            end_time,
            is_recurring: is_recurring || false,
            recurring_pattern: recurring_pattern || null,
            reason: reason || null,
            blocked_by_admin: null,
          },
        ])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create blocked slot: ${error.message}`)
      }

      console.log(`✅ Created blocked slot: ${date} from ${start_time} to ${end_time}`)

      return new Response(JSON.stringify({ success: true, data: blockedSlot }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ==================== UPDATE BLOCKED SLOT ====================
    if (action === "update") {
      const { id, date, start_time, end_time, is_recurring, recurring_pattern, reason } = body

      if (!id) {
        throw new Error("Missing 'id' parameter")
      }

      if (end_time && start_time && end_time <= start_time) {
        throw new Error("end_time must be after start_time")
      }

      // Validate times are within business hours if provided
      if (start_time && (start_time < BUSINESS_HOURS_START || start_time > BUSINESS_HOURS_END)) {
        throw new Error(`start_time must be between ${BUSINESS_HOURS_START} and ${BUSINESS_HOURS_END}`)
      }
      
      if (end_time && (end_time < BUSINESS_HOURS_START || end_time > BUSINESS_HOURS_END)) {
        throw new Error(`end_time must be between ${BUSINESS_HOURS_START} and ${BUSINESS_HOURS_END}`)
      }

      const updateData: any = {}
      if (date !== undefined) updateData.date = date
      if (start_time !== undefined) updateData.start_time = start_time
      if (end_time !== undefined) updateData.end_time = end_time
      if (is_recurring !== undefined) updateData.is_recurring = is_recurring
      if (recurring_pattern !== undefined) updateData.recurring_pattern = recurring_pattern
      if (reason !== undefined) updateData.reason = reason

      const { data: blockedSlot, error } = await supabase
        .from("blocked_time_slots")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update blocked slot: ${error.message}`)
      }

      console.log(`✅ Updated blocked slot: ${id}`)

      return new Response(JSON.stringify({ success: true, data: blockedSlot }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ==================== DELETE BLOCKED SLOT ====================
    if (action === "delete") {
      const { id } = body

      if (!id) {
        throw new Error("Missing 'id' parameter")
      }

      const { error } = await supabase.from("blocked_time_slots").delete().eq("id", id)

      if (error) {
        throw new Error(`Failed to delete blocked slot: ${error.message}`)
      }

      console.log(`✅ Deleted blocked slot: ${id}`)

      return new Response(JSON.stringify({ success: true, message: "Blocked slot deleted" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ==================== GET BLOCKED SLOTS FOR DATE RANGE (expanded to 30-min slots) ====================
    if (action === "get_for_range") {
      const { start_date, end_date } = body

      if (!start_date || !end_date) {
        throw new Error("Missing 'start_date' or 'end_date' parameter")
      }

      // Get base blocked slots within the range
      const { data: baseSlots, error: baseError } = await supabase
        .from("blocked_time_slots")
        .select("*")
        .gte("date", start_date)
        .lte("date", end_date)

      if (baseError) {
        throw new Error(`Failed to fetch blocked slots: ${baseError.message}`)
      }

      // Expand recurring slots AND convert time ranges to individual 30-min slots
      // This exactly matches the format used in get-booked-slots
      const expandedSlots: any[] = []
      const startDate = new Date(start_date)
      const endDate = new Date(end_date)

      for (const slot of baseSlots || []) {
        // Generate dates for this slot (either single date or recurring pattern)
        const datesToProcess: string[] = []
        
        if (!slot.is_recurring) {
          datesToProcess.push(slot.date)
        } else {
          // Generate dates matching the recurring pattern
          const currentDate = new Date(startDate)
          while (currentDate <= endDate) {
            if (matchesRecurringPattern(currentDate, slot.recurring_pattern)) {
              const formattedDate = currentDate.toISOString().split("T")[0]
              datesToProcess.push(formattedDate)
            }
            currentDate.setDate(currentDate.getDate() + 1)
          }
        }
        
        // For each date, expand the time range into 30-min slots
        for (const date of datesToProcess) {
          // Parse start and end times
          const [startHours, startMins] = slot.start_time.split(':').map(Number)
          const [endHours, endMins] = slot.end_time.split(':').map(Number)
          
          // Convert to minutes since midnight for easier calculation
          const startTotalMins = startHours * 60 + startMins
          const endTotalMins = endHours * 60 + endMins
          
          // Generate all 30-min slots within this range
          for (let mins = startTotalMins; mins < endTotalMins; mins += 30) {
            const hours = Math.floor(mins / 60)
            const minutes = mins % 60
            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
            
            expandedSlots.push({
              date,
              time: timeStr,
              reason: slot.reason,
              slot_id: slot.id,
            })
          }
        }
      }

      return new Response(JSON.stringify({ success: true, data: expandedSlots }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to check if date matches recurring pattern
function matchesRecurringPattern(date: Date, pattern: string): boolean {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()

  if (pattern === "daily") return true
  if (pattern === "weekly_monday") return dayName === "monday"
  if (pattern === "weekly_tuesday") return dayName === "tuesday"
  if (pattern === "weekly_wednesday") return dayName === "wednesday"
  if (pattern === "weekly_thursday") return dayName === "thursday"
  if (pattern === "weekly_friday") return dayName === "friday"
  if (pattern === "weekly_saturday") return dayName === "saturday"
  if (pattern === "weekly_sunday") return dayName === "sunday"
  if (pattern === "weekdays") return dayName !== "saturday" && dayName !== "sunday"
  if (pattern === "weekends") return dayName === "saturday" || dayName === "sunday"

  return false
}
