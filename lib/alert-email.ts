/**
 * Best-effort transactional alert via the Resend HTTP API directly (no SDK — it's one
 * call, not worth a dependency). Never throws: an alert failing must not break the
 * webhook it's called from. Silently no-ops with a console reminder if RESEND_API_KEY
 * isn't set yet.
 */
export async function sendOwnerAlert(subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL || "joseluizweb@gmail.com";
  const from = process.env.ALERT_FROM_EMAIL || "POSTime <alertas@postime.admw.com.br>";

  if (!apiKey) {
    console.warn(`[alert-email] RESEND_API_KEY not set — would have sent "${subject}" to ${to}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error("[alert-email] Resend send failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[alert-email] Resend send threw:", err instanceof Error ? err.message : err);
  }
}
