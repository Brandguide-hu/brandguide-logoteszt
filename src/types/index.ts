// Teszt szintek
export type TestLevel = 'basic' | 'detailed' | 'full' | 'rebranding';

// Minősítési kategóriák
export type Rating = 'Kiemelkedő' | 'Kiforrott' | 'Jó' | 'Elfogadható' | 'Fejlesztendő' | 'Újragondolandó';

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

// Supabase tábla típus
export interface AnalysisRecord {
  id: string;
  result: AnalysisResult;
  logo_base64: string;
  created_at: string;
  test_level: TestLevel;
}
