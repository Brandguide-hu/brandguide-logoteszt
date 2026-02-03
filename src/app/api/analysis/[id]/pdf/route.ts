import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth ellenőrzés
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Elemzés lekérés
  const adminSupabase = getAdminSupabase();
  const { data: analysis } = await adminSupabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single() as any;

  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  // Tulajdonos vagy admin ellenőrzés
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (analysis.user_id !== user.id && !profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Csak consultation tier-nek engedélyezett
  if (analysis.tier !== 'consultation' && !profile?.is_admin) {
    return NextResponse.json({ error: 'PDF export csak Konzultáció csomaggal érhető el' }, { status: 403 });
  }

  if (analysis.status !== 'completed' || !analysis.result) {
    return NextResponse.json({ error: 'Analysis not completed' }, { status: 400 });
  }

  const result = analysis.result;

  // PDF generálás
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFontSize(22);
  doc.setTextColor(255, 240, 18); // Brand yellow
  doc.text('Logo', margin, 26);
  doc.setTextColor(255, 255, 255);
  doc.text('Lab', margin + 25, 26);
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text('Logo elemzes jelentes', margin, 34);

  y = 52;

  // Logo neve és alap infó
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(18);
  doc.text(analysis.logo_name || 'Logo elemzes', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Datum: ${new Date(analysis.created_at).toLocaleDateString('hu-HU')}`, margin, y);
  y += 12;

  // Összpontszám
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setTextColor(26, 26, 26);
  doc.text('Osszpontszam', margin + 8, y + 12);
  doc.setFontSize(28);
  doc.text(`${result.osszpontszam || 0}/100`, margin + 8, y + 24);
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(result.minosites || '', margin + contentWidth - 60, y + 18);
  y += 36;

  // Összefoglalás
  if (result.osszefoglalas) {
    checkPage(30);
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    doc.text('Osszefoglalas', margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(result.osszefoglalas, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 8;
  }

  // 7 szempont pontszámok
  if (result.szempiontok) {
    checkPage(60);
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    doc.text('Reszletes ertekeles', margin, y);
    y += 8;

    const criteria = result.szempiontok;
    for (const [key, value] of Object.entries(criteria)) {
      checkPage(20);
      const criterion = value as any;
      const score = criterion?.pontszam || 0;
      const name = criterion?.nev || key;

      doc.setFontSize(10);
      doc.setTextColor(26, 26, 26);
      doc.text(`${name}`, margin, y);
      doc.text(`${score}/100`, margin + contentWidth - 20, y);

      // Score bar
      y += 3;
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(margin, y, contentWidth, 3, 1.5, 1.5, 'F');
      const barWidth = (score / 100) * contentWidth;
      if (score >= 80) doc.setFillColor(34, 197, 94);
      else if (score >= 60) doc.setFillColor(234, 179, 8);
      else doc.setFillColor(239, 68, 68);
      doc.roundedRect(margin, y, barWidth, 3, 1.5, 1.5, 'F');

      y += 6;

      // Indoklás
      if (criterion?.indoklas) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const indLines = doc.splitTextToSize(criterion.indoklas, contentWidth);
        doc.text(indLines.slice(0, 3), margin, y);
        y += Math.min(indLines.length, 3) * 3.5 + 5;
      }
    }
  }

  // Erősségek és fejlesztendő
  if (result.erossegek?.length || result.fejlesztendo?.length) {
    checkPage(40);
    y += 4;

    const halfWidth = (contentWidth - 6) / 2;

    if (result.erossegek?.length) {
      doc.setFontSize(11);
      doc.setTextColor(34, 197, 94);
      doc.text('Erossegek', margin, y);
      let ey = y + 6;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      for (const item of result.erossegek) {
        checkPage(8);
        const lines = doc.splitTextToSize(`+ ${item}`, halfWidth);
        doc.text(lines, margin, ey);
        ey += lines.length * 3.5 + 2;
      }
    }

    if (result.fejlesztendo?.length) {
      doc.setFontSize(11);
      doc.setTextColor(239, 68, 68);
      doc.text('Fejlesztendo', margin + halfWidth + 6, y);
      let fy = y + 6;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      for (const item of result.fejlesztendo) {
        checkPage(8);
        const lines = doc.splitTextToSize(`- ${item}`, halfWidth);
        doc.text(lines, margin + halfWidth + 6, fy);
        fy += lines.length * 3.5 + 2;
      }
    }

    y += 40;
  }

  // Szín elemzés
  if (result.szinelemzes) {
    checkPage(30);
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    doc.text('Szin elemzes', margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    if (result.szinelemzes.osszefoglalas) {
      const lines = doc.splitTextToSize(result.szinelemzes.osszefoglalas, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 6;
    }
  }

  // Tipográfia elemzés
  if (result.tipografia) {
    checkPage(30);
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    doc.text('Tipografia elemzes', margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    if (result.tipografia.osszefoglalas) {
      const lines = doc.splitTextToSize(result.tipografia.osszefoglalas, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 6;
    }
  }

  // Vizuális nyelv
  if (result.vizualis_nyelv) {
    checkPage(30);
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    doc.text('Vizualis nyelv', margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    if (result.vizualis_nyelv.osszefoglalas) {
      const lines = doc.splitTextToSize(result.vizualis_nyelv.osszefoglalas, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 6;
    }
  }

  // Footer
  checkPage(20);
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Keszitette: LogoLab by Brandguide | logolab.hu', margin, y);
  doc.text(`Generalt: ${new Date().toLocaleDateString('hu-HU')}`, margin + contentWidth - 40, y);

  // PDF output
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const safeName = (analysis.logo_name || 'elemzes').replace(/[^a-zA-Z0-9-_]/g, '_');

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="LogoLab_${safeName}.pdf"`,
    },
  });
}
