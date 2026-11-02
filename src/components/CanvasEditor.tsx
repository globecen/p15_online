import React, { useRef, useState, useEffect, useCallback } from 'react';
import { LabelDimensions, LabelElement, PX_PER_MM } from '../types/label';
import { renderElementToCanvas } from '../utils/canvas-renderer';
import { RotateCw } from 'lucide-react';

interface CanvasEditorProps {
  dimensions: LabelDimensions;
  elements: LabelElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (updated: LabelElement) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  zoom: number;
}

type DragAction = 'move' | 'resize' | 'rotate' | null;
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  dimensions,
  elements,
  selectedId,
  onSelect,
  onUpdateElement,
  onDeleteSelected,
  onDuplicateSelected,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dragAction, setDragAction] = useState<DragAction>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; initialEl: LabelElement } | null>(null);

  // Guides d'alignement au centre
  const [showGuideX, setShowGuideX] = useState<boolean>(false);
  const [showGuideY, setShowGuideY] = useState<boolean>(false);

  const widthPx = Math.round(dimensions.widthMm * PX_PER_MM);
  const heightPx = Math.round(dimensions.heightMm * PX_PER_MM);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // Refs pour éviter tout problème de closure périmée pendant le drag
  const selectedElementRef = useRef(selectedElement);
  selectedElementRef.current = selectedElement;

  const dragStartRef = useRef(dragStart);
  dragStartRef.current = dragStart;

  const dragActionRef = useRef(dragAction);
  dragActionRef.current = dragAction;

  const activeHandleRef = useRef(activeHandle);
  activeHandleRef.current = activeHandle;

  // Redessiner le canvas principal à chaque changement
  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = widthPx;
    canvas.height = heightPx;

    // Fond blanc thermique
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Dessin de chaque élément
    for (const el of elements) {
      await renderElementToCanvas(ctx, el);
    }
  }, [elements, widthPx, heightPx]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Raccourcis clavier (flèches, suppr, ctrl+d)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (!selectedElement) return;

      const step = e.shiftKey ? 8 : 1;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdateElement({ ...selectedElement, x: selectedElement.x - step });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdateElement({ ...selectedElement, x: selectedElement.x + step });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdateElement({ ...selectedElement, y: selectedElement.y - step });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdateElement({ ...selectedElement, y: selectedElement.y + step });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onDuplicateSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, onUpdateElement, onDeleteSelected, onDuplicateSelected]);

  // Convertir les coordonnées écran (souris ou toucher) en pixels natifs de l'étiquette
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Déplacement souris ou doigt en cours
  const handleMoveAt = useCallback((clientX: number, clientY: number) => {
    const action = dragActionRef.current;
    const start = dragStartRef.current;
    const selected = selectedElementRef.current;
    const handle = activeHandleRef.current;

    if (!action || !start || !selected) return;

    const { x, y } = getCanvasCoords(clientX, clientY);
    const dx = x - start.mouseX;
    const dy = y - start.mouseY;
    const initial = start.initialEl;

    if (action === 'move') {
      let newX = Math.round(initial.x + dx);
      let newY = Math.round(initial.y + dy);

      // Aimantation au centre
      const centerX = widthPx / 2;
      const centerY = heightPx / 2;
      const elCenterX = newX + initial.width / 2;
      const elCenterY = newY + initial.height / 2;

      const snapTolerance = 4;
      if (Math.abs(elCenterX - centerX) < snapTolerance) {
        newX = Math.round(centerX - initial.width / 2);
        setShowGuideX(true);
      } else {
        setShowGuideX(false);
      }

      if (Math.abs(elCenterY - centerY) < snapTolerance) {
        newY = Math.round(centerY - initial.height / 2);
        setShowGuideY(true);
      } else {
        setShowGuideY(false);
      }

      onUpdateElement({
        ...selected,
        x: newX,
        y: newY,
      });
    } else if (action === 'resize' && handle) {
      let newX = initial.x;
      let newY = initial.y;
      let newW = initial.width;
      let newH = initial.height;

      const minSize = 10;

      if (handle.includes('e')) {
        newW = Math.max(minSize, Math.round(initial.width + dx));
      }
      if (handle.includes('s')) {
        newH = Math.max(minSize, Math.round(initial.height + dy));
      }
      if (handle.includes('w')) {
        const potentialW = initial.width - dx;
        if (potentialW >= minSize) {
          newW = Math.round(potentialW);
          newX = Math.round(initial.x + dx);
        }
      }
      if (handle.includes('n')) {
        const potentialH = initial.height - dy;
        if (potentialH >= minSize) {
          newH = Math.round(potentialH);
          newY = Math.round(initial.y + dy);
        }
      }

      onUpdateElement({
        ...selected,
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    } else if (action === 'rotate') {
      const elCenterX = initial.x + initial.width / 2;
      const elCenterY = initial.y + initial.height / 2;

      const rad = Math.atan2(y - elCenterY, x - elCenterX);
      let deg = Math.round((rad * 180) / Math.PI) + 90;
      if (deg < 0) deg += 360;

      const snapThreshold = 6;
      [0, 45, 90, 135, 180, 225, 270, 315, 360].forEach((snap) => {
        if (Math.abs(deg - snap) < snapThreshold) {
          deg = snap === 360 ? 0 : snap;
        }
      });

      onUpdateElement({
        ...selected,
        rotation: deg,
      });
    }
  }, [getCanvasCoords, widthPx, heightPx, onUpdateElement]);

  const handleEnd = useCallback(() => {
    dragActionRef.current = null;
    dragStartRef.current = null;
    activeHandleRef.current = null;
    setDragAction(null);
    setActiveHandle(null);
    setDragStart(null);
    setShowGuideX(false);
    setShowGuideY(false);
  }, []);

  // Écouteurs globaux sur window pour un déplacement fluide même hors du canvas
  useEffect(() => {
    if (!dragAction) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      handleMoveAt(e.clientX, e.clientY);
    };

    const handleWindowMouseUp = () => {
      handleEnd();
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMoveAt(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleWindowTouchEnd = () => {
      handleEnd();
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [dragAction, handleMoveAt, handleEnd]);

  // Clic ou tap sur le canvas pour sélectionner ou commencer à déplacer un élément
  const handleStartAt = (clientX: number, clientY: number) => {
    const { x, y } = getCanvasCoords(clientX, clientY);

    const clicked = [...elements].reverse().find((el) => {
      if (!el.rotation) {
        return (
          x >= el.x &&
          x <= el.x + el.width &&
          y >= el.y &&
          y <= el.y + el.height
        );
      }
      // Support rotation pour détection du clic
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rad = (-el.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const nx = cos * (x - cx) - sin * (y - cy) + cx;
      const ny = sin * (x - cx) + cos * (y - cy) + cy;
      return (
        nx >= el.x &&
        nx <= el.x + el.width &&
        ny >= el.y &&
        ny <= el.y + el.height
      );
    });

    if (clicked) {
      onSelect(clicked.id);
      dragActionRef.current = 'move';
      dragStartRef.current = {
        mouseX: x,
        mouseY: y,
        initialEl: { ...clicked },
      };
      setDragAction('move');
      setDragStart({
        mouseX: x,
        mouseY: y,
        initialEl: { ...clicked },
      });
    } else {
      onSelect(null);
    }
  };

  // Clic directement sur l'élément sélectionné pour le redéplacer immédiatement
  const handleSelectionBoxStart = (e: React.MouseEvent | React.TouchEvent) => {
    // Si l'utilisateur clique sur une poignée de resize ou rotate, laisser la poignée gérer
    if ((e.target as HTMLElement).closest('[data-handle]')) {
      return;
    }
    e.stopPropagation();

    if (!selectedElement) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);

    dragActionRef.current = 'move';
    dragStartRef.current = {
      mouseX: x,
      mouseY: y,
      initialEl: { ...selectedElement },
    };
    setDragAction('move');
    setDragStart({
      mouseX: x,
      mouseY: y,
      initialEl: { ...selectedElement },
    });
  };

  // Redimensionnement
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    if (!selectedElement) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const { x, y } = getCanvasCoords(clientX, clientY);
    dragActionRef.current = 'resize';
    activeHandleRef.current = handle;
    dragStartRef.current = {
      mouseX: x,
      mouseY: y,
      initialEl: { ...selectedElement },
    };
    setDragAction('resize');
    setActiveHandle(handle);
    setDragStart({
      mouseX: x,
      mouseY: y,
      initialEl: { ...selectedElement },
    });
  };

  // Rotation
  const handleRotateStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!selectedElement) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const { x, y } = getCanvasCoords(clientX, clientY);
    dragActionRef.current = 'rotate';
    dragStartRef.current = {
      mouseX: x,
      mouseY: y,
      initialEl: { ...selectedElement },
    };
    setDragAction('rotate');
    setDragStart({
      mouseX: x,
      mouseY: y,
      initialEl: { ...selectedElement },
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-auto bg-slate-900/60 select-none touch-none"
    >
      {/* Règle supérieure en millimètres */}
      <div
        className="flex items-end mb-2 h-6 border-b border-slate-700/80 font-mono text-[10px] text-slate-400"
        style={{ width: `${widthPx * zoom}px` }}
      >
        <div className="w-full flex justify-between px-1">
          <span>0 mm</span>
          <span>{Math.round(dimensions.widthMm / 2)} mm</span>
          <span>{dimensions.widthMm} mm</span>
        </div>
      </div>

      {/* Cadre de l'étiquette avec ombre */}
      <div
        className="relative group transition-all duration-75 shadow-2xl rounded-sm"
        style={{
          width: `${widthPx * zoom}px`,
          height: `${heightPx * zoom}px`,
        }}
      >
        {/* Le canevas de dessin HTML5 */}
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => handleStartAt(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handleStartAt(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          className="absolute inset-0 w-full h-full cursor-crosshair rounded-sm shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-slate-400/30 touch-none"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Lignes guides magnétiques */}
        {showGuideX && (
          <div
            className="absolute top-0 bottom-0 w-px bg-indigo-500/80 pointer-events-none z-30"
            style={{ left: `${(widthPx / 2) * zoom}px` }}
          />
        )}
        {showGuideY && (
          <div
            className="absolute left-0 right-0 h-px bg-indigo-500/80 pointer-events-none z-30"
            style={{ top: `${(heightPx / 2) * zoom}px` }}
          />
        )}

        {/* Boîte de sélection et poignées interactives */}
        {selectedElement && (
          <div
            onMouseDown={handleSelectionBoxStart}
            onTouchStart={handleSelectionBoxStart}
            className="absolute pointer-events-auto border-2 border-indigo-500 rounded-none z-20 cursor-move bg-indigo-500/10 select-none touch-none"
            style={{
              left: `${selectedElement.x * zoom}px`,
              top: `${selectedElement.y * zoom}px`,
              width: `${selectedElement.width * zoom}px`,
              height: `${selectedElement.height * zoom}px`,
              transform: selectedElement.rotation ? `rotate(${selectedElement.rotation}deg)` : undefined,
              transformOrigin: 'center center',
            }}
          >
            {/* Poignée de rotation */}
            <div
              data-handle="rotate"
              onMouseDown={handleRotateStart}
              onTouchStart={handleRotateStart}
              className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md touch-none z-30"
              title="Faire pivoter"
            >
              <RotateCw size={12} />
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-indigo-500 pointer-events-none" />

            {/* Poignées de redimensionnement */}
            <div
              data-handle="resize-nw"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
              onTouchStart={(e) => handleResizeStart(e, 'nw')}
              className="absolute -top-2 -left-2 w-4 h-4 bg-white border border-indigo-600 cursor-nwse-resize rounded-xs hover:scale-125 touch-none z-30 shadow-xs"
            />
            <div
              data-handle="resize-ne"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
              onTouchStart={(e) => handleResizeStart(e, 'ne')}
              className="absolute -top-2 -right-2 w-4 h-4 bg-white border border-indigo-600 cursor-nesw-resize rounded-xs hover:scale-125 touch-none z-30 shadow-xs"
            />
            <div
              data-handle="resize-se"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
              onTouchStart={(e) => handleResizeStart(e, 'se')}
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border border-indigo-600 cursor-nwse-resize rounded-xs hover:scale-125 touch-none z-30 shadow-xs"
            />
            <div
              data-handle="resize-sw"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
              onTouchStart={(e) => handleResizeStart(e, 'sw')}
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border border-indigo-600 cursor-nesw-resize rounded-xs hover:scale-125 touch-none z-30 shadow-xs"
            />
          </div>
        )}
      </div>

      {/* Règle latérale / infos dimensions */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 font-mono">
        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
          Format : {dimensions.widthMm} × {dimensions.heightMm} mm
        </span>
        <span className="text-slate-400">Zoom : {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};
