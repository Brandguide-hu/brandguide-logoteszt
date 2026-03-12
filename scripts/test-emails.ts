/**
 * Teszt script — minden új email sablon elküldése peti@zwoelf.hu-ra
 * Futtatás: npx tsx scripts/test-emails.ts
 */

// Env betöltés
import { config } from 'dotenv';
config({ path: '.env.local' });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'LogoLab <onboarding@resend.dev>';
const TO = 'peti@zwoelf.hu';

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY nincs beállítva!');
  process.exit(1);
}

// Kézi APP_URL beállítás (a templates.ts process.env-ből olvassa)
process.env.NEXT_PUBLIC_APP_URL = 'https://logolab.hu';

import {
  analysisCompleteEmail,
  adminPaymentSuccessEmail,
  adminPaymentFailedEmail,
  adminAnalysisCompleteEmail,
  adminAnalysisFailedEmail,
  consultationConfirmationEmail,
  consultationBookingEmail,
  paymentSuccessEmail,
} from '../src/lib/email/templates';

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ Hiba: ${err}`);
    return false;
  }
  console.log(`  ✅ Elküldve`);
  return true;
}

async function main() {
  console.log(`\n📧 Teszt emailek küldése: ${TO}\n`);

  const emails = [
    {
      name: '1. Sikeres fizetés (user) — logó preview + név',
      ...paymentSuccessEmail({
        name: 'Teszt Péter',
        tierName: 'Max',
        amount: '9 990',
        date: '2026. 03. 07.',
        logoName: 'Billingo',
        logoThumbnailUrl: 'https://chdtnvaezdilqmmggtml.supabase.co/storage/v1/object/public/logos/placeholder-logo.png',
      }),
    },
    {
      name: '2. Elemzés kész (user) — logó preview-val',
      ...analysisCompleteEmail({
        name: 'Teszt Péter',
        logoName: 'Billingo',
        score: 72,
        resultUrl: 'https://logolab.hu/eredmeny/9019a826-2b7f-4833-9903-2ef7131cd1f5',
        logoThumbnailUrl: 'https://chdtnvaezdilqmmggtml.supabase.co/storage/v1/object/public/logos/placeholder-logo.png',
      }),
    },
    {
      name: '3. Konzultáció visszaigazolás (user)',
      ...consultationConfirmationEmail({
        name: 'Teszt Péter',
        logoName: 'Billingo',
        score: 72,
        resultUrl: 'https://logolab.hu/eredmeny/9019a826-2b7f-4833-9903-2ef7131cd1f5',
      }),
    },
    {
      name: '4. Admin — sikeres fizetés',
      ...adminPaymentSuccessEmail({
        userEmail: 'teszt@example.com',
        userName: 'Teszt Péter',
        tierName: 'Max',
        amount: '9 990',
        analysisId: '9019a826-2b7f-4833-9903-2ef7131cd1f5',
      }),
    },
    {
      name: '5. Admin — sikertelen fizetés',
      ...adminPaymentFailedEmail({
        userEmail: 'teszt@example.com',
        tierName: 'Max',
        reason: 'A checkout session lejárt — a felhasználó nem fejezte be a fizetést.',
      }),
    },
    {
      name: '6. Admin — elemzés kész',
      ...adminAnalysisCompleteEmail({
        userName: 'Teszt Péter',
        userEmail: 'teszt@example.com',
        logoName: 'Billingo',
        score: 72,
        analysisId: '9019a826-2b7f-4833-9903-2ef7131cd1f5',
      }),
    },
    {
      name: '7. Admin — sikertelen elemzés',
      ...adminAnalysisFailedEmail({
        userName: 'Teszt Péter',
        userEmail: 'teszt@example.com',
        logoName: 'Billingo',
        analysisId: '9019a826-2b7f-4833-9903-2ef7131cd1f5',
        errorMessage: 'Claude Vision hiba: Rate limit exceeded',
      }),
    },
    {
      name: '8. Admin — konzultáció foglalás',
      ...consultationBookingEmail({
        userName: 'Teszt Péter',
        userEmail: 'teszt@example.com',
        logoName: 'Billingo',
        score: 72,
        adminUrl: 'https://logolab.hu/admin',
      }),
    },
  ];

  let sent = 0;
  for (const email of emails) {
    console.log(`📨 ${email.name}`);
    console.log(`   Subject: ${email.subject}`);
    const ok = await sendEmail(TO, `[TESZT] ${email.subject}`, email.html);
    if (ok) sent++;
    // Kis szünet, ne legyen rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✨ Kész! ${sent}/${emails.length} email elküldve.\n`);
}

main().catch(console.error);
