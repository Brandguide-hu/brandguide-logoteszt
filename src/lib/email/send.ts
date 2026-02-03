// Email küldő utility
// Jelenleg placeholder — cseréld ki Resend/SendGrid/stb. implementációra

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html } = params;

  // Ha van RESEND_API_KEY, használjuk a Resend-et
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'LogoLab <onboarding@resend.dev>',
          to,
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('[Email] Resend hiba:', err);
        return { success: false, error: err };
      }

      return { success: true };
    } catch (err) {
      console.error('[Email] Küldési hiba:', err);
      return { success: false, error: String(err) };
    }
  }

  // Fallback: log-oljuk az emailt (fejlesztési környezetben)
  console.log('[Email] Küldés (dev mode):', {
    to,
    subject,
    htmlLength: html.length,
  });
  return { success: true };
}
