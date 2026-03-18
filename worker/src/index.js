import { EmailMessage } from "cloudflare:email";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env) {
    // CORS preflight
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

    // Bot trap — silently accept
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
    const safeName         = (name        || "").trim().slice(0, 200) || "Anonymous";
    const safeReplyEmail   = (replyEmail  || "").trim().slice(0, 200) || "";
    const safeFeedbackType = (feedbackType|| "").trim().slice(0, 100) || "General feedback";
    const safeMessage      = trimmedMessage.slice(0, 2000);

    const dest = env.DEST_EMAIL;
    if (!dest) {
      console.error("DEST_EMAIL secret is not set");
      return new Response(JSON.stringify({ error: "Server misconfiguration." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const textBody = [
      `Type:    ${safeFeedbackType}`,
      `Name:    ${safeName}`,
      `Reply-To: ${safeReplyEmail || "Not provided"}`,
      ``,
      `Message:`,
      safeMessage,
    ].join("\n");

    try {
      // Object-format constructor — avoids raw MIME fragility
      const emailMessage = new EmailMessage({
        from: "admin@sub-site.com",
        to: dest,
        subject: `Sub-Site Feedback: ${safeFeedbackType}`,
        textBody,
        headers: {
          ...(safeReplyEmail ? { "Reply-To": safeReplyEmail } : {}),
        },
      });
      await env.EMAIL.send(emailMessage);
    } catch (err) {
      console.error("send_email failed:", err.message);
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
