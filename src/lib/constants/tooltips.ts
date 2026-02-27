export const TOOLTIPS = {
  // 7 értékelési szempont
  criteria: {
    lathatosag:
      'Mennyire kontrasztos és jól felismerhető a logó különböző méretekben és felületeken? A jó láthatóság biztosítja, hogy a logó soha ne „tűnjön el."',
    egyszeruseg:
      'A logó a lehető legkevesebb elemmel kommunikálja a lényeget? Paul Rand szerint a logó feladata az azonosítás – nem az illusztráció.',
    idotallosag:
      'A logó ellenáll a vizuális trendeknek, vagy néhány év múlva elavultnak fog tűnni? Az időtálló logó évtizedekig működik változtatás nélkül.',
    univerzalitas:
      'Működik-e a logó eltérő kulturális és nyelvi kontextusban? Az univerzális logó nem tartalmaz félreérthető szimbólumokat vagy szűk kultúrkörre jellemző utalásokat.',
    emlekezetesseg:
      'Mennyire könnyű felidézni a logót emlékezetből? Az emlékezetes logó egyetlen látás után is megragad – formája és karaktere egyedi.',
    alkalmazhatosag:
      'Jól működik-e a logó minden felületen: weboldalon, névjegykártyán, cégtáblán, apró ikonként? A jó logó méret- és médiumfüggetlen.',
    megkulonboztethetoseg:
      'Mennyire egyedi a logó az adott iparágban? Könnyen megkülönböztethető a versenytársaktól, vagy beleillik a „mindegy melyik cég" kategóriába?',
  },

  // Geometriai elemzés
  geometry: {
    balance:
      'A logó „vizuális súlypontját" hasonlítjuk össze a geometriai középponttal. Ha a kettő közel van egymáshoz, a logó kiegyensúlyozott és stabil benyomást kelt.',
    symmetry:
      'Megvizsgáljuk, mennyire szimmetrikus a logó vízszintesen és függőlegesen. A szimmetria rendet és megbízhatóságot sugall – az aszimmetria viszont dinamizmust és egyediséget.',
    complexity:
      'A logó részletgazdagságát mérjük. Az egyszerűbb logó jobban méretezhető és könnyebben megjegyezhető – de a túl egyszerű logó nem feltétlenül megkülönböztető.',
    silhouette:
      'Paul Rand alapvető tesztje: felismerhető-e a logó, ha egyetlen színnel, sziluettként ábrázoljuk? Ha igen, a formavilág erős.',
  },

  // Szín elemzés
  color: {
    section:
      'A logó színvilágának szakmai értékelése: harmónia, pszichológiai hatás és technikai alkalmazhatóság szempontjából.',
    wcag:
      'A logó színei közötti kontrasztarányok mérése. A jó kontraszt biztosítja, hogy a logó minden háttéren jól olvasható legyen – akár digitálisan, akár nyomtatásban.',
    colorblind:
      'Így látják a logót a különböző típusú színtévesztők. A férfiak ~8%-a érintett – fontos, hogy a logó így is felismerhető maradjon.',
    backgrounds:
      'A logó különböző háttérszíneken. Egy jól tervezett logónak világos, sötét és fotós háttéren egyaránt működnie kell.',
  },

  // Tipográfia
  typography: {
    section:
      'A logóban használt betűtípus értékelése: karaktere, olvashatósága és a brand személyiségéhez való illeszkedése alapján.',
  },

  // Vizuális nyelv
  visualLanguage: {
    section:
      'A logó formai elemei (vonalak, formák, szimbólumok) hogyan kommunikálnak? A vizuális nyelv adja meg a logó „hangját" – ugyanúgy, ahogy a szavak a beszédét.',
  },

  // Mockup bento box
  mockups: {
    section:
      'A logó 6 valós kontextusban: app ikon, névjegykártya, üzletportál, póló, levélpapír és telefonon. Így láthatod, hogyan működik a mindennapi felhasználásban.',
  },
} as const;
