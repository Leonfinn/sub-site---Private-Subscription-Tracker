import { EmailMessage } from "cloudflare:email";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env) {

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { name, replyEmail, feedbackType, message, honeypot } = body;

    // Bot trap — silently accept and return 200
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Validate message
    const trimmedMessage = (message || "").trim();
    if (!trimmedMessage || trimmedMessage.length < 5) {
      return new Response(JSON.stringify({ error: "Message must be at least 5 characters." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Sanitise inputs
    const safeName = (name || "").trim() || "Anonymous";
    const safeReplyEmail = (replyEmail || "").trim() || "Not provided";
    const safeFeedbackType = (feedbackType || "").trim() || "General feedback";
    const safeMessage = trimmedMessage.slice(0, 2000);

    // Build raw MIME email
    const rawEmail = [
      `From: Sub-Site Feedback <admin@sub-site.com>`,
      `To: admin@sub-site.com`,
      `Subject: Sub-Site Feedback: ${safeFeedbackType}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      `Name: ${safeName}`,
      `Reply-to: ${safeReplyEmail}`,
      `Type: ${safeFeedbackType}`,
      ``,
      safeMessage,
    ].join("\r\n");

    try {
      const emailMessage = new EmailMessage(
        "admin@sub-site.com",
        "admin@sub-site.com",
        rawEmail
      );
      await env.EMAIL.send(emailMessage);
    } catch (err) {
      return new Response(JSON.stringify({ error: "Failed to send email. Please try again later." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
