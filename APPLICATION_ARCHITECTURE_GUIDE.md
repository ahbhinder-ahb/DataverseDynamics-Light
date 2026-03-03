# DATAVERSE DYNAMICS - COMPLETE APPLICATION ARCHITECTURE & WORKFLOW GUIDE

**Document Status:** Complete Master Reference  
**Last Updated:** February 28, 2026  
**Audience:** Senior Developers, Architects, DevOps  

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Complete Consultation Workflow](#complete-consultation-workflow)
4. [Database Schema](#database-schema)
5. [Email Communication Flow](#email-communication-flow)
6. [Automation & Cron Jobs](#automation--cron-jobs)
7. [Google Apps Script Integration](#google-apps-script-integration)
8. [Post-Meeting Workflow](#post-meeting-workflow)
9. [Invoice Management](#invoice-management)
10. [Security & Validation](#security--validation)
11. [Timezone Handling](#timezone-handling)
12. [Status Definitions](#status-definitions)
13. [Troubleshooting Guide](#troubleshooting-guide)

---

## EXECUTIVE SUMMARY

**Dataverse Dynamics** is a comprehensive B2B consulting platform that automates:
- Client consultation booking with email verification
- Google Meet link generation via Google Apps Script
- Automatic reminder and cancellation workflows
- Post-meeting project creation and tracking
- Invoice generation and payment tracking

**Key Features:**
- ✅ Real-time meeting status synchronization with Google Calendar
- ✅ Automated email workflows via Resend.com (8+ different email types)
- ✅ Admin dashboard with analytics and project management
- ✅ PWA support with offline capability
- ✅ Row-level security with role-based access control
- ✅ Complete audit trail of all bookings and projects

**Deployment:** Hostinger hosting + Supabase database + Google services

---

## TECHNOLOGY STACK

### Frontend
- **Framework:** React 18.3.1
- **Build Tool:** Vite 7.3.1
- **Routing:** React Router DOM 7.12.0
- **UI Components:** Radix UI
- **Styling:** Tailwind CSS 3.4.17
- **Animations:** Framer Motion 11.15.0
- **Icons:** Lucide React 0.469.0
- **Charts:** Recharts 2.12.7
- **PDF Export:** html2pdf.js 0.14.0
- **Excel Import:** XLSX 0.18.5
- **State Management:** React Context API
- **SEO:** React Helmet 6.1.0

### Backend
- **Database:** PostgreSQL (via Supabase)
- **Backend-as-a-Service:** Supabase (Auth, Edge Functions, Realtime)
- **Edge Functions Runtime:** Deno
- **Email Service:** Resend.com API
- **Calendar/Meeting:** Google Calendar API + Google Meet
- **Automation:** Google Apps Script
- **Hosting:** Hostinger

### DevOps & Build
- **Package Manager:** npm
- **Linting:** ESLint 8.57.1
- **CSS Processing:** PostCSS 8.4.49, Autoprefixer 10.4.20
- **Code Generation:** Babel 7.26.x
- **Service Workers:** Standard Web API

---

## COMPLETE CONSULTATION WORKFLOW

### PHASE 1: BOOKING INITIATION & EMAIL VERIFICATION

#### Step 1: User Submits Consultation Form

**Component:** `src/components/ConsultationModal.jsx`

```
User fills form with:
├─ Full Name (required)
├─ Email (required, validated)
├─ Company Name (required)
├─ Phone Number (optional, validated if provided)
├─ Service of Interest (required, dropdown with 40+ options)
├─ Message (required, multiline)
├─ Preferred Date (required, date picker)
└─ Preferred Time (required, time slider in 30-min intervals)

Form Validation Rules:
├─ Email: RFC 5322 standard email format
├─ Phone: +?[0-9()\s.\-]{7,} (if provided)
├─ Time: Must not be already booked
├─ Time: Must not be blocked by admin
├─ Time: Must be within business hours (8 AM - 5:30 PM)
├─ Time: Must be on business days (Mon-Fri)
└─ All required fields must be filled
```

#### Step 2: Email Verification Request

**Function:** `supabase/functions/request-contact-verification.ts`

```
POST /functions/v1/request-contact-verification
├─ Request Body:
│  ├─ email: customer@example.com
│  ├─ name: John Doe
│  ├─ company: ABC Corp
│  ├─ phone: +1-555-123-4567
│  ├─ service_of_interest: Website Development
│  ├─ message: "I need a website..."
│  ├─ preferred_date: 2026-03-15
│  └─ preferred_time: 14:00
│
├─ Server Processing:
│  ├─ Generate 6-digit code: Math.floor(100000 + Math.random() * 900000)
│  ├─ Hash code with SHA-256
│  │  └─ Storage: code_hash (never stores plain code)
│  ├─ Create record in contact_verifications table:
│  │  ├─ id: UUID (auto-generated)
│  │  ├─ email: {customer email}
│  │  ├─ code_hash: SHA-256(code)
│  │  ├─ payload: {entire form data as JSON}
│  │  ├─ expires_at: NOW() + 15 minutes
│  │  ├─ used: false
│  │  └─ used_at: NULL
│  │
│  └─ Send verification email via Resend.com
│     ├─ From: contact@dataversedynamics.org
│     ├─ To: customer.email
│     ├─ Subject: "Dataverse Dynamics — Your verification code"
│     └─ Body:
│        ├─ Your 6-digit code: {code}
│        ├─ This code expires in 15 minutes
│        └─ If you did not request this, ignore this email
│
└─ Response: { verification_id: "{uuid}" }
```

#### Step 3: User Enters Verification Code

**Component:** `src/components/ConsultationModal.jsx` (Verification Step)

```
User receives email with 6-digit code
├─ Code sent to registered email
├─ User enters 6 digits in modal
└─ Code must be entered within 15 minutes

Code validation:
├─ Check if code matches verification record
└─ Hash verification approach:
   ├─ Hash submitted code: SHA-256(user_input)
   ├─ Compare with stored code_hash
   └─ No plain code comparison (secure)
```

#### Step 4: Booking Record Creation

**Function:** `supabase/functions/verify-contact-code.ts`

```
POST /functions/v1/verify-contact-code
├─ Request Body:
│  ├─ verification_id: "{uuid}"
│  └─ code: "123456"
│
├─ Server Validation:
│  ├─ Query contact_verifications by ID
│  ├─ Check 1: record.used === false (not already used)
│  ├─ Check 2: NOW() < record.expires_at (not expired)
│  ├─ Check 3: Hash(submitted_code) === record.code_hash
│  │
│  ├─ If ALL checks pass:
│  │  │
│  │  ├─ Extract payload from verification record
│  │  ├─ CREATE booking in "Contact Us Details" table:
│  │  │  ├─ id: UUID (auto-generated)
│  │  │  ├─ full_name: {from payload}
│  │  │  ├─ email: {from payload}
│  │  │  ├─ company: {from payload}
│  │  │  ├─ phone_number: {from payload}
│  │  │  ├─ service_of_interest: {from payload}
│  │  │  ├─ message: {from payload}
│  │  │  ├─ preferred_date: {from payload}
│  │  │  ├─ preferred_time: {from payload}
│  │  │  ├─ status: "Pending Calendar"
│  │  │  ├─ created_at: NOW()
│  │  │  ├─ initial_email_sent: false
│  │  │  ├─ reminder_sent: false
│  │  │  ├─ meet_link: NULL
│  │  │  ├─ event_id: NULL
│  │  │  └─ cancelled_reason: NULL
│  │  │
│  │  └─ UPDATE contact_verifications:
│  │     ├─ used: true
│  │     └─ used_at: NOW()
│  │
│  └─ Return: { success: true, contact: {booking_details} }
│
└─ Response Code:
   ├─ 200: Success, booking created
   ├─ 400: Invalid code, expired, or already used
   ├─ 404: Verification record not found
   └─ 500: Database error
```

---

### PHASE 2: INITIAL CONFIRMATION EMAILS

**Function:** `supabase/functions/send-consultation-emails.ts`

**Trigger:** Automatic when booking created (Supabase Realtime)

```
TWO EMAILS SENT WITH 3-SECOND DELAY BETWEEN THEM:

┌──────────────────────────────────────────────────────────┐
│ EMAIL #1: CUSTOMER CONFIRMATION                          │
│ (Sent immediately after booking created)                 │
├──────────────────────────────────────────────────────────┤
│ From: contact@dataversedynamics.org                      │
│ To: {customer.email}                                     │
│ Subject: "Your Free Consultation Request –               │
│            Dataverse Dynamics"                           │
│                                                          │
│ HTML Template:                                           │
│ ├─ Gradient header (purple/blue)                         │
│ ├─ Greeting: "Hi {name},"                                │
│ ├─ Message:                                              │
│ │  "Thank you for contacting Dataverse Dynamics.         │
│ │   We have received your request for a free consultation│
│ │   regarding {service}. Our team is reviewing your      │
│ │   requirements and will be in touch shortly to         │
│ │   schedule your session."                              │
│ ├─ Signature: "Dataverse Dynamics Team"                  │
│ └─ Footer: Contact info, social links                    │
│                                                          │
│ Plain Text Version: Included for email clients that      │
│ don't support HTML                                       │
└──────────────────────────────────────────────────────────┘

WAIT: 3 seconds (prevents rate limiting)

┌──────────────────────────────────────────────────────────┐
│ EMAIL #2: ADMIN NOTIFICATION                             │
│ (Sent 3 seconds after first email)                       │
├──────────────────────────────────────────────────────────┤
│ From: contact@dataversedynamics.org                      │
│ To: inquiry@dataversedynamics.org                        │
│ Subject: "Consultation Request – {name} –                │
│            {service} – {company}"                        │
│                                                          │
│ Email Body Contains:                                     │
│ ├─ Full Customer Details:                                │
│ │  ├─ Name: {full_name}                                  │
│ │  ├─ Email: {email}                                     │
│ │  ├─ Phone: {phone_number or "Not provided"}            │
│ │  └─ Company: {company}                                 │
│ │                                                        │
│ ├─ Consultation Details:                                 │
│ │  ├─ Service: {service_of_interest}                     │
│ │  ├─ Preferred Date: {formatted: "Tuesday, March 18..."}│
│ │  └─ Preferred Time: {formatted: "2:00 PM"}             │
│ │                                                        │
│ └─ Customer Message:                                     │
│    └─ {message} (highlighted in gray box)                │
│                                                          │
│ Purpose: Keeps admin informed of new leads               │
└──────────────────────────────────────────────────────────┘
```

---

### PHASE 3: AUTOMATIC GOOGLE CALENDAR SYNC

#### Google Apps Script Deployment

**File:** `APPS_SCRIPT_UPDATED.gs` (822 lines)

**Deployment Configuration:**
```
Deploy as: Web App
Execute as: Organization Service Account
Access: Anyone
Timeout: 6 minutes
Execution Frequency: Every 1 minute (via time-driven trigger)
```

**Required Script Properties:**
```
SUPABASE_URL = https://gzlejowuykevphselwti.supabase.co
SUPABASE_KEY = {service_role_key}
WEBHOOK_SECRET = {hmac_secret_key}
MEETING_DURATION_MINUTES = 30
```

**Required OAuth Scopes (appsscript.json):**
```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/calendar"
  ]
}
```

#### Main Function: `createMeetAndSync()`

**Trigger:** Time-driven, Every 1 minute

```
EVERY 1 MINUTE:
│
├─ Query Supabase for pending bookings:
│  └─ WHERE status IN ("Pending Calendar", "%Error%")
│  └─ AND meet_link IS NULL
│  └─ AND event_id IS NULL
│  └─ LIMIT 10 (per execution)
│
├─ For each pending booking:
│  │
│  ├─ Step 1: Set Status to "Processing"
│  │  └─ Prevents race conditions / duplicate processing
│  │
│  ├─ Step 2: Validate Date/Time Format
│  │  ├─ Date: Must be YYYY-MM-DD
│  │  ├─ Time: Must be HH:MM or HH:MM:SS (24-hour)
│  │  └─ Example: 2026-03-15 14:00 or 2026-03-15 14:00:00
│  │
│  ├─ Step 3: Parse DateTime (Convert GMT+5 → UTC)
│  │  │
│  │  ├─ Input: preferred_date="2026-03-15", preferred_time="14:00"
│  │  │ (Stored in GMT+5 timezone)
│  │  │
│  │  ├─ Algorithm:
│  │  │  ├─ Create ISO string with Z marker: "2026-03-15T14:00:00Z"
│  │  │  │ (Treated as UTC)
│  │  │  ├─ Subtract 5 hours to account for GMT+5:
│  │  │  │ UTC_time = "2026-03-15T09:00:00Z"
│  │  │  └─ This UTC time is sent to Google Calendar
│  │  │
│  │  └─ Result: Google Calendar displays 14:00 in GMT+5 timezone
│  │
│  ├─ Step 4: Create Google Calendar Event with Retry Logic
│  │  │
│  │  ├─ Retry Configuration:
│  │  │  ├─ Max attempts: 3
│  │  │  ├─ Backoff: Exponential (2s, 4s, 8s)
│  │  │  └─ Total timeout: ~14 seconds
│  │  │
│  │  ├─ Event Details:
│  │  │  ├─ Summary: "Meeting with {full_name}"
│  │  │  ├─ Description:
│  │  │  │  ├─ Email: {customer.email}
│  │  │  │  ├─ Phone: {customer.phone}
│  │  │  │  └─ Company: {customer.company}
│  │  │  ├─ Start DateTime: {UTC converted}
│  │  │  ├─ End DateTime: {UTC converted + 30 minutes}
│  │  │  ├─ Attendees: [{ email: customer.email }]
│  │  │  └─ Conference Data:
│  │  │     └─ Create Google Meet automatically
│  │  │
│  │  └─ API Call:
│  │     POST https://www.googleapis.com/calendar/v3/calendars/primary/events
│  │     ├─ Header: Authorization Bearer {ScriptApp.getOAuthToken()}
│  │     ├─ Param: conferenceDataVersion=1
│  │     ├─ Param: sendUpdates=none (don't send to attendee yet)
│  │     └─ Payload: {eventDetails}
│  │
│  ├─ Step 5: Extract Meet Link
│  │  │
│  │  ├─ Parse response JSON
│  │  ├─ Extract event.id → Google Calendar event ID
│  │  └─ Extract Meet URL from:
│  │     └─ event.conferenceData.entryPoints[0].uri
│  │     └─ Example: https://meet.google.com/abc-defg-hij
│  │
│  ├─ Step 6: Update Booking in Supabase
│  │  │
│  │  ├─ PATCH /rest/v1/Contact%20Us%20Details?id=eq.{booking_id}
│  │  └─ Payload:
│  │     ├─ event_id: {google_event_id}
│  │     ├─ meet_link: {google_meet_url}
│  │     └─ status: "Meet Link Generated"
│  │
│  └─ Step 7: Log Result
│     ├─ Success: ✅ Created event for booking {id}: {meet_link}
│     └─ Failure: ❌ Failed after 3 retries: {error_message}
│
└─ Log Summary: ✅ Calendar sync completed
```

#### Error Handling

```
If error during event creation:
├─ After 3 retry attempts fail
├─ Set status: "Error - {error_message}"
│  └─ Example: "Error - Calendar API error (403)"
│
Next execution:
└─ Will detect status contains "Error"
└─ Will retry creation
└─ Will continue until success or manual intervention
```

---

### PHASE 4: MEETING LINK EMAIL & NOTIFICATIONS

**Function:** `supabase/functions/send-meeting-email.ts`

**Trigger:** Supabase Realtime UPDATE on `Contact Us Details`

**Trigger Condition:** When `meet_link` column changes (becomes populated)

```
REALTIME TRIGGER: meet_link → populated
│
├─ Webhook fires: send-meeting-email.ts
├─ Check: initial_email_sent = false (not already sent)
├─ Check: meet_link is not null (has a valid Meet link)
│
├─ PREPARE EMAIL #1 TO CUSTOMER
│  │
│  ├─ Extract and format details:
│  │  ├─ Date: new Date(preferred_date).toLocaleDateString()
│  │  │  └─ Result: "Tuesday, March 18, 2026"
│  │  │
│  │  └─ Time: Format time to 12-hour with AM/PM
│  │     └─ Result: "2:00 PM"
│  │
│  ├─ Generate action URLs:
│  │  ├─ meetLink: https://dataversedynamics.org/meeting-room/{booking_id}
│  │  ├─ confirmLink: {supabase_url}/functions/v1/confirm-meeting?
│  │  │               action=confirm&id={booking_id}
│  │  └─ cancelLink: {supabase_url}/functions/v1/confirm-meeting?
│  │                 action=cancel&id={booking_id}
│  │
│  └─ Build HTML email:
│     ┌────────────────────────────────────────────┐
│     │ [Gradient Header: Purple/Blue]             │
│     │                                            │
│     │ Consultation Booking                       │
│     │ Dataverse Dynamics                         │
│     ├────────────────────────────────────────────┤
│     │                                            │
│     │ Hi {full_name},                            │
│     │                                            │
│     │ Your consultation has been scheduled:      │
│     │                                            │
│     │ Date: Tuesday, March 18, 2026              │
│     │ Time: 2:00 PM                              │
│     │ Service: Website Development               │
│     │ Company: ABC Corp                          │
│     │                                            │
│     │ [BUTTON] Join Google Meet                  │
│     │ https://meet.google.com/abc-defg-hij      │
│     │                                            │
│     │ [BUTTON] ✅ Confirm Meeting                │
│     │ [BUTTON] ❌ Cancel Meeting                 │
│     │                                            │
│     ├────────────────────────────────────────────┤
│     │ Dataverse Dynamics Team                    │
│     └────────────────────────────────────────────┘
│
├─ SEND EMAIL #1 TO CUSTOMER
│  │
│  ├─ POST https://api.resend.com/emails
│  ├─ From: meeting@dataversedynamics.org
│  ├─ To: {customer.email}
│  ├─ Subject: "Consultation Booking - {company}"
│  ├─ HTML: {formatted above}
│  ├─ Text: Plain text version for compatibility
│  └─ Headers: Standard Resend headers
│
├─ WAIT 2.2 SECONDS
│  └─ Prevents rate limiting on Resend API
│
├─ PREPARE EMAIL #2 TO ADMIN
│  │
│  └─ Build HTML email with full booking details
│     ┌────────────────────────────────────────────┐
│     │ [Header: Purple/Blue]                      │
│     │                                            │
│     │ New Consultation Booking                   │
│     │ Dataverse Dynamics                         │
│     ├────────────────────────────────────────────┤
│     │                                            │
│     │ Name: John Doe                             │
│     │ Email: john@example.com                    │
│     │ Company: ABC Corp                          │
│     │ Service: Website Development               │
│     │ Date: Tuesday, March 18, 2026              │
│     │ Time: 2:00 PM                              │
│     │ Meet Link: https://meet.google.com/...    │
│     │                                            │
│     └────────────────────────────────────────────┘
│
├─ SEND EMAIL #2 TO ADMIN
│  │
│  ├─ POST https://api.resend.com/emails
│  ├─ From: meeting@dataversedynamics.org
│  ├─ To: meeting@dataversedynamics.org
│  ├─ Subject: "New Booking - {company}"
│  └─ HTML: {formatted above}
│
└─ UPDATE DATABASE
   └─ PATCH /rest/v1/Contact%20Us%20Details?id=eq.{booking_id}
      └─ initial_email_sent: true
```

---

### PHASE 5: CUSTOMER ACTIONS - CONFIRM/CANCEL VIA EMAIL

**Email Buttons in Meeting Email:**

```
┌─────────────────────────────────────────────────────────┐
│ Customer receives email with TWO ACTION BUTTONS:         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [✅ CONFIRM MEETING]                                    │
│  └─ URL: {supabase_url}/functions/v1/confirm-meeting   │
│     └─ Query Params:                                    │
│        ├─ action=confirm                               │
│        ├─ id={booking_id}                              │
│        └─ source=email (optional)                      │
│                                                         │
│ [❌ CANCEL MEETING]                                     │
│  └─ URL: {supabase_url}/functions/v1/confirm-meeting   │
│     └─ Query Params:                                    │
│        ├─ action=cancel                                │
│        ├─ id={booking_id}                              │
│        └─ source=email (optional)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Function:** `supabase/functions/confirm-meeting.ts`

```
When customer clicks either button:
│
├─ Browser/Email client opens link
├─ Query params parsed by Edge Function
│
├─ CONFIRM Action:
│  │
│  ├─ Get booking record from database
│  ├─ Get Google Calendar event details using event_id
│  ├─ Find customer email in attendees list
│  ├─ Set attendee responseStatus: "accepted"
│  ├─ Update attendee in Google Calendar
│  │  └─ PATCH event with updated attendees
│  ├─ Update Supabase:
│  │  └─ status: "Confirmed" (or "Accepted")
│  ├─ Redirect browser:
│  │  └─ → https://dataversedynamics.org/meeting-confirmed
│  └─ Send confirmation email to admin
│
├─ CANCEL Action:
│  │
│  ├─ Get booking record & event details
│  ├─ Update attendee responseStatus: "declined"
│  ├─ Replace attendee email with dummy address:
│  │  └─ dummy: noreply-cancelled-{timestamp}@localhost.local
│  │  └─ Purpose: Prevents Google from sending cancellation email to customer
│  ├─ Delete Google Calendar event
│  │  └─ DELETE /events/{event_id}?sendUpdates=none
│  ├─ Update Supabase:
│  │  ├─ status: "Cancelled"
│  │  ├─ preferred_date: NULL
│  │  └─ preferred_time: NULL
│  ├─ Send cancellation email to customer
│  ├─ Redirect browser:
│  │  └─ → https://dataversedynamics.org/meeting-cancelled
│  └─ Send admin notification
│
└─ Security:
   ├─ HMAC-SHA256 signature validation (optional)
   └─ Webhook secret configured in Apps Script properties
```

---

### PHASE 6: AUTOMATIC REMINDER EMAILS

**Function:** `supabase/functions/send-reminder-email.ts`

**Trigger:** Cron job (runs hourly)

**Send Reminder Window:** 12-24 hours before meeting

```
CRON JOB EXECUTES EVERY HOUR:
│
├─ Query bookings WHERE:
│  ├─ status IN ("Meet Link Generated", "Confirmed")
│  ├─ initial_email_sent = true
│  ├─ reminder_sent = false (not already sent)
│  └─ preferred_date/time NOT NULL
│
├─ FOR EACH BOOKING:
│  │
│  ├─ Parse meeting datetime (GMT+5):
│  │  ├─ Booking stored: "2026-03-18" "14:00"
│  │  ├─ Convert to UTC: subtract 5 hours
│  │  └─ UTC time: "2026-03-18 09:00:00"
│  │
│  ├─ Calculate hours until meeting:
│  │  ├─ hoursUntilMeeting = (meetingTime - now) / (1000 * 60 * 60)
│  │  └─ Example: 16.5 hours
│  │
│  ├─ Check if within window:
│  │  ├─ IF hoursUntilMeeting > 12 AND ≤ 24:
│  │  │  └─ ✅ ELIGIBLE FOR REMINDER
│  │  └─ ELSE:
│  │     └─ Skip (too far away or too close)
│  │
│  ├─ SEND REMINDER EMAIL:
│  │  │
│  │  ├─ From: meeting@dataversedynamics.org
│  │  ├─ To: {customer.email}
│  │  ├─ Subject: "Reminder: {company} - {service}"
│  │  ├─ X-Priority: 1 (marked as high priority)
│  │  │
│  │  └─ Email Body:
│  │     ┌──────────────────────────────────────────┐
│  │     │ [Header: Purple/Blue]                    │
│  │     │                                          │
│  │     │ 📢 Consultation Reminder                 │
│  │     │ Dataverse Dynamics                       │
│  │     ├──────────────────────────────────────────┤
│  │     │                                          │
│  │     │ Hi {full_name},                          │
│  │     │                                          │
│  │     │ IF status = "Confirmed":                 │
│  │     │  "This is a reminder that your CONFIRMED│
│  │     │   consultation is happening soon!"       │
│  │     │                                          │
│  │     │ ELSE:                                    │
│  │     │  "Please confirm your attendance!       │
│  │     │   This is your last chance before       │
│  │     │   auto-cancellation."                    │
│  │     │                                          │
│  │     │ Meeting Details:                         │
│  │     │ 📅 Date: Monday, March 18, 2026          │
│  │     │ ⏰ Time: 2:00 PM                         │
│  │     │ 🎯 Service: Website Development          │
│  │     │                                          │
│  │     │ [BUTTON] Join Google Meet                │
│  │     │ [BUTTON] Confirm                         │
│  │     │ [BUTTON] Cancel                          │
│  │     │                                          │
│  │     └──────────────────────────────────────────┘
│  │
│  └─ UPDATE DATABASE:
│     └─ reminder_sent = true
│
└─ Summary log: "Sent X reminders"
```

---

### PHASE 7: AUTOMATIC CANCELLATION FOR NO-SHOWS

**Function:** `supabase/functions/auto-cancel-unresponsive.ts`

**Trigger:** Cron job (runs every 5-10 minutes)

**Auto-Cancel Window:** Less than 12 hours before meeting + Reminder already sent

```
CRON JOB EXECUTES EVERY 5-10 MINUTES:
│
├─ Query bookings WHERE:
│  ├─ status = "Meet Link Generated" (no confirmation received)
│  ├─ reminder_sent = true (reminder email was sent)
│  ├─ event_id NOT NULL (Calendar event exists)
│  └─ preferred_date/time NOT NULL
│
├─ FOR EACH BOOKING:
│  │
│  ├─ Parse meeting datetime (GMT+5) & Calculate hours
│  │  └─ hoursUntilMeeting = (meetingTime - now) / (1000 * 60 * 60)
│  │
│  ├─ IF hoursUntilMeeting < 12 AND hoursUntilMeeting >= 0:
│  │  ├─ ✅ ELIGIBLE FOR AUTO-CANCEL
│  │  │
│  │  ├─ STEP 1: Get Google Access Token
│  │  │  ├─ Use Service Account credentials
│  │  │  ├─ Create JWT (RS256 signed)
│  │  │  ├─ Exchange JWT for OAuth token
│  │  │  └─ Token valid for 1 hour
│  │  │
│  │  ├─ STEP 2: Delete Calendar Event
│  │  │  ├─ DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}
│  │  │  └─ Result: Event removed from calendar (silently, no notifications)
│  │  │
│  │  ├─ STEP 3: Send Cancellation Email to Customer
│  │  │  ├─ From: meeting@dataversedynamics.org
│  │  │  ├─ To: {customer.email}
│  │  │  ├─ Subject: "Meeting Cancelled - No Response - Dataverse Dynamics"
│  │  │  ├─ X-Priority: 1 (High)
│  │  │  │
│  │  │  └─ HTML Email:
│  │  │     ┌──────────────────────────────────────┐
│  │  │     │ [RED GRADIENT HEADER]                │
│  │  │     │                                      │
│  │  │     │ Meeting Cancelled                    │
│  │  │     ├──────────────────────────────────────┤
│  │  │     │                                      │
│  │  │     │ Hi {full_name},                      │
│  │  │     │                                      │
│  │  │     │ We have automatically cancelled your │
│  │  │     │ consultation as we did not receive   │
│  │  │     │ confirmation from you.               │
│  │  │     │                                      │
│  │  │     │ Cancelled Meeting:                   │
│  │  │     │ Date: Tuesday, March 18, 2026        │
│  │  │     │ Time: 2:00 PM                        │
│  │  │     │ Service: Website Development         │
│  │  │     │ Company: ABC Corp                    │
│  │  │     │                                      │
│  │  │     │ No action is needed. If you wish to  │
│  │  │     │ reschedule, please book again:       │
│  │  │     │ [BUTTON] Book a New Consultation     │
│  │  │     │ https://dataversedynamics.org       │
│  │  │     │                                      │
│  │  │     └──────────────────────────────────────┘
│  │  │
│  │  ├─ STEP 4: Send Cancellation Email to Admin
│  │  │  ├─ From: meeting@dataversedynamics.org
│  │  │  ├─ To: meeting@dataversedynamics.org
│  │  │  ├─ Subject: "Auto-Cancelled - No Response - {company}"
│  │  │  │
│  │  │  └─ Body:
│  │  │     ├─ Name: {full_name}
│  │  │     ├─ Email: {email}
│  │  │     ├─ Company: {company}
│  │  │     ├─ Service: {service_of_interest}
│  │  │     ├─ Scheduled Date: {formatted_date}
│  │  │     ├─ Scheduled Time: {preferred_time}
│  │  │     ├─ Reason: Auto-cancelled due to no response
│  │  │     └─ Meet Link: {meet_link}
│  │  │
│  │  ├─ STEP 5: Update Database
│  │  │  └─ PATCH /Contact%20Us%20Details?id=eq.{booking_id}
│  │  │     ├─ status: "Cancelled - No Response"
│  │  │     ├─ cancelled_reason: "Auto-cancelled due to no response after reminder"
│  │  │     ├─ preferred_date: NULL
│  │  │     └─ preferred_time: NULL
│  │  │
│  │  ├─ STEP 6: Increment Counter
│  │  │  └─ cancelledCount++
│  │  │
│  │  └─ Log: ✅ Successfully auto-cancelled meeting for {full_name}
│  │
│  ├─ ELSE IF hoursUntilMeeting >= 12:
│  │  └─ ⏳ TOO FAR AWAY - Skip (not yet eligible)
│  │
│  └─ ELSE IF hoursUntilMeeting < 0:
│     └─ ⏭️ ALREADY PASSED - Skip (meeting time in past)
│
└─ Response: { success: true, count: cancelledCount }
```

---

### PHASE 8: MONITOR ATTENDEE RESPONSES

**Function:** `supabase/functions/monitor-responses.ts`

**Trigger:** Cron job (runs every 5-10 minutes)

**Purpose:** Track customer confirmation status via Google Calendar attendee responses

```
CRON JOB EXECUTES EVERY 5-10 MINUTES:
│
├─ Query bookings WHERE:
│  ├─ status = "Meet Link Generated"
│  └─ event_id NOT NULL (has calendar event)
│
├─ FOR EACH BOOKING:
│  │
│  ├─ Get Google Access Token (JWT-based Service Account)
│  ├─ Fetch Event Details from Google Calendar:
│  │  └─ GET /calendar/v3/calendars/primary/events/{event_id}
│  │
│  ├─ Check attendees[0].responseStatus:
│  │
│  ├─ IF responseStatus = "accepted":
│  │  │
│  │  ├─ UPDATE Supabase:
│  │  │  └─ status: "Accepted"
│  │  │
│  │  └─ Send Email to Admin:
│  │     ├─ Subject: "Accepted - {company} - {service}"
│  │     └─ Body: "Meeting accepted by {full_name}\nEmail: {email}"
│  │
│  ├─ IF responseStatus = "tentative":
│  │  │
│  │  ├─ UPDATE Supabase:
│  │  │  └─ status: "Tentative"
│  │  │
│  │  └─ (No email sent - awaiting final response)
│  │
│  ├─ IF responseStatus = "declined":
│  │  │
│  │  ├─ Delete Calendar Event:
│  │  │  └─ DELETE /events/{event_id}
│  │  │
│  │  ├─ Send Email to Customer:
│  │  │  ├─ Subject: "Meeting Cancelled - Declined"
│  │  │  └─ Body:
│  │  │     "Thank you for your response. Since you declined, the meeting
│  │  │      has been cancelled. Feel free to book again anytime."
│  │  │
│  │  ├─ Send Email to Admin:
│  │  │  ├─ Subject: "Cancelled - Declined - {company}"
│  │  │  └─ Body: "Meeting cancelled. Client declined."
│  │  │
│  │  └─ UPDATE Supabase:
│  │     ├─ status: "Cancelled - Declined"
│  │     ├─ preferred_date: NULL
│  │     ├─ preferred_time: NULL
│  │     └─ cancelled_reason: "Declined"
│  │
│  └─ Log result for each booking
│
└─ Response: { success: true }
```

---

## PHASE 9: POST-MEETING WORKFLOW

### Step 1: Mark Meeting Status

**Component:** `src/pages/AdminDashboard.jsx`

**Function:** `handleStatusUpdate(bookingId, newStatus)`

**Constraint:** Actions available only 30+ minutes AFTER scheduled meeting time

```
ADMIN VIEWS BOOKING DETAILS:
│
├─ If meeting time has NOT passed + 30 minutes:
│  └─ Status buttons disabled
│  └─ Message: "This action will be available 30 minutes after 
│     the meeting time (2:30 PM)"
│
├─ If meeting time has passed + 30 minutes:
│  │
│  └─ THREE ACTION BUTTONS appear:
│     │
│     ├─ [✅ ATTENDED] Button
│     │  └─ Administrator confirms customer attended meeting
│     │
│     ├─ [⏸️  MISSED] Button
│     │  └─ Customer did not show up but didn't cancel
│     │
│     └─ [❌ NO SHOW] Button
│        └─ Customer didn't respond or show up

ACTION: CLICK [✅ ATTENDED]
│
├─ UPDATE Supabase database:
│  └─ PATCH /Contact%20Us%20Details?id=eq.{booking_id}
│     └─ status: "Attended"
│
├─ [START PROJECT] button immediately appears
│  └─ Opens StartProjectSheet modal
│
└─ Admin can now create project from this booking

ACTION: CLICK [⏸️  MISSED]
│
├─ UPDATE Supabase database:
│  └─ status: "Missed"
│
├─ No automatic actions
└─ Admin can follow up manually

ACTION: CLICK [❌ NO SHOW]
│
├─ UPDATE Supabase database:
│  ├─ status: "No Show"
│  ├─ preferred_date: NULL
│  ├─ preferred_time: NULL
│  └─ Meeting archived
│
└─ No automatic actions
```

### Step 2: Create Project from Attended Meeting

**Component:** `src/components/StartProjectSheet.jsx`

```
WHEN BOOKING MARKED AS "ATTENDED":
│
├─ Admin clicks: [START PROJECT]
├─ Modal opens: StartProjectSheet
│
├─ FORM PRE-FILLS WITH BOOKING DATA:
│  │
│  ├─ Project Name: "{service_of_interest} - {full_name}"
│  │  └─ Example: "Website Development - John Doe"
│  ├─ Client Email: {customer.email}
│  ├─ Company: {customer.company}
│  ├─ Service: {service_of_interest}
│  ├─ Phone: {customer.phone_number}
│  ├─ Status: "active" (default)
│  └─ Start Date: today
│
├─ ADMIN FILLS IN ADDITIONAL FIELDS:
│  │
│  ├─ Budget: $amount (optional)
│  ├─ Hourly Rate: $/hour (optional)
│  ├─ End Date: {projected end date}
│  └─ Description: {notes}
│
├─ CLICK [CREATE PROJECT]
│  │
│  ├─ Validate: Project name required
│  ├─ Validate: Client email required
│  │
│  ├─ Generate Project Number:
│  │  ├─ Format: PRJ-{YYYYMM}-{4-digit-count}
│  │  ├─ Example: PRJ-202602-0047
│  │  └─ Stored as: project_number (unique)
│  │
│  ├─ INSERT into projects table:
│  │  ├─ id: UUID (auto-generated)
│  │  ├─ project_number: "PRJ-202602-0047"
│  │  ├─ name: "Website Development - John Doe"
│  │  ├─ description: {from form}
│  │  ├─ service: "Website Development"
│  │  ├─ client_email: "john@example.com"
│  │  ├─ company: "ABC Corp" (from booking if available)
│  │  ├─ status: "active"
│  │  ├─ start_date: today
│  │  ├─ end_date: {from form}
│  │  ├─ budget: {from form}
│  │  ├─ hourly_rate: {from form}
│  │  ├─ meeting_id: {booking.id} ← FOREIGN KEY LINK
│  │  ├─ is_invoiced: false
│  │  ├─ created_at: NOW()
│  │  └─ updated_at: NOW()
│  │
│  ├─ FETCH newly created project:
│  │  └─ SELECT id FROM projects WHERE project_number = "PRJ-202602-0047"
│  │
│  ├─ UPDATE booking record:
│  │  ├─ PATCH /Contact%20Us%20Details?id=eq.{booking_id}
│  │  └─ project_id: {new_project_id}
│  │
│  ├─ TOAST CONFIRMATION:
│  │  └─ "✅ Project 'Website Development - John Doe' created successfully!"
│  │
│  └─ Admin Dashboard automatically refreshes
│     └─ Booking now displays: "📌 Project: PRJ-202602-0047"
└─ Modal closes
```

---

## PHASE 10: PROJECT STATUS & INVOICE READINESS

**Admin Dashboard - Project Panel**

```
AFTER PROJECT CREATED:
│
├─ Project appears in "InvoicePanel" only when:
│  ├─ status = "completed" (admin updates when work done)
│  ├─ is_invoiced = false (not yet billed)
│
├─ PROJECT LIFECYCLE:
│  │
│  ├─ Status: "active"
│  │  ├─ Tracking in progress
│  │  ├─ Admin updates total_hours as work progresses
│  │  └─ Can be marked "on-hold" or "completed"
│  │
│  ├─ Status: "on-hold"
│  │  └─ Project paused, not billed yet
│  │
│  ├─ Status: "completed"
│  │  └─ Work finished, READY FOR INVOICING
│  │
│  └─ Status: "cancelled"
│     └─ Project abandoned, will not be invoiced
│
└─ Admin updates project details manually:
   ├─ Total Hours: {hours worked}
   ├─ Hourly Rate: {rate per hour}
   ├─ Budget adjustments
   └─ End Date extension
```

---

## DATABASE SCHEMA

### Contact Us Details Table

```sql
CREATE TABLE "Contact Us Details" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone_number TEXT,
  
  -- Consultation Details
  service_of_interest TEXT,
  message TEXT,
  preferred_date DATE,
  preferred_time TIME,
  
  -- Meeting Status
  status TEXT DEFAULT 'Pending Calendar' CHECK (
    status IN (
      'Pending Calendar',
      'Meet Link Generated',
      'Accepted',
      'Tentative',
      'Confirmed',
      'Processing',
      'Attended',
      'Missed',
      'No Show',
      'Cancelled',
      'Cancelled - Declined',
      'Cancelled - No Response',
      'Cancelled by Admin'
    )
  ),
  
  -- Calendar Integration
  meet_link TEXT UNIQUE,
  event_id TEXT UNIQUE,
  
  -- Email Tracking
  initial_email_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  
  -- Cancellation
  cancelled_reason TEXT,
  
  -- Project Link
  project_id UUID REFERENCES projects(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_booking_status ON "Contact Us Details"(status);
CREATE INDEX idx_booking_email ON "Contact Us Details"(email);
CREATE INDEX idx_booking_date ON "Contact Us Details"(preferred_date);
CREATE INDEX idx_booking_created ON "Contact Us Details"(created_at DESC);
```

### Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project Identification
  project_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Client Information
  client_email TEXT NOT NULL,
  company TEXT,
  
  -- Service & Tracking
  service TEXT,
  status TEXT DEFAULT 'active' CHECK (
    status IN ('active', 'on-hold', 'completed', 'cancelled')
  ),
  
  -- Financial Information
  hourly_rate NUMERIC(10, 2),
  total_hours NUMERIC(10, 2),
  budget NUMERIC(12, 2),
  
  -- Dates
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Relationships
  meeting_id UUID REFERENCES "Contact Us Details"(id) ON DELETE SET NULL,
  
  -- Invoice Status
  is_invoiced BOOLEAN DEFAULT false,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_number ON projects(project_number);
CREATE INDEX idx_project_status ON projects(status);
CREATE INDEX idx_project_meeting ON projects(meeting_id);
CREATE INDEX idx_project_completed_uninvoiced 
  ON projects(status, is_invoiced) WHERE status = 'completed' AND is_invoiced = false;
```

### Invoices Table

```sql
CREATE TABLE "Invoices" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invoice Identification
  invoice_number TEXT UNIQUE NOT NULL,
  
  -- Links
  booking_id UUID REFERENCES "Contact Us Details"(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Customer Information
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  customer_company TEXT,
  
  -- Service & Billing
  service_of_interest TEXT,
  per_hour_rate NUMERIC(10, 2) NOT NULL,
  total_hours NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Payment Terms
  due_date DATE,
  payment_terms TEXT DEFAULT 'Net 30' CHECK (
    payment_terms IN ('Due on Receipt', 'Net 15', 'Net 30', 'Net 60')
  ),
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')
  ),
  payment_status TEXT DEFAULT 'unpaid' CHECK (
    payment_status IN ('unpaid', 'paid', 'partially_paid', 'refunded')
  ),
  
  -- Extended Fields
  comments TEXT,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoice_number ON "Invoices"(invoice_number);
CREATE INDEX idx_invoice_email ON "Invoices"(email);
CREATE INDEX idx_invoice_status ON "Invoices"(status);
CREATE INDEX idx_invoice_created ON "Invoices"(created_at DESC);

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_month TEXT;
  invoice_count INTEGER;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYYMM');
  SELECT COUNT(*) INTO invoice_count
  FROM "Invoices"
  WHERE invoice_number LIKE 'INV-' || current_month || '-%';
  RETURN 'INV-' || current_month || '-' || LPAD((invoice_count + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

### Verification Table

```sql
CREATE TABLE contact_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL (SHA-256 hash, never plain code),
  
  -- Data Storage
  payload JSONB NOT NULL (stores all form data),
  
  -- Expiration & Usage
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_verification_email ON contact_verifications(email);
CREATE INDEX idx_verification_expires ON contact_verifications(expires_at);
```

---

## EMAIL COMMUNICATION FLOW

### Email Type Matrix

| # | Email Type | Trigger | From | To | When | Priority |
|---|---|---|---|---|---|---|
| 1 | **Verification Code** | User submits form | `contact@...org` | Customer | Immediately | Normal |
| 2 | **Consultation Confirmation** | Code verified | `contact@...org` | Customer | Step 1 | Normal |
| 3 | **Admin Notice** | Code verified | `contact@...org` | Admin | Step 1 | Normal |
| 4 | **Meeting Link Email** | Meet link created | `meeting@...org` | Customer | After Apps Script sync | Normal |
| 5 | **Meeting Link Admin** | Meet link created | `meeting@...org` | Admin | After Apps Script sync | Normal |
| 6 | **Reminder Email** ⭐ | 12-24 hrs before | `meeting@...org` | Customer | Cron hourly | **HIGH** |
| 7 | **Auto-Cancel Email** ⭐ | <12 hrs, no confirm | `meeting@...org` | Customer | Cron 5-10 min | **HIGH** |
| 8 | **Admin Cancel Notice** ⭐ | <12 hrs, no confirm | `meeting@...org` | Admin | Cron 5-10 min | **HIGH** |
| 9 | **Response Confirmation** | Customer responds | `meeting@...org` | Admin | Via email link | Normal |
| 10 | **Invoice Sent** | Admin triggers | `billing@...org` | Customer | On-demand | Normal |

**HIGH Priority emails use:**
- `X-Priority: 1`
- `X-MSMail-Priority: High`
- `Importance: high`

---

## AUTOMATION & CRON JOBS

### Summary Table

| Function | Trigger Type | Interval | Purpose | Cron Expression |
|----------|---|---|---|---|
| `createMeetAndSync()` | Time-driven (Apps Script) | Every **1 minute** | Create Google Calendar events | `*/1 * * * *` |
| `send-consultation-emails` | Realtime (DB UPDATE) | On event | Send initial notifications | N/A (immediate) |
| `send-meeting-email` | Realtime (meet_link UPDATE) | On event | Send meeting link emails | N/A (immediate) |
| `send-reminder-email` | Cron (Supabase) | Every **1 hour** | Send 12-24hr reminders | `0 * * * *` |
| `auto-cancel-unresponsive` | Cron (Supabase) | Every **5-10 min** | Auto-cancel < 12hrs | `*/5 * * * *` |
| `monitor-responses` | Cron (Supabase) | Every **5-10 min** | Check attendee status | `*/5 * * * *` |
| Invoice overdue check | Cron (Supabase) | Daily | Mark overdue invoices | `0 0 * * *` |

---

## TIMEZONE HANDLING

### Critical: GMT+5 Storage & UTC Conversion

```
Database:
├─ preferred_date: "2026-03-18" (date only)
├─ preferred_time: "14:00" (time only, interpreted as GMT+5)
└─ Storage timezone: GMT+5 (Pakistan Standard Time)

Google Calendar requires UTC:
├─ Input: 14:00 GMT+5 (2 PM local time in Pakistan)
├─ Conversion formula: UTC = GMT+5 - 5 hours
└─ Result: 09:00 UTC (9 AM UTC)

Google Calendar displays back:
├─ Calendar API in UTC: 09:00 UTC
├─ User timezone GMT+5: 09:00 + 5 = 14:00 (2 PM)
└─ User sees: 14:00 (correct!)

Apps Script Implementation:
```javascript
// Parse date and time (stored in GMT+5)
const eventDate = new Date(`${booking.preferred_date}T${booking.preferred_time}:00Z`);
// Subtract 5 hours to convert from GMT+5 to UTC
eventDate.setHours(eventDate.getHours() - 5);
// Now eventDate is correct UTC time for Calendar API
```

---

## STATUS DEFINITIONS

### Complete Status Flow

```
PENDING CALENDAR
└─ Initial state after email verified
└─ Awaiting Google Calendar event creation

MEET LINK GENERATED
└─ Google Calendar event created
└─ Google Meet link assigned
└─ Email sent with Meet link & action buttons
└─ Awaiting customer response

ACCEPTED
└─ Customer clicked "✅ Confirm" button
└─ Google Calendar attendee status: "accepted"
└─ Meeting confirmed, ready to proceed

TENTATIVE
└─ Customer clicked "?" (tentative) in calendar
└─ Google Calendar attendee status: "tentative"
└─ Awaiting final confirmation

CONFIRMED
└─ Alternative status (used sometimes)
└─ Meeting is confirmed

PROCESSING
└─ Temporary status during Google Calendar creation
└─ Prevents duplicate processing
└─ Auto-reverts if creation fails

ATTENDED
└─ Admin marked after meeting concluded
└─ Meeting happened successfully
└─ Ready to create project

MISSED
└─ Admin marked customer didn't attend
└─ Customer didn't cancel but no-show
└─ No automatic follow-up

NO SHOW
└─ Admin marked total no-show/no-cancel
└─ Booking archived

CANCELLED - DECLINED
└─ Customer clicked "❌ Cancel" button
└─ Google Calendar event deleted
└─ Cancellation email sent

CANCELLED - NO RESPONSE
└─ Auto-cancelled by system
└─ Less than 12 hours before meeting
└─ Customer never responded

CANCELLED BY ADMIN
└─ Admin cancelled via dashboard
└─ Cancellation emails sent
└─ Event deleted

ERROR - {message}
└─ Google Calendar creation failed
└─ Will retry automatically
└─ Example: "Error - Calendar API error (403)"
```

---

## SECURITY & VALIDATION

### Email Verification Security

```
┌─ Code Generation ─────────────────┐
│ 1. Math.floor(100000 + random())   │
│ 2. 6-digit code: 100000-999999     │
│ 3. Never sent on URL (only email)  │
│ 4. 15-minute expiration            │
└───────────────────────────────────┘

┌─ Code Storage ────────────────────┐
│ 1. Hash immediately: SHA-256       │
│ 2. Plain code NEVER stored         │
│ 3. Hash only compared              │
│ 4. Prevents database breach        │
└───────────────────────────────────┘

┌─ Code Validation ─────────────────┐
│ 1. Check "used" flag               │
│ 2. Check expiration                │
│ 3. Hash submitted code             │
│ 4. Compare hashes (constant-time)  │
│ 5. Mark as used immediately        │
└───────────────────────────────────┘
```

### HMAC Signature Validation (Optional)

```
Webhook Security:

HMAC-SHA256 Signature Generation:
├─ Message = `action{event_id}{attendee_email}`
│  └─ Example: "confirmABC123xyz@example.com"
├─ Secret = WEBHOOK_SECRET property
├─ Signature = HmacSha256(message, secret)
└─ Send as URL param: &signature={sig}

Validation in Apps Script:
├─ Recreate signature from params
├─ Compare with received signature
├─ If mismatch → return 403 Unauthorized
└─ Prevents unauthorized cancellations

Note: Currently optional, can be enabled by setting 
WEBHOOK_SECRET property
```

### Row-Level Security (RLS)

```
"Contact Us Details" table:
├─ Public: Anyone can read own record after verification
├─ Admin: Full read/write access
└─ RLS Policy: role IN ('admin', 'admin_view')

projects table:
├─ Admins (role = 'admin'): Full CRUD
├─ View-only admins (role = 'admin_view'): SELECT only
└─ Unauthenticated: No access

Invoices table:
├─ Admins only
├─ role IN ('admin', 'admin_view'): SELECT
└─ role = 'admin': INSERT/UPDATE/DELETE

blocked_time_slots table:
├─ Admins only
└─ Full control

chatbot_conversations table:
├─ Authenticated users: SELECT/INSERT/UPDATE
└─ For storing chat history
```

---

## TROUBLESHOOTING GUIDE

### Common Issues & Solutions

#### Issue: Google Meet Link Not Generated

```
Symptoms:
├─ Status stuck at "Pending Calendar"
├─ meet_link is NULL
├─ event_id is NULL

Troubleshooting Checklist:
├─ Check Apps Script execution:
│  ├─ Go to Apps Script project → Execution log
│  ├─ Look for errors in createMeetAndSync()
│  └─ Check Supabase query results
├─ Verify Apps Script properties:
│  ├─ Project Settings → Script Properties
│  ├─ Confirm SUPABASE_URL is set
│  ├─ Confirm SUPABASE_KEY is set
│  └─ Confirm MEETING_DURATION_MINUTES is set
├─ Check Supabase connection:
│  ├─ Try manual query: SELECT * FROM "Contact Us Details" 
│     WHERE status = 'Pending Calendar'
│  └─ Verify API key has permission
├─ Check Google Calendar API:
│  ├─ Verify OAuth scopes include calendar
│  ├─ Test with testCreateEvent() in Apps Script
│  └─ Check service account has access
└─ Check date/time format:
   ├─ Verify preferred_date is YYYY-MM-DD
   ├─ Verify preferred_time is HH:MM
   └─ Test with: testDateParsing() in Apps Script

Solution:
├─ If format issue: Fix data in database
├─ If API issue: Redeploy Apps Script
├─ If permission issue: Update OAuth scope & redeploy
└─ If Supabase issue: Verify firewall & API key
```

#### Issue: Meeting Link Email Never Sent

```
Symptoms:
├─ meet_link exists in database
├─ initial_email_sent = false
├─ Customer receives no email

Troubleshooting:
├─ Check Edge Function logs:
│  ├─ Supabase → Functions → send-meeting-email
│  ├─ View invocation logs
│  └─ Check for errors
├─ Verify Resend.com API key:
│  ├─ Project Settings → Edge Function Secrets
│  ├─ RESEND_API_KEY must be set
│  └─ Test with: curl -X POST https://api.resend.com/emails
├─ Check database trigger:
│  ├─ Supabase Realtime must be enabled
│  ├─ Table must have publish permission
│  └─ UPDATE on meet_link must fire webhook
├─ Verify email address:
│  ├─ Customer email must be valid
│  ├─ Not in Resend bounce list
│  └─ Domain must be verified

Solution:
├─ Manually invoke: supabase.functions.invoke('send-meeting-email')
├─ Check RESEND_API_KEY format (Bearer token)
└─ Test email address with Resend's API directly
```

#### Issue: Customer Email Invalid / Bouncing

```
Symptoms:
├─ Email shows "invalid" error
├─ Or email sent but customer never receives

Solutions:
├─ Verify email format:
│  └─ Must be valid RFC 5322 format
├─ Check Resend API response:
│  └─ Look for bounce/invalid_email errors
├─ Whitelist sender domain:
│  └─ Resend must have domain verified
├─ Check spam folder:
│  └─ May be caught by spam filters
├─ Test with known good email:
│  └─ Gmail, Outlook, etc.
└─ Increase email deliverability:
   ├─ Add SPF record
   ├─ Add DKIM signature
   └─ Configure DMARC policy
```

#### Issue: Auto-Cancel Not Triggering

```
Symptoms:
├─ Less than 12 hours until meeting
├─ reminder_sent = true
├─ status still "Meet Link Generated"
├─ No auto-cancel email sent

Troubleshooting:
├─ Check Cron job status:
│  ├─ Supabase → Functions → auto-cancel-unresponsive
│  ├─ View invocation logs
│  └─ Check for execution errors
├─ Verify time calculation:
│  ├─ Test: testDateParsing() in Apps Script
│  └─ Confirm GMT+5 to UTC conversion is correct
├─ Check database records:
│  ├─ SELECT * FROM "Contact Us Details"
│  ├─ WHERE status = 'Meet Link Generated'
│  ├─ AND reminder_sent = true
│  ├─ AND event_id IS NOT NULL
│  └─ Check hoursUntilMeeting calculation
├─ Verify Google Calendar deletion:
│  ├─ Service Account must have calendar access
│  ├─ Check OAuth token generation
│  └─ Test with testDeleteEvent()

Solution:
├─ Manually trigger: supabase.functions.invoke('auto-cancel-unresponsive')
├─ Check Service Account credentials
├─ Verify calendar permissions
└─ Check function timeout (default 60s)
```

#### Issue: Timezone Mismatch (Showing Wrong Time)

```
Symptoms:
├─ Customer books 2 PM, sees 9 AM in email
├─ Or opposite: books 2 PM, Google Calendar shows 7 PM

Root Cause:
├─ Incorrect GMT+5 to UTC conversion
├─ Or incorrect timezone in browser

Solution:
├─ Run testDateParsing() in Apps Script
├─ Verify formula:
│  ├─ Input: 14:00 GMT+5
│  ├─ Math: 14:00 - 05:00 = 09:00 UTC
│  ├─ Calendar receives: 09:00 UTC
│  └─ Calendar displays (GMT+5): 09:00 + 05:00 = 14:00 ✓
├─ Check browser timezone settings
├─ Verify Supabase server timezone
└─ Check Google Calendar timezone configuration
```

#### Issue: Invoice Generation Fails

```
Symptoms:
├─ "Create Invoice" button doesn't work
├─ Status: "draft" not changing to "sent"
├─ No email sent to customer

Troubleshooting:
├─ Check Edge Function logs:
│  └─ supabase/functions/send-invoice.ts
├─ Verify invoice fields:
│  ├─ per_hour_rate must be set
│  ├─ total_hours must be set
│  └─ total_amount calculated correctly
├─ Check Resend API key:
│  ├─ Must use RESEND_API_KEY2
│  └─ Verify in function secrets
├─ Verify customer email:
│  └─ Must be valid for sending

Solution:
├─ Manually re-invoke send-invoice function
├─ Check total_amount calculation: (rate × hours) - discount
├─ Verify all required fields populated
└─ Test with known good customer email
```

---

## VIDEO EXPLANATION GUIDE

### What to Show in Presentation

1. **End-to-End Demo** (15 min)
   - Customer submits form → receives email with code
   - Enters code → booking created
   - Wait for Apps Script to create Meet link
   - Show confirmation email
   - Admin reviews in dashboard
   - Mark as "Attended" → create project
   - Create invoice from project

2. **Database Schema Walk-through** (10 min)
   - Contact Us Details table relationships
   - Projects table with meeting_id foreign key
   - Invoices table linked to both
   - Status flow visualization

3. **Automation Timeline** (10 min)
   - Show Apps Script running every 1 minute
   - Show reminder email at 12-24 hours
   - Show auto-cancel at < 12 hours
   - Show response monitoring

4. **Code Architecture** (15 min)
   - Frontend: ConsultationModal.jsx flow
   - Backend: Edge Functions in Deno
   - Google Apps Script integration
   - Cron job configuration

---

## CONCLUSION

This comprehensive guide covers:

✅ User booking → verification → confirmation
✅ Automatic Google Meet link generation
✅ Email notification system (8+ types)
✅ Customer confirmation/cancellation
✅ Auto-reminders (12-24 hours)
✅ Auto-cancellation (<12 hours)
✅ Post-meeting project creation
✅ Invoice generation & tracking
✅ Security & validation
✅ Timezone handling (GMT+5 ↔ UTC)
✅ Database schema & relationships
✅ Troubleshooting matrix

**For updates or clarifications, refer to:**
- GitHub repository: (your repo)
- Google Apps Script project: (link)
- Supabase project dashboard
- Resend.com API documentation

---

**Document Version:** 1.0  
**Last Updated:** February 28, 2026  
**Author:** Senior Developer Team  
**Classification:** Internal Documentation
