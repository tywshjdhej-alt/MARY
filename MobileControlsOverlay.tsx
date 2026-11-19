import React, { useRef, useState } from 'react';
import {
  ArrowUp,
  Backpack,
  EyeOff,
  Flashlight,
  Hand,
  Smartphone,
  Zap,
} from 'lucide-react';
import { t } from '../i18n/translations';
import { Language } from '../types/game';

interface MobileControlsOverlayProps {
  language: Language;
  visible: boolean;
  canInteract: boolean;
  flashlightOn: boolean;
  isHidden: boolean;
  isCrouching: boolean;
  hasUnreadPhone: boolean;
  onJoystickMove: (x: number, y: number) => void;
  onLookDrag: (dx: number, dy: number) => void;
  onSprintChange: (active: boolean) => void;
  onJump: () => void;
  onHideToggle: () => void;
  onFlashlightToggle: () => void;
  onInteract: () => void;
  onOpenInventory: () => void;
  onOpenPhone: () => void;
}

export const MobileControlsOverlay: React.FC<MobileControlsOverlayProps> = ({
  language,
  visible,
  canInteract,
  flashlightOn,
  isHidden,
  isCrouching,
  hasUnreadPhone,
  onJoystickMove,
  onLookDrag,
  onSprintChange,
  onJump,
  onHideToggle,
  onFlashlightToggle,
  onInteract,
  onOpenInventory,
  onOpenPhone,
}) => {
  const stickBaseRef = useRef<HTMLDivElement>(null);
  const stickPointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const lookPointerId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  const maxRadius = 42;

  const updateStickFromClient = (clientX: number, clientY: number) => {
    const base = stickBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    // Note: up on screen (negative dy) = forward (+y)
    onJoystickMove(dx / maxRadius, -dy / maxRadius);
  };

  const handleStickDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    stickPointerId.current = e.pointerId;
    updateStickFromClient(e.clientX, e.clientY);
  };

  const handleStickMove = (e: React.PointerEvent) => {
    if (stickPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateStickFromClient(e.clientX, e.clientY);
  };

  const handleStickUp = (e: React.PointerEvent) => {
    if (stickPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    stickPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  // Fullscreen look-drag layer (allows mouse drag on desktop AND right-side touch drag on mobile)
  const handleLookDown = (e: React.PointerEvent) => {
    if (lookPointerId.current !== null) return;
    lookPointerId.current = e.pointerId;
    lastLookPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLookMove = (e: React.PointerEvent) => {
    if (lookPointerId.current !== e.pointerId) return;
    const dx = e.clientX - lastLookPos.current.x;
    const dy = e.clientY - lastLookPos.current.y;
    lastLookPos.current = { x: e.clientX, y: e.clientY };
    onLookDrag(dx, dy);
  };

  const handleLookUp = (e: React.PointerEvent) => {
    if (lookPointerId.current !== e.pointerId) return;
    lookPointerId.current = null;
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Camera Look Drag Surface (covers playfield behind buttons) */}
      <div
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
        className="absolute inset-0 pointer-events-auto touch-none"
      />

      {visible && (
        <>
          {/* Left Side: Virtual Thumbstick */}
          <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 pointer-events-auto touch-none">
            <div
              ref={stickBaseRef}
              onPointerDown={handleStickDown}
              onPointerMove={handleStickMove}
              onPointerUp={handleStickUp}
              onPointerCancel={handleStickUp}
              className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-[#0d1016]/75 border border-zinc-600/60 flex items-center justify-center"
            >
              <div
                className="w-12 h-12 rounded-full bg-zinc-200/85 border border-white/60 shadow-lg"
                style={{
                  transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
                }}
              />
            </div>
          </div>

          {/* Right Side: Ergonomic Action Buttons */}
          <div className="absolute bottom-5 right-5 md:bottom-7 md:right-7 flex flex-col items-end gap-3 pointer-events-auto touch-none">
            {/* Top utility row: Phone, Bag, Flashlight */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenPhone}
                className={`relative w-12 h-12 rounded-full border flex flex-col items-center justify-center text-[10px] font-semibold transition-colors ${
                  hasUnreadPhone
                    ? 'bg-sky-900/90 border-sky-400 text-sky-100'
                    : 'bg-[#10131b]/85 border-zinc-700 text-zinc-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>{t(language, 'btnPhone')}</span>
              </button>

              <button
                type="button"
                onClick={onOpenInventory}
                className="w-12 h-12 rounded-full bg-[#10131b]/85 border border-zinc-700 text-zinc-200 flex flex-col items-center justify-center text-[10px] font-semibold active:bg-zinc-700"
              >
                <Backpack className="w-4 h-4" />
                <span>{t(language, 'btnBag')}</span>
              </button>

              <button
                type="button"
                onClick={onFlashlightToggle}
                className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center text-[10px] font-semibold transition-colors ${
                  flashlightOn
                    ? 'bg-amber-900/85 border-amber-400 text-amber-100'
                    : 'bg-[#10131b]/85 border-zinc-700 text-zinc-300'
                }`}
              >
                <Flashlight className="w-4 h-4" />
                <span>{t(language, 'btnLight')}</span>
              </button>
            </div>

            {/* Primary thumb cluster: Run, Hide, Jump, Interact */}
            <div className="flex items-end gap-2.5">
              <button
                type="button"
                onPointerDown={() => onSprintChange(true)}
                onPointerUp={() => onSprintChange(false)}
                onPointerLeave={() => onSprintChange(false)}
                onPointerCancel={() => onSprintChange(false)}
                className="w-12 h-12 rounded-full bg-[#10131b]/85 border border-zinc-600 text-zinc-100 flex flex-col items-center justify-center text-[10px] font-semibold active:bg-rose-900"
              >
                <Zap className="w-4 h-4" />
                <span>{t(language, 'btnRun')}</span>
              </button>

              <button
                type="button"
                onClick={onHideToggle}
                className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center text-[10px] font-semibold transition-colors ${
                  isHidden || isCrouching
                    ? 'bg-emerald-900/85 border-emerald-400 text-emerald-100'
                    : 'bg-[#10131b]/85 border-zinc-600 text-zinc-200'
                }`}
              >
                <EyeOff className="w-4 h-4" />
                <span>{t(language, 'btnHide')}</span>
              </button>

              <button
                type="button"
                onClick={onJump}
                className="w-12 h-12 rounded-full bg-[#10131b]/85 border border-zinc-600 text-zinc-100 flex flex-col items-center justify-center text-[10px] font-semibold active:bg-zinc-700"
              >
                <ArrowUp className="w-4 h-4" />
                <span>{t(language, 'btnJump')}</span>
              </button>

              <button
                type="button"
                onClick={onInteract}
                className={`w-16 h-16 rounded-full border flex flex-col items-center justify-center text-xs font-bold transition-colors ${
                  canInteract
                    ? 'bg-rose-800/95 border-rose-400 text-white shadow-lg'
                    : 'bg-[#121620]/85 border-zinc-600 text-zinc-300'
                }`}
              >
                <Hand className="w-5 h-5" />
                <span>{t(language, 'btnUse')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
