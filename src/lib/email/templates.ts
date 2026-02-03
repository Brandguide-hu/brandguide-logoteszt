// Email sablonok - LogoLab
// Minden sablon egy HTML stringet ad vissza

const BRAND_COLOR = '#FFF012';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu';

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #1a1a1a; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { margin-bottom: 24px; }
    .logo img { height: 36px; }
    .btn { display: inline-block; padding: 12px 28px; background: #1a1a1a; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #999; }
    p { line-height: 1.6; margin: 0 0 16px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .highlight { background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .big-code { font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 20px; background: #f9f9f9; border-radius: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo"><img src="${APP_URL}/logolab-logo-new.png" alt="LogoLab" /></div>
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Brandguide. Minden jog fenntartva.</p>
      <p><a href="${APP_URL}" style="color:#999;">logolab.hu</a></p>
    </div>
  </div>
</body>
</html>`.trim();
}

// 10.4 Sikeres fizetés
export function paymentSuccessEmail(params: {
  name: string;
  tierName: string;
  amount: string;
  date: string;
  analysisUrl: string;
}) {
  const subject = 'Fizetésed sikeres – LogoLab';
  const html = layout(`
    <p>Szia ${params.name}!</p>
    <p>Köszönjük a vásárlást! A fizetésed sikeresen megtörtént.</p>
    <div class="highlight">
      <p style="margin:0"><strong>Csomag:</strong> ${params.tierName}</p>
      <p style="margin:8px 0 0"><strong>Összeg:</strong> ${params.amount} Ft</p>
      <p style="margin:8px 0 0"><strong>Dátum:</strong> ${params.date}</p>
    </div>
    <p>Az elemzésed hamarosan elkészül, értesítünk emailben.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${params.analysisUrl}" class="btn">Elemzés megtekintése</a>
    </p>
  `);
  return { subject, html };
}

// 10.5 Elemzés kész
export function analysisCompleteEmail(params: {
  name: string;
  logoName: string;
  score: number;
  resultUrl: string;
}) {
  const subject = 'Elkészült a logó elemzésed – LogoLab';
  const html = layout(`
    <p>Szia ${params.name}!</p>
    <p>Elkészült a logód elemzése!</p>
    <div class="highlight">
      <p style="margin:0"><strong>Logó:</strong> ${params.logoName}</p>
      <p style="margin:8px 0 0"><strong>Összpontszám:</strong> ${params.score}/100</p>
    </div>
    <p style="text-align:center;margin-top:24px;">
      <a href="${params.resultUrl}" class="btn">Eredmény megtekintése</a>
    </p>
  `);
  return { subject, html };
}

// 10.6 Jóváhagyás (publikus lett)
export function approvalEmail(params: {
  name: string;
  galleryUrl: string;
}) {
  const subject = 'A logód megjelent a galériában – LogoLab';
  const html = layout(`
    <p>Szia ${params.name}!</p>
    <p>Jó hír! A logód jóváhagyásra került és mostantól látható a Logo galériában.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${params.galleryUrl}" class="btn">Megtekintés a galériában</a>
    </p>
    <p>Oszd meg ismerőseiddel!</p>
  `);
  return { subject, html };
}

// 10.7 Elutasítás
export function rejectionEmail(params: {
  name: string;
  reason: string;
}) {
  const subject = 'Elemzésed státusza – LogoLab';
  const html = layout(`
    <p>Szia ${params.name}!</p>
    <p>Sajnáljuk, de a logó elemzésed nem került jóváhagyásra a publikus galériába.</p>
    <div class="highlight">
      <p style="margin:0"><strong>Indoklás:</strong> ${params.reason}</p>
    </div>
    <p>Az elemzésed továbbra is elérhető a fiókodban.</p>
    <p>Ha kérdésed van, írj nekünk: <a href="mailto:peti@brandguide.hu">peti@brandguide.hu</a></p>
  `);
  return { subject, html };
}

// 10.8 Hét logója nyertes
export function weeklyWinnerEmail(params: {
  name: string;
  logoName: string;
  galleryUrl: string;
}) {
  const subject = 'Gratulálunk! A logód a Hét logója lett!';
  const html = layout(`
    <p>Szia ${params.name}!</p>
    <p><strong>Fantasztikus hír!</strong></p>
    <p>A „${params.logoName}" logód elnyerte a „Hét logója" címet!</p>
    <div class="highlight">
      <p style="margin:0">Ez azt jelenti, hogy:</p>
      <ul>
        <li>A logód kiemelt helyen jelenik meg a galériában</li>
        <li>Megosztjuk a social media csatornáinkon</li>
      </ul>
    </div>
    <p style="text-align:center;margin-top:24px;">
      <a href="${params.galleryUrl}" class="btn">Megtekintés</a>
    </p>
    <p>Köszönjük, hogy a LogoLab-ot választottad!</p>
  `);
  return { subject, html };
}

// 10.9 Üdvözlő email
export function welcomeEmail(params: {
  name: string;
}) {
  const subject = 'Üdvözlünk a LogoLab-on!';
  const html = layout(`
    <p>Szia ${params.name}!</p>
    <p>Örülünk, hogy csatlakoztál!</p>
    <p>A LogoLab segít objektíven értékelni a logódat 7 professzionális szempont szerint.</p>
    <div class="highlight">
      <p style="margin:0"><strong>Így kezdj hozzá:</strong></p>
      <ol style="padding-left:20px;margin:8px 0 0">
        <li>Töltsd fel a logódat</li>
        <li>Válaszd ki a csomagot</li>
        <li>Kapd meg a részletes elemzést</li>
      </ol>
    </div>
    <p style="text-align:center;margin-top:24px;">
      <a href="${APP_URL}/dashboard/uj" class="btn">Első elemzés indítása</a>
    </p>
    <p>Naponta 1 ingyenes elemzés elérhető!</p>
    <p>Kérdésed van? Írj nekünk: <a href="mailto:peti@brandguide.hu">peti@brandguide.hu</a></p>
  `);
  return { subject, html };
}

// 10.10 Reminder (3 nap után)
export function reminderEmail(params: {
  name: string;
}) {
  const subject = 'Még nem próbáltad ki a LogoLab-ot?';
  const html = layout(`
    <p>Szia ${params.name}!</p>
    <p>Láttuk, hogy regisztráltál, de még nem készítettél elemzést.</p>
    <p>Emlékeztetőül: <strong>naponta 1 ingyenes elemzés</strong> elérhető!</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${APP_URL}/dashboard/uj" class="btn">Elemzés indítása</a>
    </p>
    <p>Ha kérdésed van, írj bátran: <a href="mailto:peti@brandguide.hu">peti@brandguide.hu</a></p>
  `);
  return { subject, html };
}

// 10.11 Konzultáció foglalás (admin-nak)
export function consultationBookingEmail(params: {
  userName: string;
  userEmail: string;
  logoName: string;
  score: number;
  adminUrl: string;
}) {
  const subject = 'Konzultáció foglalás – LogoLab';
  const html = layout(`
    <p><strong>Új konzultáció foglalás érkezett!</strong></p>
    <div class="highlight">
      <p style="margin:0"><strong>Felhasználó:</strong> ${params.userName}</p>
      <p style="margin:8px 0 0"><strong>Email:</strong> ${params.userEmail}</p>
      <p style="margin:8px 0 0"><strong>Logó:</strong> ${params.logoName}</p>
      <p style="margin:8px 0 0"><strong>Összpontszám:</strong> ${params.score}/100</p>
    </div>
    <p style="text-align:center;margin-top:24px;">
      <a href="${params.adminUrl}" class="btn">Elemzés megtekintése</a>
    </p>
    <p>Kérlek, vedd fel a kapcsolatot a felhasználóval időpont egyeztetés céljából.</p>
  `);
  return { subject, html };
}
