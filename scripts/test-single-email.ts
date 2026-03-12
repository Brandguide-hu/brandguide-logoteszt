/**
 * Teszt: Frissített "Fizetésed sikeres" email küldése
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'LogoLab <onboarding@resend.dev>';
const TO = 'peti@zwoelf.hu';

process.env.NEXT_PUBLIC_APP_URL = 'https://logolab.hu';

import { paymentSuccessEmail, paymentSuccessWithMagicLinkEmail } from '../src/lib/email/templates';

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
    console.error(`❌ Hiba: ${await res.text()}`);
    return;
  }
  console.log(`✅ Elküldve: ${subject}`);
}

async function main() {
  // 1. Létező user — sikeres fizetés (logó preview + név, gomb nélkül)
  const e1 = paymentSuccessEmail({
    name: 'Teszt Péter',
    tierName: 'Max',
    amount: '9 990',
    date: '2026. 03. 07.',
    logoName: 'Billingo',
    logoThumbnailUrl: 'https://chdtnvaezdilqmmggtml.supabase.co/storage/v1/object/public/logos/fedcf0ac-54fc-47da-beab-e9f30a7abe05/0aecdd00-7ba6-4050-891e-a8ed9567250e/thumb.webp',
  });
  await sendEmail(TO, `[TESZT v3 - fix] ${e1.subject}`, e1.html);

  console.log('\n✨ Kész!');
}

main().catch(console.error);
