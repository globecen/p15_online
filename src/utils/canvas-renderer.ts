import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { LabelDimensions, LabelElement, PX_PER_MM } from '../types/label';
import { LABEL_ICONS } from '../data/icons';
import { rgbaToGrayscale, floydSteinbergDither, thresholdBinarize } from '../printer/image-processor';

// Cache des images pour éviter les clignotements
const imageElementCache = new Map<string, HTMLImageElement>();

export function getCachedImage(src: string): HTMLImageElement | null {
  if (imageElementCache.has(src)) {
    const img = imageElementCache.get(src)!;
    if (img.complete) return img;
  } else {
    const img = new Image();
    img.src = src;
    imageElementCache.set(src, img);
  }
  return null;
}

/**
 * Rendu d'un élément unique sur un contexte 2D Canvas
 */
export async function renderElementToCanvas(
  ctx: CanvasRenderingContext2D,
  element: LabelElement,
): Promise<void> {
  ctx.save();

  // Position et rotation
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  ctx.translate(centerX, centerY);
  if (element.rotation) {
    ctx.rotate((element.rotation * Math.PI) / 180);
  }
  ctx.translate(-centerX, -centerY);

  switch (element.type) {
    case 'text': {
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      const weight = element.fontWeight === 'bold' ? 'bold ' : '';
      const style = element.fontStyle === 'italic' ? 'italic ' : '';
      const fontName = element.fontFamily || 'Inter, sans-serif';
      const fontStack = fontName.includes(',') || fontName.startsWith("'") || fontName.startsWith('"')
        ? fontName
        : `"${fontName}", sans-serif`;
      ctx.font = `${style}${weight}${element.fontSize}px ${fontStack}`;

      const lines = element.text.split('\n');
      const lineHeight = element.fontSize * (element.lineHeight || 1.15);

      lines.forEach((line, index) => {
        const textY = element.y + index * lineHeight;
        let textX = element.x;

        if (element.align === 'center') {
          const metrics = ctx.measureText(line);
          textX = element.x + (element.width - metrics.width) / 2;
        } else if (element.align === 'right') {
          const metrics = ctx.measureText(line);
          textX = element.x + (element.width - metrics.width);
        }

        ctx.fillText(line, textX, textY);

        if (element.underline) {
          const metrics = ctx.measureText(line);
          const underlineY = textY + element.fontSize + 1;
          ctx.beginPath();
          ctx.lineWidth = Math.max(1, Math.round(element.fontSize / 14));
          ctx.strokeStyle = '#000000';
          ctx.moveTo(textX, underlineY);
          ctx.lineTo(textX + metrics.width, underlineY);
          ctx.stroke();
        }
      });
      break;
    }

    case 'barcode': {
      try {
        const tempCanvas = document.createElement('canvas');
        JsBarcode(tempCanvas, element.content, {
          format: element.format === 'ITF' ? 'ITF14' : element.format,
          displayValue: element.displayValue,
          fontSize: element.fontSize || 12,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
        ctx.drawImage(tempCanvas, element.x, element.y, element.width, element.height);
      } catch (err) {
        // En cas de format invalide (ex: EAN non conforme), afficher un avertissement
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        ctx.fillStyle = '#000000';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('Format invalide', element.x + 4, element.y + 14);
      }
      break;
    }

    case 'qrcode': {
      try {
        const tempCanvas = document.createElement('canvas');
        await QRCode.toCanvas(tempCanvas, element.content || 'P15', {
          errorCorrectionLevel: element.errorCorrectionLevel || 'M',
          margin: 0,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        ctx.drawImage(tempCanvas, element.x, element.y, element.width, element.height);
      } catch (err) {
        ctx.strokeRect(element.x, element.y, element.width, element.height);
      }
      break;
    }

    case 'icon': {
      const iconDef = LABEL_ICONS.find((i) => i.id === element.iconName);
      if (iconDef) {
        const p2d = new Path2D(iconDef.paths.join(' '));
        ctx.save();
        ctx.translate(element.x, element.y);
        // Échelle depuis le viewBox 24x24 standard vers element.width/height
        const scaleX = element.width / 24;
        const scaleY = element.height / 24;
        ctx.scale(scaleX, scaleY);
        ctx.fillStyle = '#000000';
        ctx.fill(p2d);
        ctx.restore();
      }
      break;
    }

    case 'shape': {
      ctx.lineWidth = element.strokeWidth || 2;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#000000';

      const x = element.x;
      const y = element.y;
      const w = element.width;
      const h = element.height;

      if (element.shapeType === 'rect') {
        if (element.filled) {
          ctx.fillRect(x, y, w, h);
        } else {
          ctx.strokeRect(x, y, w, h);
        }
      } else if (element.shapeType === 'rounded-rect') {
        const radius = Math.min(10, Math.min(w, h) / 4);
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        if (element.filled) ctx.fill();
        else ctx.stroke();
      } else if (element.shapeType === 'circle') {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        if (element.filled) ctx.fill();
        else ctx.stroke();
      } else if (element.shapeType === 'line-h') {
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y + h / 2);
        ctx.stroke();
      } else if (element.shapeType === 'line-v') {
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w / 2, y + h);
        ctx.stroke();
      } else if (element.shapeType === 'border-frame') {
        ctx.strokeRect(x, y, w, h);
        // Bordure double décorative
        const offset = 4;
        if (w > offset * 3 && h > offset * 3) {
          ctx.strokeRect(x + offset, y + offset, w - offset * 2, h - offset * 2);
        }
      }
      break;
    }

    case 'image': {
      if (element.dataUrl) {
        let img = imageElementCache.get(element.dataUrl);
        if (!img) {
          img = new Image();
          img.src = element.dataUrl;
          imageElementCache.set(element.dataUrl, img);
          await new Promise((res) => {
            img!.onload = res;
            img!.onerror = res;
          });
        }

        if (img && img.complete) {
          // Canevas intermédiaire pour appliquer luminosité, contraste et dithering
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = Math.round(element.width);
          tempCanvas.height = Math.round(element.height);
          const tCtx = tempCanvas.getContext('2d')!;

          tCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
          const imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

          // Ajustement luminosité & contraste
          const brightness = element.brightness || 0;
          const contrast = element.contrast || 0;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

          for (let i = 0; i < imgData.data.length; i += 4) {
            let r = imgData.data[i] + brightness;
            let g = imgData.data[i + 1] + brightness;
            let b = imgData.data[i + 2] + brightness;

            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;

            imgData.data[i] = Math.min(255, Math.max(0, r));
            imgData.data[i + 1] = Math.min(255, Math.max(0, g));
            imgData.data[i + 2] = Math.min(255, Math.max(0, b));
          }

          // Dithering ou Seuil
          const grayscale = rgbaToGrayscale(imgData.data, tempCanvas.width, tempCanvas.height);
          const binary =
            element.ditherMode === 'floyd-steinberg'
              ? floydSteinbergDither(grayscale, tempCanvas.width, tempCanvas.height)
              : thresholdBinarize(grayscale, element.threshold || 128);

          // Réécriture en noir et blanc
          for (let i = 0; i < binary.length; i++) {
            let isBlack = binary[i] === 1;
            if (element.invert) isBlack = !isBlack;

            const off = i * 4;
            const val = isBlack ? 0 : 255;
            imgData.data[off] = val;
            imgData.data[off + 1] = val;
            imgData.data[off + 2] = val;
            imgData.data[off + 3] = isBlack ? 255 : 0; // Transparence pour le blanc
          }

          tCtx.putImageData(imgData, 0, 0);
          ctx.drawImage(tempCanvas, element.x, element.y, element.width, element.height);
        }
      }
      break;
    }
  }

  ctx.restore();
}

/**
 * Génère le canevas complet à la résolution native de l'étiquette (8 pixels par mm)
 */
export async function renderLabelToFullCanvas(
  elements: LabelElement[],
  dimensions: LabelDimensions,
): Promise<HTMLCanvasElement> {
  const widthPx = Math.round(dimensions.widthMm * PX_PER_MM);
  const heightPx = Math.round(dimensions.heightMm * PX_PER_MM);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Fond blanc thermique pur
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Rendu de chaque élément dans l'ordre de calque
  for (const element of elements) {
    await renderElementToCanvas(ctx, element);
  }

  return canvas;
}
