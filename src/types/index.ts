// Teszt szintek
export type TestLevel = 'basic' | 'detailed' | 'full' | 'rebranding';

// Tier-ek (fizetési csomagok)
export type Tier = 'free' | 'paid' | 'consultation';

// Elemzés státusz
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Láthatóság
export type Visibility = 'private' | 'pending_approval' | 'public' | 'rejected';

// Kategóriák (v0.91: 16 iparág, ábécé sorrendben)
export type Category =
  | 'auto_transport'
  | 'fashion'
  | 'health_beauty'
  | 'food_agriculture'
  | 'construction_realestate'
  | 'manufacturing'
  | 'retail_webshop'
  | 'creative_media'
  | 'nonprofit'
  | 'education_training'
  | 'finance_insurance'
  | 'sport_fitness'
  | 'accommodation_tourism'
  | 'tech'
  | 'hospitality'
  | 'other';

export const CATEGORIES: Record<Category, string> = {
  auto_transport: 'Autó & Szállítás',
  fashion: 'Divat & Ruházat',
  health_beauty: 'Egészség & Szépség',
  food_agriculture: 'Élelmiszer & Mezőgazdaság',
  construction_realestate: 'Építőipar & Ingatlan',
  manufacturing: 'Gyártás & Ipar',
  retail_webshop: 'Kereskedelem & Webshop',
  creative_media: 'Kreatív & Média',
  nonprofit: 'Non-profit & Civil',
  education_training: 'Oktatás & Képzés',
  finance_insurance: 'Pénzügy & Biztosítás',
  sport_fitness: 'Sport & Fitness',
  accommodation_tourism: 'Szállás & Turizmus',
  tech: 'Technológia & IT',
  hospitality: 'Vendéglátás',
  other: 'Egyéb',
};

export const TIER_INFO: Record<Tier, { label: string; price: string; priceBrutto: number; features: string[] }> = {
  free: {
    label: 'Light',
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
    label: 'Max',
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
    label: 'Ultra',
    price: '24 990 Ft + ÁFA',
    priceBrutto: 31737,
    features: [
      'Minden a Max csomagból',
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

// Supabase tábla típus (v0.91)
export interface AnalysisRow {
  id: string;
  user_id: string;
  tier: Tier;
  status: AnalysisStatus;
  visibility: Visibility;
  rejection_reason: string | null;
  logo_name: string;
  creator_name: string | null;         // v0.91: nullable (fizetősnél opcionális)
  category: Category | null;           // v0.91: nullable (fizetősnél opcionális)
  logo_original_path: string | null;
  logo_thumbnail_path: string | null;
  logo_base64: string | null;
  result: AnalysisResult | null;
  share_hash: string | null;
  is_weekly_winner: boolean;
  weekly_winner_date: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;  // v0.91: Stripe Checkout Session ID
  stripe_amount: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

// Account eredete
export type CreatedVia = 'direct' | 'stripe';

// Profile típus (v0.91)
export interface Profile {
  id: string;
  email: string;
  name: string | null;                 // v0.91: nullable (Stripe-ból jövő usereknél)
  is_admin: boolean;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_free_analysis_at: string | null;
  last_free_analysis_ip: string | null;
  created_via: CreatedVia;             // v0.91: account eredete
}

// Ideiglenes elemzés adatok (Stripe fizetés előtt)
export interface PendingAnalysis {
  id: string;
  session_id: string;                  // Cookie-alapú anonymous session
  tier: Tier;
  logo_temp_path: string;              // Supabase Storage temp path
  logo_thumbnail_temp_path: string | null;
  logo_name: string;
  creator_name: string | null;
  category: Category | null;
  email: string | null;                // Megadott email (ha nem volt bejelentkezve)
  user_id: string | null;              // Ha be volt jelentkezve
  created_at: string;
  expires_at: string;                  // 24h TTL
}

// Feltöltési funnel event
export type UploadEventType =
  | 'page_view'
  | 'tier_selected'
  | 'logo_selected'
  | 'form_filled'
  | 'submit_clicked'
  | 'auth_started'
  | 'stripe_redirect'
  | 'completed'
  | 'abandoned';

export interface UploadEvent {
  id: string;
  session_id: string;
  event_type: UploadEventType;
  tier: Tier | null;
  has_logo: boolean;
  has_email: boolean;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
}

// Admin művelet típusok
export type AdminActionType =
  | 'approve_analysis'
  | 'reject_analysis'
  | 'select_weekly_winner'
  | 'delete_user'
  | 'restore_user';

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: AdminActionType;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}
