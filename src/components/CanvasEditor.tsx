import React, { useRef, useState, useEffect, useCallback } from 'react';
import { LabelDimensions, LabelElement, PX_PER_MM } from '../types/label';
import { renderElementToCanvas } from '../utils/canvas-renderer';
import {
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlignCenter,
  Edit3,
  Copy,
  Trash2,
} from 'lucide-react';

interface CanvasEditorProps {
  dimensions: LabelDimensions;
  elements: LabelElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (updated: LabelElement) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpenProperties?: () => void;
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
  onZoomChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOpenProperties,
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

  // Pinch-to-zoom multi-touch refs
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(zoom);

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
    pinchStartDistRef.current = null;
    setDragAction(null);
    setActiveHandle(null);
    setDragStart(null);
    setShowGuideX(false);
    setShowGuideY(false);
  }, []);

  // Écouteurs globaux sur window pour déplacement fluide et pinch-zoom
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (dragActionRef.current) {
        handleMoveAt(e.clientX, e.clientY);
      }
    };

    const handleWindowMouseUp = () => {
      if (dragActionRef.current) {
        handleEnd();
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / pinchStartDistRef.current;
        const nextZoom = Math.min(3.5, Math.max(0.5, Math.round(pinchStartZoomRef.current * factor * 20) / 20));
        onZoomChange(nextZoom);
        return;
      }

      if (e.touches.length === 1 && dragActionRef.current) {
        handleMoveAt(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDistRef.current = null;
      }
      if (dragActionRef.current) {
        handleEnd();
      }
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
  }, [handleMoveAt, handleEnd, onZoomChange]);

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

  // Actions rapides d'alignement et rotation
  const centerElementHorizontal = () => {
    if (!selectedElement) return;
    onUpdateElement({
      ...selectedElement,
      x: Math.round((widthPx - selectedElement.width) / 2),
    });
  };

  const rotateElement90 = () => {
    if (!selectedElement) return;
    const currentRot = selectedElement.rotation || 0;
    onUpdateElement({
      ...selectedElement,
      rotation: (currentRot + 90) % 360,
    });
  };

  // Ajuster automatiquement le zoom pour un affichage optimal
  const handleFitScreen = () => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    const fitW = (containerW - 32) / widthPx;
    const fitH = (containerH - 48) / heightPx;
    const optimalFit = Math.min(fitW, fitH);

    if (optimalFit * heightPx < 140) {
      const tactileZoom = Math.min(2.8, Math.max(1.8, 180 / heightPx));
      onZoomChange(Math.round(tactileZoom * 10) / 10);
    } else {
      onZoomChange(Math.min(3.0, Math.max(0.6, Math.round(optimalFit * 10) / 10)));
    }
  };

  // Basculer entre vue d'ensemble et mode tactile 2x
  const handleToggleFitZoom = () => {
    if (zoom >= 1.8) {
      if (containerRef.current) {
        const containerW = containerRef.current.clientWidth;
        const fitW = (containerW - 36) / widthPx;
        onZoomChange(Math.min(2.0, Math.max(0.6, Math.round(fitW * 10) / 10)));
      } else {
        onZoomChange(1.0);
      }
    } else {
      const tactileZoom = Math.min(2.8, Math.max(1.8, 180 / heightPx));
      onZoomChange(Math.round(tactileZoom * 10) / 10);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-8 overflow-auto bg-slate-900/60 select-none"
    >
      {/* HUD Flottant : Zoom & Historique (Accessible à tout moment en haut à droite) */}
      <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-30 flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md select-none">
        {onUndo && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition-all md:hidden cursor-pointer"
            title="Annuler (Ctrl+Z)"
          >
            <RotateCcw size={14} />
          </button>
        )}
        {onRedo && (
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition-all md:hidden cursor-pointer"
            title="Rétablir (Ctrl+Y)"
          >
            <RotateCw size={14} />
          </button>
        )}

        <div className="h-4 w-px bg-slate-700/60 mx-0.5 md:hidden" />

        {/* Dézoomer */}
        <button
          onClick={() => onZoomChange(Math.max(0.5, Math.round((zoom - 0.25) * 100) / 100))}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Dézoomer"
        >
          <ZoomOut size={14} />
        </button>

        {/* Pourcentage de zoom cliquable */}
        <button
          onClick={handleToggleFitZoom}
          className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-300 hover:text-white rounded hover:bg-slate-800/80 transition-all cursor-pointer"
          title="Cliquer pour basculer le zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        {/* Zoomer */}
        <button
          onClick={() => onZoomChange(Math.min(3.5, Math.round((zoom + 0.25) * 100) / 100))}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Zoomer"
        >
          <ZoomIn size={14} />
        </button>

        {/* Bouton Ajuster la taille */}
        <button
          onClick={handleFitScreen}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold transition-all cursor-pointer ml-0.5"
          title="Ajuster la taille optimale à l'écran"
        >
          <Maximize2 size={12} />
          <span className="hidden sm:inline">Ajuster</span>
        </button>
      </div>

      {/* Règle supérieure en millimètres */}
      <div
        className="flex items-end mb-1.5 h-5 border-b border-slate-700/80 font-mono text-[9px] text-slate-400 select-none shrink-0"
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
        className="relative group transition-all duration-75 shadow-2xl rounded-sm shrink-0"
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
            if (e.touches.length === 2) {
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              pinchStartDistRef.current = dist;
              pinchStartZoomRef.current = zoom;
            } else if (e.touches.length === 1) {
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
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-7 h-7 sm:w-6 sm:h-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg touch-none z-30"
              title="Faire pivoter"
            >
              <RotateCw size={13} />
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-indigo-500 pointer-events-none" />

            {/* Poignées de redimensionnement agrandies pour mobile/tactile */}
            <div
              data-handle="resize-nw"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
              onTouchStart={(e) => handleResizeStart(e, 'nw')}
              className="absolute -top-2.5 -left-2.5 w-5 h-5 sm:w-4 sm:h-4 bg-white border-2 border-indigo-600 cursor-nwse-resize rounded-sm hover:scale-125 touch-none z-30 shadow-md"
            />
            <div
              data-handle="resize-ne"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
              onTouchStart={(e) => handleResizeStart(e, 'ne')}
              className="absolute -top-2.5 -right-2.5 w-5 h-5 sm:w-4 sm:h-4 bg-white border-2 border-indigo-600 cursor-nesw-resize rounded-sm hover:scale-125 touch-none z-30 shadow-md"
            />
            <div
              data-handle="resize-se"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
              onTouchStart={(e) => handleResizeStart(e, 'se')}
              className="absolute -bottom-2.5 -right-2.5 w-5 h-5 sm:w-4 sm:h-4 bg-white border-2 border-indigo-600 cursor-nwse-resize rounded-sm hover:scale-125 touch-none z-30 shadow-md"
            />
            <div
              data-handle="resize-sw"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
              onTouchStart={(e) => handleResizeStart(e, 'sw')}
              className="absolute -bottom-2.5 -left-2.5 w-5 h-5 sm:w-4 sm:h-4 bg-white border-2 border-indigo-600 cursor-nesw-resize rounded-sm hover:scale-125 touch-none z-30 shadow-md"
            />
          </div>
        )}
      </div>

      {/* Barre d'action contextuelle flottante pour l'élément sélectionné */}
      {selectedElement && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          {onOpenProperties && (
            <button
              onClick={onOpenProperties}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
              title="Modifier les options et le style"
            >
              <Edit3 size={13} />
              <span>Modifier</span>
            </button>
          )}

          <button
            onClick={centerElementHorizontal}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Centrer horizontalement"
          >
            <AlignCenter size={14} />
          </button>

          <button
            onClick={rotateElement90}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Pivoter de 90°"
          >
            <RotateCw size={14} />
          </button>

          <button
            onClick={onDuplicateSelected}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Dupliquer"
          >
            <Copy size={14} />
          </button>

          <button
            onClick={onDeleteSelected}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Informations dimensions */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 font-mono shrink-0">
        <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
          Format : {dimensions.widthMm} × {dimensions.heightMm} mm
        </span>
        <span className="text-slate-400">Zoom : {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};
