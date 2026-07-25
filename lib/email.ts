/**
 * Generic transactional email via the Resend HTTP API — same bare-fetch pattern as
 * lib/alert-email.ts (no SDK, RESEND_API_KEY already provisioned in prod). Never
 * throws: a failed send must not break whatever triggered it.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL || "POSTime <alertas@postime.admw.com.br>";

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — would have sent "${subject}" to ${to}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[email] Resend send failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Resend send threw:", err instanceof Error ? err.message : err);
    return false;
  }
}
