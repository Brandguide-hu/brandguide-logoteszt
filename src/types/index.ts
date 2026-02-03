// Teszt szintek
export type TestLevel = 'basic' | 'detailed' | 'full' | 'rebranding';

// Tier-ek (fizetési csomagok)
export type Tier = 'free' | 'paid' | 'consultation';

// Elemzés státusz
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Láthatóság
export type Visibility = 'private' | 'pending_approval' | 'public' | 'rejected';

// Kategóriák
export type Category =
  | 'tech'
  | 'hospitality'
  | 'health_beauty'
  | 'construction_realestate'
  | 'retail'
  | 'services'
  | 'creative_media'
  | 'education'
  | 'manufacturing'
  | 'nonprofit'
  | 'other';

export const CATEGORIES: Record<Category, string> = {
  tech: 'Technológia & IT',
  hospitality: 'Vendéglátás',
  health_beauty: 'Egészség & Szépség',
  construction_realestate: 'Építőipar & Ingatlan',
  retail: 'Kereskedelem',
  services: 'Szolgáltatás',
  creative_media: 'Kreatív & Média',
  education: 'Oktatás',
  manufacturing: 'Gyártás & Ipar',
  nonprofit: 'Non-profit & Civil',
  other: 'Egyéb',
};

export const TIER_INFO: Record<Tier, { label: string; price: string; priceBrutto: number; features: string[] }> = {
  free: {
    label: 'Ingyenes',
    price: '0 Ft',
    priceBrutto: 0,
    features: [
      'Összpontszám',
      '7 szempont pontszám',
      'Radar chart',
      'Publikus megjelenés a galériában',
    ],
  },
  paid: {
    label: 'Zárt elemzés',
    price: '1 990 Ft + ÁFA',
    priceBrutto: 2527,
    features: [
      'Összpontszám + 7 szempont',
      'Szöveges indoklás + javaslatok',
      'Szín, tipográfia, vizuális nyelv elemzés',
      'Erősségek / Fejlesztendő',
      'Megosztható link',
      'Privát (opcionálisan publikálható)',
    ],
  },
  consultation: {
    label: 'Zárt + Konzultáció',
    price: '24 990 Ft + ÁFA',
    priceBrutto: 31737,
    features: [
      'Minden a Zárt elemzésből',
      'PDF export',
      '20 perces szakértői konzultáció',
    ],
  },
};

// Minősítési kategóriák
export type Rating = 'Kivételes' | 'Profi' | 'Jó minőségű' | 'Átlagos' | 'Problémás' | 'Újragondolandó';

// Szempont nevek - JAVÍTOTT kulcsnevek
export type CriteriaName =
  | 'megkulonboztethetoseg'
  | 'egyszeruseg'           // JAVÍTVA: egyszuruseg -> egyszeruseg
  | 'alkalmazhatosag'
  | 'emlekezetesseg'
  | 'idotallosag'           // JAVÍTVA: idotallosasg -> idotallosag
  | 'univerzalitas'
  | 'lathatosag';

// Szempont értékelés
export interface CriteriaScore {
  pont: number;
  maxPont: number;
  indoklas: string;
  javaslatok: string[];
}

// Szín elemzés
export interface ColorAnalysis {
  harmonia: string;
  pszichologia: string;
  technikai: string;
  javaslatok: string[];
}

// Tipográfia elemzés
export interface TypographyAnalysis {
  karakter: string;
  olvashatosag: string;
  javaslatok: string[];
}

// Vizuális nyelv elemzés
export interface VisualLanguageAnalysis {
  formak: string;
  elemek: string;
  stilusEgyseg: string;
  javaslatok: string[];
}

// Teljes elemzési eredmény
export interface AnalysisResult {
  id: string;
  osszpontszam: number;
  minosites: Rating;
  szempontok: {
    megkulonboztethetoseg: CriteriaScore;
    egyszeruseg: CriteriaScore;
    alkalmazhatosag: CriteriaScore;
    emlekezetesseg: CriteriaScore;
    idotallosag: CriteriaScore;
    univerzalitas: CriteriaScore;
    lathatosag: CriteriaScore;
  };
  osszegzes: string;
  erossegek: string[];
  fejlesztendo: string[];
  szinek: ColorAnalysis;
  tipografia: TypographyAnalysis;
  vizualisNyelv: VisualLanguageAnalysis;
  createdAt: string;
  testLevel: TestLevel;
  logoUrl?: string;
}

// Szempontok meta adatai - JAVÍTOTT kulcsnevek
export interface CriteriaMeta {
  name: CriteriaName;
  displayName: string;
  maxScore: number;
  description: string;
  icon: string;
}

export const CRITERIA_META: Record<CriteriaName, CriteriaMeta> = {
  megkulonboztethetoseg: {
    name: 'megkulonboztethetoseg',
    displayName: 'Megkülönböztethetőség',
    maxScore: 20,
    description: 'Ha nem tűnsz ki, nem létezel. A zsúfolt piacon ez az elsődleges túlélési kritérium.',
    icon: '🎯'
  },
  egyszeruseg: {
    name: 'egyszeruseg',
    displayName: 'Egyszerűség',
    maxScore: 18,
    description: 'Paul Rand alaptétele. A komplexitás az ellenség – amit nem tudsz 2 másodperc alatt felfogni, az nem működik.',
    icon: '✨'
  },
  alkalmazhatosag: {
    name: 'alkalmazhatosag',
    displayName: 'Alkalmazhatóság',
    maxScore: 15,
    description: 'Digitális + fizikai térben egyaránt működnie kell. Favicon-tól a cégtábláig.',
    icon: '📐'
  },
  emlekezetesseg: {
    name: 'emlekezetesseg',
    displayName: 'Emlékezetesség',
    maxScore: 15,
    description: 'Ha nem marad meg, nem épít brandet. A memória az érték.',
    icon: '💡'
  },
  idotallosag: {
    name: 'idotallosag',
    displayName: 'Időtállóság',
    maxScore: 12,
    description: 'Trendek jönnek-mennek, a jó logó marad. 10+ éves távlatban kell gondolkodni.',
    icon: '⏳'
  },
  univerzalitas: {
    name: 'univerzalitas',
    displayName: 'Univerzalitás',
    maxScore: 10,
    description: 'Különböző kontextusokban, kultúrákban, méretekben működik.',
    icon: '🌍'
  },
  lathatosag: {
    name: 'lathatosag',
    displayName: 'Láthatóság',
    maxScore: 10,
    description: 'Kontraszt, olvashatóság, technikai minőség.',
    icon: '👁️'
  }
};

// Radar chart-hoz adat formátum
export interface RadarDataPoint {
  criteria: string;
  score: number;
  fullMark: number;
}

// Form adat a feltöltéshez
export interface UploadFormData {
  logo: File | null;
  testLevel: TestLevel;
  colors: string[];
  fontName?: string;  // Betűtípus neve
}

// Supabase tábla típus (legacy)
export interface AnalysisRecord {
  id: string;
  result: AnalysisResult;
  logo_base64: string;
  created_at: string;
  test_level: TestLevel;
}

// Supabase tábla típus (v0.9)
export interface AnalysisRow {
  id: string;
  user_id: string;
  tier: Tier;
  status: AnalysisStatus;
  visibility: Visibility;
  rejection_reason: string | null;
  logo_name: string;
  creator_name: string;
  category: Category;
  logo_original_path: string | null;
  logo_thumbnail_path: string | null;
  logo_base64: string | null;
  result: AnalysisResult | null;
  share_hash: string | null;
  is_weekly_winner: boolean;
  weekly_winner_date: string | null;
  stripe_payment_intent_id: string | null;
  stripe_amount: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

// Profile típus
export interface Profile {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_free_analysis_at: string | null;
  last_free_analysis_ip: string | null;
}
