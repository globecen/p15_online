export const PX_PER_MM = 8; // 203 DPI ≈ 8 dots per mm

export type PaperType = 'gap' | 'continuous';
export type DitherMode = 'floyd-steinberg' | 'threshold';
export type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF';

export interface LabelDimensions {
  widthMm: number;  // Length of the label (along tape feed, e.g. 40mm)
  heightMm: number; // Width of the tape (print head width, e.g. 12mm, 14mm, 15mm)
  name?: string;
}

export const PRESET_LABEL_SIZES: LabelDimensions[] = [
  { name: '40 × 12 mm (Standard P15)', widthMm: 40, heightMm: 12 },
  { name: '30 × 12 mm (Court)', widthMm: 30, heightMm: 12 },
  { name: '22 × 12 mm (Mini)', widthMm: 22, heightMm: 12 },
  { name: '40 × 14 mm (Moyen)', widthMm: 40, heightMm: 14 },
  { name: '30 × 14 mm', widthMm: 30, heightMm: 14 },
  { name: '50 × 15 mm (Grand format P15)', widthMm: 50, heightMm: 15 },
  { name: '40 × 15 mm', widthMm: 40, heightMm: 15 },
  { name: '30 × 15 mm', widthMm: 30, heightMm: 15 },
  { name: '60 × 15 mm (Long câble)', widthMm: 60, heightMm: 15 },
];

export interface BaseElement {
  id: string;
  x: number; // in pixels (at 8 px/mm)
  y: number; // in pixels (at 8 px/mm)
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  locked?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number; // in px
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  align: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
}

export interface BarcodeElement extends BaseElement {
  type: 'barcode';
  format: BarcodeFormat;
  content: string;
  displayValue: boolean;
  fontSize: number;
}

export interface QrCodeElement extends BaseElement {
  type: 'qrcode';
  content: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
}

export interface IconElement extends BaseElement {
  type: 'icon';
  iconName: string;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rect' | 'rounded-rect' | 'circle' | 'line-h' | 'line-v' | 'border-frame' | 'star' | 'heart';
  strokeWidth: number;
  filled: boolean;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  dataUrl: string;
  ditherMode: DitherMode;
  threshold: number; // 0 - 255
  invert: boolean;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
}

export type LabelElement =
  | TextElement
  | BarcodeElement
  | QrCodeElement
  | IconElement
  | ShapeElement
  | ImageElement;

export interface PrintSettings {
  copies: number;
  density: 1 | 2 | 3; // 1: Clair, 2: Normal, 3: Foncé
  ditherMode: DitherMode;
  threshold: number;
  paperType: PaperType;
}

export interface TemplatePreset {
  id: string;
  title: string;
  category: 'Câbles' | 'Maison & Cuisine' | 'Atelier & Rangement' | 'Boutique & Prix' | 'Bureau' | 'Événements';
  dimensions: LabelDimensions;
  description: string;
  elements: LabelElement[];
}
