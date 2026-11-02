import { DitherMode } from '../types/label';
import { L11_COMMANDS } from './constants';

export interface ProcessedBitmap {
  data: Uint8Array;
  width: number;
  height: number;
  bytesPerRow: number;
  previewUrl: string; // URL data pour prévisualiser les points thermiques
}

/**
 * Rotation d'un canevas à 90° dans le sens horaire.
 * Les imprimantes d'étiquettes portables comme la Pristar P15 impriment en travers
 * de la bande (hauteur physique de la tête = largeur du ruban 12-15mm).
 */
export function rotateCanvas90CW(srcCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = srcCanvas.height;
  dstCanvas.height = srcCanvas.width;

  const ctx = dstCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.translate(dstCanvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(srcCanvas, 0, 0);

  return dstCanvas;
}

/**
 * Conversion d'une image RGBA en niveaux de gris (luminance pondérée)
 */
export function rgbaToGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const pixelsCount = width * height;
  const gray = new Float32Array(pixelsCount);

  for (let i = 0; i < pixelsCount; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];

    // Mélange avec fond blanc si transparence
    const alpha = a / 255;
    const blendedR = r * alpha + 255 * (1 - alpha);
    const blendedG = g * alpha + 255 * (1 - alpha);
    const blendedB = b * alpha + 255 * (1 - alpha);

    gray[i] = blendedR * 0.299 + blendedG * 0.587 + blendedB * 0.114;
  }

  return gray;
}

/**
 * Tramage Floyd-Steinberg en serpentin (bidirectionnel)
 * 0 = blanc, 1 = noir thermique
 */
export function floydSteinbergDither(
  grayscale: Float32Array,
  width: number,
  height: number,
): Uint8Array {
  const pixels = new Float32Array(grayscale);
  const result = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const leftToRight = y % 2 === 0;
    const startX = leftToRight ? 0 : width - 1;
    const endX = leftToRight ? width : -1;
    const step = leftToRight ? 1 : -1;

    for (let x = startX; x !== endX; x += step) {
      const idx = y * width + x;
      const oldPixel = pixels[idx];
      const newPixel = oldPixel >= 128 ? 255 : 0;
      const error = oldPixel - newPixel;

      result[idx] = newPixel === 0 ? 1 : 0; // 1 = noir, 0 = blanc

      const forward = x + step;
      const hasForward = leftToRight ? forward < width : forward >= 0;
      const back = x - step;
      const hasBack = leftToRight ? back >= 0 : back < width;

      if (hasForward) {
        pixels[idx + step] += error * (7 / 16);
      }
      if (y + 1 < height) {
        if (hasBack) {
          pixels[(y + 1) * width + back] += error * (3 / 16);
        }
        pixels[(y + 1) * width + x] += error * (5 / 16);
        if (hasForward) {
          pixels[(y + 1) * width + forward] += error * (1 / 16);
        }
      }
    }
  }

  return result;
}

/**
 * Binarisation simple par seuil
 */
export function thresholdBinarize(
  grayscale: Float32Array,
  cutoff: number = 128,
): Uint8Array {
  const result = new Uint8Array(grayscale.length);
  for (let i = 0; i < grayscale.length; i++) {
    result[i] = grayscale[i] < cutoff ? 1 : 0;
  }
  return result;
}

/**
 * Compactage des bits 1bpp MSB-first pour l'imprimante
 * Chaque ligne est alignée sur un octet.
 */
export function pack1bpp(
  binary: Uint8Array,
  width: number,
  height: number,
): { packed: Uint8Array; bytesPerRow: number } {
  const bytesPerRow = Math.ceil(width / 8);
  const packed = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIdx = y * width + x;
      if (binary[pixelIdx] === 1) {
        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8); // MSB en tête
        packed[byteIdx] |= 1 << bitIdx;
      }
    }
  }

  return { packed, bytesPerRow };
}

/**
 * Traite le canevas de l'étiquette pour générer le bitmap binaire prêt pour la Pristar P15.
 */
export function processLabelForPrint(
  sourceCanvas: HTMLCanvasElement,
  options: {
    ditherMode: DitherMode;
    threshold?: number;
    rotate90?: boolean;
  },
): ProcessedBitmap {
  const { ditherMode = 'floyd-steinberg', threshold = 128, rotate90 = true } = options;

  // 1. Rotation 90° horaire si demandée (orientation standard P15)
  const targetCanvas = rotate90 ? rotateCanvas90CW(sourceCanvas) : sourceCanvas;
  const width = targetCanvas.width;
  const height = targetCanvas.height;

  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true })!;
  const imgData = ctx.getImageData(0, 0, width, height);

  // 2. Niveaux de gris
  const grayscale = rgbaToGrayscale(imgData.data, width, height);

  // 3. Binarisation (Dithering ou Seuil)
  const binary =
    ditherMode === 'floyd-steinberg'
      ? floydSteinbergDither(grayscale, width, height)
      : thresholdBinarize(grayscale, threshold);

  // 4. Compactage 1bpp
  const { packed, bytesPerRow } = pack1bpp(binary, width, height);

  // 5. Générer une image de prévisualisation thermique (remise à l'endroit horizontale pour l'utilisateur)
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = sourceCanvas.width;
  previewCanvas.height = sourceCanvas.height;
  const pCtx = previewCanvas.getContext('2d')!;
  const pImgData = pCtx.createImageData(sourceCanvas.width, sourceCanvas.height);

  // Également binariser le canevas d'origine non-tourné pour l'affichage écran
  const origCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })!;
  const origImg = origCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const origGray = rgbaToGrayscale(origImg.data, sourceCanvas.width, sourceCanvas.height);
  const origBinary =
    ditherMode === 'floyd-steinberg'
      ? floydSteinbergDither(origGray, sourceCanvas.width, sourceCanvas.height)
      : thresholdBinarize(origGray, threshold);

  for (let i = 0; i < origBinary.length; i++) {
    const isBlack = origBinary[i] === 1;
    const off = i * 4;
    pImgData.data[off] = isBlack ? 15 : 250;
    pImgData.data[off + 1] = isBlack ? 23 : 250;
    pImgData.data[off + 2] = isBlack ? 42 : 250;
    pImgData.data[off + 3] = 255;
  }
  pCtx.putImageData(pImgData, 0, 0);

  return {
    data: packed,
    width,
    height,
    bytesPerRow,
    previewUrl: previewCanvas.toDataURL('image/png'),
  };
}

/**
 * Construit la séquence complète de commandes d'impression L11
 */
export function buildL11PrintJob(
  bitmap: ProcessedBitmap,
  options: {
    density: 1 | 2 | 3;
    paperType: 'gap' | 'continuous';
  },
): {
  preamble: Uint8Array;
  bulk: Uint8Array;
} {
  const { density = 2, paperType = 'gap' } = options;

  // 1. Préambule : réveil, densité, activation
  const wakeup = L11_COMMANDS.wakeup();
  const setThickness = L11_COMMANDS.setThickness(density);
  const setDensity = L11_COMMANDS.setDensity(density);
  const enable = L11_COMMANDS.enable();

  const preambleLen = wakeup.length + setThickness.length + setDensity.length + enable.length;
  const preamble = new Uint8Array(preambleLen);
  let off = 0;

  preamble.set(wakeup, off); off += wakeup.length;
  preamble.set(setThickness, off); off += setThickness.length;
  preamble.set(setDensity, off); off += setDensity.length;
  preamble.set(enable, off);

  // 2. Données principales : trame d'image bitmap + avance + stop
  const bitmapCmd = L11_COMMANDS.buildBitmapCommand(bitmap.bytesPerRow, bitmap.height, bitmap.data);
  const feedCmd = paperType === 'gap' ? L11_COMMANDS.positionToGap() : L11_COMMANDS.feedDots(100);
  const stopCmd = L11_COMMANDS.stop();

  const bulkLen = bitmapCmd.length + feedCmd.length + stopCmd.length;
  const bulk = new Uint8Array(bulkLen);
  off = 0;

  bulk.set(bitmapCmd, off); off += bitmapCmd.length;
  bulk.set(feedCmd, off); off += feedCmd.length;
  bulk.set(stopCmd, off);

  return { preamble, bulk };
}
