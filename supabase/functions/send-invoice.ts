import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY2");

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
      from: "Dataverse Dynamics <billing@dataversedynamics.org>",
      to: [to],
      subject: subject,
      html: html,
      text: text || "",
      reply_to: "billing@dataversedynamics.org",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.statusText} - ${errorText}`);
  }
}

function generateInvoiceHTML(invoice: any): string {
  const createdDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const dueDate = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Upon Receipt';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    .invoice-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .company-logo {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    .company-tagline {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 20px;
    }
    .invoice-title {
      font-size: 28px;
      font-weight: 600;
      margin-top: 20px;
    }
    .invoice-number {
      font-size: 18px;
      opacity: 0.9;
      margin-top: 10px;
    }
    .invoice-body {
      padding: 40px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      flex-wrap: wrap;
      gap: 20px;
    }
    .info-block {
      flex: 1;
      min-width: 200px;
    }
    .info-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .info-value {
      font-size: 16px;
      color: #333;
      line-height: 1.4;
    }
    .company-info {
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    }
    .invoice-table thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .invoice-table th {
      padding: 16px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-table td {
      padding: 16px;
      border-bottom: 1px solid #e9ecef;
      font-size: 15px;
    }
    .invoice-table tr:last-child td {
      border-bottom: none;
    }
    .invoice-table tbody tr:hover {
      background-color: #f8f9fa;
    }
    .text-right {
      text-align: right;
    }
    .total-section {
      margin-top: 30px;
      border-top: 2px solid #e9ecef;
      padding-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      font-size: 16px;
    }
    .total-row.grand-total {
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
      border-top: 2px solid #667eea;
      padding-top: 20px;
      margin-top: 10px;
    }
    .comments-section {
      margin-top: 40px;
      padding: 20px;
      background: #fff8e1;
      border-left: 4px solid #ffd54f;
      border-radius: 4px;
    }
    .comments-label {
      font-weight: 600;
      margin-bottom: 8px;
      color: #f57c00;
    }
    .payment-terms {
      margin-top: 30px;
      padding: 20px;
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      border-radius: 4px;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px 40px;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .footer-divider {
      margin: 20px 0;
      border: none;
      border-top: 1px solid #dee2e6;
    }
    .contact-info {
      margin-top: 15px;
      line-height: 1.8;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .invoice-container {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="invoice-header">
      <div class="company-logo">DATAVERSE DYNAMICS</div>
      <div class="company-tagline">Smart Solutions, Smarter Business</div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">${invoice.invoice_number}</div>
    </div>

    <!-- Body -->
    <div class="invoice-body">
      <!-- Company Information -->
      <div class="company-info">
        <div class="info-label">FROM</div>
        <div class="info-value">
          <strong>Dataverse Dynamics</strong><br>
          Email: billing@dataversedynamics.org<br>
          Phone: +1 (555) 123-4567<br>
          Website: www.dataversedynamics.org
        </div>
      </div>

      <!-- Bill To & Invoice Info -->
      <div class="info-section">
        <div class="info-block">
          <div class="info-label">BILL TO</div>
          <div class="info-value">
            <strong>${invoice.customer_name}</strong><br>
            ${invoice.customer_company ? `${invoice.customer_company}<br>` : ''}
            ${invoice.email}
          </div>
        </div>
        <div class="info-block">
          <div class="info-label">INVOICE DETAILS</div>
          <div class="info-value">
            <strong>Invoice Date:</strong> ${createdDate}<br>
            <strong>Due Date:</strong> ${dueDate}<br>
            <strong>Payment Terms:</strong> ${invoice.payment_terms || 'Net 30'}
          </div>
        </div>
      </div>

      <!-- Invoice Items Table -->
      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Rate/Hour</th>
            <th class="text-right">Hours</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${invoice.service_of_interest || 'Professional Services'}</strong>
              ${invoice.comments ? `<br><span style="font-size: 13px; color: #666;">${invoice.comments}</span>` : ''}
            </td>
            <td class="text-right">$${parseFloat(invoice.per_hour_rate).toFixed(2)}</td>
            <td class="text-right">${parseFloat(invoice.total_hours).toFixed(2)}</td>
            <td class="text-right">$${parseFloat(invoice.total_amount).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Total Section -->
      <div class="total-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>$${parseFloat(invoice.total_amount).toFixed(2)} USD</span>
        </div>
        <div class="total-row grand-total">
          <span>TOTAL DUE:</span>
          <span>$${parseFloat(invoice.total_amount).toFixed(2)} USD</span>
        </div>
      </div>

      <!-- Payment Terms -->
      <div class="payment-terms">
        <strong>Payment Terms:</strong> ${invoice.payment_terms || 'Net 30'}<br>
        <strong>Payment Methods:</strong> Bank Transfer, PayPal, Credit Card<br>
        Please include the invoice number (${invoice.invoice_number}) with your payment.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="contact-info">
        <strong>Questions about this invoice?</strong><br>
        Contact us at billing@dataversedynamics.org or call +1 (555) 123-4567
      </div>
      <hr class="footer-divider">
      <p>Thank you for your business!</p>
      <p style="font-size: 12px; color: #999; margin-top: 10px;">
        Dataverse Dynamics © ${new Date().getFullYear()} • All Rights Reserved
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateInvoiceText(invoice: any): string {
  const createdDate = new Date(invoice.created_at).toLocaleDateString();
  const dueDate = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString()
    : 'Upon Receipt';

  return `
DATAVERSE DYNAMICS - INVOICE

Invoice Number: ${invoice.invoice_number}
Invoice Date: ${createdDate}
Due Date: ${dueDate}

BILL TO:
${invoice.customer_name}
${invoice.customer_company ? invoice.customer_company + '\n' : ''}${invoice.email}

SERVICE DETAILS:
Description: ${invoice.service_of_interest || 'Professional Services'}
Rate per Hour: $${parseFloat(invoice.per_hour_rate).toFixed(2)}
Total Hours: ${parseFloat(invoice.total_hours).toFixed(2)}

TOTAL AMOUNT DUE: $${parseFloat(invoice.total_amount).toFixed(2)} USD

Payment Terms: ${invoice.payment_terms || 'Net 30'}

${invoice.comments ? 'Notes: ' + invoice.comments : ''}

For questions, contact: billing@dataversedynamics.org

Thank you for your business!
  `.trim();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      },
    });
  }

  try {
    console.log(`📨 Send Invoice - Request received`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const requestBody = await req.json();
    const invoiceId = requestBody.invoice_id;

    if (!invoiceId) {
      console.error("❌ Missing invoice_id");
      return new Response(
        JSON.stringify({ error: "missing_invoice_id" }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`🔍 Fetching invoice: ${invoiceId}`);

    // Fetch invoice from database
    const { data: invoice, error: fetchError } = await supabase
      .from("Invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error("❌ Invoice not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "invoice_not_found", details: fetchError?.message }),
        {
          status: 404,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`✅ Invoice found: ${invoice.invoice_number} for ${invoice.email}`);

    // Generate invoice HTML and text
    const invoiceHTML = generateInvoiceHTML(invoice);
    const invoiceText = generateInvoiceText(invoice);

    // Send email
    console.log(`📧 Sending invoice email to ${invoice.email}`);
    await sendEmail(
      invoice.email,
      `Invoice ${invoice.invoice_number} from Dataverse Dynamics`,
      invoiceHTML,
      invoiceText
    );

    console.log(`✅ Invoice email sent successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invoice sent to ${invoice.email}`,
        invoice_number: invoice.invoice_number
      }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (error) {
    console.error("❌ Error in send-invoice function:", error);
    return new Response(
      JSON.stringify({ 
        error: "internal_error", 
        message: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
