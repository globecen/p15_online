export interface LabelIcon {
  id: string;
  name: string;
  category: 'Tech & Câbles' | 'Maison & Rangement' | 'Cuisine & Frais' | 'Bureau' | 'Symboles & Alertes';
  viewBox: string;
  paths: string[];
}

export const LABEL_ICONS: LabelIcon[] = [
  // Tech & Câbles
  {
    id: 'usb',
    name: 'USB / Câble',
    category: 'Tech & Câbles',
    viewBox: '0 0 24 24',
    paths: ['M10 7v6h4V7h-4zm-2 0a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7z', 'M11 2h2v3h-2z', 'M11 15h2v7h-2z'],
  },
  {
    id: 'plug',
    name: 'Prise Électrique',
    category: 'Tech & Câbles',
    viewBox: '0 0 24 24',
    paths: ['M12 22v-5', 'M9 8V2', 'M15 8V2', 'M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8h12z'],
  },
  {
    id: 'wifi',
    name: 'Réseau WiFi',
    category: 'Tech & Câbles',
    viewBox: '0 0 24 24',
    paths: ['M5 12.55a11 11 0 0 1 14.08 0', 'M1.42 9a16 16 0 0 1 21.16 0', 'M8.53 16.11a6 6 0 0 1 6.95 0', 'M12 20h.01'],
  },
  {
    id: 'battery',
    name: 'Batterie',
    category: 'Tech & Câbles',
    viewBox: '0 0 24 24',
    paths: ['M2 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z', 'M22 11v2', 'M5 10v4', 'M9 10v4', 'M13 10v4'],
  },
  {
    id: 'screen',
    name: 'Écran / PC',
    category: 'Tech & Câbles',
    viewBox: '0 0 24 24',
    paths: ['M20 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z', 'M12 17v4', 'M8 21h8'],
  },
  {
    id: 'phone',
    name: 'Téléphone',
    category: 'Tech & Câbles',
    viewBox: '0 0 24 24',
    paths: ['M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z', 'M12 18h.01'],
  },
  {
    id: 'gamepad',
    name: 'Console Jeux',
    category: 'Tech & Câbles',
    viewBox: '0 0 24 24',
    paths: ['M6 12h4m-2-2v4', 'M15 11h.01M18 13h.01', 'M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z'],
  },

  // Maison & Rangement
  {
    id: 'box',
    name: 'Carton / Boîte',
    category: 'Maison & Rangement',
    viewBox: '0 0 24 24',
    paths: ['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12'],
  },
  {
    id: 'tools',
    name: 'Outils / Atelier',
    category: 'Maison & Rangement',
    viewBox: '0 0 24 24',
    paths: ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'],
  },
  {
    id: 'key',
    name: 'Clé',
    category: 'Maison & Rangement',
    viewBox: '0 0 24 24',
    paths: ['M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1-1-5.5 5.5a4 4 0 1 0 5.66 5.66L15.66 13.66', 'M19 5l-2-2'],
  },
  {
    id: 'home',
    name: 'Maison',
    category: 'Maison & Rangement',
    viewBox: '0 0 24 24',
    paths: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  },
  {
    id: 'hanger',
    name: 'Vêtements',
    category: 'Maison & Rangement',
    viewBox: '0 0 24 24',
    paths: ['M12 7a2 2 0 1 0-2-2', 'M2.1 16.5l8.5-8.5a2 2 0 0 1 2.8 0l8.5 8.5a1.5 1.5 0 0 1-1 2.5H3.1a1.5 1.5 0 0 1-1-2.5z'],
  },

  // Cuisine & Frais
  {
    id: 'snowflake',
    name: 'Congélation / Frais',
    category: 'Cuisine & Frais',
    viewBox: '0 0 24 24',
    paths: ['M12 2v20', 'M17 5l-5 5-5-5', 'M17 19l-5-5-5 5', 'M2 12h20', 'M5 7l5 5-5 5', 'M19 7l-5 5 5 5'],
  },
  {
    id: 'flame',
    name: 'Cuisson / Piquant',
    category: 'Cuisine & Frais',
    viewBox: '0 0 24 24',
    paths: ['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z'],
  },
  {
    id: 'coffee',
    name: 'Café / Boisson',
    category: 'Cuisine & Frais',
    viewBox: '0 0 24 24',
    paths: ['M18 8h1a4 4 0 0 1 0 8h-1', 'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z', 'M6 1v3', 'M10 1v3', 'M14 1v3'],
  },
  {
    id: 'utensils',
    name: 'Couverts / Repas',
    category: 'Cuisine & Frais',
    viewBox: '0 0 24 24',
    paths: ['M18 2v20', 'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7', 'M2 2l1.6 8.4A2 2 0 0 0 5.56 12H6v8a2 2 0 0 0 4 0v-8h.44a2 2 0 0 0 1.96-1.6L14 2H2z'],
  },
  {
    id: 'apple',
    name: 'Fruit / Bio',
    category: 'Cuisine & Frais',
    viewBox: '0 0 24 24',
    paths: ['M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z', 'M10 2c1 .5 2 2 2 5'],
  },

  // Bureau
  {
    id: 'folder',
    name: 'Dossier',
    category: 'Bureau',
    viewBox: '0 0 24 24',
    paths: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
  },
  {
    id: 'clock',
    name: 'Horloge / Date',
    category: 'Bureau',
    viewBox: '0 0 24 24',
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  },
  {
    id: 'tag',
    name: 'Prix / Étiquette',
    category: 'Bureau',
    viewBox: '0 0 24 24',
    paths: ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'M7 7h.01'],
  },
  {
    id: 'star',
    name: 'Étoile',
    category: 'Bureau',
    viewBox: '0 0 24 24',
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  },
  {
    id: 'heart',
    name: 'Cœur',
    category: 'Bureau',
    viewBox: '0 0 24 24',
    paths: ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  },

  // Symboles & Alertes
  {
    id: 'alert',
    name: 'Attention / Danger',
    category: 'Symboles & Alertes',
    viewBox: '0 0 24 24',
    paths: ['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  },
  {
    id: 'fragile',
    name: 'Fragile (Verre)',
    category: 'Symboles & Alertes',
    viewBox: '0 0 24 24',
    paths: ['M8 2h8l1 9c0 3-2 5-5 5s-5-2-5-5l1-9z', 'M12 16v6', 'M8 22h8'],
  },
  {
    id: 'umbrella',
    name: 'Garder au sec',
    category: 'Symboles & Alertes',
    viewBox: '0 0 24 24',
    paths: ['M12 2v2', 'M4 12a8 8 0 0 1 16 0z', 'M12 12v6a2 2 0 0 0 4 0'],
  },
  {
    id: 'arrow-up',
    name: 'Haut / Sens',
    category: 'Symboles & Alertes',
    viewBox: '0 0 24 24',
    paths: ['M12 19V5', 'M5 12l7-7 7 7'],
  },
  {
    id: 'check',
    name: 'Validé / OK',
    category: 'Symboles & Alertes',
    viewBox: '0 0 24 24',
    paths: ['M20 6L9 17l-5-5'],
  },
];
