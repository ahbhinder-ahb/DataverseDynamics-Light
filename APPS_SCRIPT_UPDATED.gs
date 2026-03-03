/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - MEETING SCHEDULER WITH GOOGLE MEET
 * ============================================================================
 * 
 * CONFIGURATION:
 * 1. Set these properties in Apps Script:
 *    - SUPABASE_URL: Your Supabase URL
 *    - SUPABASE_KEY: Your Supabase service role key
 *    - WEBHOOK_SECRET: A secret key for HMAC validation (e.g., "your-secret-key-12345")
 *    - MEETING_DURATION_MINUTES: Default meeting duration (e.g., 30)
 * 
 * 2. Add Calendar API scope to appsscript.json:
 *    https://www.googleapis.com/auth/calendar
 * 
 * 3. Deploy as Web App (new URL will be provided)
 * 
 * NOTE: Database times are stored in GMT+5 (local timezone)
 *       Apps Script converts them to UTC for Google Calendar API
 * ============================================================================
 */

// ============================================================================
// 1. MEETING CREATION & SYNC (Automated Polling)
// ============================================================================

/**
 * Creates Google Calendar events for pending bookings and syncs Meet links
 * Run this as a trigger every 1 minute
 */
function createMeetAndSync() {
  try {
    const props = PropertiesService.getScriptProperties();
    const supabaseUrl = props.getProperty("SUPABASE_URL");
    const supabaseKey = props.getProperty("SUPABASE_KEY");

    // Validate configuration
    if (!supabaseUrl || !supabaseKey) {
      Logger.log("❌ ERROR: Supabase credentials not set in Properties");
      return;
    }

    // Query Supabase for pending bookings or bookings with errors (to retry)
    // Matches: status="Pending Calendar" OR status contains "Error"
    const filterString = 'or=(status.eq."Pending Calendar",status.ilike."%Error%")';
    const url = `${supabaseUrl}/rest/v1/Contact%20Us%20Details?${encodeURIComponent(filterString)}&meet_link=is.null&event_id=is.null&order=created_at.desc&limit=10`;

    const response = UrlFetchApp.fetch(url, {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log(`❌ Supabase query failed: ${response.getResponseCode()} - ${response.getContentText()}`);
      return;
    }

    const bookings = JSON.parse(response.getContentText());

    if (!bookings || bookings.length === 0) {
      Logger.log("ℹ️ No pending bookings to process");
      return;
    }

    Logger.log(`📊 Found ${bookings.length} pending bookings`);

    for (const booking of bookings) {
      try {
        // Set status to "Processing" to prevent duplicate processing
        updateBookingStatus(booking.id, "Processing", supabaseUrl, supabaseKey);
        Logger.log(`⏳ Processing booking ${booking.id} - status set to "Processing"`);

        // Create calendar event with retry logic
        const result = createCalendarEventWithRetry(booking, 3, supabaseUrl, supabaseKey);
        
        if (!result) {
          // Retry failed after 3 attempts
          updateBookingStatus(booking.id, "Error - Calendar Creation Failed", supabaseUrl, supabaseKey);
          Logger.log(`❌ Failed to create event for booking ${booking.id} after 3 retries`);
          continue;
        }

        // Update booking with event details
        updateBookingWithMeetLink(
          booking.id,
          result.eventId,
          result.meetLink,
          supabaseUrl,
          supabaseKey
        );

        Logger.log(`✅ Created event for booking ${booking.id}: ${result.meetLink}`);
      } catch (error) {
        Logger.log(`❌ Error processing booking ${booking.id}: ${error.message}`);
        updateBookingStatus(booking.id, `Error - ${error.message}`, supabaseUrl, supabaseKey);
      }
    }

    Logger.log("✅ Calendar sync completed");
  } catch (error) {
    Logger.log(`❌ createMeetAndSync error: ${error.message}`);
  }
}

/**
 * Creates a calendar event with retry logic
 * @param {Object} booking - Booking object from Supabase
 * @param {number} maxRetries - Number of retry attempts
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} supabaseKey - Supabase API key
 * @returns {Object|null} - {eventId, meetLink} or null if failed
 */
function createCalendarEventWithRetry(booking, maxRetries, supabaseUrl, supabaseKey) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      Logger.log(`🔄 Attempt ${attempt}/${maxRetries} to create event for booking ${booking.id}`);
      return createCalendarEvent(booking);
    } catch (error) {
      lastError = error;
      Logger.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);

      // Wait before retrying (exponential backoff: 2s, 4s, 8s)
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        Utilities.sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  Logger.log(`❌ All ${maxRetries} retry attempts failed. Last error: ${lastError.message}`);
  return null;
}

/**
 * Creates a Google Calendar event with Google Meet link
 * @param {Object} booking - Booking object from Supabase
 * @returns {Object} - {eventId, meetLink}
 */
function createCalendarEvent(booking) {
  // Validate required fields
  if (!booking.preferred_date || !booking.preferred_time) {
    throw new Error("Missing preferred_date or preferred_time");
  }

  // Validate time format (HH:MM or HH:MM:SS)
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(booking.preferred_time)) {
    throw new Error(`Invalid time format: "${booking.preferred_time}". Expected HH:MM or HH:MM:SS (24-hour)`);
  }

  // Remove seconds if present (convert "14:00:00" to "14:00")
  const timeWithoutSeconds = booking.preferred_time.split(":").slice(0, 2).join(":");

  // Parse date and time (converts from GMT+5 to UTC for Google Calendar)
  const eventDate = parseEventDateTime(booking.preferred_date, timeWithoutSeconds);

  // Get meeting duration from properties (default: 30 minutes)
  const props = PropertiesService.getScriptProperties();
  const durationMinutes = parseInt(props.getProperty("MEETING_DURATION_MINUTES") || "30");
  const endDate = new Date(eventDate.getTime() + durationMinutes * 60000);

  const eventBody = {
    summary: `Meeting with ${booking.full_name || "Guest"}`,
    description:
      `Email: ${booking.email}\n` +
      `Phone: ${booking.phone_number || "N/A"}\n` +
      `Company: ${booking.company || "N/A"}`,
    start: { 
      dateTime: eventDate.toISOString()
    },
    end: { 
      dateTime: endDate.toISOString()
    },
    attendees: [{ email: booking.email }],
    conferenceData: {
      createRequest: {
        requestId: `meeting-${booking.id}-${Date.now()}`
      }
    }
  };

  const eventResponse = UrlFetchApp.fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ScriptApp.getOAuthToken()}`,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(eventBody),
      muteHttpExceptions: true
    }
  );

  if (eventResponse.getResponseCode() !== 200) {
    const errorDetails = eventResponse.getContentText();
    throw new Error(`Calendar API error (${eventResponse.getResponseCode()}): ${errorDetails}`);
  }

  const createdEvent = JSON.parse(eventResponse.getContentText());

  if (!createdEvent.id) {
    throw new Error("Failed to create calendar event - no event ID returned");
  }

  // Extract Meet link
  let meetLink = null;
  if (createdEvent.conferenceData && createdEvent.conferenceData.entryPoints) {
    for (const entry of createdEvent.conferenceData.entryPoints) {
      if (entry.entryPointType === "video") {
        meetLink = entry.uri;
        break;
      }
    }
  }

  if (!meetLink) {
    throw new Error("Meet link not generated by Google Calendar API");
  }

  return {
    eventId: createdEvent.id,
    meetLink: meetLink
  };
}

/**
 * Parses event date and time from database
 * Database times are stored in GMT+5 (local timezone)
 * Converts them to UTC for Google Calendar API
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {string} timeStr - Time string (HH:MM in 24-hour format)
 * @returns {Date} - Date object in UTC
 */
function parseEventDateTime(dateStr, timeStr) {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD`);
  }

  const [hours, minutes] = timeStr.split(":").map(x => parseInt(x, 10));

  // Validate time values
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: hours=${hours}, minutes=${minutes}`);
  }

  // Database times are in GMT+5
  // Create ISO string with Z (UTC) marker, then subtract 5 hours to convert GMX+5 to UTC
  const eventDate = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`);
  
  // Subtract 5 hours to convert from GMT+5 to UTC
  eventDate.setHours(eventDate.getHours() - 5);
  
  return eventDate;
}

/**
 * Updates booking with generated Meet link and event ID
 * @param {string} bookingId - Booking ID
 * @param {string} eventId - Google Calendar event ID
 * @param {string} meetLink - Google Meet link
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} supabaseKey - Supabase API key
 */
function updateBookingWithMeetLink(bookingId, eventId, meetLink, supabaseUrl, supabaseKey) {
  const url = `${supabaseUrl}/rest/v1/Contact%20Us%20Details?id=eq.${bookingId}`;

  const response = UrlFetchApp.fetch(url, {
    method: "PATCH",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    payload: JSON.stringify({
      event_id: eventId,
      meet_link: meetLink,
      status: "Meet Link Generated"
    }),
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();
  if (responseCode !== 200 && responseCode !== 204) {
    throw new Error(`Failed to update booking in Supabase (${responseCode}): ${response.getContentText()}`);
  }

  Logger.log(`✅ Updated booking ${bookingId} with Meet link (status ${responseCode})`);
}

/**
 * Updates booking status
 * @param {string} bookingId - Booking ID
 * @param {string} status - New status
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} supabaseKey - Supabase API key
 */
function updateBookingStatus(bookingId, status, supabaseUrl, supabaseKey) {
  const url = `${supabaseUrl}/rest/v1/Contact%20Us%20Details?id=eq.${bookingId}`;

  const response = UrlFetchApp.fetch(url, {
    method: "PATCH",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    payload: JSON.stringify({ status: status }),
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();
  if (responseCode !== 200 && responseCode !== 204) {
    Logger.log(`⚠️ Warning: Failed to update booking status (${responseCode}): ${response.getContentText()}`);
  } else {
    Logger.log(`✅ Updated booking status to "${status}" (status ${responseCode})`);
  }
}

// ============================================================================
// 2. WEBHOOK HANDLERS (Confirm/Cancel via Query Parameters)
// ============================================================================

/**
 * Handles confirm/cancel webhook requests via POST (from Supabase Edge Functions)
 * Expected parameters: action, event_id, attendee_email
 * 
 * Also validates HMAC signature for security
 */
function doPost(e) {
  return processWebhook(e);
}

/**
 * Handles confirm/cancel webhook requests via GET (from direct links/fetch GET)
 * Expected parameters: action, event_id, attendee_email
 */
function doGet(e) {
  return processWebhook(e);
}

/**
 * Processes webhook request with authentication and validation
 * @param {Object} e - Event object from Apps Script (contains parameters)
 * @returns {ContentService} - Response to webhook caller
 */
function processWebhook(e) {
  try {
    // Check if parameters exist
    if (!e || !e.parameter) {
      Logger.log("❌ No parameters received");
      return sendWebhookResponse("error", 400, "No parameters provided");
    }

    const action = e.parameter.action;
    const eventId = e.parameter.event_id;
    const attendeeEmail = e.parameter.attendee_email;
    const signature = e.parameter.signature;

    Logger.log("📨 Webhook received:");
    Logger.log(`   Action: ${action}`);
    Logger.log(`   Event ID: ${eventId}`);
    Logger.log(`   Attendee Email: ${attendeeEmail}`);

    // Validate required parameters
    if (!action || !eventId || !attendeeEmail) {
      Logger.log("❌ Missing required parameters");
      return sendWebhookResponse("error", 400, "Missing parameters: action, event_id, attendee_email");
    }

    // Validate action
    if (!["confirm", "cancel"].includes(action)) {
      Logger.log(`❌ Invalid action: ${action}`);
      return sendWebhookResponse("error", 400, "Invalid action. Use 'confirm' or 'cancel'");
    }

    // Verify HMAC signature for security
    const props = PropertiesService.getScriptProperties();
    const webhookSecret = props.getProperty("WEBHOOK_SECRET");

    if (webhookSecret && signature) {
      const expectedSignature = generateHMAC(
        `${action}${eventId}${attendeeEmail}`,
        webhookSecret
      );

      if (signature !== expectedSignature) {
        Logger.log("❌ HMAC signature validation failed");
        return sendWebhookResponse("error", 403, "Unauthorized: invalid signature");
      }
      Logger.log("✅ HMAC signature validated successfully");
    } else if (webhookSecret) {
      Logger.log("⚠️ Warning: WEBHOOK_SECRET set but no signature provided");
      return sendWebhookResponse("error", 403, "Unauthorized: signature required");
    }

    // Process action
    if (action === "confirm") {
      Logger.log("✅ Processing CONFIRM");
      const success = updateAttendeeStatusWithRetry(eventId, attendeeEmail, "accepted", 3);
      
      if (success) {
        return sendWebhookResponse("success", 200, "Meeting confirmed successfully");
      } else {
        return sendWebhookResponse("error", 500, "Failed to confirm meeting after retries");
      }
    }

    if (action === "cancel") {
      Logger.log("✅ Processing CANCEL");
      
      // Update status first
      const statusUpdated = updateAttendeeStatusWithRetry(eventId, attendeeEmail, "declined", 3);
      
      if (!statusUpdated) {
        return sendWebhookResponse("error", 500, "Failed to update attendee status");
      }

      // Delete the event (with alternative methods to prevent notifications)
      const deleted = deleteEventWithoutNotification(eventId);
      
      if (deleted) {
        return sendWebhookResponse("success", 200, "Meeting cancelled successfully");
      } else {
        return sendWebhookResponse("error", 500, "Failed to delete event");
      }
    }

  } catch (error) {
    Logger.log(`❌ Webhook error: ${error.message}`);
    Logger.log(`   Stack: ${error.stack}`);
    return sendWebhookResponse("error", 500, `Server error: ${error.message}`);
  }
}

/**
 * Sends a formatted webhook response
 * @param {string} status - "success" or "error"
 * @param {number} code - HTTP status code
 * @param {string} message - Response message
 */
function sendWebhookResponse(status, code, message) {
  const response = {
    status: status,
    code: code,
    message: message,
    timestamp: new Date().toISOString()
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Updates attendee status with retry logic
 * @param {string} eventId - Google Calendar event ID
 * @param {string} attendeeEmail - Attendee email to update
 * @param {string} responseStatus - Status: "accepted" or "declined"
 * @param {number} maxRetries - Number of retry attempts
 * @returns {boolean} - true if successful, false if all retries failed
 */
function updateAttendeeStatusWithRetry(eventId, attendeeEmail, responseStatus, maxRetries) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      Logger.log(`🔄 Attempt ${attempt}/${maxRetries} to update attendee status`);
      updateAttendeeStatus(eventId, attendeeEmail, responseStatus);
      Logger.log(`✅ Successfully updated attendee to: ${responseStatus}`);
      return true;
    } catch (error) {
      lastError = error;
      Logger.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);

      // Wait before retrying
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        Utilities.sleep(delayMs);
      }
    }
  }

  Logger.log(`❌ All ${maxRetries} retry attempts failed. Last error: ${lastError.message}`);
  return false;
}

/**
 * Updates attendee response status in Google Calendar
 * @param {string} eventId - Google Calendar event ID
 * @param {string} attendeeEmail - Attendee email to update
 * @param {string} responseStatus - "accepted" or "declined"
 */
function updateAttendeeStatus(eventId, attendeeEmail, responseStatus) {
  Logger.log(`🔍 Fetching event: ${eventId}`);

  // Get event details
  const getResponse = UrlFetchApp.fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
      muteHttpExceptions: true
    }
  );

  if (getResponse.getResponseCode() !== 200) {
    throw new Error(`Failed to fetch event (${getResponse.getResponseCode()}): ${getResponse.getContentText()}`);
  }

  const event = JSON.parse(getResponse.getContentText());

  if (!event.attendees || event.attendees.length === 0) {
    throw new Error("Event has no attendees");
  }

  // Find and update the attendee
  let attendeeFound = false;
  const updatedAttendees = event.attendees.map(attendee => {
    if (attendee.email && attendee.email.toLowerCase() === attendeeEmail.toLowerCase()) {
      attendeeFound = true;
      return {
        email: attendee.email,
        displayName: attendee.displayName || "",
        responseStatus: responseStatus,
        optional: attendee.optional || false
      };
    }
    return attendee;
  });

  if (!attendeeFound) {
    throw new Error(`Attendee not found: ${attendeeEmail}`);
  }

  // Update the event
  const patchResponse = UrlFetchApp.fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=none`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify({ attendees: updatedAttendees }),
      muteHttpExceptions: true
    }
  );

  if (patchResponse.getResponseCode() !== 200) {
    throw new Error(`PATCH failed (${patchResponse.getResponseCode()}): ${patchResponse.getContentText()}`);
  }

  Logger.log(`✅ Attendee updated to: ${responseStatus}`);
}

/**
 * Deletes event without sending cancellation notifications
 * 
 * Strategy: Change attendee email to dummy address, then delete
 * This prevents real user from receiving cancellation email
 * 
 * @param {string} eventId - Google Calendar event ID
 * @returns {boolean} - true if successful, false otherwise
 */
function deleteEventWithoutNotification(eventId) {
  try {
    Logger.log(`🔍 Fetching event for deletion: ${eventId}`);

    // Get event to find attendees
    const getResponse = UrlFetchApp.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
        muteHttpExceptions: true
      }
    );

    if (getResponse.getResponseCode() !== 200) {
      Logger.log(`❌ Failed to fetch event: ${getResponse.getResponseCode()}`);
      return false;
    }

    const event = JSON.parse(getResponse.getContentText());

    // Step 1: Replace attendee emails with dummy address
    if (event.attendees && event.attendees.length > 0) {
      Logger.log(`📝 Replacing ${event.attendees.length} attendee(s) with dummy address`);

      const dummyAttendees = event.attendees.map(attendee => ({
        email: `noreply-cancelled-${Date.now()}@localhost.local`,
        responseStatus: attendee.responseStatus || "needsAction"
      }));

      const patchResponse = UrlFetchApp.fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=none`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
            "Content-Type": "application/json"
          },
          payload: JSON.stringify({ attendees: dummyAttendees }),
          muteHttpExceptions: true
        }
      );

      if (patchResponse.getResponseCode() !== 200) {
        Logger.log(`⚠️ Warning: Failed to replace attendees: ${patchResponse.getResponseCode()}`);
        // Continue anyway, deletion might still work
      } else {
        Logger.log("✅ Attendees replaced with dummy address");
      }

      // Step 2: Wait before deletion to allow Google to process the change
      Logger.log("⏳ Waiting 2 seconds before deletion...");
      Utilities.sleep(2000);
    }

    // Step 3: Delete the event
    const deleteResponse = UrlFetchApp.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=none`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
        muteHttpExceptions: true
      }
    );

    if (deleteResponse.getResponseCode() === 204 || deleteResponse.getResponseCode() === 200) {
      Logger.log("✅ Event deleted successfully without sending cancellation email to real user");
      return true;
    } else {
      Logger.log(`❌ Delete failed (${deleteResponse.getResponseCode()}): ${deleteResponse.getContentText()}`);
      return false;
    }

  } catch (error) {
    Logger.log(`❌ deleteEventWithoutNotification error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// 3. SECURITY & UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates HMAC-SHA256 signature for webhook authentication
 * 
 * Usage in Supabase Edge Function:
 * const signature = crypto.subtle.digest('SHA-256', 
 *   new TextEncoder().encode(message + secret)
 * ).then(hash => btoa(String.fromCharCode(...new Uint8Array(hash))))
 * 
 * @param {string} message - Message to sign
 * @param {string} secret - Secret key
 * @returns {string} - Base64-encoded HMAC-SHA256 signature
 */
function generateHMAC(message, secret) {
  const hmac = Utilities.computeHmacSha256Signature(message, secret);
  const signature = Utilities.base64Encode(hmac);
  return signature;
}

/**
 * DEBUG FUNCTION: Test HMAC signature generation
 * Run this in Apps Script editor to verify signature format
 */
function testHMAC() {
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty("WEBHOOK_SECRET");

  if (!secret) {
    Logger.log("❌ WEBHOOK_SECRET not set");
    return;
  }

  const testMessage = "confirmABC123xyz@example.com";
  const signature = generateHMAC(testMessage, secret);

  Logger.log("HMAC Test Results:");
  Logger.log(`Message: ${testMessage}`);
  Logger.log(`Secret: ${secret}`);
  Logger.log(`Signature: ${signature}`);
  Logger.log("");
  Logger.log("Use this signature for testing webhook calls");
}

/**
 * DEBUG FUNCTION: Test event date/time parsing
 * Converts from GMT+5 (database) to UTC (Google Calendar)
 */
function testDateParsing() {
  const testDate = "2026-02-20";
  const testTime = "15:00";  // 15:00 GMT+5

  Logger.log("Date/Time Parsing Test:");
  Logger.log(`Input Date: ${testDate}`);
  Logger.log(`Input Time: ${testTime} (GMT+5 local time)`);

  const parsed = parseEventDateTime(testDate, testTime);
  
  Logger.log(`Converted to UTC: ${parsed.toISOString()}`);
  
  // Calculate what GMT+5 will show: UTC + 5 hours
  const calendarDisplayTime = new Date(parsed.getTime() + 5 * 60 * 60 * 1000);
  Logger.log(`Google Calendar (GMT+5) will display: ${calendarDisplayTime.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`);
  Logger.log("");
  Logger.log("✅ Conversion successful!");
  Logger.log("Database: 15:00 GMT+5 → UTC: 10:00 → Calendar display: 15:00 GMT+5");
}

// ============================================================================
// 4. SETUP INSTRUCTIONS
// ============================================================================

/**
 * RUN THIS ONCE to display setup instructions
 * Copy and paste the required properties into your Apps Script project
 */
function displaySetupInstructions() {
  const message = `
📋 SETUP INSTRUCTIONS FOR GOOGLE APPS SCRIPT
==============================================

1. CONFIGURE PROPERTIES:
   Go to Project Settings (gear icon) → Scripting Properties
   Add the following properties:

   ✅ SUPABASE_URL
      Value: (your Supabase URL, e.g., https://xxx.supabase.co)

   ✅ SUPABASE_KEY
      Value: (your Supabase service role key)

   ✅ WEBHOOK_SECRET
      Value: (create a strong secret, e.g., "aH7$kL9@Zm2x5Q*vP3W")

   ✅ MEETING_DURATION_MINUTES
      Value: (default duration, e.g., 30)

2. UPDATE APPSSCRIPT.JSON:
   In the Apps Script editor, go to Project Settings → Show "appsscript.json"

   Ensure oauthScopes includes:
   "https://www.googleapis.com/auth/calendar"

   Example appsscript.json:
   {
     "timeZone": "America/New_York",
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8",
     "oauthScopes": [
       "https://www.googleapis.com/auth/calendar"
     ]
   }

3. DEPLOY AS WEB APP:
   Click Deploy → New deployment
   Type: "Web app"
   Execute as: (your Google account)
   Who has access: "Anyone"
   
   Copy the deployment URL - this is your webhook URL

4. UPDATE SUPABASE EDGE FUNCTION:
   In confirm-meeting/index.ts:
   
   const webhookUrl = "https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT_ID/exec";
   const signature = await generateSignature(message, webhookSecret);
   
   fetch(webhookUrl + \`?action=\${action}&event_id=\${eventId}&attendee_email=\${email}&signature=\${signature}\`)

5. SET UP AUTOMATION TRIGGERS:
   Go to Triggers (alarm clock icon)
   Create trigger:
   - Function: createMeetAndSync
   - Event type: Time-driven
   - Frequency: Every 1 minute

6. TEST:
   Run testHMAC() to see signature format
   Run testDateParsing() to verify date/time parsing
   Check Execution log for results

NOTE: Database times are stored in GMT+5 (local timezone)
      Apps Script automatically converts them to UTC for Google Calendar API
      User sees times in GMT+5, Google Calendar API receives UTC times

✅ DONE! Your system is ready to process bookings automatically
  `;

  Logger.log(message);
  
  // Also display as alert in Apps Script GUI
  const ui = SpreadsheetApp.getUi && SpreadsheetApp.getUi().alert ? SpreadsheetApp.getUi() : null;
  if (ui) {
    ui.alert(message);
  }
}

// ============================================================================
// 5. REMOVED CODE (no longer needed)
// ============================================================================

// REMOVED: generateMeetId() - Dead code
// This function was never used. Google Calendar API generates Meet IDs automatically.

// ============================================================================
